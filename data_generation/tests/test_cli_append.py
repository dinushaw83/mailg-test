"""Tests for CLI --append functionality."""

import json
import pytest
from pathlib import Path
from data_generation.cli import main


class TestAppendValidation:
    """Tests for --append argument validation."""

    def test_append_requires_existing_data_source(self, capsys):
        """Test that --append fails without --existing-data-db or --existing-data-dir."""
        result = main(["--append", "--rows", "10"])
        assert result == 1

        captured = capsys.readouterr()
        assert "--append requires" in captured.err

    def test_append_allowed_with_existing_data_dir(self, tmp_path, capsys):
        """Test that --append is allowed with --existing-data-dir."""
        (tmp_path / "input").mkdir()
        (tmp_path / "input" / "users.json").write_text(json.dumps([
            {"id": 1, "name": "User1", "email": "user1@test.com"}
        ]))

        result = main([
            "--existing-data-dir", str(tmp_path / "input"),
            "--append",
            "--rows", "users=0",
            "--output", str(tmp_path / "output"),
            "--overwrite",
        ])

        captured = capsys.readouterr()
        assert "--append requires" not in captured.err

    def test_existing_data_dir_and_db_mutually_exclusive(self, tmp_path, capsys):
        """Test that --existing-data-dir and --existing-data-db are mutually exclusive."""
        (tmp_path / "input").mkdir()
        (tmp_path / "input" / "users.json").write_text(json.dumps([{"id": 1}]))

        result = main([
            "--existing-data-dir", str(tmp_path / "input"),
            "--existing-data-db", "postgresql://localhost/db",
            "--output", str(tmp_path / "output"),
        ])
        assert result == 1

        captured = capsys.readouterr()
        assert "mutually exclusive" in captured.err

    def test_nonexistent_existing_data_dir(self, tmp_path, capsys):
        """Test that --existing-data-dir with nonexistent path fails."""
        result = main([
            "--existing-data-dir", "/nonexistent/path",
            "--rows", "5",
            "--output", str(tmp_path / "output"),
        ])
        assert result == 1

        captured = capsys.readouterr()
        assert "Error" in captured.err


class TestAppendFunctionality:
    """Tests for --append data combination functionality."""

    def test_append_combines_existing_and_new_data(self, tmp_path):
        """Test that --append outputs existing + new records."""
        input_dir = tmp_path / "input"
        input_dir.mkdir()

        existing_users = [
            {"id": 1, "name": "Existing User 1", "email": "user1@test.com"},
            {"id": 2, "name": "Existing User 2", "email": "user2@test.com"},
        ]
        (input_dir / "users.json").write_text(json.dumps(existing_users))

        output_dir = tmp_path / "output"
        output_dir.mkdir()

        result = main([
            "--existing-data-dir", str(input_dir),
            "--append",
            "--rows", "users=5",  # Total 5 = 2 existing + 3 new
            "--output", str(output_dir),
            "--overwrite",
            "--seed", "42",
            "--no-seed",
        ])

        assert result == 0

        output_file = output_dir / "users.json"
        assert output_file.exists()

        with open(output_file) as f:
            output_data = json.load(f)

        # Should have 5 total: 2 existing + 3 new
        assert len(output_data) == 5

        # First 2 should be the existing users (in order, unchanged)
        assert output_data[0]["id"] == 1
        assert output_data[0]["name"] == "Existing User 1"
        assert output_data[1]["id"] == 2
        assert output_data[1]["name"] == "Existing User 2"

        # Remaining 3 should be new users with different IDs from existing
        existing_ids = {1, 2}
        new_ids = [output_data[i]["id"] for i in range(2, 5)]
        assert all(id_val not in existing_ids for id_val in new_ids), f"New IDs should differ from existing, got {new_ids}"
        assert len(set(new_ids)) == 3, "New IDs should be unique"

    def test_append_preserves_existing_order(self, tmp_path):
        """Test that --append preserves the order of existing records."""
        input_dir = tmp_path / "input"
        input_dir.mkdir()

        existing_data = [
            {"id": 100, "name": "First", "email": "first@test.com"},
            {"id": 50, "name": "Second", "email": "second@test.com"},
            {"id": 200, "name": "Third", "email": "third@test.com"},
        ]
        (input_dir / "users.json").write_text(json.dumps(existing_data))

        output_dir = tmp_path / "output"
        output_dir.mkdir()

        result = main([
            "--existing-data-dir", str(input_dir),
            "--append",
            "--rows", "users=3",  # Only existing, no new
            "--output", str(output_dir),
            "--overwrite",
            "--no-seed",
        ])

        assert result == 0

        with open(output_dir / "users.json") as f:
            output_data = json.load(f)

        # Order should be preserved: 100, 50, 200
        assert output_data[0]["id"] == 100
        assert output_data[1]["id"] == 50
        assert output_data[2]["id"] == 200

    def test_append_with_zero_new_rows(self, tmp_path):
        """Test --append when no new rows are generated."""
        input_dir = tmp_path / "input"
        input_dir.mkdir()

        existing_data = [
            {"id": 1, "name": "User1", "email": "u1@test.com"},
            {"id": 2, "name": "User2", "email": "u2@test.com"},
        ]
        (input_dir / "users.json").write_text(json.dumps(existing_data))

        output_dir = tmp_path / "output"
        output_dir.mkdir()

        result = main([
            "--existing-data-dir", str(input_dir),
            "--append",
            "--rows", "users=2",  # Same as existing, no new rows
            "--output", str(output_dir),
            "--overwrite",
            "--no-seed",
        ])

        assert result == 0

        with open(output_dir / "users.json") as f:
            output_data = json.load(f)

        assert len(output_data) == 2
        assert output_data[0]["id"] == 1
        assert output_data[1]["id"] == 2


