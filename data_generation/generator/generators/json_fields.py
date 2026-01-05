"""
JSON field generators for arrays and objects.

Note: Generators return Python objects (dict/list), NOT JSON strings.
Serialization is handled by the output writer based on format.
"""

from typing import Any

from .base import BaseGenerator, fake
from ..core.analyzer import FieldSemantics, SemanticType
from ..core.context import GenerationContext
from ..core.registry import generator


@generator(SemanticType.TAGS_ARRAY, priority=80)
class TagsArrayGenerator(BaseGenerator):
    """Generates JSON array of tags."""

    DEFAULT_TAGS = [
        "urgent", "billing", "technical", "feature_request",
        "bug", "question", "feedback", "vip", "escalated",
        "needs_follow_up", "resolved", "pending_customer",
        "documentation", "training", "onboarding", "renewal",
    ]

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.3):
            return None

        # Get tags from config or use defaults
        sample_tags = context.config.get("samples", {}).get("tags", self.DEFAULT_TAGS)

        num_tags = context.random().randint(0, 4)
        if num_tags == 0:
            # Check if schema expects string or array
            schema_type = semantics.field_schema.get("type", "array")
            return "" if schema_type == "string" else []

        tags = context.random().sample(sample_tags, min(num_tags, len(sample_tags)))

        # Check if schema expects string (comma-separated) or array
        schema_type = semantics.field_schema.get("type", "array")
        if schema_type == "string":
            return ",".join(tags)
        return tags


@generator(SemanticType.DOMAINS_ARRAY, priority=80)
class DomainsArrayGenerator(BaseGenerator):
    """Generates JSON array of domain names."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.2):
            return None

        num_domains = context.random().randint(1, 3)
        domains = [fake.domain_name() for _ in range(num_domains)]
        return domains


@generator(SemanticType.ATTACHMENTS, priority=80)
class AttachmentsGenerator(BaseGenerator):
    """Generates JSON array of attachment objects."""

    DEFAULT_FILE_TYPES = [
        {"filename": "screenshot.png", "content_type": "image/png", "size": 150000},
        {"filename": "document.pdf", "content_type": "application/pdf", "size": 500000},
        {"filename": "log.txt", "content_type": "text/plain", "size": 25000},
        {"filename": "data.csv", "content_type": "text/csv", "size": 75000},
        {"filename": "report.xlsx", "content_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "size": 200000},
    ]

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.7):
            return None

        # 70% have no attachments
        if context.random().random() < 0.7:
            return []

        # Get attachment types from config or use defaults
        file_types = context.config.get("samples", {}).get("attachments", self.DEFAULT_FILE_TYPES)

        num_attachments = context.random().randint(1, 3)
        attachments = []

        for i in range(num_attachments):
            file_info = context.random().choice(file_types)
            attachments.append({
                "id": context.random().randint(10000, 99999),
                "file_name": file_info.get("filename", "file.bin"),
                "content_type": file_info.get("content_type", "application/octet-stream"),
                "size": file_info.get("size", 50000) + context.random().randint(-10000, 10000),
                "url": f"https://storage.example.com/attachments/{fake.uuid4()}",
            })

        return attachments


@generator(SemanticType.SEARCH_PARAMS, priority=80)
class SearchParamsGenerator(BaseGenerator):
    """Generates JSON search parameters."""

    DEFAULT_QUERIES = {
        "tickets": ["status:in-progress", "priority:high", "assignee:me", "created>7days", "tag:urgent", "*"],
        "users": ["role:member", "role:admin", "suspended:false", "*"],
        "organizations": ["*"],
    }

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        search_type = context.get_field_value("search_type") or "tickets"

        # Get search queries from config or use defaults
        search_queries = context.config.get("samples", {}).get("search_queries", self.DEFAULT_QUERIES)

        params: dict[str, Any] = {}

        if search_type == "tickets":
            queries = search_queries.get("tickets", self.DEFAULT_QUERIES["tickets"])
            params = {
                "query": context.random().choice(queries),
                "sort_by": context.random().choice(["created_at", "updated_at", "priority"]),
                "sort_order": context.random().choice(["asc", "desc"]),
            }
        elif search_type == "users":
            queries = search_queries.get("users", self.DEFAULT_QUERIES["users"])
            params = {
                "query": context.random().choice(queries),
                "sort_by": "name",
            }
        elif search_type == "organizations":
            queries = search_queries.get("organizations", self.DEFAULT_QUERIES["organizations"])
            params = {
                "query": context.random().choice(queries),
                "sort_by": "name",
            }
        else:
            params = {"query": "*"}

        return params


@generator(SemanticType.METADATA, priority=80)
class MetadataGenerator(BaseGenerator):
    """Generates JSON metadata objects."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.4):
            return None

        table = semantics.table_name

        if table == "side_conversations":
            return {
                "participants": [fake.email() for _ in range(context.random().randint(1, 3))],
                "external_ids": {},
            }

        return {}


