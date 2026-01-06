"""
Pattern detection for schema relationships and field semantics.

Detects common patterns like:
- Sibling field pairs (resource + resource_id)
- Conditional timestamps (is_deleted + deleted_at)
- Workflow patterns (status with pending/terminal states)
- API audit log patterns
- Soft delete patterns
"""

from dataclasses import dataclass, field
from typing import Any
import re

from .domain import (
    DomainDetector,
    SEMANTIC_FIELD_PATTERNS,
)


@dataclass
class SiblingPair:
    """A pair of related fields (e.g., resource + resource_id)."""
    base_field: str           # e.g., "resource"
    derived_field: str        # e.g., "resource_id"
    relationship: str         # "id", "timestamp", "reason", "message"
    derivation_strategy: str  # How to generate derived from base


@dataclass
class ConditionalTimestamp:
    """A timestamp that depends on a boolean/status field."""
    timestamp_field: str      # e.g., "deleted_at"
    condition_field: str      # e.g., "is_deleted"
    condition_value: Any      # e.g., True
    null_when_not_met: bool = True


@dataclass
class ConditionalField:
    """A field whose value/nullability depends on another field."""
    field_name: str
    depends_on: str
    null_when: list[Any] = field(default_factory=list)     # Values that make this null
    required_when: list[Any] = field(default_factory=list) # Values that require this
    derive_from: str | None = None                          # Field to derive value from


@dataclass
class WorkflowPattern:
    """Detected approval/workflow pattern in a table."""
    status_field: str
    pending_states: list[str]
    terminal_states: list[str]
    requester_field: str | None = None
    approver_field: str | None = None
    response_timestamp: str | None = None
    response_message_field: str | None = None


@dataclass
class ApiAuditPattern:
    """Detected API/audit log pattern."""
    method_field: str | None = None
    endpoint_field: str | None = None
    status_code_field: str | None = None
    resource_field: str | None = None
    resource_id_field: str | None = None
    level_field: str | None = None
    error_message_field: str | None = None
    duration_field: str | None = None
    request_data_field: str | None = None
    response_data_field: str | None = None


@dataclass
class SoftDeletePattern:
    """Detected soft delete pattern."""
    flag_field: str           # e.g., "is_deleted"
    timestamp_field: str | None = None  # e.g., "deleted_at"


@dataclass
class TablePatterns:
    """All detected patterns for a table."""
    table_name: str
    sibling_pairs: list[SiblingPair] = field(default_factory=list)
    conditional_timestamps: list[ConditionalTimestamp] = field(default_factory=list)
    conditional_fields: list[ConditionalField] = field(default_factory=list)
    workflow: WorkflowPattern | None = None
    api_audit: ApiAuditPattern | None = None
    soft_delete: SoftDeletePattern | None = None