class TestAppendWithTableOption:
    """Tests for --append with --table option."""

    def test_append_with_table_only_outputs_that_table(self, tmp_path):
        """Test that --append with --table only outputs the specified table."""
        input_dir = tmp_path / "input"
        input_dir.mkdir()

        (input_dir / "users.json").write_text(json.dumps([
            {"id": 1, "name": "User1", "email": "u1@test.com"},
        ]))
        (input_dir / "labels.json").write_text(json.dumps([
            {"id": 1, "name": "Important", "user_id": 1},
        ]))

        output_dir = tmp_path / "output"
        output_dir.mkdir()

        result = main([
            "--existing-data-dir", str(input_dir),
            "--append",
            "--table", "users",
            "--rows", "2",
            "--output", str(output_dir),
            "--overwrite",
            "--no-seed",
            "--no-deps",
            "--seed", "42",
        ])

        assert result == 0

        assert (output_dir / "users.json").exists()
        # labels should NOT be created
        assert not (output_dir / "labels.json").exists()

        with open(output_dir / "users.json") as f:
            users = json.load(f)
        # 1 existing + 2 new = 3
        assert len(users) == 3
        assert users[0]["id"] == 1  # Existing first


class TestAppendWithSingleFile:
    """Tests for --append with --single-file option."""

    def test_append_with_single_file_output(self, tmp_path):
        """Test --append works with --single-file output."""
        input_dir = tmp_path / "input"
        input_dir.mkdir()

        (input_dir / "users.json").write_text(json.dumps([
            {"id": 1, "name": "User1", "email": "u1@test.com"}
        ]))

        output_dir = tmp_path / "output"
        output_dir.mkdir()

        result = main([
            "--existing-data-dir", str(input_dir),
            "--append",
            "--rows", "users=2",
            "--output", str(output_dir),
            "--single-file",
            "--overwrite",
            "--no-seed",
            "--seed", "42",
        ])

        assert result == 0

        with open(output_dir / "all_tables.json") as f:
            output_data = json.load(f)

        assert "users" in output_data
        assert len(output_data["users"]) == 2


class TestAppendInPlace:
    """Tests for --append with same input and output directory."""

    def test_append_in_place_same_directory(self, tmp_path):
        """Test --append when input and output are the same directory."""
        data_dir = tmp_path / "data"
        data_dir.mkdir()

        existing_users = [
            {"id": 1, "name": "User1", "email": "u1@test.com"},
            {"id": 2, "name": "User2", "email": "u2@test.com"},
        ]
        (data_dir / "users.json").write_text(json.dumps(existing_users))

        result = main([
            "--existing-data-dir", str(data_dir),
            "--append",
            "--rows", "users=4",  # 2 existing + 2 new
            "--output", str(data_dir),
            "--overwrite",
            "--no-seed",
            "--seed", "42",
        ])

        assert result == 0

        with open(data_dir / "users.json") as f:
            output_data = json.load(f)

        assert len(output_data) == 4
        assert output_data[0]["id"] == 1
        assert output_data[1]["id"] == 2

    def test_append_in_place_preserves_data_on_rerun(self, tmp_path):
        """Test that running --append multiple times accumulates data correctly."""
        data_dir = tmp_path / "data"
        data_dir.mkdir()

        (data_dir / "users.json").write_text(json.dumps([
            {"id": 1, "name": "Original", "email": "orig@test.com"},
        ]))

        # First run: add 1 more (total 2)
        result = main([
            "--existing-data-dir", str(data_dir),
            "--append",
            "--rows", "users=2",
            "--output", str(data_dir),
            "--overwrite",
            "--no-seed",
            "--seed", "42",
        ])
        assert result == 0

        with open(data_dir / "users.json") as f:
            data_after_first = json.load(f)
        assert len(data_after_first) == 2
        assert data_after_first[0]["name"] == "Original"

        # Second run: add 1 more (total 3)
        result = main([
            "--existing-data-dir", str(data_dir),
            "--append",
            "--rows", "users=3",
            "--output", str(data_dir),
            "--overwrite",
            "--no-seed",
            "--seed", "43",
        ])
        assert result == 0

        with open(data_dir / "users.json") as f:
            data_after_second = json.load(f)
        assert len(data_after_second) == 3
        assert data_after_second[0]["name"] == "Original"


class TestAppendWithStdout:
    """Tests for --append with --stdout option."""

    def test_append_with_stdout(self, tmp_path, capsys):
        """Test --append works with --stdout output."""
        input_dir = tmp_path / "input"
        input_dir.mkdir()

        (input_dir / "users.json").write_text(json.dumps([
            {"id": 1, "name": "Existing", "email": "existing@test.com"}
        ]))

        result = main([
            "--existing-data-dir", str(input_dir),
            "--append",
            "--rows", "users=2",
            "--stdout",
            "--no-seed",
            "--seed", "42",
        ])

        assert result == 0

        captured = capsys.readouterr()
        # Find the JSON object in stdout (may have other print statements before it)
        stdout_lines = captured.out.strip().split("\n")
        json_start = None
        for i, line in enumerate(stdout_lines):
            if line.strip().startswith("{"):
                json_start = i
                break

        assert json_start is not None, "Could not find JSON in stdout"
        json_text = "\n".join(stdout_lines[json_start:])
        output_data = json.loads(json_text)

        assert "users" in output_data
        assert len(output_data["users"]) == 2
        # First should be existing
        assert output_data["users"][0]["name"] == "Existing"
