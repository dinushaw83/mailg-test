"""
Main Schema Inference Engine.

Orchestrates domain detection, pattern analysis, and rule generation
to automatically infer data generation rules from JSON schemas.
"""

from dataclasses import dataclass
from typing import Any
import json
import logging

from .domain import DomainDetector, Domain, DomainVocabulary, DOMAIN_VOCABULARIES
from .patterns import PatternDetector, TablePatterns
from .rules import RuleGenerator, InferredRules, TableRules


logger = logging.getLogger(__name__)


@dataclass
class InferenceReport:
    """Report of what was inferred from the schema."""
    domain: Domain
    domain_confidence: float
    tables_analyzed: int
    patterns_detected: dict[str, dict[str, int]]  # table -> pattern_type -> count
    rules_generated: dict[str, int]  # table -> rule count
    warnings: list[str]
    suggestions: list[str]


class SchemaInferenceEngine:
    """
    Main engine for inferring generation rules from schemas.

    Usage:
        engine = SchemaInferenceEngine(domain_hint="ticketing")
        rules = engine.analyze(schema)
        merged_config = rules.merge_with_config(existing_config)
    """

    def __init__(
        self,
        domain_hint: str | None = None,
        strict_mode: bool = False,
    ):
        """
        Initialize the inference engine.

        Args:
            domain_hint: Optional domain hint (e.g., "ticketing", "hrm", "ecommerce").
            strict_mode: If True, only generate high-confidence rules.
        """
        self.domain_hint = domain_hint
        self.strict_mode = strict_mode
        self.domain_detector = DomainDetector(domain_hint)
        self.pattern_detector: PatternDetector | None = None
        self.rule_generator = RuleGenerator()
        self._table_patterns: dict[str, TablePatterns] = {}
        self._warnings: list[str] = []
        self._suggestions: list[str] = []

    def analyze(self, schema: dict[str, Any]) -> InferredRules:
        """
        Analyze a schema and generate inference rules.

        Args:
            schema: JSON schema dictionary.

        Returns:
            InferredRules containing all generated rules.
        """
        self._warnings = []
        self._suggestions = []
        self._table_patterns = {}

        # Step 1: Detect domain
        domain = self.domain_detector.detect(schema)
        logger.info(f"Detected domain: {domain.value} (confidence: {self.domain_detector.confidence:.2f})")

        if self.domain_detector.confidence < 0.5:
            self._warnings.append(
                f"Low confidence domain detection ({self.domain_detector.confidence:.2f}). "
                "Consider providing a domain_hint for better results."
            )

        # Step 2: Initialize pattern detector with domain context
        self.pattern_detector = PatternDetector(self.domain_detector)

        # Step 3: Analyze each table
        tables = self._get_tables(schema)
        inferred = InferredRules()

        for table_name, table_schema in tables.items():
            logger.debug(f"Analyzing table: {table_name}")

            # Detect patterns
            patterns = self.pattern_detector.analyze_table(table_name, table_schema)
            self._table_patterns[table_name] = patterns

            # Generate rules from patterns
            table_rules = self.rule_generator.generate_rules(patterns)
            inferred.tables[table_name] = table_rules

            # Log what was found
            self._log_patterns(table_name, patterns)

        # Step 4: Cross-table analysis
        self._analyze_cross_table_relationships(schema, inferred)

        # Step 5: Generate suggestions
        self._generate_suggestions(inferred)

        return inferred

    def _get_tables(self, schema: dict) -> dict[str, dict]:
        """Extract tables from schema structure."""
        # Handle different schema formats
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

    def _log_patterns(self, table_name: str, patterns: TablePatterns) -> None:
        """Log detected patterns for debugging."""
        found = []

        if patterns.sibling_pairs:
            found.append(f"{len(patterns.sibling_pairs)} sibling pairs")

        if patterns.conditional_timestamps:
            found.append(f"{len(patterns.conditional_timestamps)} conditional timestamps")

        if patterns.workflow:
            found.append("workflow pattern")

        if patterns.api_audit:
            found.append("API audit pattern")

        if patterns.soft_delete:
            found.append("soft delete pattern")

        if patterns.conditional_fields:
            found.append(f"{len(patterns.conditional_fields)} conditional fields")

        if found:
            logger.info(f"  {table_name}: {', '.join(found)}")

    def _analyze_cross_table_relationships(
        self,
        schema: dict,
        inferred: InferredRules,
    ) -> None:
        """
        Analyze relationships between tables.

        Uses the relationships section of the schema to understand
        foreign key constraints and their implications.
        """
        relationships = schema.get("relationships", [])
        if isinstance(relationships, dict):
            relationships = relationships.get("default", [])

        for rel in relationships:
            from_table = rel.get("from_table")
            from_column = rel.get("from_column")
            to_table = rel.get("to_table")
            on_delete = rel.get("on_delete", "NO ACTION")

            if not all([from_table, from_column, to_table]):
                continue

            # Add generation order hint: referenced table should be generated first
            if from_table in inferred.tables:
                table_rules = inferred.tables[from_table]
                if to_table not in table_rules.generation_order:
                    # Note: This is a hint for the generator, not enforced here
                    pass

            # Check for special relationship patterns
            if "approver" in from_column.lower() or "reviewer" in from_column.lower():
                # This FK is likely conditional on a status field
                table_patterns = self._table_patterns.get(from_table)
                if table_patterns and table_patterns.workflow:
                    logger.debug(
                        f"  {from_table}.{from_column} is conditional approver FK"
                    )

    def _generate_suggestions(self, inferred: InferredRules) -> None:
        """Generate suggestions for improving data quality."""
        for table_name, table_rules in inferred.tables.items():
            patterns = self._table_patterns.get(table_name)
            if not patterns:
                continue

            # Suggest workflow configuration if detected
            if patterns.workflow:
                wf = patterns.workflow
                if not wf.pending_states or not wf.terminal_states:
                    self._suggestions.append(
                        f"Table '{table_name}' has a workflow pattern but states couldn't be "
                        f"fully inferred. Consider adding explicit state values in the schema description."
                    )

            # Suggest API audit configuration
            if patterns.api_audit:
                api = patterns.api_audit
                if not api.resource_field:
                    self._suggestions.append(
                        f"Table '{table_name}' looks like an API audit log but 'resource' field "
                        f"wasn't found. Consider adding a 'resource' or 'resource_type' field."
                    )

    def get_report(self) -> InferenceReport:
        """
        Get a detailed report of what was inferred.

        Returns:
            InferenceReport with analysis details.
        """
        patterns_detected = {}
        rules_generated = {}

        for table_name, patterns in self._table_patterns.items():
            pattern_counts = {}

            if patterns.sibling_pairs:
                pattern_counts["sibling_pairs"] = len(patterns.sibling_pairs)
            if patterns.conditional_timestamps:
                pattern_counts["conditional_timestamps"] = len(patterns.conditional_timestamps)
            if patterns.workflow:
                pattern_counts["workflow"] = 1
            if patterns.api_audit:
                pattern_counts["api_audit"] = 1
            if patterns.soft_delete:
                pattern_counts["soft_delete"] = 1
            if patterns.conditional_fields:
                pattern_counts["conditional_fields"] = len(patterns.conditional_fields)

            patterns_detected[table_name] = pattern_counts

        return InferenceReport(
            domain=self.domain_detector.domain,
            domain_confidence=self.domain_detector.confidence,
            tables_analyzed=len(self._table_patterns),
            patterns_detected=patterns_detected,
            rules_generated=rules_generated,
            warnings=self._warnings,
            suggestions=self._suggestions,
        )

    def analyze_and_merge(
        self,
        schema: dict[str, Any],
        existing_config: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Analyze schema and merge inferred rules with existing config.

        Existing config takes precedence - inferred rules fill gaps.

        Args:
            schema: JSON schema dictionary.
            existing_config: Existing configuration dictionary.

        Returns:
            Merged configuration with inferred rules.
        """
        inferred = self.analyze(schema)
        return inferred.merge_with_config(existing_config)

    def print_report(self) -> None:
        """Print a human-readable report to stdout."""
        report = self.get_report()

        print(f"\n{'='*60}")
        print("SCHEMA INFERENCE REPORT")
        print(f"{'='*60}\n")

        print(f"Domain: {report.domain.value}")
        print(f"Confidence: {report.domain_confidence:.1%}")
        print(f"Tables analyzed: {report.tables_analyzed}\n")

        print("Patterns Detected:")
        print("-" * 40)
        for table_name, patterns in report.patterns_detected.items():
            if patterns:
                pattern_str = ", ".join(f"{k}: {v}" for k, v in patterns.items())
                print(f"  {table_name}: {pattern_str}")

        if report.warnings:
            print(f"\nWarnings:")
            print("-" * 40)
            for warning in report.warnings:
                print(f"  ⚠ {warning}")

        if report.suggestions:
            print(f"\nSuggestions:")
            print("-" * 40)
            for suggestion in report.suggestions:
                print(f"  💡 {suggestion}")

        print(f"\n{'='*60}\n")


def analyze_schema_file(
    schema_path: str,
    domain_hint: str | None = None,
    output_path: str | None = None,
) -> InferredRules:
    """
    Convenience function to analyze a schema file.

    Args:
        schema_path: Path to JSON schema file.
        domain_hint: Optional domain hint.
        output_path: Optional path to write inferred rules as YAML.

    Returns:
        InferredRules from analysis.
    """
    with open(schema_path) as f:
        schema = json.load(f)

    engine = SchemaInferenceEngine(domain_hint=domain_hint)
    rules = engine.analyze(schema)

    engine.print_report()

    if output_path:
        # Convert to YAML-compatible dict and write
        import yaml
        config = rules.merge_with_config({})
        with open(output_path, 'w') as f:
            yaml.dump(config, f, default_flow_style=False, sort_keys=False)
        print(f"Wrote inferred rules to: {output_path}")

    return rules
