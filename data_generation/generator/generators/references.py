"""
Reference generators for URLs, foreign keys, and IDs.
"""

import uuid
from typing import Any

from .base import BaseGenerator
from ..core.analyzer import FieldSemantics, SemanticType
from ..core.context import GenerationContext
from ..core.registry import generator


@generator(SemanticType.URL, priority=80)
class UrlGenerator(BaseGenerator):
    """Generates URLs."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.2):
            return None

        field_name = semantics.field_name

        if "html" in field_name.lower():
            return f"https://help.example.com/articles/{context.row_index}"
        elif "endpoint" in field_name.lower():
            resources = ["tickets", "users", "organizations", "articles", "groups"]
            resource = context.random().choice(resources)
            resource_id = context.random().randint(1, 10000)
            return f"/api/v1/{resource}/{resource_id}"

        return context.fake().url()


@generator(SemanticType.PHOTO_URL, priority=80)
class PhotoUrlGenerator(BaseGenerator):
    """Generates profile photo URLs."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.4):
            return None

        user_id = context.row_index
        return f"https://api.example.com/avatars/{user_id}.jpg"


@generator(SemanticType.PRIMARY_KEY_INT, priority=100)
class IntegerPrimaryKeyGenerator(BaseGenerator):
    """Generates integer primary keys."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        start_id = context.get_start_id(context.table_name)
        return start_id + context.row_index - 1


@generator(SemanticType.PRIMARY_KEY_STR, priority=100)
class StringPrimaryKeyGenerator(BaseGenerator):
    """Generates string primary keys including UUIDs."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        # Check if this is a UUID field
        if semantics.field_schema.get("format") == "uuid":
            return str(context.fake().uuid4())

        # Fall back to sequential string IDs for non-UUID fields
        start_id = context.get_start_id(context.table_name)
        return str(start_id + context.row_index - 1)


