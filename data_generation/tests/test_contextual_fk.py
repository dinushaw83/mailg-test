"""Tests for contextual foreign key constraints.

Tests verify that:
1. Contextual FK lookup works (e.g., label_id must match owner_id)
2. Generator respects contextual constraints during data generation
3. Configuration is correctly parsed and applied
"""

import pytest
from data_generation.generator.core.context import GenerationContext


class TestContextualFkLookup:
    """Tests for GenerationContext.get_contextual_fk_value method."""

    def test_basic_contextual_lookup(self):
        """Test that contextual FK lookup returns matching IDs."""
        context = GenerationContext()

        # Register labels with their owner_id attributes
        # Label 1 belongs to user 1
        context.register_id("labels", 1, owner_id=1)
        # Label 2 belongs to user 1
        context.register_id("labels", 2, owner_id=1)
        # Label 3 belongs to user 2
        context.register_id("labels", 3, owner_id=2)
        # Label 4 belongs to user 2
        context.register_id("labels", 4, owner_id=2)

        # Set current row context (thread_label for user 1)
        context.current_row = {"owner_id": 1}

        # Get contextual FK - should only return labels 1 or 2
        for _ in range(50):  # Test multiple times for randomness
            result = context.get_contextual_fk_value(
                ref_table="labels",
                context_field="owner_id",
                target_field="owner_id",
                nullable=False,
            )
            assert result in [1, 2], f"Expected label 1 or 2, got {result}"

    def test_contextual_lookup_different_owner(self):
        """Test that contextual FK lookup returns correct IDs for different owner."""
        context = GenerationContext()

        # Register labels
        context.register_id("labels", 1, owner_id=1)
        context.register_id("labels", 2, owner_id=1)
        context.register_id("labels", 3, owner_id=2)
        context.register_id("labels", 4, owner_id=2)

        # Set current row context (thread_label for user 2)
        context.current_row = {"owner_id": 2}

        # Get contextual FK - should only return labels 3 or 4
        for _ in range(50):
            result = context.get_contextual_fk_value(
                ref_table="labels",
                context_field="owner_id",
                target_field="owner_id",
                nullable=False,
            )
            assert result in [3, 4], f"Expected label 3 or 4, got {result}"

    def test_contextual_lookup_no_matching_ids(self):
        """Test behavior when no IDs match the context."""
        context = GenerationContext()

        # Register labels only for user 1
        context.register_id("labels", 1, owner_id=1)
        context.register_id("labels", 2, owner_id=1)

        # Set current row context (thread_label for user 3 - no labels)
        context.current_row = {"owner_id": 3}

        # Nullable: should return None
        result = context.get_contextual_fk_value(
            ref_table="labels",
            context_field="owner_id",
            target_field="owner_id",
            nullable=True,
        )
        assert result is None

        # Non-nullable: should fall back to any label ID
        result = context.get_contextual_fk_value(
            ref_table="labels",
            context_field="owner_id",
            target_field="owner_id",
            nullable=False,
        )
        assert result in [1, 2]  # Falls back to any available ID

    def test_contextual_lookup_null_context_value(self):
        """Test behavior when context field is None."""
        context = GenerationContext()

        context.register_id("labels", 1, owner_id=1)

        # Set current row with null owner_id
        context.current_row = {"owner_id": None}

        # Nullable: should return None
        result = context.get_contextual_fk_value(
            ref_table="labels",
            context_field="owner_id",
            target_field="owner_id",
            nullable=True,
        )
        assert result is None

    def test_contextual_lookup_null_probability(self):
        """Test that null probability is respected for nullable FKs."""
        context = GenerationContext()
        context.set_seed(42)  # Deterministic randomness

        context.register_id("labels", 1, owner_id=1)
        context.current_row = {"owner_id": 1}

        # With 100% null probability, should always return None
        result = context.get_contextual_fk_value(
            ref_table="labels",
            context_field="owner_id",
            target_field="owner_id",
            nullable=True,
            null_probability=1.0,
        )
        assert result is None

        # With 0% null probability, should never return None
        for _ in range(20):
            result = context.get_contextual_fk_value(
                ref_table="labels",
                context_field="owner_id",
                target_field="owner_id",
                nullable=True,
                null_probability=0.0,
            )
            assert result == 1


