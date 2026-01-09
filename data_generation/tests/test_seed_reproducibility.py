"""
Tests for seed reproducibility.

Verifies that using the same seed produces identical results.
"""

import pytest
from data_generation.generator.data_generator import DataGenerator


class TestSeedReproducibility:
    """Tests that seed produces reproducible results."""

    # Fields that use datetime.now() and are expected to vary slightly
    TIMESTAMP_FIELDS = {"created_at", "updated_at", "deleted_at", "sent_at", "received_at"}

    def _compare_records_ignoring_timestamps(self, r1, r2):
        """Compare two records, ignoring timestamp fields."""
        for key in set(r1.keys()) | set(r2.keys()):
            if key in self.TIMESTAMP_FIELDS:
                continue
            assert r1.get(key) == r2.get(key), f"Mismatch on field '{key}': {r1.get(key)} != {r2.get(key)}"

    def test_same_seed_same_results(self):
        """Test that same seed produces identical data (except timestamps)."""
        gen1 = DataGenerator(seed=12345, use_seed=False)
        gen2 = DataGenerator(seed=12345, use_seed=False)

        data1 = gen1.generate_table("users", 10, include_dependencies=False)
        data2 = gen2.generate_table("users", 10, include_dependencies=False)

        users1 = data1["users"]
        users2 = data2["users"]

        assert len(users1) == len(users2)
        for u1, u2 in zip(users1, users2):
            self._compare_records_ignoring_timestamps(u1, u2)

    def test_different_seed_different_results(self):
        """Test that different seeds produce different data."""
        gen1 = DataGenerator(seed=12345, use_seed=False)
        gen2 = DataGenerator(seed=54321, use_seed=False)

        data1 = gen1.generate_table("users", 10, include_dependencies=False)
        data2 = gen2.generate_table("users", 10, include_dependencies=False)

        users1 = data1["users"]
        users2 = data2["users"]

        # At least some records should be different
        differences = sum(1 for u1, u2 in zip(users1, users2) if u1 != u2)
        assert differences > 0

    def test_faker_values_reproducible(self):
        """Test that Faker-generated values are reproducible."""
        gen1 = DataGenerator(seed=42, use_seed=False)
        gen2 = DataGenerator(seed=42, use_seed=False)

        # Generate users which use Faker for names, emails, etc.
        data1 = gen1.generate_table("users", 5, include_dependencies=False)
        data2 = gen2.generate_table("users", 5, include_dependencies=False)

        users1 = data1["users"]
        users2 = data2["users"]

        # Check that Faker-generated fields match (mailg uses first_name/last_name)
        for u1, u2 in zip(users1, users2):
            assert u1.get("first_name") == u2.get("first_name")
            assert u1.get("last_name") == u2.get("last_name")
            assert u1.get("email") == u2.get("email")

    def test_multiple_tables_reproducible(self):
        """Test that generating multiple tables is reproducible."""
        gen1 = DataGenerator(seed=999, use_seed=False)
        gen2 = DataGenerator(seed=999, use_seed=False)

        data1 = gen1.generate_all({"users": 5, "labels": 3}, default_rows=5)
        data2 = gen2.generate_all({"users": 5, "labels": 3}, default_rows=5)

        # Check users (ignoring timestamps)
        assert len(data1["users"]) == len(data2["users"])
        for u1, u2 in zip(data1["users"], data2["users"]):
            self._compare_records_ignoring_timestamps(u1, u2)

        # Check labels (ignoring timestamps)
        assert len(data1["labels"]) == len(data2["labels"])
        for l1, l2 in zip(data1["labels"], data2["labels"]):
            self._compare_records_ignoring_timestamps(l1, l2)


