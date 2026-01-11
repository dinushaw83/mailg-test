"""
Tests for the ingestion API endpoints.

Tests cover:
- POST /import-data - Import data from uploaded files (JSON, CSV, ZIP)
- GET /import-data - Get import status
- GET /import-data/history - Get all import history
- DELETE /import-data/cancel - Cancel active import
- POST /reset-seed-db/original - Reset to original state
- POST /reset-seed-db/empty - Reset to empty state
"""

import io
import json
import zipfile
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.api.v1.endpoints import ingestion


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def temp_reports_dir(tmp_path):
    """Create temporary reports directory for tests."""
    reports_dir = tmp_path / "reports"
    reports_dir.mkdir()
    original_dir = ingestion.REPORTS_DIR
    ingestion.REPORTS_DIR = reports_dir
    yield reports_dir
    ingestion.REPORTS_DIR = original_dir


@pytest.fixture
def sample_json_data():
    """Sample JSON data for import testing."""
    return [
        {
            "id": "00000000-0000-0000-0000-000000000001",
            "email": "test@example.com",
            "first_name": "Test",
            "last_name": "User"
        }
    ]


@pytest.fixture
def sample_csv_data():
    """Sample CSV data for import testing."""
    return "id,email,first_name,last_name\n00000000-0000-0000-0000-000000000001,test@example.com,Test,User"


def get_response_data(response):
    """Extract data from wrapped response format."""
    json_data = response.json()
    # Response is wrapped: {"success": bool, "message": str, "statusCode": int, "data": ...}
    if isinstance(json_data, dict) and "data" in json_data:
        return json_data["data"]
    return json_data


def get_response_message(response):
    """Extract message from wrapped response format."""
    json_data = response.json()
    if isinstance(json_data, dict) and "message" in json_data:
        return json_data["message"]
    # For error responses, detail might be in data
    if isinstance(json_data, dict) and "data" in json_data:
        data = json_data["data"]
        if isinstance(data, dict) and "detail" in data:
            return data["detail"]
    return None


class TestImportDataEndpoint:
    """Tests for POST /import-data endpoint."""

    def test_import_data_no_file(self, client):
        """Should reject request without file."""
        response = client.post("/api/v1/import-data")
        assert response.status_code == 422  # Validation error

    def test_import_data_invalid_file_format(self, client, temp_reports_dir):
        """Should reject unsupported file formats."""
        with patch.object(ingestion, 'create_seed_original_backup'):
            with patch.object(ingestion, 'get_active_imports', return_value=[]):
                response = client.post(
                    "/api/v1/import-data",
                    files={"file": ("test.txt", b"some content", "text/plain")},
                    data={"table_name": "users"}
                )
        assert response.status_code == 400
        message = get_response_message(response)
        assert message is not None
        assert "Invalid file format" in message

    def test_import_data_json_requires_table_name(self, client, temp_reports_dir):
        """JSON import should require table_name."""
        with patch.object(ingestion, 'create_seed_original_backup'):
            with patch.object(ingestion, 'get_active_imports', return_value=[]):
                response = client.post(
                    "/api/v1/import-data",
                    files={"file": ("test.json", b'[{"id": "1"}]', "application/json")},
                )
        assert response.status_code == 400
        message = get_response_message(response)
        assert message is not None
        assert "Table name is required" in message

    def test_import_data_csv_requires_table_name(self, client, temp_reports_dir):
        """CSV import should require table_name."""
        with patch.object(ingestion, 'create_seed_original_backup'):
            with patch.object(ingestion, 'get_active_imports', return_value=[]):
                response = client.post(
                    "/api/v1/import-data",
                    files={"file": ("test.csv", b"id\n1", "text/csv")},
                )
        assert response.status_code == 400
        message = get_response_message(response)
        assert message is not None
        assert "Table name is required" in message

    def test_import_data_zip_does_not_require_table_name(self, client, temp_reports_dir):
        """ZIP import should not require table_name."""
        # Create a valid ZIP file
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w') as zf:
            zf.writestr("users.json", json.dumps([{"id": "00000000-0000-0000-0000-000000000001"}]))
        zip_buffer.seek(0)

        with patch.object(ingestion, 'create_seed_original_backup'):
            with patch.object(ingestion, 'get_active_imports', return_value=[]):
                response = client.post(
                    "/api/v1/import-data",
                    files={"file": ("test.zip", zip_buffer.getvalue(), "application/zip")},
                )
        # Should accept without table_name (returns 202 for async processing)
        assert response.status_code == 202

    def test_import_data_conflict_when_import_active(self, client, temp_reports_dir):
        """Should return 409 when another import is in progress."""
        with patch.object(ingestion, 'create_seed_original_backup'):
            with patch.object(ingestion, 'get_active_imports', return_value=[
                {"import_id": "existing", "filename": "existing.json"}
            ]):
                response = client.post(
                    "/api/v1/import-data",
                    files={"file": ("test.json", b'[]', "application/json")},
                    data={"table_name": "users"}
                )
        assert response.status_code == 409
        message = get_response_message(response)
        assert message is not None
        assert "Another import is currently in progress" in message

    def test_import_data_file_size_limit(self, client, temp_reports_dir):
        """Should reject files exceeding size limit."""
        # Create content larger than MAX_FILE_SIZE_BYTES
        large_content = b"x" * (ingestion.MAX_FILE_SIZE_BYTES + 1)

        with patch.object(ingestion, 'create_seed_original_backup'):
            with patch.object(ingestion, 'get_active_imports', return_value=[]):
                response = client.post(
                    "/api/v1/import-data",
                    files={"file": ("large.json", large_content, "application/json")},
                    data={"table_name": "users"}
                )
        assert response.status_code == 400
        message = get_response_message(response)
        assert message is not None
        assert "exceeds maximum allowed size" in message

    def test_import_data_success_returns_202(self, client, temp_reports_dir):
        """Successful import should return 202 Accepted."""
        with patch.object(ingestion, 'create_seed_original_backup'):
            with patch.object(ingestion, 'get_active_imports', return_value=[]):
                response = client.post(
                    "/api/v1/import-data",
                    files={"file": ("test.json", b'[{"id": "1"}]', "application/json")},
                    data={"table_name": "users"}
                )
        assert response.status_code == 202
        data = get_response_data(response)
        assert "import_id" in data
        assert data["status"] == "pending"
        assert data["filename"] == "test.json"


