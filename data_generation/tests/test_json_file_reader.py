"""Tests for JsonFileReader class."""

import json
import pytest
from pathlib import Path
from data_generation.generator.json_file_reader import JsonFileReader


class TestJsonFileReaderInit:
    """Tests for JsonFileReader initialization."""

    def test_init_with_valid_directory(self, tmp_path):
        """Test initialization with a valid directory."""
        reader = JsonFileReader(tmp_path)
        assert reader.directory_path == tmp_path

    def test_init_with_nonexistent_directory(self):
        """Test initialization with nonexistent directory raises error."""
        with pytest.raises(FileNotFoundError) as exc_info:
            JsonFileReader("/nonexistent/path/to/dir")
        assert "not found" in str(exc_info.value).lower()

    def test_init_with_file_instead_of_directory(self, tmp_path):
        """Test initialization with a file path raises error."""
        file_path = tmp_path / "test.json"
        file_path.write_text("[]")

        with pytest.raises(ValueError) as exc_info:
            JsonFileReader(file_path)
        assert "not a directory" in str(exc_info.value).lower()


class TestLoadSingleTableFiles:
    """Tests for loading individual table JSON files."""

    def test_load_single_table_file(self, tmp_path):
        """Test loading a single table JSON file."""
        users_data = [
            {"id": 1, "name": "Alice"},
            {"id": 2, "name": "Bob"},
        ]
        (tmp_path / "users.json").write_text(json.dumps(users_data))

        reader = JsonFileReader(tmp_path)
        data = reader.get_full_table_data()

        assert "users" in data
        assert len(data["users"]) == 2
        assert data["users"][0]["name"] == "Alice"

    def test_load_multiple_table_files(self, tmp_path):
        """Test loading multiple table JSON files."""
        (tmp_path / "users.json").write_text(json.dumps([
            {"id": 1, "name": "Alice"},
        ]))
        (tmp_path / "emails.json").write_text(json.dumps([
            {"id": 100, "subject": "Hello"},
            {"id": 101, "subject": "Re: Hello"},
        ]))

        reader = JsonFileReader(tmp_path)
        data = reader.get_full_table_data()

        assert "users" in data
        assert "emails" in data
        assert len(data["users"]) == 1
        assert len(data["emails"]) == 2

    def test_load_wrapped_format(self, tmp_path):
        """Test loading JSON with wrapped format {"data": [...]}."""
        (tmp_path / "users.json").write_text(json.dumps({
            "data": [
                {"id": 1, "name": "Alice"},
                {"id": 2, "name": "Bob"},
            ]
        }))

        reader = JsonFileReader(tmp_path)
        data = reader.get_full_table_data()

        assert "users" in data
        assert len(data["users"]) == 2

    def test_empty_table_file(self, tmp_path):
        """Test loading an empty table file."""
        (tmp_path / "users.json").write_text("[]")

        reader = JsonFileReader(tmp_path)
        data = reader.get_full_table_data()

        assert "users" in data
        assert len(data["users"]) == 0

    def test_skip_invalid_json_file(self, tmp_path):
        """Test that invalid JSON files are skipped with warning."""
        (tmp_path / "users.json").write_text(json.dumps([{"id": 1}]))
        (tmp_path / "bad.json").write_text("not valid json {")

        reader = JsonFileReader(tmp_path)
        data = reader.get_full_table_data()

        assert "users" in data
        assert "bad" not in data