class TestContextualFkInGenerator:
    """Tests for contextual FK constraints in the data generator."""

    @pytest.fixture
    def config_with_contextual_fk(self):
        """Config with contextual FK constraint for label_id based on owner."""
        return {
            "default_rows": 10,
            "table_defaults": {
                "users": 3,
                "labels": 9,  # 3 labels per user
                "thread_labels": 30,
            },
            "contextual_foreign_keys": {
                "thread_labels": {
                    "label_id": {
                        "must_match": {
                            "source_field": "user_id",
                            "target_field": "owner_id",
                        }
                    }
                }
            },
            "id_registration_attributes": {
                "labels": ["owner_id"],
            },
            "null_probabilities": {
                "thread_labels": {
                    "label_id": 0.0,  # Always assign a label
                }
            },
            "distributions": {
                "emails": {
                    "status": {"draft": 50, "sent": 50},
                    "folder": {"inbox": 50, "sent": 50},
                    "category": {"primary": 50, "promotions": 50},
                },
                "users": {
                    "role": {"admin": 20, "user": 80},
                },
                "attachments": {
                    "attachment_type": {"file": 50, "image": 50},
                },
            },
        }

    def test_generator_respects_contextual_constraint(self, config_with_contextual_fk):
        """Test that generated thread_labels have label_id matching their user's labels."""
        # This test simulates the data generator behavior
        context = GenerationContext()
        context.config = config_with_contextual_fk

        # Simulate registering users
        for user_id in [1, 2, 3]:
            context.register_id("users", user_id)

        # Simulate registering labels with owner_id attribute
        # 3 labels per user
        label_to_owner = {
            1: 1, 2: 1, 3: 1,  # Labels 1-3 for user 1
            4: 2, 5: 2, 6: 2,  # Labels 4-6 for user 2
            7: 3, 8: 3, 9: 3,  # Labels 7-9 for user 3
        }
        for label_id, owner_id in label_to_owner.items():
            context.register_id("labels", label_id, owner_id=owner_id)

        # Verify the attribute registration worked
        assert context.get_ids_by_attr("labels", "owner_id", 1) == [1, 2, 3]
        assert context.get_ids_by_attr("labels", "owner_id", 2) == [4, 5, 6]
        assert context.get_ids_by_attr("labels", "owner_id", 3) == [7, 8, 9]

        # Simulate generating thread_labels and verify label_id matches user's labels
        for tl_idx in range(30):
            # Assign thread_label to a user
            user_id = (tl_idx % 3) + 1
            context.current_row = {"user_id": user_id}

            # Get label_id using contextual FK (user_id -> owner_id match)
            label_id = context.get_contextual_fk_value(
                ref_table="labels",
                context_field="user_id",
                target_field="owner_id",
                nullable=False,
            )

            # Verify label belongs to the same user
            expected_labels = {
                1: [1, 2, 3],
                2: [4, 5, 6],
                3: [7, 8, 9],
            }
            assert label_id in expected_labels[user_id], (
                f"Thread_label for user {user_id} got label {label_id}, "
                f"expected one of {expected_labels[user_id]}"
            )


class TestContextualFkConfiguration:
    """Tests for contextual FK configuration parsing."""

    def test_config_structure(self):
        """Test that contextual FK config is correctly structured."""
        config = {
            "contextual_foreign_keys": {
                "thread_labels": {
                    "label_id": {
                        "must_match": {
                            "source_field": "user_id",
                            "target_field": "owner_id",
                        }
                    },
                    "thread_id": {
                        "must_match": {
                            "source_field": "user_id",
                            "target_field": "owner_id",
                        }
                    },
                }
            }
        }

        contextual_fks = config.get("contextual_foreign_keys", {})
        thread_labels_constraints = contextual_fks.get("thread_labels", {})

        # Verify label_id constraint
        label_constraint = thread_labels_constraints.get("label_id", {})
        must_match = label_constraint.get("must_match", {})
        assert must_match.get("source_field") == "user_id"
        assert must_match.get("target_field") == "owner_id"

        # Verify thread_id constraint
        thread_constraint = thread_labels_constraints.get("thread_id", {})
        must_match = thread_constraint.get("must_match", {})
        assert must_match.get("source_field") == "user_id"
        assert must_match.get("target_field") == "owner_id"

    def test_missing_contextual_config_returns_regular_fk(self):
        """Test that missing contextual config falls back to regular FK behavior."""
        context = GenerationContext()
        context.config = {}  # No contextual FK config

        # Register labels (no attributes needed for regular FK)
        context.register_id("labels", 1)
        context.register_id("labels", 2)

        # Regular FK lookup should work
        result = context.get_foreign_key_value("labels", nullable=False)
        assert result in [1, 2]


class TestIdRegistrationWithAttributes:
    """Tests for ID registration with attributes."""

    def test_register_id_with_single_attribute(self):
        """Test registering ID with a single attribute."""
        context = GenerationContext()

        context.register_id("labels", 1, owner_id=5)

        # Check ID is in generated_ids
        assert 1 in context.generated_ids["labels"]

        # Check attribute is registered
        assert context.get_ids_by_attr("labels", "owner_id", 5) == [1]

    def test_register_id_with_multiple_attributes(self):
        """Test registering ID with multiple attributes."""
        context = GenerationContext()

        context.register_id("users", 1, role="admin", company="Acme Inc")

        # Check both attributes are registered
        assert context.get_ids_by_attr("users", "role", "admin") == [1]
        assert context.get_ids_by_attr("users", "company", "Acme Inc") == [1]

    def test_multiple_ids_same_attribute_value(self):
        """Test multiple IDs with same attribute value."""
        context = GenerationContext()

        context.register_id("labels", 1, owner_id=5)
        context.register_id("labels", 2, owner_id=5)
        context.register_id("labels", 3, owner_id=5)

        # All three labels should be returned for owner 5
        ids = context.get_ids_by_attr("labels", "owner_id", 5)
        assert set(ids) == {1, 2, 3}

    def test_ids_with_different_attribute_values(self):
        """Test IDs with different attribute values are separated."""
        context = GenerationContext()

        context.register_id("labels", 1, owner_id=1)
        context.register_id("labels", 2, owner_id=1)
        context.register_id("labels", 3, owner_id=2)

        # User 1's labels
        assert set(context.get_ids_by_attr("labels", "owner_id", 1)) == {1, 2}
        # User 2's labels
        assert context.get_ids_by_attr("labels", "owner_id", 2) == [3]
        # User 3's labels (none)
        assert context.get_ids_by_attr("labels", "owner_id", 3) == []
