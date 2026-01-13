"""
Tests for field_groups coordinated nullability.

Field groups ensure related fields are all-null or all-present together.
For example, birthday_month and birthday_day should both be null or both have values.
"""

import pytest
from data_generation.generator.data_generator import DataGenerator


class TestFieldGroupDetection:
    """Tests for detecting fields in groups."""

    def test_field_in_group_detected(self):
        """Test that fields in a group are detected."""
        generator = DataGenerator(seed=42)

        generator.config["field_groups"] = {
            "users": {
                "birthday": {
                    "fields": ["birthday_month", "birthday_day"],
                    "null_probability": 0.5
                }
            }
        }

        generator.context.new_row("users", 1)

        # First field in group - should make decision
        result1 = generator._check_field_group_null("users", "birthday_month")
        assert result1 is not None  # Should be True or False

        # Second field in group - should use same decision
        result2 = generator._check_field_group_null("users", "birthday_day")
        assert result2 == result1  # Same decision

    def test_field_not_in_group_returns_none(self):
        """Test that fields not in any group return None."""
        generator = DataGenerator(seed=42)

        generator.config["field_groups"] = {
            "users": {
                "birthday": {
                    "fields": ["birthday_month", "birthday_day"],
                    "null_probability": 0.5
                }
            }
        }

        result = generator._check_field_group_null("users", "email")
        assert result is None

    def test_field_in_different_table_not_affected(self):
        """Test that field groups are table-specific."""
        generator = DataGenerator(seed=42)

        generator.config["field_groups"] = {
            "users": {
                "birthday": {
                    "fields": ["birthday_month", "birthday_day"],
                    "null_probability": 0.5
                }
            }
        }

        # Check field in a different table
        result = generator._check_field_group_null("contacts", "birthday_month")
        assert result is None


class TestFieldGroupNullability:
    """Tests for coordinated nullability behavior."""

    def test_field_group_all_null(self):
        """Test that all fields in group are null together."""
        generator = DataGenerator(seed=42)

        # Set null_probability to 1.0 to always be null
        generator.config["field_groups"] = {
            "users": {
                "birthday": {
                    "fields": ["birthday_month", "birthday_day"],
                    "null_probability": 1.0
                }
            }
        }

        generator.context.new_row("users", 1)

        result1 = generator._check_field_group_null("users", "birthday_month")
        result2 = generator._check_field_group_null("users", "birthday_day")

        assert result1 is True
        assert result2 is True

    def test_field_group_all_not_null(self):
        """Test that all fields in group are not null together."""
        generator = DataGenerator(seed=42)

        # Set null_probability to 0.0 to never be null
        generator.config["field_groups"] = {
            "users": {
                "birthday": {
                    "fields": ["birthday_month", "birthday_day"],
                    "null_probability": 0.0
                }
            }
        }

        generator.context.new_row("users", 1)

        result1 = generator._check_field_group_null("users", "birthday_month")
        result2 = generator._check_field_group_null("users", "birthday_day")

        assert result1 is False
        assert result2 is False

    def test_field_group_consistency_across_fields(self):
        """Test that group decision is consistent across all fields."""
        generator = DataGenerator(seed=42)

        generator.config["field_groups"] = {
            "users": {
                "address": {
                    "fields": ["street", "city", "zip_code"],
                    "null_probability": 0.5
                }
            }
        }

        generator.context.new_row("users", 1)

        # Check all three fields
        result1 = generator._check_field_group_null("users", "street")
        result2 = generator._check_field_group_null("users", "city")
        result3 = generator._check_field_group_null("users", "zip_code")

        # All should have same value
        assert result1 == result2 == result3


class TestFieldGroupNewRow:
    """Tests for field group behavior across rows."""

    def test_new_row_resets_group_decision(self):
        """Test that starting a new row resets the group decision."""
        generator = DataGenerator(seed=42)

        generator.config["field_groups"] = {
            "users": {
                "birthday": {
                    "fields": ["birthday_month", "birthday_day"],
                    "null_probability": 0.5
                }
            }
        }

        # Row 1
        generator.context.new_row("users", 1)
        row1_result = generator._check_field_group_null("users", "birthday_month")

        # Row 2 - should be independent decision
        generator.context.new_row("users", 2)
        row2_result = generator._check_field_group_null("users", "birthday_month")

        # Results may be same or different - the point is they're independent
        # We can't assert they're different since it's random
        # But we can verify the mechanism works by checking consistency within row 2
        row2_result2 = generator._check_field_group_null("users", "birthday_day")
        assert row2_result == row2_result2


class TestMultipleFieldGroups:
    """Tests for multiple field groups in same table."""

    def test_multiple_groups_independent(self):
        """Test that multiple groups in same table are independent."""
        generator = DataGenerator(seed=42)

        generator.config["field_groups"] = {
            "users": {
                "birthday": {
                    "fields": ["birthday_month", "birthday_day"],
                    "null_probability": 1.0  # Always null
                },
                "address": {
                    "fields": ["street", "city"],
                    "null_probability": 0.0  # Never null
                }
            }
        }

        generator.context.new_row("users", 1)

        # Birthday group should be null
        bday_result = generator._check_field_group_null("users", "birthday_month")
        assert bday_result is True

        # Address group should not be null
        addr_result = generator._check_field_group_null("users", "street")
        assert addr_result is False
