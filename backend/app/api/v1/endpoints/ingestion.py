from fastapi import APIRouter, UploadFile, File, HTTPException, Form, BackgroundTasks, Request, Depends
from fastapi.responses import JSONResponse
from typing import Optional
from datetime import datetime
from pathlib import Path
import json
import uuid
import logging
import os
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from werkzeug.utils import secure_filename

from app.core.config import (
    DATABASE_URL,
    POSTGRES_ADMIN_DB,
    POSTGRES_TEMPLATE_DB,
)
from app.db.base import Base
from app.utils.import_data.data_importer import DataImporter
from app.db.run_router import drop_run_database
from app.auth.token_dependency import get_token_data_optional

logger = logging.getLogger(__name__)
router = APIRouter()

# Base directory (backend folder)
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent

# Reports directory - use environment variable or default to local path
REPORTS_DIR = Path(os.environ.get("REPORTS_DIR", BASE_DIR / "reports"))
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

# Postgres template helper database names
POSTGRES_SEED_ORIGINAL_DB = f"{POSTGRES_TEMPLATE_DB}_original"
POSTGRES_EMPTY_DB = f"{POSTGRES_TEMPLATE_DB}_empty"

# Must match app.db_router._PG_TEMPLATE_LOCK_KEY (kept local to avoid importing private symbol)
_PG_TEMPLATE_LOCK_KEY = 88112233

# Maximum file size for uploads (100 MB)
MAX_FILE_SIZE_MB = 10
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024


def _pg_admin_engine():
    url = make_url(DATABASE_URL).set(database=POSTGRES_ADMIN_DB)
    return create_engine(url, isolation_level="AUTOCOMMIT", pool_pre_ping=True)


def _pg_db_exists(conn, db_name: str) -> bool:
    return (
            conn.execute(
                text("SELECT 1 FROM pg_database WHERE datname=:name"),
                {"name": db_name},
            ).scalar()
            is not None
    )


def _pg_terminate_connections(conn, db_name: str):
    conn.execute(
        text(
            """
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = :db_name
              AND pid <> pg_backend_pid()
            """
        ),
        {"db_name": db_name},
    )


def _pg_advisory_lock(conn):
    conn.execute(text("SELECT pg_advisory_lock(:k)"), {"k": _PG_TEMPLATE_LOCK_KEY})


def _pg_advisory_unlock(conn):
    conn.execute(text("SELECT pg_advisory_unlock(:k)"), {"k": _PG_TEMPLATE_LOCK_KEY})


def _pg_template_engine(db_name: str = POSTGRES_TEMPLATE_DB):
    url = make_url(DATABASE_URL).set(database=db_name)
    return create_engine(url, pool_pre_ping=True)


def _count_db_records(db_name: str) -> int:
    """Count total records in key tables to check if database has data.

    Must be called OUTSIDE of advisory lock to avoid connection conflicts.
    """
    engine = _pg_template_engine(db_name)
    try:
        with engine.connect() as conn:
            total = 0
            for table in ["users", "tickets", "organizations"]:
                try:
                    result = conn.execute(text(f'SELECT COUNT(*) FROM "{table}"'))
                    total += result.scalar() or 0
                except Exception:
                    pass
            return total
    finally:
        engine.dispose()


