"""Tests for existing data loading and distribution awareness.

Tests verify that:
1. Full table data is loaded correctly from database
2. IDs are registered for FK resolution (direct and derived attributes)
3. Assignment constraints respect existing counts
4. Distributions from existing data are analyzed correctly
5. Start IDs are updated to avoid conflicts
6. Total assignment counts (existing + generated) are calculated correctly
"""

import pytest
from data_generation.generator.core.context import GenerationContext


class TestLoadExistingRecords:
    """Tests for GenerationContext.load_existing_records method."""

    def test_basic_id_registration(self):
        """Test that IDs from existing records are registered for FK resolution."""
        context = GenerationContext()
        context.config = {}

        existing_data = {
            "users": [
                {"id": 1, "name": "Alice", "role": "admin"},
                {"id": 2, "name": "Bob", "role": "member"},
                {"id": 3, "name": "Charlie", "role": "member"},
            ],
            "projects": [
                {"id": 10, "name": "Project A"},
                {"id": 20, "name": "Project B"},
            ],
        }

        context.load_existing_records(existing_data)

        # Check IDs are registered
        assert set(context.generated_ids["users"]) == {1, 2, 3}
        assert set(context.generated_ids["projects"]) == {10, 20}

    def test_id_registration_with_direct_attributes(self):
        """Test that IDs are registered with their direct attributes."""
        context = GenerationContext()
        context.config = {
            "id_registration_attributes": {
                "users": ["role", "organization_id"],
                "boards": ["project_id"],
            }
        }

        existing_data = {
            "users": [
                {"id": 1, "name": "Alice", "role": "admin", "organization_id": 100},
                {"id": 2, "name": "Bob", "role": "member", "organization_id": 100},
                {"id": 3, "name": "Charlie", "role": "member", "organization_id": 200},
            ],
            "boards": [
                {"id": 10, "name": "Board 1", "project_id": 1},
                {"id": 20, "name": "Board 2", "project_id": 1},
                {"id": 30, "name": "Board 3", "project_id": 2},
            ],
        }

        context.load_existing_records(existing_data)

        # Check attributes are registered for users
        assert context.get_ids_by_attr("users", "role", "admin") == [1]
        assert set(context.get_ids_by_attr("users", "role", "member")) == {2, 3}
        assert set(context.get_ids_by_attr("users", "organization_id", 100)) == {1, 2}
        assert context.get_ids_by_attr("users", "organization_id", 200) == [3]

        # Check attributes are registered for boards
        assert set(context.get_ids_by_attr("boards", "project_id", 1)) == {10, 20}
        assert context.get_ids_by_attr("boards", "project_id", 2) == [30]

    def test_derived_attributes_computation(self):
        """Test that derived attributes are computed via in-memory JOINs."""
        context = GenerationContext()
        context.config = {
            "id_registration_attributes": {
                "boards": ["project_id"],
            },
            "derived_id_attributes": {
                "sprints": {
                    "project_id": {
                        "via": "board_id",
                        "from_table": "boards",
                        "source_field": "project_id",
                    }
                }
            }
        }

        existing_data = {
            "boards": [
                {"id": 1, "name": "Board 1", "project_id": 100},
                {"id": 2, "name": "Board 2", "project_id": 100},
                {"id": 3, "name": "Board 3", "project_id": 200},
            ],
            "sprints": [
                {"id": 10, "name": "Sprint 1", "board_id": 1},  # -> project_id: 100
                {"id": 20, "name": "Sprint 2", "board_id": 1},  # -> project_id: 100
                {"id": 30, "name": "Sprint 3", "board_id": 2},  # -> project_id: 100
                {"id": 40, "name": "Sprint 4", "board_id": 3},  # -> project_id: 200
            ],
        }

        context.load_existing_records(existing_data)

        # Check derived project_id is computed for sprints
        # Sprints 10, 20, 30 should have project_id 100 (via boards 1, 1, 2)
        assert set(context.get_ids_by_attr("sprints", "project_id", 100)) == {10, 20, 30}
        # Sprint 40 should have project_id 200 (via board 3)
        assert context.get_ids_by_attr("sprints", "project_id", 200) == [40]

    def test_derived_attributes_with_null_fk(self):
        """Test that derived attributes handle null FK values gracefully."""
        context = GenerationContext()
        context.config = {
            "derived_id_attributes": {
                "sprints": {
                    "project_id": {
                        "via": "board_id",
                        "from_table": "boards",
                        "source_field": "project_id",
                    }
                }
            }
        }

        existing_data = {
            "boards": [
                {"id": 1, "name": "Board 1", "project_id": 100},
            ],
            "sprints": [
                {"id": 10, "name": "Sprint 1", "board_id": 1},    # -> project_id: 100
                {"id": 20, "name": "Sprint 2", "board_id": None}, # -> no project_id
            ],
        }

        context.load_existing_records(existing_data)

        # Sprint 10 should have project_id 100
        assert context.get_ids_by_attr("sprints", "project_id", 100) == [10]
        # Sprint 20 should not have project_id attribute (FK is null)
        # It should still be registered as an ID
        assert 20 in context.generated_ids["sprints"]

    def test_derived_attributes_with_missing_referenced_record(self):
        """Test that derived attributes handle missing referenced records."""
        context = GenerationContext()
        context.config = {
            "derived_id_attributes": {
                "sprints": {
                    "project_id": {
                        "via": "board_id",
                        "from_table": "boards",
                        "source_field": "project_id",
                    }
                }
            }
        }

        existing_data = {
            "boards": [
                {"id": 1, "name": "Board 1", "project_id": 100},
            ],
            "sprints": [
                {"id": 10, "name": "Sprint 1", "board_id": 1},   # -> project_id: 100
                {"id": 20, "name": "Sprint 2", "board_id": 999}, # board 999 doesn't exist
            ],
        }

        context.load_existing_records(existing_data)

        # Sprint 10 should have project_id 100
        assert context.get_ids_by_attr("sprints", "project_id", 100) == [10]
        # Sprint 20 should not have project_id (referenced board missing)
        assert 20 in context.generated_ids["sprints"]

    def test_existing_records_stored(self):
        """Test that existing records are stored for distribution analysis."""
        context = GenerationContext()
        context.config = {}

        existing_data = {
            "tickets": [
                {"id": 1, "status": "open", "priority": "high"},
                {"id": 2, "status": "open", "priority": "low"},
                {"id": 3, "status": "closed", "priority": "high"},
            ],
        }

        context.load_existing_records(existing_data)

        # Check records are stored
        assert context.existing_records == existing_data
        assert len(context.existing_records["tickets"]) == 3