class TestGetImportStatusEndpoint:
    """Tests for GET /import-data endpoint."""

    def test_get_import_status_not_found(self, client, temp_reports_dir):
        """Should return 404 for non-existent import."""
        response = client.get(
            "/api/v1/import-data",
            params={"import_id": "nonexistent", "filename": "test.json"}
        )
        assert response.status_code == 404
        message = get_response_message(response)
        assert message is not None
        assert "not found" in message

    def test_get_import_status_success(self, client, temp_reports_dir):
        """Should return import status when found."""
        # Create a report file - import_id stem is used for path construction
        import_id = "20240101_120000_test"  # No extension - stem is used
        report = {
            "import_id": import_id,
            "filename": "test.json",
            "status": "success",
            "total_records": 10
        }
        # get_report_path_from_friendly_name uses Path(id).stem then adds report_ prefix and .json
        report_path = temp_reports_dir / f"report_{import_id}.json"
        with open(report_path, 'w') as f:
            json.dump(report, f)

        response = client.get(
            "/api/v1/import-data",
            params={"import_id": import_id, "filename": "test.json"}
        )
        assert response.status_code == 200
        data = get_response_data(response)
        assert data["import_id"] == import_id
        assert data["status"] == "success"


class TestGetImportHistoryEndpoint:
    """Tests for GET /import-data/history endpoint."""

    def test_get_import_history_empty(self, client, temp_reports_dir):
        """Should return empty list when no imports."""
        response = client.get("/api/v1/import-data/history")
        assert response.status_code == 200
        data = get_response_data(response)
        assert data["imports"] == []
        assert data["total"] == 0

    def test_get_import_history_with_reports(self, client, temp_reports_dir):
        """Should return all import reports sorted by date."""
        # Create multiple report files
        reports = [
            {"import_id": "id1", "started_at": "2024-01-01T10:00:00", "finished_at": "2024-01-01T10:01:00"},
            {"import_id": "id2", "started_at": "2024-01-02T10:00:00", "finished_at": "2024-01-02T10:01:00"},
        ]
        for i, report in enumerate(reports):
            report_path = temp_reports_dir / f"report_id{i+1}.json"
            with open(report_path, 'w') as f:
                json.dump(report, f)

        response = client.get("/api/v1/import-data/history")
        assert response.status_code == 200
        data = get_response_data(response)
        assert data["total"] == 2
        # Should be sorted newest first
        assert data["imports"][0]["import_id"] == "id2"

    def test_get_import_history_includes_duration(self, client, temp_reports_dir):
        """Should calculate duration for completed imports."""
        report = {
            "import_id": "id1",
            "started_at": "2024-01-01T10:00:00",
            "finished_at": "2024-01-01T10:00:30"
        }
        report_path = temp_reports_dir / "report_id1.json"
        with open(report_path, 'w') as f:
            json.dump(report, f)

        response = client.get("/api/v1/import-data/history")
        assert response.status_code == 200
        data = get_response_data(response)
        assert data["imports"][0]["duration_seconds"] == 30.0


