"""
Semantic field analyzer.

Parses field names, types, and descriptions to determine the semantic
meaning of each field for appropriate data generation.
"""

import re
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Any


class SemanticType(Enum):
    """High-level semantic categories for fields."""
    # Identity
    PERSON_NAME = auto()
    FIRST_NAME = auto()
    LAST_NAME = auto()
    COMPANY_NAME = auto()
    GROUP_NAME = auto()
    EMAIL = auto()
    PHONE = auto()
    PHONE_LABEL = auto()
    EMAIL_LABEL = auto()
    USERNAME = auto()
    EXTERNAL_ID = auto()
    JOB_TITLE = auto()
    WEBSITE = auto()
    ADDRESS = auto()
    BIRTHDAY_YEAR = auto()
    BIRTHDAY_MONTH = auto()
    BIRTHDAY_DAY = auto()

    # Content
    SUBJECT = auto()
    BODY = auto()
    BODY_HTML = auto()
    BODY_PLAIN = auto()
    DESCRIPTION = auto()
    MESSAGE = auto()
    TITLE = auto()
    NOTE = auto()
    SIGNATURE = auto()

    # Temporal
    CREATED_AT = auto()
    UPDATED_AT = auto()
    DELETED_AT = auto()
    TIMESTAMP = auto()

    # Location/Locale
    TIMEZONE = auto()
    TIMEZONE_OFFSET = auto()
    LOCALE = auto()
    IP_ADDRESS = auto()

    # URLs and References
    URL = auto()
    PHOTO_URL = auto()

    # Visual/Display
    COLOR = auto()

    # Enums
    ROLE = auto()
    STATUS = auto()
    PRIORITY = auto()
    TICKET_TYPE = auto()
    TAG_TYPE = auto()
    LEVEL = auto()
    OPERATION = auto()
    HTTP_METHOD = auto()
    RESOURCE_TYPE = auto()
    CHANNEL = auto()
    STATUS_CATEGORY = auto()
    SEARCH_TYPE = auto()
    APPROVAL_STATUS = auto()
    CONVERSATION_TYPE = auto()
    SIDE_CONV_TYPE = auto()

    # Boolean Flags
    BOOL_ACTIVE = auto()
    BOOL_DELETED = auto()
    BOOL_SUSPENDED = auto()
    BOOL_VERIFIED = auto()
    BOOL_PUBLIC = auto()
    BOOL_DEFAULT = auto()
    BOOL_SPAM = auto()
    BOOL_GENERIC = auto()

    # Numeric
    STATUS_CODE = auto()
    DURATION = auto()
    LOCALE_ID = auto()
    ROLE_TYPE = auto()
    AUDIT_ID = auto()
    COUNT = auto()

    # JSON/Complex
    JSON_ARRAY = auto()
    JSON_OBJECT = auto()
    TAGS_ARRAY = auto()
    DOMAINS_ARRAY = auto()
    ATTACHMENTS = auto()
    SEARCH_PARAMS = auto()
    METADATA = auto()
    VIA_SOURCE = auto()
    USER_FIELDS = auto()

    # Keys
    PRIMARY_KEY_INT = auto()
    PRIMARY_KEY_STR = auto()
    FOREIGN_KEY = auto()

    # Fallback
    GENERIC_STRING = auto()
    GENERIC_INT = auto()
    GENERIC_BOOL = auto()
    UNKNOWN = auto()


@dataclass
class FieldSemantics:
    """Analyzed semantics of a field."""
    semantic_type: SemanticType
    confidence: float  # 0.0 to 1.0
    field_name: str
    table_name: str
    field_schema: dict[str, Any]

    # Extracted metadata
    is_nullable: bool = True
    is_required: bool = False
    is_primary_key: bool = False
    is_foreign_key: bool = False
    foreign_key_ref: str | None = None
    default_value: Any = None
    enum_values: list[str] = field(default_factory=list)

    # Related field hints (for consistency rules)
    related_fields: list[str] = field(default_factory=list)


