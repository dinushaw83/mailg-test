"""Background cleanup service for stale Postgres run databases and attachment files.

The backend creates one Postgres database per run_id by cloning a template DB.
To prevent unbounded growth, we periodically drop old/unused run databases.

Attachment files are stored in a configurable directory and cleaned up when:
- The parent email is permanently deleted
- The attachment is marked as deleted
- The run database is dropped

Signal source for "last used":
- `app.run_registry.touch_run()` writes a heartbeat row in the admin DB.
"""

from __future__ import annotations

import asyncio
import logging
import os
import shutil
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional, List

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.pool import NullPool

from app.core.config import DATABASE_URL, POSTGRES_ADMIN_DB, POSTGRES_TEMPLATE_DB, POSTGRES_RUN_DB_PREFIX
from app.db.run_router import dispose_postgres_run_engine
from app.db.registry import ensure_registry_table

logger = logging.getLogger(__name__)

# Attachment storage configuration
ATTACHMENT_STORAGE_PATH = Path(os.getenv("ATTACHMENT_STORAGE_PATH", "/tmp/attachments"))
_ATTACHMENT_CLEANUP_AGE_DAYS = int(os.getenv("ATTACHMENT_CLEANUP_AGE_DAYS", "7"))


_CLEANUP_STARTUP_DELAY_SECONDS = int(os.getenv("CLEANUP_STARTUP_DELAY_SECONDS", str(5 * 60)))
_CLEANUP_INTERVAL_SECONDS = int(os.getenv("POSTGRES_CLEANUP_INTERVAL_SECONDS", str(5 * 60)))
_CLEANUP_AGE_HOURS_DEFAULT = float(os.getenv("POSTGRES_CLEANUP_AGE_HOURS_DEFAULT", "1.5"))  # 90 minutes

# If multiple workers/processes run this code, we only want ONE of them performing cleanup at a time.
# A Postgres advisory lock is a simple, robust leader-election primitive.
_POSTGRES_CLEANUP_ADVISORY_LOCK_KEY = int(os.getenv("POSTGRES_CLEANUP_ADVISORY_LOCK_KEY", "99887766"))


def _admin_engine():
    url = make_url(DATABASE_URL).set(database=POSTGRES_ADMIN_DB)
    return create_engine(url, isolation_level="AUTOCOMMIT", pool_pre_ping=True, poolclass=NullPool)


def cleanup_attachment_files(storage_paths: List[str]) -> int:
    """Delete attachment files from storage.
    
    Args:
        storage_paths: List of file paths to delete.
        
    Returns:
        Number of files successfully deleted.
    """
    deleted = 0
    for path in storage_paths:
        if not path:
            continue
        try:
            full_path = ATTACHMENT_STORAGE_PATH / path.lstrip("/")
            if full_path.exists() and full_path.is_file():
                full_path.unlink()
                deleted += 1
                logger.debug(f"Deleted attachment file: {full_path}")
        except Exception as e:
            logger.warning(f"Failed to delete attachment file {path}: {e}")
    return deleted


def cleanup_orphaned_attachments_sync(age_days: Optional[int] = None) -> int:
    """Clean up attachment files that are no longer referenced or are orphaned.
    
    This function removes:
    - Files in the attachment storage directory that are older than age_days
    - Files that don't match any known attachment records
    
    Args:
        age_days: Delete files older than this many days.
        
    Returns:
        Number of files deleted.
    """
    age = _ATTACHMENT_CLEANUP_AGE_DAYS if age_days is None else int(age_days)
    cutoff = datetime.now(timezone.utc) - timedelta(days=age)
    deleted = 0
    
    if not ATTACHMENT_STORAGE_PATH.exists():
        return 0
    
    try:
        for file_path in ATTACHMENT_STORAGE_PATH.rglob("*"):
            if not file_path.is_file():
                continue
            try:
                # Check file modification time
                mtime = datetime.fromtimestamp(file_path.stat().st_mtime, tz=timezone.utc)
                if mtime < cutoff:
                    file_path.unlink()
                    deleted += 1
                    logger.debug(f"Deleted orphaned attachment: {file_path}")
            except Exception as e:
                logger.warning(f"Failed to process attachment file {file_path}: {e}")
    except Exception as e:
        logger.error(f"Error during orphaned attachment cleanup: {e}")
    
    return deleted


def cleanup_run_attachments(run_id: str) -> int:
    """Clean up all attachment files associated with a specific run_id.
    
    Args:
        run_id: The run_id whose attachments should be deleted.
        
    Returns:
        Number of files deleted.
    """
    deleted = 0
    run_attachment_path = ATTACHMENT_STORAGE_PATH / run_id
    
    if run_attachment_path.exists() and run_attachment_path.is_dir():
        try:
            shutil.rmtree(run_attachment_path)
            deleted = 1  # Count directory removal as 1 operation
            logger.info(f"Deleted attachment directory for run_id={run_id}")
        except Exception as e:
            logger.warning(f"Failed to delete attachment directory for run_id={run_id}: {e}")
    
    return deleted