class TestStartIdConflictAvoidance:
    """Tests for start ID updates to avoid conflicts."""

    def test_start_id_updated_after_existing_data(self):
        """Test that start IDs are set to max_id + 1 after loading existing data."""
        context = GenerationContext()
        context.config = {}
        context.default_start_id = 1

        existing_data = {
            "users": [
                {"id": 1, "name": "Alice"},
                {"id": 5, "name": "Bob"},
                {"id": 10, "name": "Charlie"},
            ],
            "projects": [
                {"id": 100, "name": "Project A"},
                {"id": 200, "name": "Project B"},
            ],
        }

        context.load_existing_records(existing_data)

        # Start IDs should be max_id + 1
        assert context.start_ids["users"] == 11
        assert context.start_ids["projects"] == 201

    def test_start_id_respects_explicit_start_id(self):
        """Test that explicit start_id is kept if higher than max existing ID."""
        context = GenerationContext()
        context.config = {}
        context.default_start_id = 1
        context.start_ids = {"users": 1000}  # Explicit high start ID

        existing_data = {
            "users": [
                {"id": 1, "name": "Alice"},
                {"id": 10, "name": "Bob"},
            ],
        }

        context.load_existing_records(existing_data)

        # Start ID should remain 1000 since it's higher than max(10) + 1
        assert context.start_ids["users"] == 1000

    def test_start_id_updated_when_existing_higher(self):
        """Test that explicit start_id is updated if existing IDs are higher."""
        context = GenerationContext()
        context.config = {}
        context.default_start_id = 1
        context.start_ids = {"users": 50}  # Lower than existing max

        existing_data = {
            "users": [
                {"id": 100, "name": "Alice"},
                {"id": 200, "name": "Bob"},
            ],
        }

        context.load_existing_records(existing_data)

        # Start ID should be updated to max(200) + 1
        assert context.start_ids["users"] == 201

    def test_start_id_with_non_integer_ids(self):
        """Test that non-integer IDs are handled gracefully."""
        context = GenerationContext()
        context.config = {}
        context.default_start_id = 1

        existing_data = {
            "users": [
                {"id": "uuid-1", "name": "Alice"},
                {"id": "uuid-2", "name": "Bob"},
            ],
            "projects": [
                {"id": 10, "name": "Project A"},
            ],
        }

        context.load_existing_records(existing_data)

        # Users table should not have start_id set (UUIDs)
        assert "users" not in context.start_ids or context.start_ids.get("users") == context.default_start_id
        # Projects should have start_id set
        assert context.start_ids["projects"] == 11


