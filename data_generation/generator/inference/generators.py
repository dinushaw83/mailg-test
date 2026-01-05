"""
Inference-aware generators.

Provides generators that use inferred rules for contextual data generation.
"""

from typing import Any
import random

from .rules import (
    FieldRule,
    RuleType,
    GenerationStrategy,
    InferredRules,
)
from .domain import SEMANTIC_FIELD_PATTERNS


class InferenceAwareGenerator:
    """
    Generator that uses inferred rules for field generation.

    Works alongside the existing generator registry to provide
    inference-based generation when rules are available.
    """

    def __init__(self, inferred_rules: InferredRules):
        """
        Initialize with inferred rules.

        Args:
            inferred_rules: Rules inferred from schema analysis.
        """
        self.rules = inferred_rules
        self._random = random.Random()

    def set_seed(self, seed: int) -> None:
        """Set random seed for reproducibility."""
        self._random = random.Random(seed)

    def should_be_null(
        self,
        table_name: str,
        field_name: str,
        context: dict[str, Any],
    ) -> bool:
        """
        Check if a field should be null based on inferred rules.

        Args:
            table_name: Name of the table.
            field_name: Name of the field.
            context: Current row context with already-generated values.

        Returns:
            True if field should be null.
        """
        field_rules = self.rules.get_field_rules(table_name, field_name)

        for rule in field_rules:
            if rule.rule_type == RuleType.CONDITIONAL_NULL:
                if rule.depends_on and rule.depends_on in context:
                    current_value = context[rule.depends_on]
                    if current_value in rule.condition_values:
                        return True

        return False

    def must_have_value(
        self,
        table_name: str,
        field_name: str,
        context: dict[str, Any],
    ) -> bool:
        """
        Check if a field must have a value based on inferred rules.

        Args:
            table_name: Name of the table.
            field_name: Name of the field.
            context: Current row context with already-generated values.

        Returns:
            True if field must have a non-null value.
        """
        field_rules = self.rules.get_field_rules(table_name, field_name)

        for rule in field_rules:
            if rule.rule_type == RuleType.CONDITIONAL_REQUIRED:
                if rule.depends_on and rule.depends_on in context:
                    current_value = context[rule.depends_on]
                    if current_value in rule.condition_values:
                        return True

        return False

    def generate_value(
        self,
        table_name: str,
        field_name: str,
        context: dict[str, Any],
        field_schema: dict[str, Any] | None = None,
    ) -> tuple[Any, bool]:
        """
        Generate a value using inferred rules.

        Args:
            table_name: Name of the table.
            field_name: Name of the field.
            context: Current row context with already-generated values.
            field_schema: Optional field schema for additional context.

        Returns:
            Tuple of (generated_value, was_generated).
            was_generated is False if no rule applied.
        """
        field_rules = self.rules.get_field_rules(table_name, field_name)

        for rule in field_rules:
            if rule.strategy:
                value = self._apply_strategy(rule, context)
                if value is not None:
                    return value, True

        return None, False

    def _apply_strategy(
        self,
        rule: FieldRule,
        context: dict[str, Any],
    ) -> Any:
        """Apply a generation strategy."""
        strategy = rule.strategy
        params = rule.parameters

        if strategy == GenerationStrategy.DERIVED_ID:
            return self._generate_derived_id(rule, context, params)

        elif strategy == GenerationStrategy.API_PATH:
            return self._generate_api_path(rule, context, params)

        elif strategy == GenerationStrategy.CONTEXTUAL_MESSAGE:
            return self._generate_contextual_message(rule, context, params)

        elif strategy == GenerationStrategy.HTTP_STATUS:
            return self._generate_http_status(rule, context, params)

        elif strategy == GenerationStrategy.TIMESTAMP_AFTER:
            return self._generate_timestamp_after(rule, context, params)

        return None

    def _generate_derived_id(
        self,
        rule: FieldRule,
        context: dict[str, Any],
        params: dict[str, Any],
    ) -> Any:
        """Generate an ID derived from another field."""
        format_type = params.get("format", "numeric_string")
        min_val = params.get("min", 1)
        max_val = params.get("max", 10000)

        if format_type == "numeric_string":
            return str(self._random.randint(min_val, max_val))
        elif format_type == "numeric":
            return self._random.randint(min_val, max_val)
        else:
            return str(self._random.randint(min_val, max_val))

    def _generate_api_path(
        self,
        rule: FieldRule,
        context: dict[str, Any],
        params: dict[str, Any],
    ) -> str:
        """Generate an API endpoint path."""
        resource_field = params.get("resource_field")
        resource_id_field = params.get("resource_id_field")
        path_template = params.get("path_template", "/api/v1/{resource}s/{resource_id}")
        list_template = params.get("list_template", "/api/v1/{resource}s")

        resource = context.get(resource_field, "resource")
        resource_id = context.get(resource_id_field)

        # Pluralize resource name (simple)
        resource_plural = resource + "s" if not resource.endswith("s") else resource

        # Handle different scenarios
        operation = context.get("operation", "READ")

        if operation in ("CREATE", "LIST") or not resource_id:
            # List/create endpoints don't have ID
            return f"/api/v1/{resource_plural}"
        else:
            # Detail endpoints have ID
            return f"/api/v1/{resource_plural}/{resource_id}"

    def _generate_contextual_message(
        self,
        rule: FieldRule,
        context: dict[str, Any],
        params: dict[str, Any],
    ) -> str | None:
        """Generate a contextual message."""
        message_type = params.get("message_type", "generic")
        templates = params.get("templates", [])

        if templates:
            return self._random.choice(templates)

        # Default templates by type
        default_templates = {
            "error": [
                "Internal server error",
                "Resource not found",
                "Unauthorized access",
                "Validation failed: invalid input",
                "Request timeout",
                "Database connection failed",
                "Rate limit exceeded",
                "Service temporarily unavailable",
            ],
            "approval_response": [
                "Approved as requested",
                "Request approved",
                "Approved with conditions",
            ],
            "denial_response": [
                "Request denied: insufficient justification",
                "Not authorized for this action",
                "Budget constraints prevent approval",
                "Additional information required",
                "Request does not meet policy requirements",
            ],
            "generic": [
                "Operation completed successfully",
                "Request processed",
                "Action completed",
            ],
        }

        type_templates = default_templates.get(message_type, default_templates["generic"])
        return self._random.choice(type_templates)

    def _generate_http_status(
        self,
        rule: FieldRule,
        context: dict[str, Any],
        params: dict[str, Any],
    ) -> int:
        """Generate an HTTP status code consistent with context."""
        level = context.get(rule.depends_on, "INFO")

        success_codes = params.get("success_codes", [200, 201, 204])
        error_codes = params.get("error_codes", [400, 401, 403, 404, 500])

        if level in SEMANTIC_FIELD_PATTERNS.get("error_log_levels", ["ERROR"]):
            return self._random.choice(error_codes)
        else:
            return self._random.choice(success_codes)

    def _generate_timestamp_after(
        self,
        rule: FieldRule,
        context: dict[str, Any],
        params: dict[str, Any],
    ) -> str | None:
        """Generate a timestamp after another timestamp."""
        from datetime import datetime, timedelta

        after_field = params.get("after_field", "created_at")
        min_hours = params.get("min_hours", 1)
        max_hours = params.get("max_hours", 48)

        base_timestamp = context.get(after_field)

        if base_timestamp:
            try:
                if isinstance(base_timestamp, str):
                    base_dt = datetime.fromisoformat(base_timestamp.replace("Z", "+00:00"))
                else:
                    base_dt = base_timestamp

                hours_later = self._random.randint(min_hours, max_hours)
                result_dt = base_dt + timedelta(hours=hours_later)

                # Don't generate future timestamps
                now = datetime.utcnow()
                if result_dt > now:
                    result_dt = now

                return result_dt.isoformat()
            except (ValueError, AttributeError):
                pass

        # Fallback: generate a past timestamp
        from datetime import datetime, timedelta
        days_ago = self._random.randint(1, 30)
        result_dt = datetime.utcnow() - timedelta(days=days_ago)
        return result_dt.isoformat()

    def get_generation_order(self, table_name: str) -> list[str]:
        """
        Get the recommended field generation order for a table.

        Args:
            table_name: Name of the table.

        Returns:
            List of field names that should be generated first.
        """
        table_rules = self.rules.get_table_rules(table_name)
        if table_rules:
            return table_rules.generation_order
        return []

    def apply_consistency_rules(
        self,
        table_name: str,
        record: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Apply inferred consistency rules to a record.

        Args:
            table_name: Name of the table.
            record: Generated record.

        Returns:
            Record with consistency rules applied.
        """
        consistency_rules = self.rules.get_consistency_rules(table_name)

        for rule in consistency_rules:
            condition_value = record.get(rule.condition_field)

            if condition_value in rule.condition_values:
                for field, value in rule.set_fields.items():
                    if value is None:
                        record[field] = None
                    elif isinstance(value, str) and value.startswith("{") and value.endswith("}"):
                        # JSON string - leave as is
                        record[field] = value
                    else:
                        record[field] = value

        return record