def _ensure_postgres_seed_original_backup():
    """Create a template backup database the first time (Postgres only).

    If the backup exists but is empty while the template has data,
    the backup will be recreated to capture the current template state.
    """
    admin = _pg_admin_engine()

    # First check if backup exists (quick check, no lock needed)
    try:
        with admin.connect() as conn:
            backup_exists = _pg_db_exists(conn, POSTGRES_SEED_ORIGINAL_DB)
            template_exists = _pg_db_exists(conn, POSTGRES_TEMPLATE_DB)
    finally:
        admin.dispose()

    if not template_exists:
        raise RuntimeError(f"Template database '{POSTGRES_TEMPLATE_DB}' not found.")

    # Count records OUTSIDE the advisory lock to avoid connection conflicts
    need_recreate = False
    if backup_exists:
        backup_count = _count_db_records(POSTGRES_SEED_ORIGINAL_DB)
        if backup_count > 0:
            logger.debug(f"Backup database {POSTGRES_SEED_ORIGINAL_DB} exists with {backup_count} records")
            return

        # Backup is empty - check if template has data
        template_count = _count_db_records(POSTGRES_TEMPLATE_DB)
        if template_count == 0:
            logger.debug(f"Both backup and template are empty, keeping existing backup")
            return

        logger.info(f"Backup {POSTGRES_SEED_ORIGINAL_DB} is empty but template has {template_count} records. Will recreate backup...")
        need_recreate = True

    # Now acquire lock and do the actual database operations
    admin = _pg_admin_engine()
    try:
        with admin.connect() as conn:
            _pg_advisory_lock(conn)
            try:
                if need_recreate:
                    # Re-verify backup still exists (could have changed)
                    if _pg_db_exists(conn, POSTGRES_SEED_ORIGINAL_DB):
                        _pg_terminate_connections(conn, POSTGRES_SEED_ORIGINAL_DB)
                        conn.execute(text(f"DROP DATABASE {POSTGRES_SEED_ORIGINAL_DB}"))
                        logger.info(f"Dropped empty backup database {POSTGRES_SEED_ORIGINAL_DB}")

                # Check again if backup exists (may have been dropped above or by another process)
                if not _pg_db_exists(conn, POSTGRES_SEED_ORIGINAL_DB):
                    _pg_terminate_connections(conn, POSTGRES_TEMPLATE_DB)
                    conn.execute(text(f"CREATE DATABASE {POSTGRES_SEED_ORIGINAL_DB} TEMPLATE {POSTGRES_TEMPLATE_DB}"))
                    logger.info(f"Created Postgres backup database {POSTGRES_SEED_ORIGINAL_DB} from {POSTGRES_TEMPLATE_DB}")
            finally:
                _pg_advisory_unlock(conn)
    finally:
        admin.dispose()


def _ensure_postgres_empty_database():
    """Ensure an empty template database (schema only) exists (Postgres only)."""
    admin = _pg_admin_engine()
    try:
        with admin.connect() as conn:
            _pg_advisory_lock(conn)
            try:
                if _pg_db_exists(conn, POSTGRES_EMPTY_DB):
                    return
                conn.execute(text(f"CREATE DATABASE {POSTGRES_EMPTY_DB}"))
            finally:
                _pg_advisory_unlock(conn)
    finally:
        admin.dispose()

    # Create schema in the empty DB
    empty_engine = _pg_template_engine(POSTGRES_EMPTY_DB)
    try:
        Base.metadata.create_all(bind=empty_engine)
    finally:
        empty_engine.dispose()


def _reset_postgres_template_from(source_db: str):
    """Reset the template DB by recreating it from another DB using TEMPLATE."""
    admin = _pg_admin_engine()
    try:
        with admin.connect() as conn:
            _pg_advisory_lock(conn)
            try:
                if not _pg_db_exists(conn, source_db):
                    raise FileNotFoundError(f"Source database '{source_db}' not found.")

                # Both template and source must have no other connections for TEMPLATE
                _pg_terminate_connections(conn, POSTGRES_TEMPLATE_DB)
                _pg_terminate_connections(conn, source_db)

                if _pg_db_exists(conn, POSTGRES_TEMPLATE_DB):
                    conn.execute(text(f"DROP DATABASE {POSTGRES_TEMPLATE_DB}"))
                conn.execute(text(f"CREATE DATABASE {POSTGRES_TEMPLATE_DB} TEMPLATE {source_db}"))
            finally:
                _pg_advisory_unlock(conn)
    finally:
        admin.dispose()


