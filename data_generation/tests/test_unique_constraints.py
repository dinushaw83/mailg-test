"""Tests for unique constraint enforcement when appending to existing data."""

import pytest
from data_generation.generator.core.context import GenerationContext


class TestUniqueConstraintEnforcement:
    """Tests that unique values from existing records are tracked and enforced."""

    def test_single_column_unique_populated_from_existing(self):
        """Single-column unique fields from existing records are registered."""
        context = GenerationContext()
        context.config = {}

        schema = {
            "users": {
                "properties": {
                    "id": {"type": "integer"},
                    "email": {"type": "string", "unique": True},
                },
                "uniqueConstraints": [],
            }
        }
        existing_data = {
            "users": [
                {"id": 1, "email": "alice@example.com"},
                {"id": 2, "email": "bob@example.com"},
            ]
        }

        context.load_existing_records(existing_data, schema=schema)

        # Existing emails should be marked as used
        assert context.is_unique_value_used("users", "email", "alice@example.com")
        assert context.is_unique_value_used("users", "email", "bob@example.com")
        # New email should not be marked
        assert not context.is_unique_value_used("users", "email", "charlie@example.com")

    def test_composite_unique_populated_from_existing(self):
        """Composite unique constraints from existing records are registered."""
        context = GenerationContext()
        context.config = {}

        schema = {
            "thread_labels": {
                "properties": {
                    "thread_id": {"type": "integer"},
                    "label_id": {"type": "integer"},
                    "user_id": {"type": "integer"},
                },
                "uniqueConstraints": [["thread_id", "label_id"]],
            }
        }
        existing_data = {
            "thread_labels": [
                {"thread_id": 1, "label_id": 10, "user_id": 100},
                {"thread_id": 2, "label_id": 20, "user_id": 200},
            ]
        }

        context.load_existing_records(existing_data, schema=schema)

        existing = context.get_existing_composite_uniques("thread_labels", ["thread_id", "label_id"])
        assert (1, 10) in existing
        assert (2, 20) in existing
        assert (3, 30) not in existing

    def test_no_schema_still_works(self):
        """load_existing_records without schema doesn't crash (backward compat)."""
        context = GenerationContext()
        context.config = {}

        existing_data = {
            "users": [{"id": 1, "email": "a@b.com"}]
        }

        # Should not raise
        context.load_existing_records(existing_data)

        # Unique values should NOT be populated (no schema provided)
        assert not context.is_unique_value_used("users", "email", "a@b.com")

    def test_null_values_not_tracked(self):
        """Null values in unique fields should not be tracked."""
        context = GenerationContext()
        context.config = {}

        schema = {
            "users": {
                "properties": {
                    "id": {"type": "integer"},
                    "email": {"type": "string", "unique": True},
                },
                "uniqueConstraints": [],
            }
        }
        existing_data = {
            "users": [
                {"id": 1, "email": None},
            ]
        }

        context.load_existing_records(existing_data, schema=schema)

        # None should not be registered
        assert not context.is_unique_value_used("users", "email", None)

    def test_composite_key_order_independent(self):
        """Composite constraint lookup works regardless of column order in query."""
        context = GenerationContext()
        context.config = {}

        schema = {
            "tl": {
                "properties": {
                    "a": {"type": "integer"},
                    "b": {"type": "integer"},
                },
                "uniqueConstraints": [["b", "a"]],
            }
        }
        existing_data = {
            "tl": [{"a": 1, "b": 2}]
        }

        context.load_existing_records(existing_data, schema=schema)

        # Both orderings should find the same set (key is sorted)
        assert context.get_existing_composite_uniques("tl", ["a", "b"]) == \
               context.get_existing_composite_uniques("tl", ["b", "a"])