class TestLoadCombinedFile:
    """Tests for loading all_tables.json combined file."""

    def test_load_combined_file(self, tmp_path):
        """Test loading combined all_tables.json file."""
        combined_data = {
            "users": [{"id": 1, "name": "Alice"}],
            "emails": [{"id": 100, "subject": "Hello"}],
        }
        (tmp_path / "all_tables.json").write_text(json.dumps(combined_data))

        reader = JsonFileReader(tmp_path)
        data = reader.get_full_table_data()

        assert "users" in data
        assert "emails" in data
        assert len(data["users"]) == 1
        assert len(data["emails"]) == 1

    def test_individual_files_override_combined(self, tmp_path):
        """Test that individual table files override combined file."""
        combined_data = {
            "users": [{"id": 1, "name": "Combined"}],
            "emails": [{"id": 100, "subject": "Hello"}],
        }
        (tmp_path / "all_tables.json").write_text(json.dumps(combined_data))

        (tmp_path / "users.json").write_text(json.dumps([
            {"id": 2, "name": "Individual"},
        ]))

        reader = JsonFileReader(tmp_path)
        data = reader.get_full_table_data()

        # users should be from individual file
        assert data["users"][0]["id"] == 2
        assert data["users"][0]["name"] == "Individual"
        # emails should be from combined file
        assert data["emails"][0]["id"] == 100


class TestGetExistingIds:
    """Tests for get_existing_ids method."""

    def test_get_existing_ids(self, tmp_path):
        """Test getting existing IDs from tables."""
        (tmp_path / "users.json").write_text(json.dumps([
            {"id": 1, "name": "Alice"},
            {"id": 5, "name": "Bob"},
            {"id": 10, "name": "Charlie"},
        ]))

        reader = JsonFileReader(tmp_path)
        ids = reader.get_existing_ids()

        assert "users" in ids
        assert set(ids["users"]) == {1, 5, 10}

    def test_get_existing_ids_skips_null_ids(self, tmp_path):
        """Test that records without id are skipped."""
        (tmp_path / "users.json").write_text(json.dumps([
            {"id": 1, "name": "Alice"},
            {"name": "Bob"},  # No id
            {"id": None, "name": "Charlie"},  # Null id
            {"id": 3, "name": "Diana"},
        ]))

        reader = JsonFileReader(tmp_path)
        ids = reader.get_existing_ids()

        assert set(ids["users"]) == {1, 3}

    def test_get_existing_ids_specific_tables(self, tmp_path):
        """Test getting existing IDs for specific tables only."""
        (tmp_path / "users.json").write_text(json.dumps([{"id": 1}]))
        (tmp_path / "emails.json").write_text(json.dumps([{"id": 100}]))
        (tmp_path / "threads.json").write_text(json.dumps([{"id": 1000}]))

        reader = JsonFileReader(tmp_path)
        ids = reader.get_existing_ids(table_names=["users", "emails"])

        assert "users" in ids
        assert "emails" in ids
        assert "threads" not in ids


class TestGetRowCounts:
    """Tests for get_row_counts method."""

    def test_get_row_counts(self, tmp_path):
        """Test getting row counts from tables."""
        (tmp_path / "users.json").write_text(json.dumps([
            {"id": 1}, {"id": 2}, {"id": 3}
        ]))
        (tmp_path / "emails.json").write_text(json.dumps([
            {"id": 100}
        ]))
        (tmp_path / "threads.json").write_text("[]")

        reader = JsonFileReader(tmp_path)
        counts = reader.get_row_counts()

        assert counts["users"] == 3
        assert counts["emails"] == 1
        assert counts["threads"] == 0

    def test_get_row_counts_specific_tables(self, tmp_path):
        """Test getting row counts for specific tables only."""
        (tmp_path / "users.json").write_text(json.dumps([{"id": 1}]))
        (tmp_path / "emails.json").write_text(json.dumps([{"id": 100}]))

        reader = JsonFileReader(tmp_path)
        counts = reader.get_row_counts(table_names=["users"])

        assert "users" in counts
        assert "emails" not in counts