def _pg_count_records(db_name: str, tables: list[str]) -> dict:
    engine = _pg_template_engine(db_name)
    try:
        with engine.connect() as conn:
            counts = {}
            for t in tables:
                try:
                    counts[t] = int(conn.execute(text(f'SELECT COUNT(*) FROM \"{t}\"')).scalar() or 0)
                except Exception:
                    counts[t] = 0
            return counts
    finally:
        engine.dispose()


def _get_template_connection_params(db_name: str = POSTGRES_TEMPLATE_DB) -> dict:
    """Get connection parameters for a specific database in psycopg2 format."""
    url = make_url(DATABASE_URL).set(database=db_name)
    return {
        "host": url.host,
        "port": url.port or 5432,
        "database": url.database,
        "user": url.username,
        "password": url.password,
    }


def create_seed_original_backup():
    """
    Create a backup template database if it doesn't exist.

    This is called before the first import to preserve the original state.
    """
    _ensure_postgres_seed_original_backup()


def truncate_filename(filename: str, max_length: int = 20) -> str:
    """
    Truncate filename if longer than max_length.

    Format: first 20 chars + ".." + extension
    Example: very_long_filename_here.json -> very_long_filename_..json

    Args:
        filename: Original filename
        max_length: Maximum length for the base name (without extension)

    Returns:
        Truncated filename
    """
    path = Path(filename)
    name = path.stem
    ext = path.suffix

    if len(name) <= max_length:
        return filename

    return f"{name[:max_length]}..{ext}"


def generate_friendly_filename(filename: str) -> str:
    """
    Generate a friendly filename with timestamp and truncated filename.

    Format: <timestamp>_<truncated_filename>

    Args:
        filename: Original filename

    Returns:
        Friendly filename with timestamp for use in report/pending marker names
    """
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    truncated = truncate_filename(filename)
    return f"{timestamp}_{truncated}"


def get_report_path_from_friendly_name(friendly_name: str) -> Path:
    """Get the path to an import report file using the friendly name, with path validation."""
    # Strip any extension and sanitize friendly_name to be a secure filename
    base_name = secure_filename(Path(friendly_name).stem)
    candidate = REPORTS_DIR / f"report_{base_name}.json"
    # Normalize and ensure path is strictly inside REPORTS_DIR
    normalized = candidate.resolve()
    reports_dir_resolved = REPORTS_DIR.resolve()
    # Robust path traversal prevention using is_relative_to (Python 3.9+) or equivalent
    try:
        if not normalized.is_relative_to(reports_dir_resolved):
            raise HTTPException(status_code=400, detail="Invalid import_id (path traversal detected)")
    except AttributeError:
        # For Python <3.9, use parent chain
        if reports_dir_resolved not in normalized.parents and reports_dir_resolved != normalized:
            raise HTTPException(status_code=400, detail="Invalid import_id (path traversal detected)")
    return normalized


def get_pending_marker_path_from_friendly_name(friendly_name: str) -> Path:
    """Get the path to a pending import marker file using the friendly name, with path validation."""
    # Strip any extension and sanitize friendly_name to be a secure filename
    base_name = secure_filename(Path(friendly_name).stem)
    candidate = REPORTS_DIR / f"pending_{base_name}"
    normalized = candidate.resolve()
    reports_dir_resolved = REPORTS_DIR.resolve()
    try:
        if not normalized.is_relative_to(reports_dir_resolved):
            raise HTTPException(status_code=400, detail="Invalid import_id (path traversal detected)")
    except AttributeError:
        if reports_dir_resolved not in normalized.parents and reports_dir_resolved != normalized:
            raise HTTPException(status_code=400, detail="Invalid import_id (path traversal detected)")
    return normalized