class TestCancelImportEndpoint:
    """Tests for DELETE /import-data/cancel endpoint."""

    def test_cancel_import_not_found(self, client, temp_reports_dir):
        """Should return 404 for non-existent import."""
        response = client.delete(
            "/api/v1/import-data/cancel",
            params={"import_id": "nonexistent", "filename": "test.json"}
        )
        assert response.status_code == 404

    def test_cancel_import_already_completed(self, client, temp_reports_dir):
        """Should return 400 for already completed import."""
        import_id = "completed_import"
        report = {
            "import_id": import_id,
            "filename": "test.json",
            "status": "success"
        }
        report_path = temp_reports_dir / f"report_{import_id}.json"
        with open(report_path, 'w') as f:
            json.dump(report, f)

        response = client.delete(
            "/api/v1/import-data/cancel",
            params={"import_id": import_id, "filename": "test.json"}
        )
        assert response.status_code == 400
        message = get_response_message(response)
        assert message is not None
        assert "Cannot cancel import with status" in message

    def test_cancel_import_success(self, client, temp_reports_dir):
        """Should successfully cancel pending import."""
        import_id = "pending_import"
        report = {
            "import_id": import_id,
            "filename": "test.json",
            "status": "pending"
        }
        report_path = temp_reports_dir / f"report_{import_id}.json"
        with open(report_path, 'w') as f:
            json.dump(report, f)

        # Create pending marker
        pending_path = temp_reports_dir / f"pending_{import_id}"
        pending_path.touch()

        response = client.delete(
            "/api/v1/import-data/cancel",
            params={"import_id": import_id, "filename": "test.json"}
        )
        assert response.status_code == 200
        data = get_response_data(response)
        assert data["success"] is True

        # Verify report was updated
        with open(report_path) as f:
            updated_report = json.load(f)
        assert updated_report["status"] == "cancelled"

        # Verify pending marker was removed
        assert not pending_path.exists()


class TestResetSeedDbOriginalEndpoint:
    """Tests for POST /reset-seed-db/original endpoint."""

    def test_reset_to_original_no_backup(self, client):
        """Should return 404 when no backup exists."""
        with patch.object(ingestion, '_pg_admin_engine') as mock_engine:
            mock_conn = MagicMock()
            mock_conn.__enter__ = MagicMock(return_value=mock_conn)
            mock_conn.__exit__ = MagicMock(return_value=None)
            mock_engine.return_value.connect.return_value = mock_conn
            mock_engine.return_value.dispose = MagicMock()

            with patch.object(ingestion, '_pg_db_exists', return_value=False):
                response = client.post("/api/v1/reset-seed-db/original")

        assert response.status_code == 404
        message = get_response_message(response)
        assert message is not None
        assert "not found" in message

    def test_reset_to_original_conflict_active_import(self, client):
        """Should return 409 when import is in progress."""
        with patch.object(ingestion, '_pg_admin_engine') as mock_engine:
            mock_conn = MagicMock()
            mock_conn.__enter__ = MagicMock(return_value=mock_conn)
            mock_conn.__exit__ = MagicMock(return_value=None)
            mock_engine.return_value.connect.return_value = mock_conn
            mock_engine.return_value.dispose = MagicMock()

            with patch.object(ingestion, '_pg_db_exists', return_value=True):
                with patch.object(ingestion, 'get_active_imports', return_value=[
                    {"import_id": "active", "filename": "test.json"}
                ]):
                    response = client.post("/api/v1/reset-seed-db/original")

        assert response.status_code == 409
        message = get_response_message(response)
        assert message is not None
        assert "import is in progress" in message

    def test_reset_to_original_success(self, client):
        """Should successfully reset to original state."""
        with patch.object(ingestion, '_pg_admin_engine') as mock_engine:
            mock_conn = MagicMock()
            mock_conn.__enter__ = MagicMock(return_value=mock_conn)
            mock_conn.__exit__ = MagicMock(return_value=None)
            mock_engine.return_value.connect.return_value = mock_conn
            mock_engine.return_value.dispose = MagicMock()

            with patch.object(ingestion, '_pg_db_exists', return_value=True):
                with patch.object(ingestion, 'get_active_imports', return_value=[]):
                    with patch.object(ingestion, '_reset_postgres_template_from'):
                        with patch.object(ingestion, '_pg_count_records', return_value={"users": 10}):
                            with patch.object(ingestion, 'drop_run_database'):
                                response = client.post("/api/v1/reset-seed-db/original")

        assert response.status_code == 200
        data = get_response_data(response)
        assert data["success"] is True
        assert "reset to original state" in data["message"]