@generator(SemanticType.FOREIGN_KEY, priority=100)
class ForeignKeyGenerator(BaseGenerator):
    """Generates foreign key references."""

    def _null_or_placeholder(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        """Return None for nullable fields, or a valid FK reference for non-nullable."""
        if semantics.is_nullable:
            return None
        # For non-nullable FKs, we must return a valid reference
        # Try to get an existing ID from the referenced table
        fk_ref = semantics.foreign_key_ref
        if fk_ref:
            ref_table = fk_ref.split(".")[0]
            ids = context.generated_ids.get(ref_table, [])
            if ids:
                return context.random().choice(ids)
        # Fallback to None and let validation catch it
        return None

    def _enforce_unique_fk(
        self,
        value: Any,
        semantics: FieldSemantics,
        context: GenerationContext,
        ref_table: str,
    ) -> Any:
        """
        Enforce uniqueness for unique FK fields (e.g., general_settings.user_id).

        Tries to pick an unused ID if the chosen value is already taken.
        Does NOT register the value — that is done by _generate_table_records
        after full-row validation.
        """
        if not semantics.is_unique or value is None:
            return value

        table_name = semantics.table_name
        field_name = semantics.field_name

        if context.is_unique_value_used(table_name, field_name, value):
            # Pick an unused ID
            ids = context.generated_ids.get(ref_table, [])
            unused = [i for i in ids if not context.is_unique_value_used(table_name, field_name, i)]
            if unused:
                value = context.random().choice(unused)
            else:
                # No unused IDs — return the duplicate; row-level check will skip it
                return value

        return value

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        fk_ref = semantics.foreign_key_ref
        if not fk_ref:
            return self._null_or_placeholder(semantics, context)

        ref_table, ref_column = fk_ref.split(".")
        table_name = semantics.table_name
        field_name = semantics.field_name

        # Handle self-references (like linked_problem_id -> tickets.id)
        if ref_table == table_name:
            # For self-references, only pick from PREVIOUS rows (not current row)
            ids = context.generated_ids.get(ref_table, [])

            # Get current row's ID to exclude it
            current_id = context.get_start_id(ref_table) + context.row_index - 1
            valid_ids = [id for id in ids if str(id) != str(current_id)]

            # If non-nullable, we MUST return a valid ID (if any exist)
            if not semantics.is_nullable:
                if valid_ids:
                    return context.random().choice(valid_ids)
                # No valid IDs and non-nullable - this is a schema problem
                # (first row can't reference a previous row that doesn't exist)
                # Return None and let validation catch it
                return None

            # For nullable self-refs, prefer null to avoid circular references
            fk_config = context.config.get("foreign_keys", {})
            self_ref_null_prob = fk_config.get("self_reference_null_probability", 0.7)

            if not valid_ids or context.random().random() < self_ref_null_prob:
                return None
            return context.random().choice(valid_ids)

        # IMPORTANT: Schema nullability takes precedence over config
        # If schema says nullable: false, null_prob must be 0
        if not semantics.is_nullable:
            null_prob = 0.0
        else:
            # Get null probability from config or use default
            fk_config = context.config.get("foreign_keys", {})
            default_null_prob = fk_config.get("optional_null_probability", 0.2)
            null_prob = default_null_prob

            # Check for field-specific null probability override (only for nullable fields)
            null_probs = context.config.get("null_probabilities", {})
            table_null_probs = null_probs.get(table_name, {})
            if field_name in table_null_probs:
                null_prob = table_null_probs[field_name]

        # Check for contextual FK constraints
        # These require the FK to reference a row that shares a value with the current row
        # e.g., ticket.board_id must reference a board where board.project_id == ticket.project_id
        contextual_fks = context.config.get("contextual_foreign_keys", {})
        table_contextual = contextual_fks.get(table_name, {})
        field_contextual = table_contextual.get(field_name)

        if field_contextual:
            must_match = field_contextual.get("must_match", {})
            source_field = must_match.get("source_field")  # Field in current row
            target_field = must_match.get("target_field")  # Field in referenced table

            if source_field and target_field:
                value = context.get_contextual_fk_value(
                    ref_table=ref_table,
                    context_field=source_field,
                    target_field=target_field,
                    nullable=semantics.is_nullable,
                    null_probability=null_prob,
                )
                if value is None and not semantics.is_nullable:
                    return self._null_or_placeholder(semantics, context)
                return self._enforce_unique_fk(value, semantics, context, ref_table)

        # Check for foreign key filters (e.g., exclude deleted labels)
        fk_filters = context.config.get("foreign_key_filters", {})
        table_fk_filters = fk_filters.get(table_name, {})
        field_filter = table_fk_filters.get(field_name)

        # Check for assignment constraints
        constraints = context.config.get("assignment_constraints", {})
        table_constraints = constraints.get(table_name, {})
        field_constraint = table_constraints.get(field_name)

        if field_constraint:
            max_percentage = field_constraint.get("max_percentage", 100)
            # Merge filter from constraint and foreign_key_filters
            filter_by = field_constraint.get("filter", {})
            if field_filter:
                filter_by = {**filter_by, **field_filter}

            value = context.get_constrained_fk_value(
                ref_table=ref_table,
                table_name=table_name,
                field_name=field_name,
                max_percentage=max_percentage,
                filter_by=filter_by if filter_by else None,
                nullable=semantics.is_nullable,
                null_probability=null_prob,
            )
            if value is None and not semantics.is_nullable:
                return self._null_or_placeholder(semantics, context)
            return self._enforce_unique_fk(value, semantics, context, ref_table)

        # Apply FK filter without assignment constraints
        if field_filter:
            value = context.get_constrained_fk_value(
                ref_table=ref_table,
                table_name=table_name,
                field_name=field_name,
                max_percentage=100,  # No percentage limit
                filter_by=field_filter,
                nullable=semantics.is_nullable,
                null_probability=null_prob,
            )
            if value is None and not semantics.is_nullable:
                return self._null_or_placeholder(semantics, context)
            return self._enforce_unique_fk(value, semantics, context, ref_table)

        value = context.get_foreign_key_value(
            ref_table,
            nullable=semantics.is_nullable,
            null_probability=null_prob,
        )
        if value is None and not semantics.is_nullable:
            return self._null_or_placeholder(semantics, context)
        return self._enforce_unique_fk(value, semantics, context, ref_table)


@generator(SemanticType.AUDIT_ID, priority=80)
class AuditIdGenerator(BaseGenerator):
    """Generates audit trail IDs."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.3):
            return None
        return context.random().randint(100000, 999999)


@generator(SemanticType.GENERIC_INT, priority=20)
class GenericIntGenerator(BaseGenerator):
    """Fallback generator for integer fields."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.2):
            return None

        field_name = semantics.field_name

        if "count" in field_name.lower():
            return context.random().randint(0, 100)
        elif "_id" in field_name:
            return context.random().randint(1, 10000)
        else:
            return context.random().randint(0, 1000)


@generator(SemanticType.GENERIC_STRING, priority=10)
class GenericStringGenerator(BaseGenerator):
    """Fallback generator for string fields."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.2):
            return None

        field_name = semantics.field_name
        table_name = semantics.table_name

        # Status label for statuses table
        if table_name == "statuses" and field_name == "agent_label":
            labels = [
                "Backlog", "Selected", "To Do", "In Progress",
                "In Review", "Testing", "Done", "Blocked", "Bugs"
            ]
            return context.random().choice(labels)

        # Tag name for tags table
        if table_name == "tags" and field_name == "name":
            return context.fake().word().lower()

        # If field has enum values in schema, use distribution if configured, otherwise equal weights
        enum_values = semantics.field_schema.get("enum")
        if enum_values:
            equal_weight = 1.0 / len(enum_values)
            default_distribution = [(v, equal_weight) for v in enum_values]
            return context.get_distribution_value(
                semantics.table_name, semantics.field_name,
                default=default_distribution
            )

        # Check config enums (master list of valid values)
        config_enum_values = context.get_enum_values(table_name, field_name)
        if config_enum_values:
            return context.get_distribution_value(
                table_name, field_name,
            )

        # Custom status ID - respect schema nullability
        if field_name == "custom_status_id":
            # If not nullable, always generate a value
            if not semantics.is_nullable:
                return str(context.random().randint(1000, 9999))
            # Nullable - 30% chance of having a value
            if context.random().random() < 0.3:
                return str(context.random().randint(1000, 9999))
            return None

        # Generate value, ensuring uniqueness if required
        value = context.fake().word()

        if semantics.is_unique:
            # Ensure uniqueness by appending suffix if needed
            max_attempts = 100
            base_value = value
            attempt = 0
            while context.is_unique_value_used(table_name, field_name, value):
                attempt += 1
                if attempt >= max_attempts:
                    # Fallback to UUID-like suffix
                    value = f"{base_value}_{context.row_index}"
                    break
                value = f"{base_value}_{attempt}"
            context.register_unique_value(table_name, field_name, value)

        return value
