"""
Post-generation consistency rules.

Ensures logical consistency between related fields after generation.
Rules are loaded from configuration and applied dynamically.
"""

from datetime import datetime, timedelta
from typing import Any
import random
import re


class ConsistencyRules:
    """
    Applies consistency rules to generated records.

    Rules are loaded from configuration and applied after all fields
    are generated to ensure logical consistency between related fields.
    """

    def __init__(self, config: dict[str, Any] | None = None, schema: dict[str, Any] | None = None):
        """
        Initialize with configuration.

        Args:
            config: Configuration dictionary containing consistency_rules.
            schema: Schema dictionary containing table/field definitions with nullability info.
        """
        self.config = config or {}
        self.rules = self.config.get("consistency_rules", {})
        self.schema = schema or {}

    def _is_field_nullable(self, table_name: str, field_name: str) -> bool:
        """Check if a field is nullable according to the schema."""
        tables = self.schema.get("properties", {}).get("tables", {}).get("properties", {})
        table_def = tables.get(table_name, {})
        columns = table_def.get("properties", {})
        if field_name in columns:
            return columns[field_name].get("nullable", True)
        # Default to nullable if not found
        return True

    def apply(self, record: dict[str, Any], table_name: str) -> dict[str, Any]:
        """
        Apply all consistency rules to a record.

        Args:
            record: The generated record.
            table_name: Name of the table.

        Returns:
            Modified record with consistent values.
        """
        # Get rules for this table
        table_rules = self.rules.get(table_name, [])

        for rule in table_rules:
            if self._evaluate_condition(rule.get("condition", {}), record):
                record = self._apply_set_values(rule.get("set", {}), record, table_name)

        # Apply body consistency for emails (non-configurable)
        if table_name == "emails":
            record = self._apply_body_consistency(record)

        # Apply birthday field consistency for users (non-configurable)
        if table_name == "users":
            record = self._apply_birthday_consistency(record)

        return record

    def _evaluate_condition(self, condition: dict[str, Any], record: dict[str, Any]) -> bool:
        """
        Evaluate a condition against a record.

        Args:
            condition: Condition definition with field and comparison.
            record: The record to check.

        Returns:
            True if condition matches.
        """
        if not condition:
            return True

        field = condition.get("field")
        if not field:
            return True

        value = record.get(field)

        # Check different condition types
        if "equals" in condition:
            return value == condition["equals"]

        if "not_equals" in condition:
            return value != condition["not_equals"]

        if "in" in condition:
            return value in condition["in"]

        if "not_in" in condition:
            return value not in condition["not_in"]

        return True

    def _apply_set_values(self, set_values: dict[str, Any], record: dict[str, Any], table_name: str = None) -> dict[str, Any]:
        """
        Apply set values to a record.

        Args:
            set_values: Dictionary of field -> value specifications.
            record: The record to modify.
            table_name: Name of the table (for nullability check).

        Returns:
            Modified record.
        """
        for field, value_spec in set_values.items():
            resolved_value = self._resolve_value(value_spec, record)

            # Skip setting null for non-nullable fields
            if resolved_value is None and table_name:
                if not self._is_field_nullable(table_name, field):
                    # Don't override with null - keep existing value
                    continue

            record[field] = resolved_value

        return record

    def _resolve_value(self, value_spec: Any, record: dict[str, Any]) -> Any:
        """
        Resolve a value specification to an actual value.

        Args:
            value_spec: The value specification (can be literal, dict with directives, etc.)
            record: The current record (for field references).

        Returns:
            Resolved value.
        """
        # None/null
        if value_spec is None:
            return None

        # Simple literals (string, number, bool)
        if isinstance(value_spec, (str, int, float, bool)):
            # Check if it's a function call string
            if isinstance(value_spec, str):
                return self._parse_function_call(value_spec, record)
            return value_spec

        # Dictionary with directives
        if isinstance(value_spec, dict):
            # random_choice: pick from list
            if "random_choice" in value_spec:
                choices = value_spec["random_choice"]
                if choices:
                    return random.choice(choices)
                return None

            # Could add more directives here in the future

        # List (shouldn't happen in set values, but return as-is)
        if isinstance(value_spec, list):
            return value_spec

        return value_spec

    def _parse_function_call(self, value: str, record: dict[str, Any]) -> Any:
        """
        Parse and execute function call strings.

        Supported functions:
        - generate_past_timestamp(min_days, max_days)
        - generate_timestamp_past(min_days, max_days) [alias]
        - generate_timestamp_future(min_days, max_days)
        - generate_future_timestamp(min_days, max_days) [alias]
        - generate_timestamp_after(field_name, min_hours, max_hours)

        Args:
            value: The function call string.
            record: The current record.

        Returns:
            Executed function result or original value if not a function.
        """
        # Match generate_past_timestamp(min_days, max_days) or generate_timestamp_past(min_days, max_days)
        match = re.match(r'generate_(past_timestamp|timestamp_past)\((\d+),\s*(\d+)\)', value)
        if match:
            min_days = int(match.group(2))
            max_days = int(match.group(3))
            return self._generate_past_timestamp(min_days, max_days)

        # Match generate_future_timestamp(min_days, max_days) or generate_timestamp_future(min_days, max_days)
        match = re.match(r'generate_(future_timestamp|timestamp_future)\((\d+),\s*(\d+)\)', value)
        if match:
            min_days = int(match.group(2))
            max_days = int(match.group(3))
            return self._generate_future_timestamp(min_days, max_days)

        # Match generate_timestamp_after(field, min_hours, max_hours)
        match = re.match(r'generate_timestamp_after\((\w+),\s*(\d+),\s*(\d+)\)', value)
        if match:
            field_name = match.group(1)
            min_hours = int(match.group(2))
            max_hours = int(match.group(3))
            after_value = record.get(field_name)
            if after_value:
                return self._generate_timestamp_after(after_value, min_hours, max_hours)
            return self._generate_past_timestamp(0, 30)

        # Not a function call, return as-is
        return value

    def _apply_body_consistency(self, record: dict[str, Any]) -> dict[str, Any]:
        """
        Apply body field consistency for emails.

        This ensures body and html_body have the same content in different formats.
        For emails table, only body and html_body fields exist.
        """
        import re

        body = record.get("body")
        html_body = record.get("html_body")

        # If we have html_body but not body, strip HTML to create plain text
        if html_body and not body:
            # Replace closing paragraph tags with double newlines first
            plain_text = re.sub(r'</p>\s*<p>', '\n\n', html_body)
            # Now strip all remaining HTML tags
            plain_text = re.sub(r'<[^>]+>', '', plain_text)
            # Clean up extra whitespace
            plain_text = re.sub(r'\n{3,}', '\n\n', plain_text)  # Max 2 newlines
            plain_text = plain_text.strip()
            record["body"] = plain_text

        # If we have body but not html_body, convert to HTML
        elif body and not html_body:
            # Convert plain text paragraphs to HTML
            paragraphs = body.split("\n\n")
            html_parts = [f"<p>{p.strip()}</p>" for p in paragraphs if p.strip()]
            record["html_body"] = "\n".join(html_parts)

        return record

    def _apply_birthday_consistency(self, record: dict[str, Any]) -> dict[str, Any]:
        """
        Apply birthday field consistency for users.

        Ensures birthday_month, birthday_day, and birthday_year are either:
        - All null (no birthday data), OR
        - All populated with valid values

        If any one field is set, all three will be generated with valid values.
        """
        birthday_month = record.get("birthday_month")
        birthday_day = record.get("birthday_day")
        birthday_year = record.get("birthday_year")

        # Check if at least one birthday field is populated
        has_any_birthday = any(
            field is not None
            for field in [birthday_month, birthday_day, birthday_year]
        )

        if has_any_birthday:
            # Generate missing fields to ensure all three are populated
            if birthday_month is None:
                birthday_month = random.randint(1, 12)
                record["birthday_month"] = birthday_month

            if birthday_year is None:
                # Generate a reasonable birth year (18-80 years old)
                current_year = datetime.now().year
                birthday_year = random.randint(current_year - 80, current_year - 18)
                record["birthday_year"] = birthday_year

            if birthday_day is None:
                # Generate a valid day for the given month and year
                days_in_month = {
                    1: 31, 2: 29 if (birthday_year % 4 == 0 and (birthday_year % 100 != 0 or birthday_year % 400 == 0)) else 28,
                    3: 31, 4: 30, 5: 31, 6: 30, 7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31
                }
                max_day = days_in_month.get(birthday_month, 31)
                birthday_day = random.randint(1, max_day)
                record["birthday_day"] = birthday_day
        else:
            # All are null - ensure they stay null (consistency)
            record["birthday_month"] = None
            record["birthday_day"] = None
            record["birthday_year"] = None

        return record

    def _generate_past_timestamp(self, min_days: int, max_days: int) -> str:
        """Generate a timestamp in the past."""
        days_ago = random.randint(min_days, max_days)
        hours = random.randint(0, 23)
        dt = datetime.utcnow() - timedelta(days=days_ago, hours=hours)
        return dt.isoformat()

    def _generate_future_timestamp(self, min_days: int, max_days: int) -> str:
        """Generate a timestamp in the future."""
        days_ahead = random.randint(min_days, max_days)
        hours = random.randint(0, 23)
        dt = datetime.utcnow() + timedelta(days=days_ahead, hours=hours)
        return dt.isoformat()

    def _generate_timestamp_after(
        self,
        after: str,
        min_hours: int,
        max_hours: int,
    ) -> str:
        """Generate a timestamp after the given timestamp."""
        try:
            base_dt = datetime.fromisoformat(after.replace("Z", "+00:00"))
            hours_later = random.randint(min_hours, max_hours)
            dt = base_dt + timedelta(hours=hours_later)
            if dt > datetime.utcnow():
                dt = datetime.utcnow()
            return dt.isoformat()
        except (ValueError, AttributeError):
            return self._generate_past_timestamp(0, 30)