def create_report(import_id: str, filename: str, file_type: str, table_name: Optional[str]) -> dict:
    """Create a new import report and pending marker."""
    # Generate friendly filename once with timestamp
    friendly_name = generate_friendly_filename(filename)

    report = {
        "import_id": import_id,
        "filename": filename,
        "file_type": file_type,
        "table_name": table_name,
        "status": "pending",
        "message": None,
        "total_records": 0,
        "started_at": datetime.utcnow().isoformat(),
        "finished_at": None,
        "table_results": []
    }

    # Create pending marker (empty file to signal active import)
    pending_path = get_pending_marker_path_from_friendly_name(import_id)
    pending_path.touch()

    # Create report file and ensure it's synced to disk
    report_path = get_report_path_from_friendly_name(import_id)
    logger.info(f"Creating import report: {report_path}")
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)

    return report


def read_report_by_id(import_id: str) -> Optional[dict]:
    """Read a report by import_id (which is the friendly_name).

    Constructs path directly - no directory listing needed.
    """
    report_path = get_report_path_from_friendly_name(import_id)
    if not report_path.exists():
        return None
    try:
        with open(report_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error reading report file {report_path}: {e}")
        return None


def read_report(import_id: str, filename: str) -> Optional[dict]:
    """Read an import report by import_id."""
    return read_report_by_id(import_id)


def update_report(import_id: str, filename: str, updates: dict):
    """Update an import report."""
    report = read_report_by_id(import_id)
    if not report:
        raise ValueError(f"Report {import_id} not found")

    report.update(updates)

    # import_id IS the friendly_name, so construct path directly
    report_path = get_report_path_from_friendly_name(import_id)
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)


def remove_pending_marker(import_id: str, filename: str):
    """Remove pending marker when import completes or fails."""
    # import_id IS the friendly_name, so construct path directly
    pending_path = get_pending_marker_path_from_friendly_name(import_id)
    if pending_path.exists():
        pending_path.unlink()


def get_active_imports() -> list:
    """
    Get all active (pending or processing) imports by checking for pending marker files.

    This is much faster than parsing all report JSON files.

    Returns:
        List of dicts with import_id and filename of active imports
    """
    active = []
    for pending_file in REPORTS_DIR.glob("pending_*"):
        # The pending marker filename format: pending_<timestamp>_<truncated_filename>
        # The corresponding report has the same name but with "report_" prefix and .json extension
        marker_name = pending_file.name
        report_name = marker_name.replace("pending_", "report_") + ".json"
        report_path = REPORTS_DIR / report_name

        if report_path.exists():
            try:
                with open(report_path, 'r') as f:
                    report = json.load(f)
                    active.append({
                        "import_id": report.get("import_id"),
                        "filename": report.get("filename")
                    })
            except Exception:
                # If we can't read the report, skip it
                continue

    return active


