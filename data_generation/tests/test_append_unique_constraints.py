"""
Test that appending data to existing fixtures doesn't violate unique constraints.

Reproduces the real append workflow:
1. Copy current fixture data to a temp directory
2. Load it as existing data via JsonFileReader
3. Generate new data with --no-seed and --append semantics
4. Verify no unique constraint violations in the combined output
"""

import json
import shutil
import tempfile
from pathlib import Path

import pytest

from data_generation.generator import DataGenerator
from data_generation.generator.json_file_reader import JsonFileReader
from data_generation.generator.schema_loader import (
    get_tables,
    get_table_properties,
    get_unique_constraints,
)


FIXTURES_DIR = Path(__file__).resolve().parent.parent.parent / "backend" / "fixtures"


def _run_append_workflow(row_counts: dict[str, int]) -> dict[str, list[dict]]:
    """
    Simulate the CLI append workflow:
      python -m data_generation --existing-data-dir <fixtures> --append --no-seed --rows ...

    Returns the combined (existing + new) data.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)

        # Copy current fixture files to temp dir
        for json_file in FIXTURES_DIR.glob("*.json"):
            shutil.copy2(json_file, tmp_path / json_file.name)

        # Create generator (--no-seed)
        generator = DataGenerator(seed=42, use_seed=False)

        # Load existing data (same as CLI --existing-data-dir)
        reader = JsonFileReader(directory_path=tmp_path, schema=generator.schema)
        full_table_data = reader.get_full_table_data()
        generator.load_existing_data(full_table_data)

        existing_counts = {
            table: len(records) for table, records in full_table_data.items()
        }

        # Generate new data
        data = generator.generate_all(
            row_counts=row_counts,
            existing_counts=existing_counts,
        )

        # Combine existing + new (--append)
        combined = {}
        for table_name in data.keys():
            existing_records = full_table_data.get(table_name, [])
            new_records = data.get(table_name, [])
            combined[table_name] = existing_records + new_records

        return combined


class TestAppendUniqueConstraints:
    """Verify no unique constraint violations when appending to fixture data."""

    @pytest.fixture(scope="class")
    def combined_data(self):
        """Run the append workflow once for the whole test class."""
        if not FIXTURES_DIR.exists():
            pytest.skip("Fixture directory not found")
        return _run_append_workflow(row_counts={"emails": 2000})

    @pytest.fixture(scope="class")
    def schema_tables(self):
        """Load schema tables once."""
        generator = DataGenerator()
        return generator.tables

    def test_general_settings_user_id_unique(self, combined_data):
        """general_settings.user_id must be unique (one settings row per user)."""
        records = combined_data.get("general_settings", [])
        if not records:
            pytest.skip("No general_settings records")

        user_ids = [r["user_id"] for r in records]
        duplicates = [uid for uid in user_ids if user_ids.count(uid) > 1]
        assert not duplicates, (
            f"Duplicate user_id in general_settings: {set(duplicates)}"
        )

    def test_no_duplicate_primary_keys(self, combined_data):
        """No table should have duplicate primary key values."""
        for table_name, records in combined_data.items():
            if not records:
                continue
            ids = [r.get("id") for r in records if r.get("id") is not None]
            if not ids:
                continue
            dupes = set(x for x in ids if ids.count(x) > 1)
            assert not dupes, (
                f"Duplicate IDs in {table_name}: {dupes}"
            )

    def test_composite_unique_constraints(self, combined_data, schema_tables):
        """No composite unique constraint should be violated."""
        for table_name, table_schema in schema_tables.items():
            unique_constraints = get_unique_constraints(table_schema)
            if not unique_constraints:
                continue

            records = combined_data.get(table_name, [])
            if not records:
                continue

            for constraint in unique_constraints:
                seen = set()
                duplicates = []
                for record in records:
                    combo = tuple(record.get(f) for f in constraint)
                    # Skip all-None tuples
                    if all(v is None for v in combo):
                        continue
                    if combo in seen:
                        duplicates.append(combo)
                    seen.add(combo)

                assert not duplicates, (
                    f"Duplicate composite unique ({constraint}) in "
                    f"{table_name}: {duplicates[:5]}"
                )

    def test_single_column_unique_fields(self, combined_data, schema_tables):
        """No single-column unique field should have duplicate values."""
        for table_name, table_schema in schema_tables.items():
            properties = get_table_properties(table_schema)
            records = combined_data.get(table_name, [])
            if not records:
                continue

            for field_name, field_def in properties.items():
                if not field_def.get("unique", False):
                    continue
                # Skip PKs, they're checked separately
                if field_def.get("primaryKey", False):
                    continue

                values = [
                    r.get(field_name)
                    for r in records
                    if r.get(field_name) is not None
                ]
                dupes = set(v for v in values if values.count(v) > 1)
                assert not dupes, (
                    f"Duplicate values for unique field "
                    f"{table_name}.{field_name}: {list(dupes)[:5]}"
                )