class TestResetSeedDbEmptyEndpoint:
    """Tests for POST /reset-seed-db/empty endpoint."""

    def test_reset_to_empty_conflict_active_import(self, client):
        """Should return 409 when import is in progress."""
        with patch.object(ingestion, 'get_active_imports', return_value=[
            {"import_id": "active", "filename": "test.json"}
        ]):
            response = client.post("/api/v1/reset-seed-db/empty")

        assert response.status_code == 409
        message = get_response_message(response)
        assert message is not None
        assert "import is in progress" in message

    def test_reset_to_empty_success(self, client):
        """Should successfully reset to empty state."""
        with patch.object(ingestion, 'get_active_imports', return_value=[]):
            with patch.object(ingestion, '_ensure_postgres_empty_database'):
                with patch.object(ingestion, '_reset_postgres_template_from'):
                    with patch.object(ingestion, 'drop_run_database'):
                        response = client.post("/api/v1/reset-seed-db/empty")

        assert response.status_code == 200
        data = get_response_data(response)
        assert data["success"] is True
        assert "empty state" in data["message"]


class TestHelperFunctions:
    """Tests for helper functions in ingestion module."""

    def test_truncate_filename_short(self):
        """Short filenames should not be truncated."""
        result = ingestion.truncate_filename("short.json")
        assert result == "short.json"

    def test_truncate_filename_long(self):
        """Long filenames should be truncated."""
        result = ingestion.truncate_filename("this_is_a_very_long_filename_that_exceeds_limit.json")
        assert len(result) < len("this_is_a_very_long_filename_that_exceeds_limit.json")
        assert result.endswith(".json")
        assert ".." in result

    def test_generate_friendly_filename(self):
        """Should generate filename with timestamp prefix."""
        result = ingestion.generate_friendly_filename("test.json")
        # Format: <timestamp>_<truncated_filename>
        assert "_test.json" in result
        # Should have timestamp prefix (YYYYMMDD_HHMMSS format)
        assert len(result.split("_")[0]) == 8  # YYYYMMDD

    def test_get_report_path_from_friendly_name(self, temp_reports_dir):
        """Should construct correct report path."""
        path = ingestion.get_report_path_from_friendly_name("20240101_120000_test.json")
        assert path.name == "report_20240101_120000_test.json"
        assert path.parent == temp_reports_dir

    def test_get_report_path_prevents_traversal(self, temp_reports_dir):
        """Should prevent path traversal attacks via secure_filename sanitization."""
        # secure_filename strips dangerous characters instead of raising
        # The result should be sanitized to stay within reports directory
        path = ingestion.get_report_path_from_friendly_name("../../../etc/passwd")
        # Path should be inside reports dir after sanitization
        assert temp_reports_dir in path.parents or path.parent == temp_reports_dir
        # Should not contain path traversal
        assert ".." not in str(path)

    def test_get_pending_marker_path(self, temp_reports_dir):
        """Should construct correct pending marker path."""
        path = ingestion.get_pending_marker_path_from_friendly_name("20240101_120000_test.json")
        assert path.name == "pending_20240101_120000_test"
        assert path.parent == temp_reports_dir

    def test_create_report(self, temp_reports_dir):
        """Should create report and pending marker files."""
        import_id = "20240101_120000_test"  # No extension - stem is used for paths
        report = ingestion.create_report(import_id, "test.json", "json", "users")

        assert report["import_id"] == import_id
        assert report["filename"] == "test.json"
        assert report["status"] == "pending"

        # Check files were created (path uses stem of import_id)
        report_path = temp_reports_dir / f"report_{import_id}.json"
        pending_path = temp_reports_dir / f"pending_{import_id}"
        assert report_path.exists()
        assert pending_path.exists()

    def test_read_report_by_id(self, temp_reports_dir):
        """Should read report from file."""
        import_id = "test_import"
        report_data = {"import_id": import_id, "status": "success"}
        report_path = temp_reports_dir / f"report_{import_id}.json"
        with open(report_path, 'w') as f:
            json.dump(report_data, f)

        result = ingestion.read_report_by_id(import_id)
        assert result["import_id"] == import_id
        assert result["status"] == "success"

    def test_read_report_by_id_not_found(self, temp_reports_dir):
        """Should return None for non-existent report."""
        result = ingestion.read_report_by_id("nonexistent")
        assert result is None

    def test_update_report(self, temp_reports_dir):
        """Should update existing report."""
        import_id = "test_import"
        report_data = {"import_id": import_id, "status": "pending"}
        report_path = temp_reports_dir / f"report_{import_id}.json"
        with open(report_path, 'w') as f:
            json.dump(report_data, f)

        ingestion.update_report(import_id, "test.json", {"status": "success", "total_records": 10})

        with open(report_path) as f:
            updated = json.load(f)
        assert updated["status"] == "success"
        assert updated["total_records"] == 10

    def test_remove_pending_marker(self, temp_reports_dir):
        """Should remove pending marker file."""
        import_id = "test_import"
        pending_path = temp_reports_dir / f"pending_{import_id}"
        pending_path.touch()
        assert pending_path.exists()

        ingestion.remove_pending_marker(import_id, "test.json")
        assert not pending_path.exists()

    def test_get_active_imports(self, temp_reports_dir):
        """Should return list of active imports."""
        # Create pending marker and corresponding report
        # Note: get_active_imports looks for files with pattern "pending_*"
        # and expects report to be "report_<same_suffix>.json"
        import_id = "active_import"
        # Pending marker name is "pending_<import_id>" (no extension)
        pending_path = temp_reports_dir / f"pending_{import_id}"
        pending_path.touch()

        # Report name replaces "pending_" with "report_" and adds .json
        report_path = temp_reports_dir / f"report_{import_id}.json"
        with open(report_path, 'w') as f:
            json.dump({"import_id": import_id, "filename": "test.json"}, f)

        active = ingestion.get_active_imports()
        assert len(active) == 1
        assert active[0]["import_id"] == import_id

    def test_get_active_imports_empty(self, temp_reports_dir):
        """Should return empty list when no active imports."""
        active = ingestion.get_active_imports()
        assert active == []