@router.post("/import-data", status_code=202)
async def import_data(
        request: Request,
        background_tasks: BackgroundTasks,
        file: UploadFile = File(...),
        table_name: Optional[str] = Form(None),
        reclone_current_session: bool = Form(False),
        ignore_duplicates: bool = Form(True),
        _token_data=Depends(get_token_data_optional)
):
    """
    Import data from uploaded file (JSON, CSV, or ZIP) - asynchronous processing.

    Imports update seed.db so all test runs can use the imported data.
    Import status is tracked in JSON reports.

    Args:
        request: FastAPI request (for extracting run_id from JWT via middleware)
        background_tasks: FastAPI background tasks
        file: Uploaded file (JSON, CSV, or ZIP format)
        table_name: Target table name (required for non-ZIP files)
        reclone_current_session: If True, drops current session's run database after import
                                 so it gets recloned from updated template on next access
        ignore_duplicates: If True, skip duplicate records. If False, fail on duplicates.
        _token_data: Optional token data (injected by Depends, sets request.state.run_id)

    Returns:
        202 Accepted with import request ID for status tracking

    Raises:
        HTTPException: If validation fails
    """
    # Get run_id from request state (set by get_token_data_optional dependency from JWT token)
    run_id = getattr(request.state, "run_id", None) if reclone_current_session else None
    # Validate file was provided
    if not file or not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file selected. Please select a file to upload."
        )

    # Get file extension
    filename = file.filename.lower()
    file_extension = None

    if filename.endswith('.json'):
        file_extension = 'json'
    elif filename.endswith('.csv'):
        file_extension = 'csv'
    elif filename.endswith('.zip'):
        file_extension = 'zip'
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file format. Supported formats: JSON, CSV, ZIP. Received: {file.filename}"
        )

    # Validate table name requirement for non-ZIP files
    if file_extension != 'zip':
        if not table_name or table_name.strip() == "":
            raise HTTPException(
                status_code=400,
                detail="Table name is required when uploading JSON or CSV files."
            )

    # Create backup of original template database before first import
    create_seed_original_backup()

    # Check for active imports (prevent concurrent imports)
    active_imports = get_active_imports()
    if active_imports:
        active = active_imports[0]
        raise HTTPException(
            status_code=409,
            detail=f"Another import is currently in progress (ID: {active['import_id']}, file: {active['filename']}). Please wait for it to complete before starting a new import."
        )

    # Read file content
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to read uploaded file: {str(e)}"
        )

    # Validate file size
    if len(content) > MAX_FILE_SIZE_BYTES:
        size_mb = len(content) / 1024 / 1024
        raise HTTPException(
            status_code=400,
            detail=f"File size ({size_mb:.2f} MB) exceeds maximum allowed size of {MAX_FILE_SIZE_MB} MB."
        )

    # Create import report - use friendly_name as import_id for direct path construction
    import_id = generate_friendly_filename(file.filename)
    create_report(import_id, file.filename, file_extension, table_name)

    # Schedule background processing
    background_tasks.add_task(
        process_import_async,
        import_id=import_id,
        filename=file.filename,
        content=content,
        file_extension=file_extension,
        table_name=table_name,
        reclone_run_id=run_id,
        ignore_duplicates=ignore_duplicates
    )

    return JSONResponse(
        status_code=202,
        content={
            "import_id": import_id,
            "filename": file.filename,
            "status": "pending",
            "message": f"Importing {file.filename} in background."
        }
    )


@router.get("/import-data")
async def get_import_status(import_id: str, filename: str):
    """
    Get the status of an import request.

    Args:
        import_id: Import identifier (query parameter)
        filename: Original filename (query parameter)

    Returns:
        Import request status and details, including table-level results for ZIP imports

    Raises:
        HTTPException: If import request not found
    """
    report = read_report(import_id, filename)

    if not report:
        raise HTTPException(
            status_code=404,
            detail=f"Import request {import_id} not found"
        )

    return report


@router.get("/import-data/history")
async def get_import_history():
    """
    Get all import history sorted by date (newest first).

    Returns:
        List of import reports with computed duration fields
    """
    reports = []

    for report_file in REPORTS_DIR.glob("report_*.json"):
        try:
            with open(report_file, 'r') as f:
                report = json.load(f)

                # Calculate duration in seconds
                if report.get("started_at") and report.get("finished_at"):
                    start = datetime.fromisoformat(report["started_at"])
                    end = datetime.fromisoformat(report["finished_at"])
                    duration_seconds = (end - start).total_seconds()
                    report["duration_seconds"] = round(duration_seconds, 2)
                else:
                    report["duration_seconds"] = None

                reports.append(report)
        except Exception as e:
            logger.warning(f"Failed to read report {report_file}: {e}")
            continue

    # Sort by started_at descending (newest first)
    reports.sort(key=lambda r: r.get("started_at", ""), reverse=True)

    return {"imports": reports, "total": len(reports)}