class TestExistingAssignmentCounts:
    """Tests for assignment count computation from existing data."""

    def test_existing_assignment_counts_computed(self):
        """Test that assignment counts are pre-computed from existing records."""
        context = GenerationContext()
        context.config = {
            "assignment_constraints": {
                "tickets": {
                    "assignee_id": {"max_percentage": 20},
                }
            }
        }

        existing_data = {
            "tickets": [
                {"id": 1, "assignee_id": 100},
                {"id": 2, "assignee_id": 100},
                {"id": 3, "assignee_id": 100},
                {"id": 4, "assignee_id": 200},
                {"id": 5, "assignee_id": 200},
                {"id": 6, "assignee_id": None},  # Unassigned
            ],
        }

        context.load_existing_records(existing_data)

        # Check existing assignment counts
        assert context.get_existing_assignment_count("tickets", "assignee_id", 100) == 3
        assert context.get_existing_assignment_count("tickets", "assignee_id", 200) == 2
        assert context.get_existing_assignment_count("tickets", "assignee_id", 300) == 0

    def test_total_assignment_count(self):
        """Test that total assignment count includes existing + generated."""
        context = GenerationContext()
        context.config = {
            "assignment_constraints": {
                "tickets": {
                    "assignee_id": {"max_percentage": 20},
                }
            }
        }

        existing_data = {
            "tickets": [
                {"id": 1, "assignee_id": 100},
                {"id": 2, "assignee_id": 100},
                {"id": 3, "assignee_id": 100},
            ],
        }

        context.load_existing_records(existing_data)

        # Existing count: 3
        assert context.get_existing_assignment_count("tickets", "assignee_id", 100) == 3
        assert context.get_total_assignment_count("tickets", "assignee_id", 100) == 3

        # Simulate generating new tickets assigned to user 100
        context.track_assignment("tickets", "assignee_id", 100)
        context.track_assignment("tickets", "assignee_id", 100)

        # Generated count: 2, existing: 3, total: 5
        assert context.get_assignment_count("tickets", "assignee_id", 100) == 2
        assert context.get_existing_assignment_count("tickets", "assignee_id", 100) == 3
        assert context.get_total_assignment_count("tickets", "assignee_id", 100) == 5


