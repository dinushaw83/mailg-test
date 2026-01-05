#!/usr/bin/env python3
"""
Demo script for the Schema Inference Engine.

Shows what patterns and rules are inferred from the schema.
"""

import json
import sys
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from data_generation.generator.inference import (
    SchemaInferenceEngine,
    Domain,
)


def main():
    # Load the schema
    schema_path = Path(__file__).parent.parent / "backend" / "database_schema.json"

    if not schema_path.exists():
        print(f"Schema not found at: {schema_path}")
        return

    with open(schema_path) as f:
        schema = json.load(f)

    print("=" * 70)
    print("SCHEMA INFERENCE ENGINE DEMO")
    print("=" * 70)

    # Create engine with domain hint
    engine = SchemaInferenceEngine(domain_hint="ticketing")

    # Analyze schema
    inferred_rules = engine.analyze(schema)

    # Print report
    engine.print_report()

    # Show detailed rules for specific tables
    print("\n" + "=" * 70)
    print("DETAILED RULES FOR PROBLEM TABLES")
    print("=" * 70)

    # API Logs
    print("\n📋 API_LOGS TABLE:")
    print("-" * 50)
    api_logs_rules = inferred_rules.get_table_rules("api_logs")
    if api_logs_rules:
        print(f"  Generation order: {api_logs_rules.generation_order}")
        print(f"\n  Field Rules:")
        for field, rules in api_logs_rules.field_rules.items():
            for rule in rules:
                print(f"    {field}:")
                print(f"      Type: {rule.rule_type.name}")
                print(f"      Depends on: {rule.depends_on}")
                if rule.strategy:
                    print(f"      Strategy: {rule.strategy.value}")
                if rule.condition_values:
                    print(f"      Condition values: {rule.condition_values[:3]}...")

        print(f"\n  Consistency Rules:")
        for rule in api_logs_rules.consistency_rules:
            print(f"    When {rule.condition_field} in {rule.condition_values[:3]}...:")
            for field, value in rule.set_fields.items():
                print(f"      Set {field} = {value}")

    # Approval Requests
    print("\n\n📋 APPROVAL_REQUESTS TABLE:")
    print("-" * 50)
    approval_rules = inferred_rules.get_table_rules("approval_requests")
    if approval_rules:
        print(f"  Generation order: {approval_rules.generation_order}")
        print(f"\n  Field Rules:")
        for field, rules in approval_rules.field_rules.items():
            for rule in rules:
                print(f"    {field}:")
                print(f"      Type: {rule.rule_type.name}")
                print(f"      Depends on: {rule.depends_on}")
                if rule.strategy:
                    print(f"      Strategy: {rule.strategy.value}")
                if rule.condition_values:
                    print(f"      Condition values: {rule.condition_values}")

        print(f"\n  Consistency Rules:")
        for rule in approval_rules.consistency_rules:
            print(f"    When {rule.condition_field} in {rule.condition_values}:")
            for field, value in rule.set_fields.items():
                print(f"      Set {field} = {value}")

    # Show inferred patterns for all tables
    print("\n\n" + "=" * 70)
    print("ALL DETECTED PATTERNS")
    print("=" * 70)

    for table_name, patterns in engine._table_patterns.items():
        has_patterns = (
            patterns.sibling_pairs or
            patterns.conditional_timestamps or
            patterns.workflow or
            patterns.api_audit or
            patterns.soft_delete
        )

        if has_patterns:
            print(f"\n📊 {table_name}:")

            if patterns.sibling_pairs:
                print(f"  Sibling pairs:")
                for pair in patterns.sibling_pairs:
                    print(f"    {pair.base_field} → {pair.derived_field} ({pair.relationship})")

            if patterns.conditional_timestamps:
                print(f"  Conditional timestamps:")
                for ct in patterns.conditional_timestamps:
                    print(f"    {ct.timestamp_field} depends on {ct.condition_field}")

            if patterns.workflow:
                wf = patterns.workflow
                print(f"  Workflow pattern:")
                print(f"    Status field: {wf.status_field}")
                print(f"    Pending states: {wf.pending_states}")
                print(f"    Terminal states: {wf.terminal_states}")
                print(f"    Approver field: {wf.approver_field}")
                print(f"    Response timestamp: {wf.response_timestamp}")

            if patterns.api_audit:
                api = patterns.api_audit
                print(f"  API audit pattern:")
                print(f"    Method: {api.method_field}")
                print(f"    Endpoint: {api.endpoint_field}")
                print(f"    Resource: {api.resource_field}")
                print(f"    Resource ID: {api.resource_id_field}")
                print(f"    Level: {api.level_field}")
                print(f"    Error message: {api.error_message_field}")

            if patterns.soft_delete:
                sd = patterns.soft_delete
                print(f"  Soft delete pattern:")
                print(f"    Flag: {sd.flag_field}")
                print(f"    Timestamp: {sd.timestamp_field}")

    # Demo generating values with inference
    print("\n\n" + "=" * 70)
    print("DEMO: GENERATING VALUES WITH INFERENCE")
    print("=" * 70)

    from data_generation.generator.inference import InferenceAwareGenerator

    gen = InferenceAwareGenerator(inferred_rules)

    # Test API logs generation
    print("\n📋 API Logs - Error Case:")
    context = {
        "level": "ERROR",
        "operation": "UPDATE",
        "resource": "ticket",
    }

    # Generate resource_id
    resource_id, _ = gen.generate_value("api_logs", "resource_id", context)
    context["resource_id"] = resource_id
    print(f"  resource_id: {resource_id}")

    # Generate endpoint
    endpoint, _ = gen.generate_value("api_logs", "endpoint", context)
    print(f"  endpoint: {endpoint}")

    # Check if error_message should be null
    should_null = gen.should_be_null("api_logs", "error_message", {"level": "INFO"})
    print(f"  error_message null when INFO: {should_null}")

    should_null = gen.should_be_null("api_logs", "error_message", {"level": "ERROR"})
    print(f"  error_message null when ERROR: {should_null}")

    # Generate error message
    error_msg, _ = gen.generate_value("api_logs", "error_message", context)
    print(f"  error_message: {error_msg}")

    # Test approval requests
    print("\n📋 Approval Requests - Pending Case:")
    context = {"status": "pending", "created_at": "2025-01-15T10:00:00"}

    should_null = gen.should_be_null("approval_requests", "approver_id", context)
    print(f"  approver_id null when pending: {should_null}")

    should_null = gen.should_be_null("approval_requests", "responded_at", context)
    print(f"  responded_at null when pending: {should_null}")

    print("\n📋 Approval Requests - Approved Case:")
    context = {"status": "approved", "created_at": "2025-01-15T10:00:00"}

    must_have = gen.must_have_value("approval_requests", "approver_id", context)
    print(f"  approver_id required when approved: {must_have}")

    must_have = gen.must_have_value("approval_requests", "responded_at", context)
    print(f"  responded_at required when approved: {must_have}")


if __name__ == "__main__":
    main()
