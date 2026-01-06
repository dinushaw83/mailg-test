"""
Schema analyzer for generating configuration from a database schema.

Analyzes a JSON schema and generates a YAML configuration file with:
- Table row counts based on relationship hierarchy
- Distributions for enum fields
- Null probabilities for optional fields
- Suggested consistency rules for common patterns
"""

import re
from collections import defaultdict
from typing import Any

import yaml


class SchemaAnalyzer:
    """
    Analyzes a database schema to generate configuration.

    Examines table relationships, field types, and naming patterns
    to produce a starter configuration file.
    """

    # Common field patterns that suggest consistency rules
    CONSISTENCY_PATTERNS = [
        # (boolean_field, timestamp_field, condition_value)
        ("suspended", "suspended_at", True),
        ("is_deleted", "deleted_at", True),
        ("is_spam", "spam_marked_at", True),
        ("is_active", "deactivated_at", False),
        ("is_verified", "verified_at", True),
        ("is_archived", "archived_at", True),
        ("is_resolved", "resolved_at", True),
        ("is_closed", "closed_at", True),
    ]

    # Status field patterns (status field -> timestamp field for certain values)
    STATUS_PATTERNS = [
        ("status", "solved_at", ["done", "closed"]),
        ("status", "closed_at", ["closed"]),
        ("status", "completed_at", ["completed", "done", "closed"]),
    ]

    # Base row count for parent tables
    BASE_ROW_COUNT = 100

    def __init__(self, schema: dict[str, Any]):
        """
        Initialize with a schema.

        Args:
            schema: The database schema dictionary.
        """
        self.schema = schema
        self.tables = self._get_tables()
        self.relationships = self._build_relationship_map()

    def _get_tables(self) -> dict[str, Any]:
        """Extract tables from schema."""
        return self.schema.get("properties", {}).get("tables", {}).get("properties", {})

    def _get_table_properties(self, table_schema: dict[str, Any]) -> dict[str, Any]:
        """Extract properties from a table schema."""
        return table_schema.get("properties", {})

    def _get_required_fields(self, table_schema: dict[str, Any]) -> list[str]:
        """Extract required fields from a table schema."""
        return table_schema.get("required", [])

    def _build_relationship_map(self) -> dict[str, list[str]]:
        """
        Build a map of table relationships.

        Returns:
            Dict mapping table names to list of tables they depend on.
        """
        deps: dict[str, list[str]] = defaultdict(list)

        for table_name, table_schema in self.tables.items():
            props = self._get_table_properties(table_schema)
            for prop_name, prop_def in props.items():
                if "foreignKey" in prop_def:
                    fk = prop_def["foreignKey"]
                    # Parse "table.column" format
                    if "." in fk:
                        ref_table = fk.split(".")[0]
                        if ref_table != table_name:  # Exclude self-references
                            deps[table_name].append(ref_table)

        return deps

    def analyze(self) -> dict[str, Any]:
        """
        Analyze the schema and generate configuration.

        Returns:
            Configuration dictionary ready to be written as YAML.
        """
        config: dict[str, Any] = {
            "version": "1.0",
            "default_rows": self.BASE_ROW_COUNT,
        }

        # Generate table defaults
        config["table_defaults"] = self._analyze_table_counts()

        # Generate distributions for enum fields
        distributions = self._analyze_distributions()
        if distributions:
            config["distributions"] = distributions

        # Generate enum lists
        enums = self._analyze_enums()
        if enums:
            config["enums"] = enums

        # Generate null probabilities
        null_probs = self._analyze_null_probabilities()
        if null_probs:
            config["null_probabilities"] = null_probs

        # Generate foreign key settings
        config["foreign_keys"] = {
            "self_reference_null_probability": 0.70,
            "optional_null_probability": 0.20,
        }

        # Generate consistency rules
        rules = self._analyze_consistency_rules()
        if rules:
            config["consistency_rules"] = rules

        # Add placeholder sections for customization
        config["templates"] = self._generate_template_placeholders()
        config["samples"] = self._generate_sample_placeholders()

        return config

    def _analyze_table_counts(self) -> dict[str, int]:
        """
        Determine row counts based on table hierarchy.

        Parent tables get fewer rows, child/junction tables get more.
        """
        counts: dict[str, int] = {}

        # Calculate depth in relationship hierarchy
        depths = self._calculate_table_depths()

        for table_name in self.tables:
            depth = depths.get(table_name, 0)

            # Base count adjusted by depth
            # Parent tables (depth 0): fewer rows
            # Child tables (higher depth): more rows
            if depth == 0:
                count = 20  # Root/parent tables
            elif depth == 1:
                count = 100  # Direct children
            elif depth == 2:
                count = 200  # Grandchildren
            else:
                count = 500  # Deep children / junction tables

            # Junction tables (multiple FKs, few other columns) get more rows
            if self._is_junction_table(table_name):
                count = max(count, 300)

            # Log tables get many more rows
            if "log" in table_name.lower() or "history" in table_name.lower():
                count = 1000

            counts[table_name] = count

        return counts

    def _calculate_table_depths(self) -> dict[str, int]:
        """Calculate depth of each table in the relationship hierarchy."""
        depths: dict[str, int] = {}

        # Find root tables (no dependencies)
        for table_name in self.tables:
            if not self.relationships.get(table_name):
                depths[table_name] = 0

        # Propagate depths
        changed = True
        while changed:
            changed = False
            for table_name in self.tables:
                if table_name in depths:
                    continue

                deps = self.relationships.get(table_name, [])
                if all(d in depths for d in deps):
                    depths[table_name] = max(depths[d] for d in deps) + 1
                    changed = True

        # Handle cycles - assign remaining tables depth based on dep count
        for table_name in self.tables:
            if table_name not in depths:
                depths[table_name] = len(self.relationships.get(table_name, []))

        return depths

    def _is_junction_table(self, table_name: str) -> bool:
        """Check if a table is a junction/linking table."""
        table_schema = self.tables.get(table_name, {})
        props = self._get_table_properties(table_schema)

        # Count FKs vs total columns
        fk_count = sum(1 for p in props.values() if "foreignKey" in p)
        total_cols = len(props)

        # Junction tables typically have mostly FK columns
        return fk_count >= 2 and fk_count >= (total_cols - 3)

    def _analyze_distributions(self) -> dict[str, dict[str, dict[str, int]]]:
        """
        Analyze enum fields and create equal distributions.
        """
        distributions: dict[str, dict[str, dict[str, int]]] = {}

        for table_name, table_schema in self.tables.items():
            props = self._get_table_properties(table_schema)
            table_dists: dict[str, dict[str, int]] = {}

            for prop_name, prop_def in props.items():
                # Try direct enum first
                enum_values = prop_def.get("enum")

                # If no direct enum, try to extract from description
                if not enum_values:
                    enum_values = self._extract_enum_from_description(prop_def)

                if enum_values and len(enum_values) > 1:
                    # Create equal distribution
                    weight = 100 // len(enum_values)
                    table_dists[prop_name] = {v: weight for v in enum_values}

            if table_dists:
                distributions[table_name] = table_dists

        return distributions

    def _extract_enum_from_description(self, prop_def: dict[str, Any]) -> list[str] | None:
        """
        Extract enum values from description field.

        Handles patterns like:
        - "e.g., 'new', 'open', 'pending'"
        - "(e.g., 'low', 'normal', 'high')"
        """
        description = prop_def.get("description", "")
        if not description:
            return None

        # Look for patterns like "e.g., 'value1', 'value2'" or "(e.g., 'value1', 'value2')"
        match = re.search(r"e\.g\.,?\s*(['\"][^'\"]+['\"](?:\s*,\s*['\"][^'\"]+['\"])*)", description)
        if match:
            values_str = match.group(1)
            # Extract quoted values
            values = re.findall(r"['\"]([^'\"]+)['\"]", values_str)
            if values:
                return values

        return None

    def _analyze_enums(self) -> dict[str, dict[str, list[str]]]:
        """
        Extract enum value lists from schema.
        """
        enums: dict[str, dict[str, list[str]]] = {}

        for table_name, table_schema in self.tables.items():
            props = self._get_table_properties(table_schema)
            table_enums: dict[str, list[str]] = {}

            for prop_name, prop_def in props.items():
                # Try direct enum first
                enum_values = prop_def.get("enum")

                # If no direct enum, try to extract from description
                if not enum_values:
                    enum_values = self._extract_enum_from_description(prop_def)

                if enum_values:
                    table_enums[prop_name] = enum_values

            if table_enums:
                enums[table_name] = table_enums

        return enums

    def _analyze_null_probabilities(self) -> dict[str, dict[str, float]]:
        """
        Analyze fields to determine null probabilities.
        """
        null_probs: dict[str, dict[str, float]] = {}

        for table_name, table_schema in self.tables.items():
            props = self._get_table_properties(table_schema)
            required = set(self._get_required_fields(table_schema))
            table_probs: dict[str, float] = {}

            for prop_name, prop_def in props.items():
                if prop_name in required:
                    continue  # Required fields don't need null probability

                # Check if nullable
                prop_type = prop_def.get("type", "")
                is_nullable = (
                    prop_type == "null" or
                    (isinstance(prop_type, list) and "null" in prop_type) or
                    "null" in str(prop_def.get("anyOf", []))
                )

                if not is_nullable:
                    continue

                # Assign probability based on field name patterns
                prob = self._estimate_null_probability(prop_name, prop_def)
                if prob > 0:
                    table_probs[prop_name] = prob

            if table_probs:
                null_probs[table_name] = table_probs

        return null_probs

    def _estimate_null_probability(self, field_name: str, prop_def: dict[str, Any]) -> float:
        """
        Estimate null probability based on field name and type.
        """
        name_lower = field_name.lower()

        # Foreign keys - moderate null probability
        if "foreignKey" in prop_def:
            return 0.20

        # Optional metadata fields - higher null probability
        if any(x in name_lower for x in ["note", "description", "comment", "memo"]):
            return 0.30

        # Photo/image fields
        if any(x in name_lower for x in ["photo", "image", "avatar", "picture"]):
            return 0.40

        # External IDs
        if "external" in name_lower:
            return 0.50

        # Phone numbers
        if "phone" in name_lower:
            return 0.15

        # Signature fields
        if "signature" in name_lower:
            return 0.40

        # Alias/nickname
        if any(x in name_lower for x in ["alias", "nickname"]):
            return 0.30

        # Timestamp fields for conditional states
        if name_lower.endswith("_at") and any(
            x in name_lower for x in ["deleted", "suspended", "archived", "solved", "spam"]
        ):
            return 0.70

        # Default for optional fields
        return 0.20

    def _analyze_consistency_rules(self) -> dict[str, list[dict[str, Any]]]:
        """
        Analyze schema for common field patterns that need consistency rules.
        """
        rules: dict[str, list[dict[str, Any]]] = {}

        for table_name, table_schema in self.tables.items():
            props = self._get_table_properties(table_schema)
            field_names = set(props.keys())
            table_rules: list[dict[str, Any]] = []

            # Check boolean/timestamp patterns
            for bool_field, ts_field, condition_value in self.CONSISTENCY_PATTERNS:
                if bool_field in field_names and ts_field in field_names:
                    # Rule when condition is true
                    table_rules.append({
                        "condition": {"field": bool_field, "equals": condition_value},
                        "set": {ts_field: "generate_past_timestamp(1, 90)"}
                    })
                    # Rule when condition is false
                    table_rules.append({
                        "condition": {"field": bool_field, "equals": not condition_value},
                        "set": {ts_field: None}
                    })

            # Check status/timestamp patterns
            for status_field, ts_field, status_values in self.STATUS_PATTERNS:
                if status_field in field_names and ts_field in field_names:
                    # Get actual enum values if available (from enum or description)
                    prop_def = props.get(status_field, {})
                    enum_values = prop_def.get("enum") or self._extract_enum_from_description(prop_def) or []
                    matching_values = [v for v in status_values if v in enum_values]

                    if matching_values:
                        table_rules.append({
                            "condition": {"field": status_field, "in": matching_values},
                            "set": {ts_field: "generate_timestamp_after(created_at, 1, 72)"}
                        })
                        # Non-matching values
                        non_matching = [v for v in enum_values if v not in matching_values]
                        if non_matching:
                            table_rules.append({
                                "condition": {"field": status_field, "in": non_matching},
                                "set": {ts_field: None}
                            })

            if table_rules:
                rules[table_name] = table_rules

        return rules

    def _generate_template_placeholders(self) -> dict[str, Any]:
        """Generate placeholder template section."""
        return {
            "subjects": {
                "patterns": [
                    "Issue with {topic}",
                    "Question about {topic}",
                    "Help needed: {topic}",
                ],
                "topics": ["feature", "account", "billing", "technical"],
                "actions": ["login", "access", "configure"],
            },
            "titles": {
                "patterns": [
                    "How to {action}",
                    "Getting started with {topic}",
                ],
                "topics": ["setup", "configuration", "integration"],
                "actions": ["get started", "configure", "troubleshoot"],
            },
        }

    def _generate_sample_placeholders(self) -> dict[str, Any]:
        """Generate placeholder samples section."""
        return {
            "tags": ["urgent", "important", "follow-up", "resolved"],
            "departments": ["Engineering", "Sales", "Support", "Marketing"],
            "support_email": "support@example.com",
            "support_name": "Support Team",
        }

    def to_yaml(self) -> str:
        """
        Generate YAML configuration from analysis.

        Returns:
            YAML string of the configuration.
        """
        config = self.analyze()

        # Custom YAML formatting
        yaml_str = yaml.dump(
            config,
            default_flow_style=False,
            sort_keys=False,
            allow_unicode=True,
            width=100,
        )

        # Add header comment
        header = """# Auto-generated configuration from schema analysis
# Review and customize this file for your needs
#
# Sections:
#   table_defaults: Row counts per table
#   distributions: Weighted distributions for enum fields
#   enums: Available enum values
#   null_probabilities: Probability of null values for optional fields
#   foreign_keys: FK generation settings
#   consistency_rules: Rules to ensure logical consistency between fields
#   templates: Text generation templates
#   samples: Sample values for various fields

"""
        return header + yaml_str


def analyze_schema(schema: dict[str, Any]) -> str:
    """
    Convenience function to analyze a schema and return YAML config.

    Args:
        schema: The database schema dictionary.

    Returns:
        YAML configuration string.
    """
    analyzer = SchemaAnalyzer(schema)
    return analyzer.to_yaml()