class TestConstrainedFkWithExistingData:
    """Tests for constrained FK value selection with existing data."""

    def test_constrained_fk_respects_existing_assignments(self):
        """Test that constrained FK considers existing assignment counts."""
        context = GenerationContext()
        context.set_seed(42)
        context.config = {
            "assignment_constraints": {
                "tickets": {
                    "assignee_id": {"max_percentage": 50},  # Max 50% per user
                }
            }
        }

        # Register 2 users
        context.register_id("users", 1)
        context.register_id("users", 2)

        # Load existing data where user 1 already has 4 assignments
        existing_data = {
            "tickets": [
                {"id": 1, "assignee_id": 1},
                {"id": 2, "assignee_id": 1},
                {"id": 3, "assignee_id": 1},
                {"id": 4, "assignee_id": 1},
                {"id": 5, "assignee_id": 2},
            ],
        }
        context.load_existing_records(existing_data)

        # Set up: 5 existing + 5 new = 10 total, max 50% = 5 per user
        context.table_row_counts["tickets"] = 5  # New rows to generate

        # User 1 already has 4, can only get 1 more (5 max)
        # User 2 already has 1, can get 4 more (5 max)

        # Get constrained FK values
        assignments = {1: 0, 2: 0}
        for _ in range(5):
            user_id = context.get_constrained_fk_value(
                ref_table="users",
                table_name="tickets",
                field_name="assignee_id",
                max_percentage=50,
                nullable=False,
            )
            if user_id:
                assignments[user_id] += 1

        # User 1 should get at most 1 more assignment (already has 4 of 5 max)
        assert assignments[1] <= 1, f"User 1 got {assignments[1]} new assignments, expected <= 1"
        # User 2 should get most of the new assignments
        assert assignments[2] >= 4, f"User 2 got {assignments[2]} new assignments, expected >= 4"

    def test_constrained_fk_all_at_capacity(self):
        """Test behavior when all entities are at capacity."""
        context = GenerationContext()
        context.set_seed(42)
        context.config = {
            "assignment_constraints": {
                "tickets": {
                    "assignee_id": {"max_percentage": 50},
                }
            }
        }

        # Register 2 users
        context.register_id("users", 1)
        context.register_id("users", 2)

        # Load existing data where both users are at capacity
        existing_data = {
            "tickets": [
                {"id": 1, "assignee_id": 1},
                {"id": 2, "assignee_id": 1},
                {"id": 3, "assignee_id": 1},
                {"id": 4, "assignee_id": 1},
                {"id": 5, "assignee_id": 1},  # 5 for user 1
                {"id": 6, "assignee_id": 2},
                {"id": 7, "assignee_id": 2},
                {"id": 8, "assignee_id": 2},
                {"id": 9, "assignee_id": 2},
                {"id": 10, "assignee_id": 2},  # 5 for user 2
            ],
        }
        context.load_existing_records(existing_data)

        # 10 existing + 0 new = 10 total, max 50% = 5 per user
        # Both users already at capacity
        context.table_row_counts["tickets"] = 0

        # Nullable: should return None when all at capacity
        result = context.get_constrained_fk_value(
            ref_table="users",
            table_name="tickets",
            field_name="assignee_id",
            max_percentage=50,
            nullable=True,
        )
        assert result is None

        # Non-nullable: should fallback to any user
        result = context.get_constrained_fk_value(
            ref_table="users",
            table_name="tickets",
            field_name="assignee_id",
            max_percentage=50,
            nullable=False,
        )
        assert result in [1, 2]


