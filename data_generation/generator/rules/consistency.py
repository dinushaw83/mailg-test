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

        # Apply body consistency for conversations (non-configurable)
        if table_name == "conversations":
            record = self._apply_body_consistency(record)

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
        Apply body field consistency for conversations.

        This ensures html_body and plain_body are set if body exists.
        """
        body = record.get("body")
        html_body = record.get("html_body")
        plain_body = record.get("plain_body")

        # If we have body but not html_body, create simple HTML
        if body and not html_body:
            record["html_body"] = f"<p>{body}</p>"

        # If we have body but not plain_body, use body
        if body and not plain_body:
            record["plain_body"] = body

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
