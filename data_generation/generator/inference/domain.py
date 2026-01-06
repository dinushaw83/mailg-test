"""
Domain detection and vocabulary management.

Detects the business domain from schema structure and provides
domain-specific vocabularies for intelligent data generation.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class Domain(Enum):
    """Supported business domains."""
    TICKETING = "ticketing"           # Support tickets, helpdesk, Zendesk-like
    ISSUE_TRACKING = "issue_tracking" # Jira-like, bug tracking
    HRM = "hrm"                       # HR management, Workday-like
    CRM = "crm"                       # Customer relationship management
    ECOMMERCE = "ecommerce"           # Orders, products, payments
    CMS = "cms"                       # Content management
    PROJECT_MGMT = "project_mgmt"     # Project management
    GENERIC = "generic"               # Fallback


@dataclass
class DomainVocabulary:
    """Vocabulary and patterns for a specific domain."""

    # Primary entity names that indicate this domain
    entity_indicators: list[str] = field(default_factory=list)

    # Actor/role names common in this domain
    actors: list[str] = field(default_factory=list)

    # State/status values typical for this domain
    states: list[str] = field(default_factory=list)

    # Terminal states (completed, closed, etc.)
    terminal_states: list[str] = field(default_factory=list)

    # Pending/in-progress states
    pending_states: list[str] = field(default_factory=list)

    # Priority levels
    priorities: list[str] = field(default_factory=list)

    # Communication channels
    channels: list[str] = field(default_factory=list)

    # Common field name patterns specific to domain
    field_patterns: dict[str, str] = field(default_factory=dict)

    # Content templates for text fields
    content_hints: dict[str, list[str]] = field(default_factory=dict)


# Comprehensive domain vocabularies
DOMAIN_VOCABULARIES: dict[Domain, DomainVocabulary] = {
    Domain.TICKETING: DomainVocabulary(
        entity_indicators=[
            "ticket", "tickets", "case", "cases", "incident", "incidents",
            "support_request", "helpdesk", "desk", "zendesk", "freshdesk",
        ],
        actors=[
            "agent", "requester", "submitter", "assignee", "reporter",
            "end_user", "end-user", "customer", "support_agent",
        ],
        states=[
            "new", "open", "pending", "on_hold", "hold", "waiting",
            "in_progress", "escalated", "solved", "closed", "resolved",
        ],
        terminal_states=["solved", "closed", "resolved", "cancelled"],
        pending_states=["new", "open", "pending", "on_hold", "hold", "waiting", "in_progress"],
        priorities=["low", "normal", "medium", "high", "urgent", "critical"],
        channels=["email", "web", "phone", "chat", "api", "twitter", "facebook"],
        field_patterns={
            "subject": "ticket_subject",
            "description": "ticket_description",
            "priority": "ticket_priority",
        },
        content_hints={
            "subject": [
                "Issue with {topic}",
                "Cannot {action}",
                "Help needed: {topic}",
                "Error when {action}",
                "{topic} not working",
            ],
            "topics": [
                "login", "password", "billing", "account", "payment",
                "subscription", "integration", "API", "export", "import",
            ],
        },
    ),

    Domain.ISSUE_TRACKING: DomainVocabulary(
        entity_indicators=[
            "issue", "issues", "bug", "bugs", "task", "tasks", "story", "stories",
            "epic", "epics", "sprint", "sprints", "jira", "backlog",
        ],
        actors=[
            "reporter", "assignee", "reviewer", "developer", "tester",
            "product_owner", "scrum_master", "lead", "member", "viewer", "admin",
        ],
        states=[
            "backlog", "selected", "todo", "in_progress", "in-progress", "in_review", "in-review",
            "review", "testing", "done", "blocked", "bugs",
        ],
        terminal_states=["done", "closed", "resolved", "wont_fix", "duplicate"],
        pending_states=["backlog", "selected", "todo", "in_progress", "in-progress", "in_review", "in-review", "testing", "blocked"],
        priorities=["low", "medium", "high", "critical"],
        channels=["web", "api", "email", "slack", "cli"],
        field_patterns={
            "summary": "issue_subject",
            "description": "issue_description",
        },
        content_hints={
            "summary": [
                "[{component}] {description}",
                "Bug: {description}",
                "Feature: {description}",
                "Fix {description}",
            ],
        },
    ),

    Domain.HRM: DomainVocabulary(
        entity_indicators=[
            "employee", "employees", "department", "departments", "position",
            "leave", "leaves", "payroll", "attendance", "timesheet", "workday",
            "performance", "review", "onboarding", "offboarding", "benefit",
        ],
        actors=[
            "employee", "manager", "hr_admin", "hr", "supervisor",
            "recruiter", "approver", "reviewer",
        ],
        states=[
            "draft", "submitted", "pending_approval", "approved", "rejected",
            "processed", "cancelled", "active", "inactive", "terminated",
        ],
        terminal_states=["approved", "rejected", "processed", "terminated", "completed"],
        pending_states=["draft", "submitted", "pending_approval", "under_review"],
        priorities=["low", "normal", "high"],
        channels=["web", "mobile", "email", "api"],
        field_patterns={
            "employee_id": "employee_identifier",
            "department_id": "department_reference",
        },
        content_hints={
            "leave_reason": [
                "Personal time off",
                "Medical appointment",
                "Family emergency",
                "Vacation",
            ],
        },
    ),

    Domain.CRM: DomainVocabulary(
        entity_indicators=[
            "lead", "leads", "opportunity", "opportunities", "account", "accounts",
            "contact", "contacts", "deal", "deals", "pipeline", "campaign",
            "salesforce", "hubspot",
        ],
        actors=[
            "sales_rep", "account_manager", "owner", "contact", "lead",
        ],
        states=[
            "new", "contacted", "qualified", "proposal", "negotiation",
            "won", "lost", "churned",
        ],
        terminal_states=["won", "lost", "churned", "closed"],
        pending_states=["new", "contacted", "qualified", "proposal", "negotiation"],
        priorities=["cold", "warm", "hot"],
        channels=["email", "phone", "web", "social", "referral"],
        content_hints={},
    ),

    Domain.ECOMMERCE: DomainVocabulary(
        entity_indicators=[
            "order", "orders", "product", "products", "cart", "carts",
            "payment", "payments", "shipment", "shipments", "inventory",
            "catalog", "sku", "checkout",
        ],
        actors=[
            "customer", "vendor", "seller", "buyer", "admin", "merchant",
        ],
        states=[
            "pending", "confirmed", "processing", "shipped", "delivered",
            "cancelled", "refunded", "returned",
        ],
        terminal_states=["delivered", "cancelled", "refunded", "completed"],
        pending_states=["pending", "confirmed", "processing", "shipped"],
        priorities=["standard", "express", "overnight", "same_day"],
        channels=["web", "mobile", "pos", "api", "marketplace"],
        content_hints={},
    ),

    Domain.CMS: DomainVocabulary(
        entity_indicators=[
            "article", "articles", "post", "posts", "page", "pages",
            "content", "media", "document", "documents", "blog",
        ],
        actors=[
            "author", "editor", "reviewer", "publisher", "admin",
        ],
        states=[
            "draft", "pending_review", "review", "published", "archived",
            "scheduled", "unpublished",
        ],
        terminal_states=["published", "archived"],
        pending_states=["draft", "pending_review", "review", "scheduled"],
        priorities=[],
        channels=["web", "mobile", "api", "rss"],
        content_hints={
            "title": [
                "How to {action}",
                "Getting started with {topic}",
                "Understanding {topic}",
                "{topic} best practices",
            ],
        },
    ),

    Domain.PROJECT_MGMT: DomainVocabulary(
        entity_indicators=[
            "project", "projects", "milestone", "milestones", "task", "tasks",
            "deliverable", "resource", "timeline", "gantt",
        ],
        actors=[
            "project_manager", "team_member", "stakeholder", "owner", "lead",
        ],
        states=[
            "planned", "in_progress", "on_hold", "completed", "cancelled",
            "delayed", "at_risk",
        ],
        terminal_states=["completed", "cancelled"],
        pending_states=["planned", "in_progress", "on_hold", "delayed"],
        priorities=["low", "medium", "high", "critical"],
        channels=["web", "email", "slack", "api"],
        content_hints={},
    ),

    Domain.GENERIC: DomainVocabulary(
        entity_indicators=[],
        actors=["user", "admin", "owner", "creator"],
        states=["active", "inactive", "pending", "completed", "archived"],
        terminal_states=["completed", "archived", "deleted"],
        pending_states=["pending", "active", "in_progress"],
        priorities=["low", "normal", "high"],
        channels=["web", "api", "email"],
        content_hints={},
    ),
}


# Global semantic field patterns that apply across domains
SEMANTIC_FIELD_PATTERNS = {
    # HTTP/API related
    "http_methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
    "http_success_codes": [200, 201, 202, 204],
    "http_client_error_codes": [400, 401, 403, 404, 405, 409, 422, 429],
    "http_server_error_codes": [500, 501, 502, 503, 504],

    # Log levels
    "log_levels": ["DEBUG", "INFO", "WARNING", "WARN", "ERROR", "CRITICAL", "FATAL"],
    "error_log_levels": ["ERROR", "CRITICAL", "FATAL"],
    "non_error_log_levels": ["DEBUG", "INFO", "WARNING", "WARN"],

    # CRUD operations
    "crud_operations": ["CREATE", "READ", "UPDATE", "DELETE", "LIST", "RESTORE"],
    "write_operations": ["CREATE", "UPDATE", "DELETE", "RESTORE"],
    "read_operations": ["READ", "LIST", "GET"],

    # Boolean indicator prefixes
    "boolean_prefixes": ["is_", "has_", "can_", "should_", "was_", "will_"],

    # Timestamp suffixes
    "timestamp_suffixes": ["_at", "_on", "_date", "_time", "_timestamp"],

    # ID suffixes
    "id_suffixes": ["_id", "_uuid", "_guid", "_ref", "_key"],

    # Resource types (generic)
    "common_resources": [
        "user", "ticket", "organization", "article", "group", "comment",
        "attachment", "tag", "status", "role", "permission",
    ],
}


# Field name patterns that indicate specific semantics
FIELD_SEMANTIC_INDICATORS = {
    # Error/failure related
    "error_indicators": [
        "error", "err", "exception", "failure", "fail", "fault",
    ],

    # Response/result related
    "response_indicators": [
        "response", "result", "output", "reply", "answer",
    ],

    # Approval/workflow related
    "approval_indicators": [
        "approv", "reject", "deny", "denied", "accept", "decline",
    ],

    # Request related
    "request_indicators": [
        "request", "req", "input", "payload", "body",
    ],

    # Duration/timing related
    "duration_indicators": [
        "duration", "elapsed", "latency", "time_taken", "_ms", "_seconds",
    ],

    # Count/quantity related
    "count_indicators": [
        "count", "total", "num_", "number_of", "_count", "quantity",
    ],

    # Path/endpoint related
    "path_indicators": [
        "endpoint", "path", "route", "uri", "url", "href",
    ],
}


class DomainDetector:
    """
    Detects the business domain from schema structure.

    Uses table names, field names, and descriptions to infer
    which business domain the schema represents.
    """

    def __init__(self, domain_hint: str | None = None):
        """
        Initialize with optional domain hint.

        Args:
            domain_hint: User-provided hint like "ticketing", "hrm", etc.
        """
        self.domain_hint = domain_hint
        self._detected_domain: Domain | None = None
        self._confidence: float = 0.0
        self._vocabulary: DomainVocabulary | None = None

    def detect(self, schema: dict[str, Any]) -> Domain:
        """
        Detect the domain from schema structure.

        Args:
            schema: The full schema dictionary.

        Returns:
            Detected Domain enum value.
        """
        # If user provided hint, validate and use it
        if self.domain_hint:
            for domain in Domain:
                if domain.value == self.domain_hint.lower():
                    self._detected_domain = domain
                    self._confidence = 1.0
                    self._vocabulary = DOMAIN_VOCABULARIES[domain]
                    return domain

        # Score each domain based on schema content
        tables = self._get_tables(schema)
        scores: dict[Domain, float] = {d: 0.0 for d in Domain}

        for domain, vocab in DOMAIN_VOCABULARIES.items():
            if domain == Domain.GENERIC:
                continue

            score = 0.0

            # Check table names against entity indicators
            for table_name in tables:
                table_lower = table_name.lower()
                for indicator in vocab.entity_indicators:
                    if indicator in table_lower:
                        score += 10.0
                        break

            # Check field names and descriptions
            for table_name, table_schema in tables.items():
                properties = table_schema.get("properties", {})
                for field_name, field_schema in properties.items():
                    field_lower = field_name.lower()
                    desc = field_schema.get("description", "").lower()

                    # Actor matches
                    for actor in vocab.actors:
                        if actor in field_lower or actor in desc:
                            score += 2.0

                    # State matches in descriptions
                    for state in vocab.states:
                        if state in desc:
                            score += 1.0

            scores[domain] = score

        # Find best match
        best_domain = max(scores, key=scores.get)
        best_score = scores[best_domain]

        if best_score < 5.0:
            # Not enough confidence, use generic
            best_domain = Domain.GENERIC
            self._confidence = 0.5
        else:
            self._confidence = min(1.0, best_score / 50.0)

        self._detected_domain = best_domain
        self._vocabulary = DOMAIN_VOCABULARIES[best_domain]

        return best_domain

    def _get_tables(self, schema: dict) -> dict[str, dict]:
        """Extract tables from schema structure."""
        if "tables" in schema:
            tables_section = schema["tables"]
            if isinstance(tables_section, dict):
                if "properties" in tables_section:
                    return tables_section["properties"]
                return tables_section
        if "properties" in schema:
            props = schema["properties"]
            if "tables" in props:
                tables_section = props["tables"]
                if "properties" in tables_section:
                    return tables_section["properties"]
        return {}

    @property
    def domain(self) -> Domain:
        """Get detected domain."""
        return self._detected_domain or Domain.GENERIC

    @property
    def confidence(self) -> float:
        """Get detection confidence (0.0 to 1.0)."""
        return self._confidence

    @property
    def vocabulary(self) -> DomainVocabulary:
        """Get vocabulary for detected domain."""
        return self._vocabulary or DOMAIN_VOCABULARIES[Domain.GENERIC]

    def is_terminal_state(self, value: str) -> bool:
        """Check if a value represents a terminal state."""
        if not self._vocabulary:
            return False
        return value.lower() in [s.lower() for s in self._vocabulary.terminal_states]

    def is_pending_state(self, value: str) -> bool:
        """Check if a value represents a pending/non-terminal state."""
        if not self._vocabulary:
            return False
        return value.lower() in [s.lower() for s in self._vocabulary.pending_states]

    def get_terminal_states(self) -> list[str]:
        """Get list of terminal states for detected domain."""
        if not self._vocabulary:
            return ["completed", "closed", "done"]
        return self._vocabulary.terminal_states

    def get_pending_states(self) -> list[str]:
        """Get list of pending states for detected domain."""
        if not self._vocabulary:
            return ["pending", "open", "in_progress"]
        return self._vocabulary.pending_states