class TestExistingFieldDistribution:
    """Tests for field distribution analysis from existing data."""

    def test_get_existing_field_distribution(self):
        """Test that field distributions are computed correctly."""
        context = GenerationContext()
        context.config = {}

        existing_data = {
            "tickets": [
                {"id": 1, "status": "open", "priority": "high"},
                {"id": 2, "status": "open", "priority": "high"},
                {"id": 3, "status": "open", "priority": "low"},
                {"id": 4, "status": "closed", "priority": "low"},
                {"id": 5, "status": "closed", "priority": "low"},
            ],
        }

        context.load_existing_records(existing_data)

        # Check status distribution
        status_dist = context.get_existing_field_distribution("tickets", "status")
        assert status_dist == {"open": 3, "closed": 2}

        # Check priority distribution
        priority_dist = context.get_existing_field_distribution("tickets", "priority")
        assert priority_dist == {"high": 2, "low": 3}

    def test_distribution_caching(self):
        """Test that distributions are cached for efficiency."""
        context = GenerationContext()
        context.config = {}

        existing_data = {
            "tickets": [
                {"id": 1, "status": "open"},
                {"id": 2, "status": "closed"},
            ],
        }

        context.load_existing_records(existing_data)

        # First call computes distribution
        dist1 = context.get_existing_field_distribution("tickets", "status")
        # Second call should return cached value
        dist2 = context.get_existing_field_distribution("tickets", "status")

        assert dist1 is dist2  # Same object (cached)

    def test_distribution_with_null_values(self):
        """Test that null values are excluded from distribution."""
        context = GenerationContext()
        context.config = {}

        existing_data = {
            "tickets": [
                {"id": 1, "status": "open"},
                {"id": 2, "status": None},
                {"id": 3, "status": "closed"},
                {"id": 4, "status": None},
            ],
        }

        context.load_existing_records(existing_data)

        # Null values should not be counted
        status_dist = context.get_existing_field_distribution("tickets", "status")
        assert status_dist == {"open": 1, "closed": 1}

    def test_distribution_empty_table(self):
        """Test distribution for empty table returns empty dict."""
        context = GenerationContext()
        context.config = {}

        existing_data = {
            "tickets": [],
        }

        context.load_existing_records(existing_data)

        dist = context.get_existing_field_distribution("tickets", "status")
        assert dist == {}

    def test_distribution_missing_table(self):
        """Test distribution for missing table returns empty dict."""
        context = GenerationContext()
        context.config = {}
        context.load_existing_records({})

        dist = context.get_existing_field_distribution("nonexistent", "field")
        assert dist == {}


class TestExistingRecordCount:
    """Tests for existing record count retrieval."""

    def test_get_existing_record_count(self):
        """Test getting count of existing records."""
        context = GenerationContext()
        context.config = {}

        existing_data = {
            "users": [{"id": 1}, {"id": 2}, {"id": 3}],
            "projects": [{"id": 10}],
            "tickets": [],
        }

        context.load_existing_records(existing_data)

        assert context.get_existing_record_count("users") == 3
        assert context.get_existing_record_count("projects") == 1
        assert context.get_existing_record_count("tickets") == 0
        assert context.get_existing_record_count("nonexistent") == 0


class TestDistributionValueWithExisting:
    """Tests for distribution-based value generation with existing data."""

    def test_distribution_without_existing_data(self):
        """Test distribution value generation without existing data."""
        context = GenerationContext()
        context.set_seed(42)
        context.config = {
            "distributions": {
                "tickets": {
                    "status": {"open": 70, "closed": 30},
                }
            }
        }

        # Generate many values to check distribution
        counts = {"open": 0, "closed": 0}
        for _ in range(1000):
            value = context.get_distribution_value_with_existing(
                "tickets", "status", maintain_existing_ratio=False
            )
            counts[value] += 1

        # Should roughly follow 70/30 distribution
        assert 600 < counts["open"] < 800
        assert 200 < counts["closed"] < 400

    def test_distribution_maintaining_existing_ratio(self):
        """Test distribution value generation maintaining existing ratio."""
        context = GenerationContext()
        context.set_seed(42)
        context.config = {
            "distributions": {
                "tickets": {
                    "status": {"open": 50, "closed": 50},  # Config says 50/50
                }
            }
        }

        # Existing data has 80/20 distribution
        existing_data = {
            "tickets": [
                {"id": i, "status": "open"} for i in range(80)
            ] + [
                {"id": i + 80, "status": "closed"} for i in range(20)
            ],
        }

        context.load_existing_records(existing_data)
        context.table_row_counts["tickets"] = 100  # Will generate 100 new

        # Generate values maintaining existing ratio
        counts = {"open": 0, "closed": 0}
        for _ in range(100):
            value = context.get_distribution_value_with_existing(
                "tickets", "status", maintain_existing_ratio=True
            )
            counts[value] += 1

        # Should bias towards existing ratio (80/20)
        # To maintain 80/20 across 200 total (100 existing + 100 new):
        # Need 160 open total, have 80, so need ~80 more open
        # Need 40 closed total, have 20, so need ~20 more closed
        # This should result in roughly 80/20 split in new data too
        assert counts["open"] > counts["closed"], (
            f"Expected more open than closed, got open={counts['open']}, closed={counts['closed']}"
        )