class TestGetFullTableData:
    """Tests for get_full_table_data method."""

    def test_filter_specific_tables(self, tmp_path):
        """Test filtering to specific tables."""
        (tmp_path / "users.json").write_text(json.dumps([{"id": 1}]))
        (tmp_path / "emails.json").write_text(json.dumps([{"id": 100}]))
        (tmp_path / "threads.json").write_text(json.dumps([{"id": 1000}]))

        reader = JsonFileReader(tmp_path)
        data = reader.get_full_table_data(table_names=["users", "emails"])

        assert "users" in data
        assert "emails" in data
        assert "threads" not in data

    def test_filter_specific_columns(self, tmp_path):
        """Test filtering to specific columns."""
        (tmp_path / "users.json").write_text(json.dumps([
            {"id": 1, "name": "Alice", "email": "alice@test.com", "role": "admin"},
        ]))

        reader = JsonFileReader(tmp_path)
        data = reader.get_full_table_data(columns={"users": ["id", "name"]})

        assert data["users"][0] == {"id": 1, "name": "Alice"}
        assert "email" not in data["users"][0]
        assert "role" not in data["users"][0]


class TestCaching:
    """Tests for data caching behavior."""

    def test_data_is_cached(self, tmp_path):
        """Test that data is cached after first load."""
        (tmp_path / "users.json").write_text(json.dumps([{"id": 1}]))

        reader = JsonFileReader(tmp_path)

        # First load
        data1 = reader.get_full_table_data()

        # Modify file
        (tmp_path / "users.json").write_text(json.dumps([{"id": 2}]))

        # Second load should return cached data (underlying records are same objects)
        data2 = reader.get_full_table_data()

        # The record lists are the same objects (from cache)
        assert data1["users"] is data2["users"]
        # Content should still be from original file (id=1), not modified file (id=2)
        assert data1["users"][0]["id"] == 1
        assert data2["users"][0]["id"] == 1

    def test_close_clears_cache(self, tmp_path):
        """Test that close() clears the cache."""
        (tmp_path / "users.json").write_text(json.dumps([{"id": 1}]))

        reader = JsonFileReader(tmp_path)

        # First load
        data1 = reader.get_full_table_data()

        # Close (clears cache)
        reader.close()

        # Modify file
        (tmp_path / "users.json").write_text(json.dumps([{"id": 2}]))

        # Second load should reload
        data2 = reader.get_full_table_data()

        assert data1 is not data2
        assert data2["users"][0]["id"] == 2


class TestContextManager:
    """Tests for context manager protocol."""

    def test_context_manager(self, tmp_path):
        """Test using JsonFileReader as context manager."""
        (tmp_path / "users.json").write_text(json.dumps([{"id": 1}]))

        with JsonFileReader(tmp_path) as reader:
            data = reader.get_full_table_data()
            assert "users" in data

        # Cache should be cleared after exiting context
        assert reader._cached_data is None


class TestIntegrationWithGenerationContext:
    """Integration tests with GenerationContext."""

    def test_load_into_generation_context(self, tmp_path):
        """Test loading JSON data into GenerationContext."""
        from data_generation.generator.core.context import GenerationContext

        (tmp_path / "users.json").write_text(json.dumps([
            {"id": 1, "name": "Alice", "role": "admin"},
            {"id": 2, "name": "Bob", "role": "member"},
        ]))
        (tmp_path / "emails.json").write_text(json.dumps([
            {"id": 100, "subject": "Hello", "sender_id": 1},
        ]))

        reader = JsonFileReader(tmp_path)
        data = reader.get_full_table_data()

        context = GenerationContext()
        context.config = {
            "id_registration_attributes": {
                "users": ["role"],
            },
            "assignment_constraints": {
                "emails": {"sender_id": {"max_percentage": 50}},
            }
        }
        context.load_existing_records(data)

        # Verify IDs are registered
        assert set(context.generated_ids["users"]) == {1, 2}
        assert set(context.generated_ids["emails"]) == {100}

        # Verify attributes are registered
        assert context.get_ids_by_attr("users", "role", "admin") == [1]
        assert context.get_ids_by_attr("users", "role", "member") == [2]

        # Verify assignment counts
        assert context.get_existing_assignment_count("emails", "sender_id", 1) == 1