class PatternDetector:
    """
    Detects structural and semantic patterns in schema tables.

    Uses field names, types, descriptions, and relationships
    to identify common patterns that inform data generation.
    """

    # Regex patterns for field name analysis
    BOOLEAN_PATTERN = re.compile(r'^(is_|has_|can_|was_|should_|will_)?(\w+)$', re.I)
    TIMESTAMP_PATTERN = re.compile(r'^(\w+?)(_at|_on|_date|_time|_timestamp)$', re.I)
    ID_PATTERN = re.compile(r'^(\w+?)(_id|_uuid|_ref|_key)$', re.I)
    REASON_PATTERN = re.compile(r'^(\w+?)(_reason|_message|_note|_comment)$', re.I)

    # Field name indicators
    APPROVER_INDICATORS = ['approver', 'approved_by', 'reviewer', 'authorizer']
    REQUESTER_INDICATORS = ['requester', 'requested_by', 'submitter', 'creator', 'author']
    RESPONSE_TIMESTAMP_INDICATORS = ['responded_at', 'approved_at', 'reviewed_at', 'completed_at']
    RESPONSE_MESSAGE_INDICATORS = ['response_message', 'response', 'approval_message', 'review_comment']

    def __init__(self, domain_detector: DomainDetector):
        """
        Initialize with a domain detector.

        Args:
            domain_detector: Configured domain detector with detected domain.
        """
        self.domain = domain_detector

    def analyze_table(
        self,
        table_name: str,
        table_schema: dict[str, Any],
    ) -> TablePatterns:
        """
        Analyze a table schema and detect all patterns.

        Args:
            table_name: Name of the table.
            table_schema: Schema definition for the table.

        Returns:
            TablePatterns with all detected patterns.
        """
        properties = table_schema.get("properties", {})
        patterns = TablePatterns(table_name=table_name)

        # Detect various pattern types
        patterns.sibling_pairs = self._detect_sibling_pairs(properties)
        patterns.conditional_timestamps = self._detect_conditional_timestamps(properties)
        patterns.soft_delete = self._detect_soft_delete(properties)
        patterns.workflow = self._detect_workflow_pattern(properties)
        patterns.api_audit = self._detect_api_audit_pattern(properties)
        patterns.conditional_fields = self._detect_conditional_fields(
            properties, patterns
        )

        return patterns

    def _detect_sibling_pairs(
        self,
        properties: dict[str, Any],
    ) -> list[SiblingPair]:
        """
        Detect sibling field pairs like resource + resource_id.

        Args:
            properties: Field properties from schema.

        Returns:
            List of detected sibling pairs.
        """
        pairs = []
        field_names = set(properties.keys())

        for field_name in field_names:
            # Check for foo_id pattern
            id_match = self.ID_PATTERN.match(field_name)
            if id_match:
                base_name = id_match.group(1)
                if base_name in field_names:
                    pairs.append(SiblingPair(
                        base_field=base_name,
                        derived_field=field_name,
                        relationship="id",
                        derivation_strategy="id_from_base_value",
                    ))
                continue

            # Check for foo_reason/foo_message pattern
            reason_match = self.REASON_PATTERN.match(field_name)
            if reason_match:
                base_name = reason_match.group(1)
                # Check for boolean trigger (is_foo, foo)
                bool_field = f"is_{base_name}"
                if bool_field in field_names or base_name in field_names:
                    trigger = bool_field if bool_field in field_names else base_name
                    pairs.append(SiblingPair(
                        base_field=trigger,
                        derived_field=field_name,
                        relationship="reason",
                        derivation_strategy="reason_when_true",
                    ))

        return pairs

    def _detect_conditional_timestamps(
        self,
        properties: dict[str, Any],
    ) -> list[ConditionalTimestamp]:
        """
        Detect conditional timestamp patterns like is_deleted + deleted_at.

        Args:
            properties: Field properties from schema.

        Returns:
            List of detected conditional timestamps.
        """
        timestamps = []
        field_names = set(properties.keys())

        for field_name in field_names:
            ts_match = self.TIMESTAMP_PATTERN.match(field_name)
            if not ts_match:
                continue

            base_name = ts_match.group(1)
            suffix = ts_match.group(2)

            # Skip created_at, updated_at - these aren't conditional
            if base_name in ('created', 'updated', 'last_updated'):
                continue

            # Look for corresponding boolean field
            bool_candidates = [
                f"is_{base_name}",      # is_deleted
                base_name,               # deleted, suspended
                f"is_{base_name}d",     # is_solved (for solved_at)
                f"was_{base_name}",     # was_deleted
            ]

            # Handle past tense variations
            if base_name.endswith('ed'):
                bool_candidates.append(f"is_{base_name[:-2]}")  # solved → is_solv (unlikely but check)
                bool_candidates.append(base_name[:-2])  # solved → solv (unlikely)

            # Handle specific patterns
            if base_name == 'spam_marked':
                bool_candidates.extend(['is_spam', 'spam'])
            if base_name == 'responded':
                bool_candidates.extend(['status'])  # responded_at depends on status
            if base_name == 'solved':
                bool_candidates.extend(['status'])

            for bool_field in bool_candidates:
                if bool_field in field_names:
                    field_schema = properties[bool_field]
                    field_type = field_schema.get("type", "string")

                    if field_type == "boolean":
                        timestamps.append(ConditionalTimestamp(
                            timestamp_field=field_name,
                            condition_field=bool_field,
                            condition_value=True,
                            null_when_not_met=True,
                        ))
                    elif field_type == "string" and bool_field == "status":
                        # Status-based timestamp (e.g., solved_at when status=solved)
                        timestamps.append(ConditionalTimestamp(
                            timestamp_field=field_name,
                            condition_field=bool_field,
                            condition_value=self._infer_timestamp_trigger_states(base_name),
                            null_when_not_met=True,
                        ))
                    break

        return timestamps

    def _infer_timestamp_trigger_states(self, base_name: str) -> list[str]:
        """
        Infer which status values trigger a timestamp.

        Args:
            base_name: Base name of timestamp (e.g., "solved" from "solved_at").

        Returns:
            List of status values that would trigger this timestamp.
        """
        # Map timestamp bases to typical trigger states
        mappings = {
            'solved': ['done', 'closed'],
            'closed': ['closed'],
            'resolved': ['done', 'closed'],
            'completed': ['completed', 'done', 'closed', 'finished'],
            'approved': ['approved'],
            'denied': ['denied', 'rejected'],
            'responded': ['approved', 'denied', 'rejected', 'responded'],
            'cancelled': ['cancelled', 'canceled'],
            'deleted': ['deleted'],
        }
        return mappings.get(base_name, [base_name])

    def _detect_soft_delete(
        self,
        properties: dict[str, Any],
    ) -> SoftDeletePattern | None:
        """
        Detect soft delete pattern (is_deleted + deleted_at).

        Args:
            properties: Field properties from schema.

        Returns:
            SoftDeletePattern if detected, None otherwise.
        """
        flag_field = None
        timestamp_field = None

        for field_name, field_schema in properties.items():
            field_lower = field_name.lower()

            if field_lower == 'is_deleted' and field_schema.get('type') == 'boolean':
                flag_field = field_name
            elif field_lower == 'deleted_at' and field_schema.get('format') == 'date-time':
                timestamp_field = field_name

        if flag_field:
            return SoftDeletePattern(
                flag_field=flag_field,
                timestamp_field=timestamp_field,
            )

        return None

    def _detect_workflow_pattern(
        self,
        properties: dict[str, Any],
    ) -> WorkflowPattern | None:
        """
        Detect approval/workflow pattern.

        Args:
            properties: Field properties from schema.

        Returns:
            WorkflowPattern if detected, None otherwise.
        """
        status_field = None
        pending_states = []
        terminal_states = []
        requester_field = None
        approver_field = None
        response_timestamp = None
        response_message = None

        field_names = list(properties.keys())

        # Find status field and analyze its description for states
        for field_name, field_schema in properties.items():
            if field_name.lower() in ('status', 'state', 'approval_status', 'workflow_status'):
                status_field = field_name
                desc = field_schema.get('description', '').lower()

                # Extract states from description
                # Look for patterns like "pending, approved, denied" or "status: pending, approved"
                states = self._extract_states_from_description(desc)

                if states:
                    for state in states:
                        if self.domain.is_terminal_state(state):
                            terminal_states.append(state)
                        elif self.domain.is_pending_state(state):
                            pending_states.append(state)
                        else:
                            # Use heuristics
                            if state in ('approved', 'denied', 'rejected', 'completed', 'closed', 'done'):
                                terminal_states.append(state)
                            else:
                                pending_states.append(state)
                break

        if not status_field:
            return None

        # If no states found, use domain defaults
        if not pending_states and not terminal_states:
            pending_states = self.domain.get_pending_states()[:3]
            terminal_states = self.domain.get_terminal_states()[:3]

        # Find requester/approver fields
        for field_name in field_names:
            field_lower = field_name.lower()

            for indicator in self.REQUESTER_INDICATORS:
                if indicator in field_lower:
                    requester_field = field_name
                    break

            for indicator in self.APPROVER_INDICATORS:
                if indicator in field_lower:
                    approver_field = field_name
                    break

            for indicator in self.RESPONSE_TIMESTAMP_INDICATORS:
                if indicator in field_lower or field_lower == indicator:
                    response_timestamp = field_name
                    break

            for indicator in self.RESPONSE_MESSAGE_INDICATORS:
                if indicator in field_lower or field_lower == indicator:
                    response_message = field_name
                    break

        # Only return workflow if we have meaningful indicators
        if approver_field or response_timestamp or (pending_states and terminal_states):
            return WorkflowPattern(
                status_field=status_field,
                pending_states=pending_states,
                terminal_states=terminal_states,
                requester_field=requester_field,
                approver_field=approver_field,
                response_timestamp=response_timestamp,
                response_message_field=response_message,
            )

        return None

    def _extract_states_from_description(self, description: str) -> list[str]:
        """
        Extract state values from a field description.

        Args:
            description: Field description text.

        Returns:
            List of extracted state values.
        """
        states = []

        # Look for comma-separated lists in parentheses or after colons
        # e.g., "status: pending, approved, denied" or "(pending, approved, denied)"
        patterns = [
            r'\(([^)]+)\)',                    # (pending, approved, denied)
            r':\s*([^.]+)',                    # : pending, approved, denied
            r'(?:status|state|values?)\s*[:-]\s*([^.]+)',  # status: xxx
        ]

        for pattern in patterns:
            match = re.search(pattern, description)
            if match:
                values_str = match.group(1)
                # Split by comma, 'or', '/'
                parts = re.split(r'[,/]|\s+or\s+', values_str)
                for part in parts:
                    cleaned = part.strip().strip("'\"").lower()
                    cleaned = re.sub(r'[^a-z_]', '', cleaned)
                    if cleaned and len(cleaned) > 1:
                        states.append(cleaned)
                if states:
                    break

        return states

    def _detect_api_audit_pattern(
        self,
        properties: dict[str, Any],
    ) -> ApiAuditPattern | None:
        """
        Detect API/audit log pattern.

        Args:
            properties: Field properties from schema.

        Returns:
            ApiAuditPattern if detected, None otherwise.
        """
        pattern = ApiAuditPattern()
        field_names = {f.lower(): f for f in properties.keys()}
        matches = 0

        # Method field
        for candidate in ['method', 'http_method', 'request_method']:
            if candidate in field_names:
                pattern.method_field = field_names[candidate]
                matches += 1
                break

        # Endpoint field
        for candidate in ['endpoint', 'path', 'route', 'uri', 'url', 'request_path']:
            if candidate in field_names:
                pattern.endpoint_field = field_names[candidate]
                matches += 1
                break

        # Status code field
        for candidate in ['status_code', 'http_status', 'response_code', 'code']:
            if candidate in field_names:
                pattern.status_code_field = field_names[candidate]
                matches += 1
                break

        # Resource field
        for candidate in ['resource', 'resource_type', 'entity', 'entity_type', 'object_type']:
            if candidate in field_names:
                pattern.resource_field = field_names[candidate]
                matches += 1
                break

        # Resource ID field
        for candidate in ['resource_id', 'entity_id', 'object_id', 'record_id']:
            if candidate in field_names:
                pattern.resource_id_field = field_names[candidate]
                matches += 1
                break

        # Level field
        for candidate in ['level', 'log_level', 'severity']:
            if candidate in field_names:
                pattern.level_field = field_names[candidate]
                matches += 1
                break

        # Error message field
        for candidate in ['error_message', 'error', 'error_msg', 'exception', 'failure_reason']:
            if candidate in field_names:
                pattern.error_message_field = field_names[candidate]
                matches += 1
                break

        # Duration field
        for candidate in ['duration_ms', 'duration', 'elapsed_ms', 'latency', 'response_time']:
            if candidate in field_names:
                pattern.duration_field = field_names[candidate]
                matches += 1
                break

        # Request/response data
        for candidate in ['request_data', 'request_body', 'request_payload', 'request']:
            if candidate in field_names:
                pattern.request_data_field = field_names[candidate]
                break

        for candidate in ['response_data', 'response_body', 'response_payload', 'response']:
            if candidate in field_names:
                pattern.response_data_field = field_names[candidate]
                break

        # Only return if we have enough API audit indicators
        if matches >= 3:
            return pattern

        return None

    def _detect_conditional_fields(
        self,
        properties: dict[str, Any],
        patterns: TablePatterns,
    ) -> list[ConditionalField]:
        """
        Detect fields that are conditional on other fields.

        Uses already-detected patterns plus description parsing.

        Args:
            properties: Field properties from schema.
            patterns: Already-detected patterns for this table.

        Returns:
            List of conditional fields.
        """
        conditional = []

        # From workflow pattern
        if patterns.workflow:
            wf = patterns.workflow

            # Approver required for terminal states
            if wf.approver_field:
                conditional.append(ConditionalField(
                    field_name=wf.approver_field,
                    depends_on=wf.status_field,
                    null_when=wf.pending_states,
                    required_when=wf.terminal_states,
                ))

            # Response timestamp required for terminal states
            if wf.response_timestamp:
                conditional.append(ConditionalField(
                    field_name=wf.response_timestamp,
                    depends_on=wf.status_field,
                    null_when=wf.pending_states,
                    required_when=wf.terminal_states,
                ))

            # Response message null for pending
            if wf.response_message_field:
                conditional.append(ConditionalField(
                    field_name=wf.response_message_field,
                    depends_on=wf.status_field,
                    null_when=wf.pending_states,
                ))

        # From API audit pattern
        if patterns.api_audit:
            api = patterns.api_audit

            # Error message null when not error level
            if api.error_message_field and api.level_field:
                conditional.append(ConditionalField(
                    field_name=api.error_message_field,
                    depends_on=api.level_field,
                    null_when=SEMANTIC_FIELD_PATTERNS["non_error_log_levels"],
                    required_when=SEMANTIC_FIELD_PATTERNS["error_log_levels"],
                ))

            # Endpoint derived from resource + resource_id
            if api.endpoint_field and api.resource_field:
                conditional.append(ConditionalField(
                    field_name=api.endpoint_field,
                    depends_on=api.resource_field,
                    derive_from=api.resource_id_field,
                ))

            # Resource ID relates to resource type
            if api.resource_id_field and api.resource_field:
                conditional.append(ConditionalField(
                    field_name=api.resource_id_field,
                    depends_on=api.resource_field,
                    derive_from=api.resource_field,
                ))

        # Parse descriptions for additional conditionals
        for field_name, field_schema in properties.items():
            desc = field_schema.get("description", "").lower()

            # Look for "if failed", "when error", "if operation failed"
            if any(phrase in desc for phrase in [
                "if failed", "if error", "when error", "if operation failed",
                "on failure", "on error", "error message if"
            ]):
                # Find the condition field
                level_field = patterns.api_audit.level_field if patterns.api_audit else None
                status_field = None

                for fname in properties:
                    if fname.lower() in ('level', 'status_code', 'status'):
                        if fname.lower() == 'level':
                            level_field = fname
                        elif fname.lower() == 'status_code':
                            status_field = fname

                if level_field and field_name not in [c.field_name for c in conditional]:
                    conditional.append(ConditionalField(
                        field_name=field_name,
                        depends_on=level_field,
                        null_when=["INFO", "DEBUG", "WARNING"],
                        required_when=["ERROR", "CRITICAL", "FATAL"],
                    ))

        return conditional