class TestDataImporterIntegration:
    """Integration tests for DataImporter with schema validation."""

    def test_schema_utils_imports(self):
        """Schema utils should import successfully."""
        from app.utils.import_data.schema_utils import (
            TABLE_SCHEMAS,
            RELATIONSHIPS,
            get_table_dependency_order,
            validate_table_data,
            normalize_table_name,
        )
        assert TABLE_SCHEMAS is not None
        assert isinstance(RELATIONSHIPS, list)

    def test_get_table_dependency_order(self):
        """Should return tables in valid dependency order."""
        from app.utils.import_data.schema_utils import get_table_dependency_order
        order = get_table_dependency_order()
        assert isinstance(order, list)
        assert len(order) > 0
        # Users should come before emails (emails depend on users)
        if "users" in order and "emails" in order:
            assert order.index("users") < order.index("emails")

    def test_normalize_table_name(self):
        """Should extract table name from filename."""
        from app.utils.import_data.schema_utils import normalize_table_name
        assert normalize_table_name("users.json") == "users"
        assert normalize_table_name("Users.JSON") == "users"
        assert normalize_table_name("path/to/emails.csv") == "emails"

    def test_validate_table_data_valid(self):
        """Should validate correct data."""
        from app.utils.import_data.schema_utils import validate_table_data, TABLE_SCHEMAS

        # Skip if users table not in schema
        if "users" not in TABLE_SCHEMAS:
            pytest.skip("users table not in schema")

        records = [{
            "id": "00000000-0000-0000-0000-000000000001",
            "email": "test@example.com",
            "first_name": "Test",
            "last_name": "User"
        }]
        sanitized, error_type, errors = validate_table_data("users", records)
        # Should pass validation (no error type)
        assert error_type == ""

    def test_validate_table_data_unknown_table(self):
        """Should return error for unknown table."""
        from app.utils.import_data.schema_utils import validate_table_data

        sanitized, error_type, errors = validate_table_data("nonexistent_table", [{}])
        assert "Unknown table" in error_type