@generator(SemanticType.VIA_SOURCE, priority=80)
class ViaSourceGenerator(BaseGenerator):
    """Generates via_source JSON object."""

    DEFAULT_SUPPORT_EMAIL = "support@example.com"
    DEFAULT_SUPPORT_NAME = "Support Team"

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.3):
            return None

        channel = context.get_field_value("via_channel") or "web"

        # Get support email from config or use default
        support_email = context.config.get("samples", {}).get("support_email", self.DEFAULT_SUPPORT_EMAIL)
        support_name = context.config.get("samples", {}).get("support_name", self.DEFAULT_SUPPORT_NAME)

        if channel == "email":
            return {
                "from": {
                    "address": fake.email(),
                    "name": fake.name(),
                },
                "to": {
                    "address": support_email,
                    "name": support_name,
                },
            }
        elif channel == "api":
            return {
                "rel": "api",
                "client_id": fake.uuid4()[:8],
            }
        else:
            return {
                "rel": channel,
            }


@generator(SemanticType.USER_FIELDS, priority=80)
class UserFieldsGenerator(BaseGenerator):
    """Generates custom user fields JSON."""

    DEFAULT_DEPARTMENTS = ["Engineering", "Sales", "Marketing", "Support", "HR", "Finance"]

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.5):
            return None

        # 50% empty
        if context.random().random() < 0.5:
            return {}

        # Get departments from config or use defaults
        departments = context.config.get("samples", {}).get("departments", self.DEFAULT_DEPARTMENTS)

        fields = {}
        if context.random().random() < 0.3:
            fields["department"] = context.random().choice(departments)
        if context.random().random() < 0.2:
            fields["employee_id"] = f"EMP{context.random().randint(1000, 9999)}"
        if context.random().random() < 0.2:
            fields["location"] = fake.city()

        return fields


@generator(SemanticType.JSON_OBJECT, priority=20)
class GenericJsonObjectGenerator(BaseGenerator):
    """Fallback generator for JSON objects."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.3):
            return None

        field_name = semantics.field_name
        table_name = semantics.table_name

        # Mailg-specific: saved_searches.filters
        if table_name == "saved_searches" and field_name == "filters":
            filter_types = [
                {"has_attachment": True},
                {"is_unread": True},
                {"is_starred": True},
                {"date_range": "last_7_days"},
                {"date_range": "last_30_days"},
                {"from_domain": context.random().choice(["gmail.com", "company.com", "example.com"])},
                {"category": context.random().choice(["primary", "social", "promotions"])},
            ]
            return context.random().choice(filter_types)

        # Original logic
        if "request_data" in field_name:
            return {"action": "update", "fields": ["status"]}
        elif "response_data" in field_name:
            return {"success": True}

        return {}


@generator(SemanticType.JSON_ARRAY, priority=20)
class GenericJsonArrayGenerator(BaseGenerator):
    """Fallback generator for JSON arrays."""

    def generate(self, semantics: FieldSemantics, context: GenerationContext) -> Any:
        if self.maybe_null(semantics, context, 0.3):
            return None

        field_name = semantics.field_name
        table_name = semantics.table_name

        # Mailg-specific: users.significant_dates
        if table_name == "users" and field_name == "significant_dates":
            if context.random().random() < 0.8:  # 80% empty
                return []

            date_labels = ["Anniversary", "Birthday", "Work Anniversary", "Important Date"]
            num_dates = context.random().randint(1, 3)
            dates = []
            for _ in range(num_dates):
                dates.append({
                    "date": fake.date_between(start_date="-10y", end_date="today").strftime("%Y-%m-%d"),
                    "label": context.random().choice(date_labels)
                })
            return dates

        # Mailg-specific: users.related_persons
        if table_name == "users" and field_name == "related_persons":
            if context.random().random() < 0.7:  # 70% empty
                return []

            relationships = ["Spouse", "Partner", "Child", "Parent", "Sibling", "Friend", "Colleague", "Manager", "Assistant"]
            num_persons = context.random().randint(1, 2)
            persons = []
            for _ in range(num_persons):
                persons.append({
                    "name": fake.name(),
                    "relationship": context.random().choice(relationships)
                })
            return persons

        # Mailg-specific: users.labels
        if table_name == "users" and field_name == "labels":
            if context.random().random() < 0.5:  # 50% empty
                return []

            user_labels = ["VIP", "Client", "Partner", "Vendor", "Team Member", "Family", "Friend"]
            num_labels = context.random().randint(1, 3)
            return context.random().sample(user_labels, min(num_labels, len(user_labels)))

        # Mailg-specific: users.custom_fields
        if table_name == "users" and field_name == "custom_fields":
            if context.random().random() < 0.8:  # 80% empty
                return []

            field_names = ["Department", "Location", "Employee ID", "Cost Center", "Manager", "Team"]
            field_values = {
                "Department": ["Engineering", "Sales", "Marketing", "Support", "HR", "Finance"],
                "Location": ["New York", "San Francisco", "London", "Remote"],
                "Employee ID": [f"EMP{context.random().randint(1000, 9999)}"],
                "Cost Center": [f"CC-{context.random().randint(100, 999)}"],
                "Manager": [fake.name()],
                "Team": ["Product", "Infrastructure", "Frontend", "Backend", "QA"]
            }

            num_fields = context.random().randint(1, 3)
            selected_fields = context.random().sample(field_names, min(num_fields, len(field_names)))
            custom_fields = []
            for field_name_item in selected_fields:
                custom_fields.append({
                    "field_name": field_name_item,
                    "value": context.random().choice(field_values.get(field_name_item, ["Unknown"]))
                })
            return custom_fields

        return []