@router.delete("/import-data/cancel")
async def cancel_import(import_id: str, filename: str):
    """
    Cancel an active import request.

    This removes the pending marker, effectively marking the import as cancelled.
    The background process may continue briefly but will fail when trying to update the report.

    Args:
        import_id: Import identifier (query parameter)
        filename: Original filename (query parameter)

    Returns:
        Success message

    Raises:
        HTTPException: If import request not found or already completed
    """
    report = read_report(import_id, filename)

    if not report:
        raise HTTPException(
            status_code=404,
            detail=f"Import request {import_id} not found"
        )

    if report["status"] not in ["pending", "processing"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel import with status '{report['status']}'. Only pending or processing imports can be cancelled."
        )

    # Remove pending marker
    remove_pending_marker(import_id, filename)

    # Update report status
    update_report(import_id, filename, {
        "status": "cancelled",
        "message": "Import cancelled by user",
        "finished_at": datetime.utcnow().isoformat()
    })

    return {
        "success": True,
        "message": f"Import {import_id} has been cancelled"
    }


async def process_import_async(
        import_id: str,
        filename: str,
        content: bytes,
        file_extension: str,
        table_name: Optional[str],
        reclone_run_id: Optional[str] = None,
        ignore_duplicates: bool = True
):
    """
    Process import in background task.

    Updates seed.db with imported data and tracks status in JSON report.
    Creates backup before import and restores on failure.

    Args:
        import_id: Import identifier (friendly_name)
        filename: Original filename
        content: File content bytes
        file_extension: File type (json/csv/zip)
        table_name: Target table name
        reclone_run_id: Optional run_id to reclone after successful import
        ignore_duplicates: If True, skip duplicates. If False, fail on duplicates.
    """
    # Postgres-only importer (transactional).

    # Callbacks for tracking ZIP file table imports
    def on_table_start(table_name: str):
        """Create table result record when import starts."""
        report = read_report_by_id(import_id)
        if not report:
            return

        report["table_results"].append({
            "table_name": table_name,
            "status": "processing",
            "records_imported": 0,
            "error_message": None,
            "started_at": datetime.utcnow().isoformat(),
            "finished_at": None
        })

        # import_id IS the friendly_name, construct path directly
        report_path = get_report_path_from_friendly_name(import_id)
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)

    def on_table_complete(table_name: str, result: dict):
        """Update table result record when import completes."""
        report = read_report_by_id(import_id)
        if not report:
            return

        for table_result in report["table_results"]:
            if table_result["table_name"] == table_name:
                table_result["status"] = result.get("status", "success")
                table_result["records_imported"] = result.get("records_imported", 0)
                table_result["error_message"] = result.get("error")
                table_result["finished_at"] = datetime.utcnow().isoformat()
                break

        # import_id IS the friendly_name, construct path directly
        report_path = get_report_path_from_friendly_name(import_id)
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)

    try:
        # Update status to processing
        logger.info(f"Starting import processing for import_id: {import_id}, filename: {filename}")

        report = read_report(import_id, filename)
        if not report:
            raise ValueError(f"Import report not found: {import_id}")

        update_report(import_id, filename, {"status": "processing"})

        # Import into template database
        connection_params = _get_template_connection_params()
        with DataImporter(connection_params) as importer:
            if file_extension == 'json':
                content_str = content.decode('utf-8')
                result = importer.import_json_data(table_name, content_str, ignore_duplicates=ignore_duplicates)
            elif file_extension == 'csv':
                content_str = content.decode('utf-8')
                result = importer.import_csv_data(table_name, content_str, ignore_duplicates=ignore_duplicates)
            elif file_extension == 'zip':
                result = importer.import_zip_data(
                    content,
                    on_table_start=on_table_start,
                    on_table_complete=on_table_complete,
                    ignore_duplicates=ignore_duplicates
                )
            else:
                raise ValueError(f"Unsupported file type: {file_extension}")

        # Extract total records from result
        total_records = 0
        if file_extension == 'zip':
            total_records = result.get("total_records", 0)
        else:
            total_records = result.get("records_imported", 0)

        # Reclone run database if requested
        reclone_message = ""
        if reclone_run_id:
            try:
                result = drop_run_database(reclone_run_id)
                if result.get("dropped"):
                    reclone_message = f" Run database '{reclone_run_id}' dropped and will be recloned on next access."
                    logger.info(f"Dropped run database for reclone: {reclone_run_id}")
                else:
                    reclone_message = f" Run database '{reclone_run_id}' not found (may already be fresh)."
                    logger.info(f"Run database not found for reclone: {reclone_run_id}")
            except Exception as e:
                reclone_message = f" Warning: Failed to reclone run database: {str(e)}"
                logger.warning(f"Failed to reclone run database {reclone_run_id}: {e}")

        # Update report with success
        update_report(import_id, filename, {
            "status": "success",
            "total_records": total_records,
            "finished_at": datetime.utcnow().isoformat(),
            "message": f"Successfully imported {total_records} records.{reclone_message}"
        })

        # Remove pending marker on success
        remove_pending_marker(import_id, filename)

    except Exception as e:
        # Update report with failure
        error_message = str(e)
        update_report(import_id, filename, {
            "status": "failure",
            "message": error_message,
            "finished_at": datetime.utcnow().isoformat()
        })

        # Remove pending marker on failure
        remove_pending_marker(import_id, filename)


