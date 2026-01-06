"""
Rule generation from inferred patterns.

Converts detected patterns into actionable rules for data generation.
"""

from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Any

from .patterns import (
    TablePatterns,
    SiblingPair,
    ConditionalTimestamp,
    ConditionalField,
    WorkflowPattern,
    ApiAuditPattern,
)
from .domain import SEMANTIC_FIELD_PATTERNS


class RuleType(Enum):
    """Types of generation rules."""
    CONDITIONAL_NULL = auto()       # Field is null when condition met
    CONDITIONAL_REQUIRED = auto()   # Field required when condition met
    DERIVE_FROM_FIELD = auto()      # Field value derived from another field
    GENERATE_PATTERN = auto()       # Field uses specific generation pattern
    VALUE_CONSISTENCY = auto()      # Field value must be consistent with another


class GenerationStrategy(Enum):
    """Strategies for value generation."""
    RANDOM_ID = "random_id"                    # Random numeric/UUID ID
    DERIVED_ID = "derived_id"                  # ID based on sibling field value
    API_PATH = "api_path"                      # API endpoint path
    TIMESTAMP_AFTER = "timestamp_after"        # Timestamp after another field
    TIMESTAMP_BEFORE = "timestamp_before"      # Timestamp before another field
    CONTEXTUAL_MESSAGE = "contextual_message"  # Message based on context
    HTTP_STATUS = "http_status"                # HTTP status code
    ENUM_VALUE = "enum_value"                  # Value from enum list
    CONSISTENT_WITH = "consistent_with"        # Value consistent with another field


@dataclass
class FieldRule:
    """A rule for generating a specific field."""
    field_name: str
    rule_type: RuleType
    depends_on: str | None = None
    condition_values: list[Any] = field(default_factory=list)
    strategy: GenerationStrategy | None = None
    parameters: dict[str, Any] = field(default_factory=dict)
    priority: int = 50  # Higher = applied first


@dataclass
class ConsistencyRule:
    """A cross-field consistency rule."""
    condition_field: str
    condition_values: list[Any]
    set_fields: dict[str, Any]  # field_name -> value or directive
    priority: int = 50


@dataclass
class TableRules:
    """All rules for a table."""
    table_name: str
    field_rules: dict[str, list[FieldRule]] = field(default_factory=dict)
    consistency_rules: list[ConsistencyRule] = field(default_factory=list)
    generation_order: list[str] = field(default_factory=list)  # Fields that must be generated first


@dataclass
class InferredRules:
    """Complete set of inferred rules for a schema."""
    tables: dict[str, TableRules] = field(default_factory=dict)

    def get_table_rules(self, table_name: str) -> TableRules | None:
        """Get rules for a specific table."""
        return self.tables.get(table_name)

    def get_field_rules(self, table_name: str, field_name: str) -> list[FieldRule]:
        """Get rules for a specific field."""
        table_rules = self.tables.get(table_name)
        if not table_rules:
            return []
        return table_rules.field_rules.get(field_name, [])

    def get_consistency_rules(self, table_name: str) -> list[ConsistencyRule]:
        """Get consistency rules for a table."""
        table_rules = self.tables.get(table_name)
        if not table_rules:
            return []
        return table_rules.consistency_rules

    def merge_with_config(self, config: dict[str, Any]) -> dict[str, Any]:
        """
        Merge inferred rules with existing config.

        Existing config takes precedence - inferred rules fill gaps.

        Args:
            config: Existing configuration dictionary.

        Returns:
            Merged configuration.
        """
        merged = dict(config)

        # Merge consistency rules
        existing_rules = merged.get("consistency_rules", {})

        for table_name, table_rules in self.tables.items():
            if table_name not in existing_rules:
                existing_rules[table_name] = []

            existing_conditions = set()
            for rule in existing_rules[table_name]:
                cond = rule.get("condition", {})
                if cond:
                    field = cond.get("field", "")
                    vals = cond.get("equals") or cond.get("in", [])
                    if isinstance(vals, list):
                        for v in vals:
                            existing_conditions.add((field, str(v)))
                    else:
                        existing_conditions.add((field, str(vals)))

            # Add inferred rules that don't conflict
            for rule in table_rules.consistency_rules:
                # Check if this condition already exists
                is_duplicate = False
                for val in rule.condition_values:
                    if (rule.condition_field, str(val)) in existing_conditions:
                        is_duplicate = True
                        break

                if not is_duplicate:
                    # Convert to config format
                    config_rule = self._rule_to_config(rule)
                    existing_rules[table_name].append(config_rule)

        merged["consistency_rules"] = existing_rules

        # Add field generation hints
        if "field_hints" not in merged:
            merged["field_hints"] = {}

        for table_name, table_rules in self.tables.items():
            if table_name not in merged["field_hints"]:
                merged["field_hints"][table_name] = {}

            for field_name, rules in table_rules.field_rules.items():
                if field_name not in merged["field_hints"][table_name]:
                    hints = []
                    for rule in rules:
                        hint = self._field_rule_to_hint(rule)
                        if hint:
                            hints.append(hint)
                    if hints:
                        merged["field_hints"][table_name][field_name] = hints

        # Add generation order hints
        if "generation_order" not in merged:
            merged["generation_order"] = {}

        for table_name, table_rules in self.tables.items():
            if table_rules.generation_order and table_name not in merged["generation_order"]:
                merged["generation_order"][table_name] = table_rules.generation_order

        return merged

    def _rule_to_config(self, rule: ConsistencyRule) -> dict[str, Any]:
        """Convert a ConsistencyRule to config format."""
        config_rule = {
            "condition": {
                "field": rule.condition_field,
            },
            "set": rule.set_fields,
        }

        if len(rule.condition_values) == 1:
            config_rule["condition"]["equals"] = rule.condition_values[0]
        else:
            config_rule["condition"]["in"] = rule.condition_values

        return config_rule

    def _field_rule_to_hint(self, rule: FieldRule) -> dict[str, Any] | None:
        """Convert a FieldRule to a hint dictionary."""
        if rule.strategy:
            return {
                "strategy": rule.strategy.value,
                "depends_on": rule.depends_on,
                "parameters": rule.parameters,
            }
        return None


