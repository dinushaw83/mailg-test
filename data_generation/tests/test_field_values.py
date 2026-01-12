"""
Tests for field_values configuration support.

Field values config allows specifying value sources for any field,
either as inline values or references to config paths.
"""

import pytest
from data_generation.generator.data_generator import DataGenerator


class TestFieldValuesConfig:
    """Tests for field_values configuration lookup."""

    def test_get_field_value_config(self):
        """Test getting field value configuration."""
        generator = DataGenerator(seed=42)

        generator.config["field_values"] = {
            "test_table": {
                "status": {
                    "values": ["active", "inactive", "pending"]
                }
            }
        }

        config = generator._get_field_value_config("test_table", "status")
        assert config is not None
        assert config["values"] == ["active", "inactive", "pending"]

    def test_field_values_returns_none_for_unconfigured(self):
        """Test that unconfigured fields return None."""
        generator = DataGenerator(seed=42)

        config = generator._get_field_value_config("unknown_table", "unknown_field")
        assert config is None

    def test_field_values_different_tables(self):
        """Test field values for different tables."""
        generator = DataGenerator(seed=42)

        generator.config["field_values"] = {
            "users": {
                "role": {"values": ["admin", "user"]}
            },
            "orders": {
                "status": {"values": ["pending", "shipped"]}
            }
        }

        user_config = generator._get_field_value_config("users", "role")
        order_config = generator._get_field_value_config("orders", "status")

        assert user_config["values"] == ["admin", "user"]
        assert order_config["values"] == ["pending", "shipped"]


class TestResolveFieldValues:
    """Tests for resolving field values from config."""

    def test_resolve_inline_values(self):
        """Test resolving inline values."""
        generator = DataGenerator(seed=42)

        config = {"values": ["a", "b", "c"]}
        values = generator._resolve_field_values(config)

        assert values == ["a", "b", "c"]

    def test_resolve_source_path(self):
        """Test resolving values from source path."""
        generator = DataGenerator(seed=42)

        generator.config["samples"] = {
            "colors": ["red", "green", "blue"]
        }

        config = {"source": "samples.colors"}
        values = generator._resolve_field_values(config)

        assert values == ["red", "green", "blue"]

    def test_resolve_nested_source_path(self):
        """Test resolving values from nested source path."""
        generator = DataGenerator(seed=42)

        generator.config["data"] = {
            "categories": {
                "names": ["cat1", "cat2"]
            }
        }

        config = {"source": "data.categories.names"}
        values = generator._resolve_field_values(config)

        assert values == ["cat1", "cat2"]

    def test_resolve_missing_source_returns_empty(self):
        """Test that missing source path returns empty list."""
        generator = DataGenerator(seed=42)

        config = {"source": "nonexistent.path"}
        values = generator._resolve_field_values(config)

        assert values == []

    def test_inline_values_take_precedence(self):
        """Test that inline values take precedence over source."""
        generator = DataGenerator(seed=42)

        generator.config["samples"] = {
            "colors": ["red", "green", "blue"]
        }

        config = {
            "values": ["custom1", "custom2"],
            "source": "samples.colors"
        }
        values = generator._resolve_field_values(config)

        # Inline values should take precedence
        assert values == ["custom1", "custom2"]


class TestUniqueValuePicking:
    """Tests for unique value picking."""

    def test_pick_unique_value(self):
        """Test picking unique values."""
        generator = DataGenerator(seed=42)

        values = ["a", "b", "c"]

        picked = set()
        for _ in range(3):
            value = generator._pick_unique_value("test", "field", values)
            picked.add(value)

        # Should have picked 3 unique values
        assert len(picked) == 3
        assert picked == {"a", "b", "c"}

    def test_pick_unique_value_exhausted(self):
        """Test picking unique values when exhausted appends suffix."""
        generator = DataGenerator(seed=42)

        values = ["only"]

        # Pick the only value
        v1 = generator._pick_unique_value("test", "field", values)
        assert v1 == "only"

        # Pick again - should get suffixed version
        v2 = generator._pick_unique_value("test", "field", values)
        assert v2 == "only_1"

        # Pick again
        v3 = generator._pick_unique_value("test", "field", values)
        assert v3 == "only_2"

    def test_unique_values_across_tables(self):
        """Test that unique values are tracked per table."""
        generator = DataGenerator(seed=42)

        values = ["shared"]

        # Pick from table1
        v1 = generator._pick_unique_value("table1", "field", values)
        assert v1 == "shared"

        # Pick from table2 - should also get "shared" since different table
        v2 = generator._pick_unique_value("table2", "field", values)
        assert v2 == "shared"

    def test_unique_values_across_fields(self):
        """Test that unique values are tracked per field."""
        generator = DataGenerator(seed=42)

        values = ["shared"]

        # Pick from field1
        v1 = generator._pick_unique_value("table", "field1", values)
        assert v1 == "shared"

        # Pick from field2 - should also get "shared" since different field
        v2 = generator._pick_unique_value("table", "field2", values)
        assert v2 == "shared"