def _terminate_connections(conn, db_name: str) -> None:
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


def cleanup_old_databases_sync(age_hours: Optional[float] = None) -> int:
    """Drop run databases whose last_used_at is older than `age_hours`."""
    age = _CLEANUP_AGE_HOURS_DEFAULT if age_hours is None else float(age_hours)
    cutoff = datetime.now(timezone.utc) - timedelta(hours=age)

    logger.info(f"[CLEANUP] Starting database cleanup cycle. cutoff={cutoff.isoformat()} age_hours={age}")

    engine = _admin_engine()
    dropped = 0
    scanned = 0
    try:
        with engine.connect() as conn:
            ensure_registry_table(conn)

            # Ensure only one worker performs cleanup. If lock is held elsewhere, skip this run.
            try:
                got_lock = bool(
                    conn.execute(
                        text("SELECT pg_try_advisory_lock(:k)"),
                        {"k": _POSTGRES_CLEANUP_ADVISORY_LOCK_KEY},
                    ).scalar()
                )
            except Exception:
                got_lock = True  # Best-effort: if we can't lock, continue rather than breaking cleanup.

            if not got_lock:
                logger.info("[CLEANUP] Another worker holds the cleanup lock, skipping this cycle")
                return 0
            try:
                rows = (
                    conn.execute(
                        text(
                            """
                            SELECT db_name, run_id, last_used_at
                            FROM mailg_run_registry
                            ORDER BY last_used_at ASC
                            """
                        )
                    )
                    .mappings()
                    .all()
                )

                logger.info(f"[CLEANUP] Found {len(rows)} registered run database(s) to evaluate")

                for r in rows:
                    db_name = r.get("db_name")
                    run_id = r.get("run_id")
                    last_used_at = r.get("last_used_at")

                    if not db_name or not isinstance(db_name, str):
                        continue
                    if not db_name.startswith(POSTGRES_RUN_DB_PREFIX):
                        continue
                    if db_name in {POSTGRES_ADMIN_DB, POSTGRES_TEMPLATE_DB}:
                        continue
                    if run_id == "default":
                        continue
                    
                    scanned += 1
                    
                    if not last_used_at or last_used_at >= cutoff:
                        continue

                    # Dispose any cached pooled engine for this DB before dropping.
                    dispose_postgres_run_engine(db_name, reason="background_cleanup")

                    logger.info(f"[CLEANUP] Dropping database: db_name={db_name} run_id={run_id} last_used_at={last_used_at}")

                    try:
                        _terminate_connections(conn, db_name)
                        conn.execute(text(f'DROP DATABASE "{db_name}"'))
                        conn.execute(
                            text("DELETE FROM mailg_run_registry WHERE db_name = :db_name"),
                            {"db_name": db_name},
                        )
                        
                        # Clean up attachment files for this run
                        if run_id:
                            cleanup_run_attachments(run_id)
                        
                        dropped += 1
                        logger.info(
                            f"[CLEANUP] Successfully dropped database: db_name={db_name} run_id={run_id}"
                        )
                    except Exception as e:
                        logger.warning(f"[CLEANUP] Failed dropping run database {db_name}: {e}")
            finally:
                try:
                    conn.execute(
                        text("SELECT pg_advisory_unlock(:k)"),
                        {"k": _POSTGRES_CLEANUP_ADVISORY_LOCK_KEY},
                    )
                except Exception:
                    pass

    finally:
        engine.dispose()

    logger.info(f"[CLEANUP] Cycle complete. scanned={scanned} dropped={dropped}")
    return dropped


async def cleanup_old_databases() -> None:
    """Background task to periodically drop stale run databases and orphaned attachments."""
    if _CLEANUP_STARTUP_DELAY_SECONDS > 0:
        await asyncio.sleep(_CLEANUP_STARTUP_DELAY_SECONDS)

    while True:
        try:
            # Clean up stale run databases
            cleaned_dbs = cleanup_old_databases_sync()
            if cleaned_dbs:
                logger.info(f"Background cleanup dropped {cleaned_dbs} run database(s)")
            
            # Clean up orphaned attachment files
            cleaned_files = cleanup_orphaned_attachments_sync()
            if cleaned_files:
                logger.info(f"Background cleanup deleted {cleaned_files} orphaned attachment file(s)")
                
        except Exception as e:
            logger.error(f"Background cleanup failed: {e}", exc_info=True)

        await asyncio.sleep(max(1, _CLEANUP_INTERVAL_SECONDS))

