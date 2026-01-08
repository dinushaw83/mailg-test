"""
Reference generators for URLs, foreign keys, and IDs.
"""

import uuid
from typing import Any

from .base import BaseGenerator, fake
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

        return fake.url()


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
        field_format = semantics.field_schema.get("format")

        if field_format == "uuid":
            # Generate UUID v4
            return str(uuid.uuid4())

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

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        fk_ref = semantics.foreign_key_ref
        if not fk_ref:
            return self._null_or_placeholder(semantics, context)

        ref_table, ref_column = fk_ref.split(".")
        table_name = semantics.table_name
        field_name = semantics.field_name

        # Handle self-references (like parent_email_id -> emails.id, parent_id -> labels.id)
        if ref_table == table_name:
            # For self-references, only pick from PREVIOUS rows (not current row)
            ids = context.generated_ids.get(ref_table, [])

            # Get current row's ID to exclude it
            # For UUID primary keys, the current ID is already in the current_row
            current_id = context.current_row.get("id")

            # If current_id is not set yet (shouldn't happen but just in case)
            if current_id is None:
                # Try to calculate it for integer IDs
                try:
                    current_id = context.get_start_id(ref_table) + context.row_index - 1
                except:
                    # If calculation fails, assume we can't determine current_id
                    current_id = None

            # Filter out current ID from valid choices
            if current_id is not None:
                valid_ids = [id for id in ids if str(id) != str(current_id)]
            else:
                # If we can't determine current_id, just use all previous IDs
                # Take only IDs generated before this row
                valid_ids = ids[:context.row_index - 1] if context.row_index > 1 else []

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

        # Check for assignment constraints
        constraints = context.config.get("assignment_constraints", {})
        table_constraints = constraints.get(table_name, {})
        field_constraint = table_constraints.get(field_name)

        if field_constraint:
            max_percentage = field_constraint.get("max_percentage", 100)
            filter_by = field_constraint.get("filter")  # e.g., {"role": "agent"}

            value = context.get_constrained_fk_value(
                ref_table=ref_table,
                table_name=table_name,
                field_name=field_name,
                max_percentage=max_percentage,
                filter_by=filter_by,
                nullable=semantics.is_nullable,
                null_probability=null_prob,
            )
            if value is None and not semantics.is_nullable:
                return self._null_or_placeholder(semantics, context)
            return value

        value = context.get_foreign_key_value(
            ref_table,
            nullable=semantics.is_nullable,
            null_probability=null_prob,
        )
        if value is None and not semantics.is_nullable:
            return self._null_or_placeholder(semantics, context)
        return value


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

        # Mailg-specific: users.phone_country_code
        if table_name == "users" and field_name == "phone_country_code":
            country_codes = ["+1", "+44", "+33", "+49", "+81", "+86", "+55", "+61", "+91"]
            weights = [0.6, 0.1, 0.05, 0.05, 0.05, 0.05, 0.05, 0.03, 0.02]
            return context.random().choices(country_codes, weights=weights)[0]

        # Mailg-specific: email_recipients.recipient_name
        if table_name == "email_recipients" and field_name == "recipient_name":
            first_names = context.config.get("samples", {}).get("first_names", ["John", "Jane", "Bob"])
            last_names = context.config.get("samples", {}).get("last_names", ["Doe", "Smith", "Johnson"])
            first = context.random().choice(first_names)
            last = context.random().choice(last_names)
            return f"{first} {last}"

        # Mailg-specific: email_recipients.recipient_email (for external recipients)
        if table_name == "email_recipients" and field_name == "recipient_email":
            # If recipient_id is null, generate external email
            recipient_id = context.get_field_value("recipient_id")
            if recipient_id is None:
                # Generate external email address
                first_names = context.config.get("samples", {}).get("first_names", ["john", "jane"])
                last_names = context.config.get("samples", {}).get("last_names", ["doe", "smith"])
                domains = context.config.get("samples", {}).get("email_domains", ["example.com", "gmail.com"])
                first = context.random().choice(first_names).lower()
                last = context.random().choice(last_names).lower()
                domain = context.random().choice(domains)
                return f"{first}.{last}@{domain}"
            # If recipient_id exists, get email from users table (would need FK resolution)
            # For now, generate a realistic email
            return fake.email()

        # Mailg-specific: saved_searches.query
        if table_name == "saved_searches" and field_name == "query":
            queries = context.config.get("samples", {}).get("search_queries", [
                "from:important@client.com", "subject:urgent", "has:attachment",
                "is:unread", "label:work", "in:inbox"
            ])
            return context.random().choice(queries)

        # Mailg-specific: saved_searches.name
        if table_name == "saved_searches" and field_name == "name":
            names = [
                "Unread Messages", "Important Emails", "Work Emails",
                "Emails with Attachments", "Recent from Client",
                "Urgent Items", "This Week", "Starred Messages"
            ]
            return context.random().choice(names)

        # Mailg-specific: labels.name
        if table_name == "labels" and field_name == "name":
            label_names = context.config.get("samples", {}).get("label_names", [
                "Work", "Personal", "Important", "Projects", "Follow Up",
                "Clients", "Team", "Archive", "Reference", "To Do"
            ])
            return context.random().choice(label_names)

        # Mailg-specific: attachments.filename
        if table_name == "attachments" and field_name == "filename":
            filenames = context.config.get("samples", {}).get("attachments", [])
            if filenames:
                file_info = context.random().choice(filenames)
                return file_info.get("filename", "document.pdf")
            return "document.pdf"

        # Mailg-specific: attachments.storage_path
        if table_name == "attachments" and field_name == "storage_path":
            # Generate a realistic S3-style path
            year = context.random().randint(2023, 2025)
            month = f"{context.random().randint(1, 12):02d}"
            import uuid
            file_id = str(uuid.uuid4())
            return f"attachments/{year}/{month}/{file_id}"

        # Status label for statuses table
        if table_name == "statuses" and field_name == "agent_label":
            labels = [
                "Backlog", "Selected", "To Do", "In Progress",
                "In Review", "Testing", "Done", "Blocked", "Bugs"
            ]
            return context.random().choice(labels)

        # Tag name for tags table
        if table_name == "tags" and field_name == "name":
            return fake.word().lower()

        # If field has enum values in schema, use distribution if configured, otherwise equal weights
        enum_values = semantics.field_schema.get("enum")
        if enum_values:
            equal_weight = 1.0 / len(enum_values)
            default_distribution = [(v, equal_weight) for v in enum_values]
            return context.get_distribution_value(
                semantics.table_name, semantics.field_name,
                default=default_distribution
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

        return fake.word()