@router.post("/reset-seed-db/original")
async def reset_seed_db_to_original(request: Request):
    """
    Reset template database to its original state.

    This restores the database to the state it was in before any imports were made.
    Also drops the current run database so it gets recloned on next access.

    Returns:
        Success message with record counts

    Raises:
        HTTPException: If backup doesn't exist or reset fails
    """
    run_id = getattr(request.state, "run_id", None)
    admin = _pg_admin_engine()
    try:
        with admin.connect() as conn:
            has_backup = _pg_db_exists(conn, POSTGRES_SEED_ORIGINAL_DB)
    finally:
        admin.dispose()

    if not has_backup:
        raise HTTPException(
            status_code=404,
            detail=(
                f"{POSTGRES_SEED_ORIGINAL_DB} not found. No backup exists. "
                "Perform at least one import to create a backup."
            ),
        )

    # Check for active imports
    active_imports = get_active_imports()
    if active_imports:
        active = active_imports[0]
        raise HTTPException(
            status_code=409,
            detail=(
                f"Cannot reset database while an import is in progress "
                f"(ID: {active['import_id']}, file: {active['filename']}). "
                "Please wait for it to complete."
            ),
        )

    try:
        _reset_postgres_template_from(POSTGRES_SEED_ORIGINAL_DB)
        counts = _pg_count_records(
            POSTGRES_TEMPLATE_DB,
            ["users", "tickets", "organizations", "groups", "articles", "tags"],
        )

        # Drop run database so it gets recloned on next access
        if run_id:
            drop_run_database(run_id)

        return {
            "success": True,
            "message": "Database reset to original state successfully",
            "record_counts": counts,
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error resetting template to original: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to reset database: {str(e)}")


@router.post("/reset-seed-db/empty")
async def reset_seed_db_to_empty(request: Request):
    """
    Reset template database to empty state.

    This creates a clean database with all tables but no data.
    Also drops the current run database so it gets recloned on next access.

    Returns:
        Success message

    Raises:
        HTTPException: If reset fails
    """
    run_id = getattr(request.state, "run_id", None)
    active_imports = get_active_imports()
    if active_imports:
        active = active_imports[0]
        raise HTTPException(
            status_code=409,
            detail=(
                f"Cannot reset database while an import is in progress "
                f"(ID: {active['import_id']}, file: {active['filename']}). "
                "Please wait for it to complete."
            ),
        )

    try:
        _ensure_postgres_empty_database()
        _reset_postgres_template_from(POSTGRES_EMPTY_DB)

        # Drop run database so it gets recloned on next access
        if run_id:
            drop_run_database(run_id)

        return {
            "success": True,
            "message": "Database reset to empty state successfully. All tables are now empty.",
        }
    except Exception as e:
        logger.error(f"Error resetting template to empty: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to reset database: {str(e)}")