class TestContextualFkWithExistingData:
    """Tests for contextual FK lookup with existing data."""

    def test_contextual_fk_with_loaded_existing_data(self):
        """Test contextual FK lookup uses existing data attributes."""
        context = GenerationContext()
        context.config = {
            "id_registration_attributes": {
                "boards": ["project_id"],
            }
        }

        existing_data = {
            "boards": [
                {"id": 1, "name": "Board 1", "project_id": 100},
                {"id": 2, "name": "Board 2", "project_id": 100},
                {"id": 3, "name": "Board 3", "project_id": 200},
            ],
        }

        context.load_existing_records(existing_data)

        # Set current row context (ticket for project 100)
        context.current_row = {"project_id": 100}

        # Get contextual FK - should only return boards 1 or 2
        for _ in range(50):
            result = context.get_contextual_fk_value(
                ref_table="boards",
                context_field="project_id",
                target_field="project_id",
                nullable=False,
            )
            assert result in [1, 2], f"Expected board 1 or 2, got {result}"

        # Set current row context (ticket for project 200)
        context.current_row = {"project_id": 200}

        # Get contextual FK - should only return board 3
        for _ in range(20):
            result = context.get_contextual_fk_value(
                ref_table="boards",
                context_field="project_id",
                target_field="project_id",
                nullable=False,
            )
            assert result == 3, f"Expected board 3, got {result}"

    def test_contextual_fk_with_derived_attributes(self):
        """Test contextual FK lookup with derived attributes (e.g., sprints)."""
        context = GenerationContext()
        context.config = {
            "id_registration_attributes": {
                "boards": ["project_id"],
            },
            "derived_id_attributes": {
                "sprints": {
                    "project_id": {
                        "via": "board_id",
                        "from_table": "boards",
                        "source_field": "project_id",
                    }
                }
            }
        }

        existing_data = {
            "boards": [
                {"id": 1, "project_id": 100},
                {"id": 2, "project_id": 200},
            ],
            "sprints": [
                {"id": 10, "name": "Sprint 1", "board_id": 1},  # project 100
                {"id": 20, "name": "Sprint 2", "board_id": 1},  # project 100
                {"id": 30, "name": "Sprint 3", "board_id": 2},  # project 200
            ],
        }

        context.load_existing_records(existing_data)

        # Set current row context (ticket for project 100)
        context.current_row = {"project_id": 100}

        # Get sprint for project 100 - should only return sprints 10 or 20
        for _ in range(50):
            result = context.get_contextual_fk_value(
                ref_table="sprints",
                context_field="project_id",
                target_field="project_id",
                nullable=False,
            )
            assert result in [10, 20], f"Expected sprint 10 or 20, got {result}"