class FieldAnalyzer:
    """
    Analyzes field schema to determine semantic meaning.

    Uses field name patterns, description keywords, and type information
    to infer the appropriate generator for each field.
    """

    # Patterns for field name analysis (compiled regexes)
    NAME_PATTERNS: dict[SemanticType, list[re.Pattern]] = {
        # Identity patterns
        SemanticType.FIRST_NAME: [re.compile(r'^first_name$', re.I)],
        SemanticType.LAST_NAME: [re.compile(r'^last_name$', re.I)],
        SemanticType.EMAIL: [re.compile(r'^e?-?mail$', re.I)],
        SemanticType.PHONE: [re.compile(r'^phone$', re.I)],
        SemanticType.PHONE_LABEL: [re.compile(r'^phone_label$', re.I)],
        SemanticType.EMAIL_LABEL: [re.compile(r'^email_label$', re.I)],
        SemanticType.LOCALE: [re.compile(r'^phone_country_code$', re.I)],
        SemanticType.EXTERNAL_ID: [re.compile(r'^external_id$', re.I)],
        SemanticType.USERNAME: [re.compile(r'^(user_?name|alias|login)$', re.I)],
        SemanticType.COMPANY_NAME: [re.compile(r'^company$', re.I)],
        SemanticType.JOB_TITLE: [re.compile(r'^job_title$', re.I)],
        SemanticType.WEBSITE: [re.compile(r'^website$', re.I)],
        SemanticType.ADDRESS: [re.compile(r'^address$', re.I)],
        SemanticType.BIRTHDAY_YEAR: [re.compile(r'^birthday_year$', re.I)],
        SemanticType.BIRTHDAY_MONTH: [re.compile(r'^birthday_month$', re.I)],
        SemanticType.BIRTHDAY_DAY: [re.compile(r'^birthday_day$', re.I)],

        # Content patterns
        SemanticType.SUBJECT: [re.compile(r'^subject$', re.I)],
        SemanticType.TITLE: [re.compile(r'^title$', re.I)],
        SemanticType.BODY_HTML: [re.compile(r'^html_body$', re.I)],
        SemanticType.BODY_PLAIN: [re.compile(r'^plain_body$', re.I)],
        SemanticType.BODY: [re.compile(r'^body$', re.I)],
        SemanticType.DESCRIPTION: [re.compile(r'^description$', re.I)],
        SemanticType.MESSAGE: [re.compile(r'message$', re.I)],
        SemanticType.NOTE: [re.compile(r'^notes?$', re.I)],
        SemanticType.SIGNATURE: [re.compile(r'^signature$', re.I)],

        # Temporal patterns
        SemanticType.CREATED_AT: [re.compile(r'^created_at$', re.I)],
        SemanticType.UPDATED_AT: [re.compile(r'^(updated_at|last_updated)$', re.I)],
        SemanticType.DELETED_AT: [re.compile(r'^deleted_at$', re.I)],
        SemanticType.TIMESTAMP: [re.compile(r'^timestamp$|_at$', re.I)],

        # Locale patterns
        SemanticType.TIMEZONE: [re.compile(r'^timezone$', re.I)],
        SemanticType.TIMEZONE_OFFSET: [re.compile(r'^timezone_offset$', re.I)],
        SemanticType.LOCALE: [re.compile(r'^locale$', re.I)],
        SemanticType.LOCALE_ID: [re.compile(r'^locale_id$', re.I)],
        SemanticType.IP_ADDRESS: [re.compile(r'ip_address', re.I)],

        # URL patterns
        SemanticType.PHOTO_URL: [re.compile(r'^photo$|avatar|image_url', re.I)],
        SemanticType.URL: [re.compile(r'_url$|^url$|^href$|^link$', re.I)],

        # Visual patterns
        SemanticType.COLOR: [re.compile(r'^color$|^colour$|_color$|_colour$', re.I)],

        # Enum patterns
        SemanticType.PRIORITY: [re.compile(r'^priority$', re.I)],
        SemanticType.LEVEL: [re.compile(r'^level$', re.I)],
        SemanticType.OPERATION: [re.compile(r'^operation$', re.I)],
        SemanticType.HTTP_METHOD: [re.compile(r'^method$', re.I)],
        SemanticType.RESOURCE_TYPE: [re.compile(r'^resource$', re.I)],
        SemanticType.CHANNEL: [re.compile(r'^via_channel$', re.I)],
        SemanticType.STATUS_CATEGORY: [re.compile(r'^status_category$', re.I)],
        SemanticType.SEARCH_TYPE: [re.compile(r'^search_type$', re.I)],

        # Boolean patterns
        SemanticType.BOOL_ACTIVE: [re.compile(r'^(is_)?active$', re.I)],
        SemanticType.BOOL_DELETED: [re.compile(r'^is_deleted$', re.I)],
        SemanticType.BOOL_SUSPENDED: [re.compile(r'^suspended$', re.I)],
        SemanticType.BOOL_VERIFIED: [re.compile(r'^verified$', re.I)],
        SemanticType.BOOL_PUBLIC: [re.compile(r'^(is_)?public', re.I)],
        SemanticType.BOOL_DEFAULT: [re.compile(r'^is_default$', re.I)],
        SemanticType.BOOL_SPAM: [re.compile(r'^is_spam$', re.I)],

        # Numeric patterns
        SemanticType.STATUS_CODE: [re.compile(r'^status_code$', re.I)],
        SemanticType.DURATION: [re.compile(r'duration|_ms$', re.I)],
        SemanticType.AUDIT_ID: [re.compile(r'^audit_id$', re.I)],
        SemanticType.ROLE_TYPE: [re.compile(r'^role_type$', re.I)],

        # JSON patterns
        SemanticType.TAGS_ARRAY: [re.compile(r'^tags$', re.I)],
        SemanticType.DOMAINS_ARRAY: [re.compile(r'^domains$', re.I)],
        SemanticType.ATTACHMENTS: [re.compile(r'^attachments$', re.I)],
        SemanticType.SEARCH_PARAMS: [re.compile(r'^search_params$', re.I)],
        SemanticType.METADATA: [re.compile(r'^metadata$', re.I)],
        SemanticType.VIA_SOURCE: [re.compile(r'^via_source$', re.I)],
        SemanticType.USER_FIELDS: [re.compile(r'^user_fields$', re.I)],
    }

    # Description keywords for semantic inference
    DESCRIPTION_KEYWORDS: dict[SemanticType, list[str]] = {
        SemanticType.PERSON_NAME: ["user's full name", "user name", "author name"],
        SemanticType.COMPANY_NAME: ["organization name", "company", "brand name"],
        SemanticType.GROUP_NAME: ["group name", "team name"],
        SemanticType.EMAIL: ["email address", "e-mail"],
        SemanticType.PHONE: ["phone number", "telephone"],
        SemanticType.URL: ["url", "link", "href"],
        SemanticType.FOREIGN_KEY: ["foreign key"],
        SemanticType.PRIMARY_KEY_INT: ["primary key"],
    }

    # Table context for name field disambiguation
    TABLE_NAME_SEMANTICS: dict[str, SemanticType] = {
        "users": SemanticType.PERSON_NAME,
        "organizations": SemanticType.COMPANY_NAME,
        "brands": SemanticType.COMPANY_NAME,
        "groups": SemanticType.GROUP_NAME,
        "tags": SemanticType.GENERIC_STRING,  # tag name
        "statuses": SemanticType.GENERIC_STRING,  # status label
    }

    def analyze(
        self,
        field_name: str,
        field_schema: dict[str, Any],
        table_name: str,
    ) -> FieldSemantics:
        """
        Analyze a field and determine its semantic type.

        Args:
            field_name: Name of the field.
            field_schema: Schema definition for the field.
            table_name: Name of the containing table.

        Returns:
            FieldSemantics with analyzed information.
        """
        # Extract basic schema info
        field_type = field_schema.get("type", "string")
        description = field_schema.get("description", "").lower()
        is_pk = field_schema.get("primaryKey", False)
        fk_ref = field_schema.get("foreignKey")
        nullable = field_schema.get("nullable", True)
        default = field_schema.get("default")

        # Determine semantic type
        semantic_type, confidence = self._determine_semantic_type(
            field_name, field_schema, table_name, description
        )

        # Build related fields list for consistency
        related_fields = self._find_related_fields(field_name, table_name)

        # Primary keys and composite PK/FKs are never nullable and always required
        is_pk_or_composite = is_pk or (fk_ref and is_pk)
        effective_nullable = False if is_pk_or_composite else nullable
        effective_required = is_pk_or_composite or field_name in field_schema.get("required", [])

        return FieldSemantics(
            semantic_type=semantic_type,
            confidence=confidence,
            field_name=field_name,
            table_name=table_name,
            field_schema=field_schema,
            is_nullable=effective_nullable,
            is_required=effective_required,
            is_primary_key=is_pk,
            is_foreign_key=fk_ref is not None,
            foreign_key_ref=fk_ref,
            default_value=default,
            related_fields=related_fields,
        )

    def _determine_semantic_type(
        self,
        field_name: str,
        field_schema: dict[str, Any],
        table_name: str,
        description: str,
    ) -> tuple[SemanticType, float]:
        """Determine the semantic type with confidence score."""
        field_type = field_schema.get("type", "string")
        is_pk = field_schema.get("primaryKey", False)
        fk_ref = field_schema.get("foreignKey")

        # Check for foreign key FIRST - if a field is both PK and FK (composite primary key
        # referencing another table), treat it as FK to pick from generated IDs
        if fk_ref:
            return SemanticType.FOREIGN_KEY, 1.0

        # Check for primary key (only if not also a foreign key)
        if is_pk:
            if field_type == "integer":
                return SemanticType.PRIMARY_KEY_INT, 1.0
            return SemanticType.PRIMARY_KEY_STR, 1.0

        # Check name patterns (highest priority for exact matches)
        for sem_type, patterns in self.NAME_PATTERNS.items():
            for pattern in patterns:
                if pattern.search(field_name):
                    return sem_type, 0.95

        # Special handling for "name" field based on table
        if field_name == "name":
            if table_name in self.TABLE_NAME_SEMANTICS:
                return self.TABLE_NAME_SEMANTICS[table_name], 0.9

        # Special handling for status/type/role based on table context
        if field_name == "status":
            if table_name == "tickets":
                return SemanticType.STATUS, 0.95
            if table_name == "approval_requests":
                return SemanticType.APPROVAL_STATUS, 0.95
            if table_name == "side_conversations":
                return SemanticType.STATUS, 0.9
            return SemanticType.STATUS, 0.8

        if field_name == "type":
            if table_name == "tickets":
                return SemanticType.TICKET_TYPE, 0.95
            if table_name == "tags":
                return SemanticType.TAG_TYPE, 0.95
            if table_name == "conversations":
                return SemanticType.CONVERSATION_TYPE, 0.95
            if table_name == "side_conversations":
                return SemanticType.SIDE_CONV_TYPE, 0.9
            return SemanticType.GENERIC_STRING, 0.5

        if field_name == "role":
            return SemanticType.ROLE, 0.95

        if field_name == "agent_label":
            return SemanticType.GENERIC_STRING, 0.7  # Status label

        # Check description keywords
        for sem_type, keywords in self.DESCRIPTION_KEYWORDS.items():
            for keyword in keywords:
                if keyword in description:
                    return sem_type, 0.85

        # Check for access field
        if field_name == "access":
            return SemanticType.GENERIC_STRING, 0.7

        if field_name == "details":
            return SemanticType.DESCRIPTION, 0.7

        # Fallback based on type
        if field_type == "boolean":
            return SemanticType.BOOL_GENERIC, 0.5

        if field_type == "integer":
            if "_id" in field_name:
                return SemanticType.GENERIC_INT, 0.6
            return SemanticType.GENERIC_INT, 0.5

        if field_type == "array":
            return SemanticType.JSON_ARRAY, 0.5

        if field_type == "object":
            return SemanticType.JSON_OBJECT, 0.5

        if field_type == "string":
            if field_schema.get("format") == "date-time":
                return SemanticType.TIMESTAMP, 0.8
            return SemanticType.GENERIC_STRING, 0.3

        return SemanticType.UNKNOWN, 0.0

    def _find_related_fields(self, field_name: str, table_name: str) -> list[str]:
        """Find fields that should be consistent with this field."""
        relations = {
            # Suspended fields
            "suspended": ["suspended_at", "suspended_reason"],
            "suspended_at": ["suspended"],

            # Deleted fields
            "is_deleted": ["deleted_at"],
            "deleted_at": ["is_deleted"],

            # Spam fields
            "is_spam": ["spam_marked_at"],
            "spam_marked_at": ["is_spam"],

            # Status fields
            "status": ["solved_at", "updated_at"],
            "solved_at": ["status"],

            # Response fields
            "approver_id": ["responded_at", "response_message"],
            "responded_at": ["approver_id", "status"],
        }

        return relations.get(field_name, [])