class RuleGenerator:
    """
    Generates rules from detected patterns.

    Converts pattern detections into actionable generation rules.
    """

    def generate_rules(self, patterns: TablePatterns) -> TableRules:
        """
        Generate rules from detected patterns.

        Args:
            patterns: Detected patterns for a table.

        Returns:
            TableRules with all generated rules.
        """
        rules = TableRules(table_name=patterns.table_name)

        # Track fields that need to be generated first
        priority_fields = set()

        # Process sibling pairs
        for pair in patterns.sibling_pairs:
            field_rules = self._rules_from_sibling_pair(pair)
            for rule in field_rules:
                rules.field_rules.setdefault(rule.field_name, []).append(rule)
            priority_fields.add(pair.base_field)

        # Process conditional timestamps
        for ct in patterns.conditional_timestamps:
            field_rules, consistency = self._rules_from_conditional_timestamp(ct)
            for rule in field_rules:
                rules.field_rules.setdefault(rule.field_name, []).append(rule)
            if consistency:
                rules.consistency_rules.append(consistency)
            priority_fields.add(ct.condition_field)

        # Process workflow pattern
        if patterns.workflow:
            wf_rules, wf_consistency = self._rules_from_workflow(patterns.workflow)
            for rule in wf_rules:
                rules.field_rules.setdefault(rule.field_name, []).append(rule)
            rules.consistency_rules.extend(wf_consistency)
            priority_fields.add(patterns.workflow.status_field)

        # Process API audit pattern
        if patterns.api_audit:
            api_rules, api_consistency = self._rules_from_api_audit(patterns.api_audit)
            for rule in api_rules:
                rules.field_rules.setdefault(rule.field_name, []).append(rule)
            rules.consistency_rules.extend(api_consistency)
            if patterns.api_audit.level_field:
                priority_fields.add(patterns.api_audit.level_field)
            if patterns.api_audit.resource_field:
                priority_fields.add(patterns.api_audit.resource_field)

        # Process conditional fields
        for cf in patterns.conditional_fields:
            field_rules, consistency = self._rules_from_conditional_field(cf)
            for rule in field_rules:
                # Avoid duplicates
                existing = rules.field_rules.get(rule.field_name, [])
                if not any(r.rule_type == rule.rule_type and r.depends_on == rule.depends_on for r in existing):
                    rules.field_rules.setdefault(rule.field_name, []).append(rule)
            if consistency:
                # Avoid duplicate consistency rules
                existing_conds = [(r.condition_field, tuple(r.condition_values)) for r in rules.consistency_rules]
                if (consistency.condition_field, tuple(consistency.condition_values)) not in existing_conds:
                    rules.consistency_rules.append(consistency)

        # Set generation order
        rules.generation_order = list(priority_fields)

        return rules

    def _rules_from_sibling_pair(self, pair: SiblingPair) -> list[FieldRule]:
        """Generate rules from a sibling pair."""
        rules = []

        if pair.relationship == "id":
            # resource_id derives from resource
            rules.append(FieldRule(
                field_name=pair.derived_field,
                rule_type=RuleType.DERIVE_FROM_FIELD,
                depends_on=pair.base_field,
                strategy=GenerationStrategy.DERIVED_ID,
                parameters={
                    "base_field": pair.base_field,
                    "format": "numeric_or_string",  # Will generate ID appropriate to resource type
                },
                priority=60,
            ))

        elif pair.relationship == "reason":
            # reason field is conditional on boolean
            rules.append(FieldRule(
                field_name=pair.derived_field,
                rule_type=RuleType.CONDITIONAL_NULL,
                depends_on=pair.base_field,
                condition_values=[False],  # Null when false
                strategy=GenerationStrategy.CONTEXTUAL_MESSAGE,
                parameters={
                    "context_field": pair.base_field,
                },
                priority=50,
            ))

        return rules

    def _rules_from_conditional_timestamp(
        self,
        ct: ConditionalTimestamp,
    ) -> tuple[list[FieldRule], ConsistencyRule | None]:
        """Generate rules from a conditional timestamp."""
        rules = []

        rules.append(FieldRule(
            field_name=ct.timestamp_field,
            rule_type=RuleType.CONDITIONAL_NULL,
            depends_on=ct.condition_field,
            condition_values=[not ct.condition_value] if isinstance(ct.condition_value, bool) else [],
            strategy=GenerationStrategy.TIMESTAMP_AFTER,
            parameters={
                "after_field": "created_at",
                "min_hours": 1,
                "max_hours": 72,
            },
            priority=50,
        ))

        # Create consistency rule
        if isinstance(ct.condition_value, bool):
            # Boolean condition
            consistency = ConsistencyRule(
                condition_field=ct.condition_field,
                condition_values=[not ct.condition_value],
                set_fields={ct.timestamp_field: None},
                priority=50,
            )
        else:
            # Status-based condition (list of states)
            # Create rule for when condition is NOT met
            consistency = None  # Will be handled by workflow rules

        return rules, consistency

    def _rules_from_workflow(
        self,
        workflow: WorkflowPattern,
    ) -> tuple[list[FieldRule], list[ConsistencyRule]]:
        """Generate rules from a workflow pattern."""
        rules = []
        consistency = []

        # Approver required for terminal states
        if workflow.approver_field:
            rules.append(FieldRule(
                field_name=workflow.approver_field,
                rule_type=RuleType.CONDITIONAL_REQUIRED,
                depends_on=workflow.status_field,
                condition_values=workflow.terminal_states,
                priority=70,
            ))

            # Consistency: null for pending
            consistency.append(ConsistencyRule(
                condition_field=workflow.status_field,
                condition_values=workflow.pending_states,
                set_fields={workflow.approver_field: None},
                priority=60,
            ))

        # Response timestamp for terminal states
        if workflow.response_timestamp:
            rules.append(FieldRule(
                field_name=workflow.response_timestamp,
                rule_type=RuleType.CONDITIONAL_REQUIRED,
                depends_on=workflow.status_field,
                condition_values=workflow.terminal_states,
                strategy=GenerationStrategy.TIMESTAMP_AFTER,
                parameters={
                    "after_field": "created_at",
                    "min_hours": 1,
                    "max_hours": 48,
                },
                priority=60,
            ))

            # Consistency: null for pending
            consistency.append(ConsistencyRule(
                condition_field=workflow.status_field,
                condition_values=workflow.pending_states,
                set_fields={workflow.response_timestamp: None},
                priority=60,
            ))

        # Response message null for pending
        if workflow.response_message_field:
            rules.append(FieldRule(
                field_name=workflow.response_message_field,
                rule_type=RuleType.CONDITIONAL_NULL,
                depends_on=workflow.status_field,
                condition_values=workflow.pending_states,
                priority=50,
            ))

            consistency.append(ConsistencyRule(
                condition_field=workflow.status_field,
                condition_values=workflow.pending_states,
                set_fields={workflow.response_message_field: None},
                priority=50,
            ))

        return rules, consistency

    def _rules_from_api_audit(
        self,
        api: ApiAuditPattern,
    ) -> tuple[list[FieldRule], list[ConsistencyRule]]:
        """Generate rules from an API audit pattern."""
        rules = []
        consistency = []

        # Error message conditional on level
        if api.error_message_field and api.level_field:
            rules.append(FieldRule(
                field_name=api.error_message_field,
                rule_type=RuleType.CONDITIONAL_NULL,
                depends_on=api.level_field,
                condition_values=SEMANTIC_FIELD_PATTERNS["non_error_log_levels"],
                strategy=GenerationStrategy.CONTEXTUAL_MESSAGE,
                parameters={
                    "message_type": "error",
                    "templates": [
                        "Internal server error",
                        "Resource not found",
                        "Unauthorized access",
                        "Validation failed",
                        "Request timeout",
                        "Database connection error",
                        "Rate limit exceeded",
                    ],
                },
                priority=60,
            ))

            # Consistency: null for non-error levels
            consistency.append(ConsistencyRule(
                condition_field=api.level_field,
                condition_values=SEMANTIC_FIELD_PATTERNS["non_error_log_levels"],
                set_fields={api.error_message_field: None},
                priority=70,
            ))

        # Endpoint derived from resource
        if api.endpoint_field and api.resource_field:
            rules.append(FieldRule(
                field_name=api.endpoint_field,
                rule_type=RuleType.DERIVE_FROM_FIELD,
                depends_on=api.resource_field,
                strategy=GenerationStrategy.API_PATH,
                parameters={
                    "resource_field": api.resource_field,
                    "resource_id_field": api.resource_id_field,
                    "path_template": "/api/v1/{resource}s/{resource_id}",
                    "list_template": "/api/v1/{resource}s",
                },
                priority=60,
            ))

        # Resource ID as numeric string
        if api.resource_id_field:
            rules.append(FieldRule(
                field_name=api.resource_id_field,
                rule_type=RuleType.GENERATE_PATTERN,
                depends_on=api.resource_field,
                strategy=GenerationStrategy.DERIVED_ID,
                parameters={
                    "format": "numeric_string",
                    "min": 1,
                    "max": 10000,
                },
                priority=60,
            ))

        # Status code consistent with level
        if api.status_code_field and api.level_field:
            rules.append(FieldRule(
                field_name=api.status_code_field,
                rule_type=RuleType.VALUE_CONSISTENCY,
                depends_on=api.level_field,
                strategy=GenerationStrategy.HTTP_STATUS,
                parameters={
                    "success_codes": SEMANTIC_FIELD_PATTERNS["http_success_codes"],
                    "error_codes": SEMANTIC_FIELD_PATTERNS["http_client_error_codes"] +
                                   SEMANTIC_FIELD_PATTERNS["http_server_error_codes"],
                },
                priority=70,
            ))

        # Response data consistency with level
        if api.response_data_field and api.level_field:
            consistency.append(ConsistencyRule(
                condition_field=api.level_field,
                condition_values=SEMANTIC_FIELD_PATTERNS["error_log_levels"],
                set_fields={
                    api.response_data_field: '{"success": false}',
                },
                priority=50,
            ))

        return rules, consistency

    def _rules_from_conditional_field(
        self,
        cf: ConditionalField,
    ) -> tuple[list[FieldRule], ConsistencyRule | None]:
        """Generate rules from a conditional field."""
        rules = []
        consistency = None

        if cf.null_when:
            rules.append(FieldRule(
                field_name=cf.field_name,
                rule_type=RuleType.CONDITIONAL_NULL,
                depends_on=cf.depends_on,
                condition_values=cf.null_when,
                priority=50,
            ))

            consistency = ConsistencyRule(
                condition_field=cf.depends_on,
                condition_values=cf.null_when,
                set_fields={cf.field_name: None},
                priority=50,
            )

        if cf.required_when:
            rules.append(FieldRule(
                field_name=cf.field_name,
                rule_type=RuleType.CONDITIONAL_REQUIRED,
                depends_on=cf.depends_on,
                condition_values=cf.required_when,
                priority=60,
            ))

        if cf.derive_from:
            rules.append(FieldRule(
                field_name=cf.field_name,
                rule_type=RuleType.DERIVE_FROM_FIELD,
                depends_on=cf.derive_from,
                strategy=GenerationStrategy.DERIVED_ID,
                priority=55,
            ))

        return rules, consistency