class TestFilterByWithExistingData:
    """Tests for constrained FK with filter_by using existing data."""

    def test_filter_by_single_attribute(self):
        """Test constrained FK with single attribute filter."""
        context = GenerationContext()
        context.set_seed(42)
        context.config = {
            "id_registration_attributes": {
                "users": ["role"],
            },
            "assignment_constraints": {
                "tickets": {
                    "assignee_id": {"max_percentage": 100},  # No limit for this test
                }
            }
        }

        existing_data = {
            "users": [
                {"id": 1, "name": "Alice", "role": "admin"},
                {"id": 2, "name": "Bob", "role": "member"},
                {"id": 3, "name": "Charlie", "role": "member"},
                {"id": 4, "name": "Diana", "role": "agent"},
            ],
            "tickets": [],
        }

        context.load_existing_records(existing_data)
        context.table_row_counts["tickets"] = 100

        # Filter by role=member should only return users 2 or 3
        for _ in range(50):
            result = context.get_constrained_fk_value(
                ref_table="users",
                table_name="tickets",
                field_name="assignee_id",
                max_percentage=100,
                filter_by={"role": "member"},
                nullable=False,
            )
            assert result in [2, 3], f"Expected user 2 or 3, got {result}"

    def test_filter_by_list_of_values(self):
        """Test constrained FK with list of values in filter."""
        context = GenerationContext()
        context.set_seed(42)
        context.config = {
            "id_registration_attributes": {
                "users": ["role"],
            },
            "assignment_constraints": {
                "tickets": {
                    "assignee_id": {"max_percentage": 100},
                }
            }
        }

        existing_data = {
            "users": [
                {"id": 1, "name": "Alice", "role": "admin"},
                {"id": 2, "name": "Bob", "role": "member"},
                {"id": 3, "name": "Charlie", "role": "agent"},
            ],
            "tickets": [],
        }

        context.load_existing_records(existing_data)
        context.table_row_counts["tickets"] = 100

        # Filter by role in [member, agent] should return users 2 or 3
        for _ in range(50):
            result = context.get_constrained_fk_value(
                ref_table="users",
                table_name="tickets",
                field_name="assignee_id",
                max_percentage=100,
                filter_by={"role": ["member", "agent"]},
                nullable=False,
            )
            assert result in [2, 3], f"Expected user 2 or 3, got {result}"


class TestEmptyExistingData:
    """Tests for edge cases with empty existing data."""

    def test_empty_existing_data(self):
        """Test loading empty existing data."""
        context = GenerationContext()
        context.config = {}

        context.load_existing_records({})

        assert context.existing_records == {}
        assert context.generated_ids == {}

    def test_empty_table_in_existing_data(self):
        """Test handling of empty table in existing data."""
        context = GenerationContext()
        context.config = {}

        existing_data = {
            "users": [],
            "tickets": [{"id": 1, "status": "open"}],
        }

        context.load_existing_records(existing_data)

        assert context.generated_ids.get("users", []) == []
        assert context.generated_ids["tickets"] == [1]

    def test_records_without_id(self):
        """Test that records without ID are skipped."""
        context = GenerationContext()
        context.config = {}

        existing_data = {
            "users": [
                {"id": 1, "name": "Alice"},
                {"name": "Bob"},  # No ID
                {"id": None, "name": "Charlie"},  # Null ID
                {"id": 3, "name": "Diana"},
            ],
        }

        context.load_existing_records(existing_data)

        # Only records with valid IDs should be registered
        assert set(context.generated_ids["users"]) == {1, 3}


class TestIntegrationExistingDataWithGeneration:
    """Integration tests for existing data loading with data generation."""

    def test_fk_references_existing_ids(self):
        """Test that FK values can reference existing IDs."""
        context = GenerationContext()
        context.set_seed(42)
        context.config = {}

        # Load existing users
        existing_data = {
            "users": [
                {"id": 100, "name": "Existing User 1"},
                {"id": 200, "name": "Existing User 2"},
            ],
        }
        context.load_existing_records(existing_data)

        # Get FK values - should return existing user IDs
        for _ in range(20):
            result = context.get_foreign_key_value("users", nullable=False)
            assert result in [100, 200], f"Expected existing user ID, got {result}"

    def test_combined_existing_and_new_ids_for_fk(self):
        """Test that FK can reference both existing and newly generated IDs."""
        context = GenerationContext()
        context.set_seed(42)
        context.config = {}

        # Load existing users
        existing_data = {
            "users": [
                {"id": 100, "name": "Existing User"},
            ],
        }
        context.load_existing_records(existing_data)

        # Add newly generated user
        context.register_id("users", 200)

        # Get FK values - should return either existing or new ID
        results = set()
        for _ in range(100):
            result = context.get_foreign_key_value("users", nullable=False)
            results.add(result)

        # Both IDs should be reachable
        assert 100 in results, "Existing ID 100 should be reachable"
        assert 200 in results, "New ID 200 should be reachable"
