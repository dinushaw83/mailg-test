"""Background task to process expired snoozed threads.

This task periodically checks for threads with snooze_until time that has passed
and automatically unsnoozes them, restoring them to inbox visibility.

When a snooze expires:
- The snooze_until field is cleared
- The SNOOZED label is removed via sync_thread_labels
"""

from __future__ import annotations

import asyncio
import logging
import os
from datetime import UTC, datetime

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import DATABASE_URL, POSTGRES_ADMIN_DB, POSTGRES_RUN_DB_PREFIX, POSTGRES_TEMPLATE_DB
from app.models.thread_user_metadata import ThreadUserMetadata
from app.utils.label_utils import sync_thread_labels

logger = logging.getLogger(__name__)


def _is_database_not_exists_error(e: Exception) -> bool:
    """Check if the exception is a 'database does not exist' error.
    
    This happens when cleanup drops a database between when we list databases
    and when we try to connect - it's a benign race condition.
    """
    error_str = str(e).lower()
    return "does not exist" in error_str and "database" in error_str


# Configuration
_SNOOZE_PROCESSOR_STARTUP_DELAY_SECONDS = int(os.getenv("SNOOZE_PROCESSOR_STARTUP_DELAY_SECONDS", "5"))
_SNOOZE_PROCESSOR_INTERVAL_SECONDS = int(os.getenv("SNOOZE_PROCESSOR_INTERVAL_SECONDS", "30"))

# Advisory lock to ensure only one worker processes at a time (different key from scheduled_sender)
_SNOOZE_PROCESSOR_ADVISORY_LOCK_KEY = int(os.getenv("SNOOZE_PROCESSOR_ADVISORY_LOCK_KEY", "99887744"))


def _admin_engine():
    """Create an engine connected to the admin database."""
    url = make_url(DATABASE_URL).set(database=POSTGRES_ADMIN_DB)
    return create_engine(url, isolation_level="AUTOCOMMIT", pool_pre_ping=True, poolclass=NullPool)


def _get_active_run_databases() -> list[str]:
    """Get list of all active run database names (excludes template database)."""
    engine = _admin_engine()
    try:
        with engine.connect() as conn:
            result = conn.execute(
                text(
                    """
                    SELECT datname FROM pg_database
                    WHERE datname LIKE :prefix
                    AND datname <> :template_db
                    AND datistemplate = false
                    """
                ),
                {"prefix": f"{POSTGRES_RUN_DB_PREFIX}%", "template_db": POSTGRES_TEMPLATE_DB},
            )
            return [row[0] for row in result.fetchall()]
    finally:
        engine.dispose()


def process_expired_snoozes_for_database(db_name: str) -> int:
    """Process all expired snoozed threads in a specific run database.
    
    Args:
        db_name: The database name to process.
        
    Returns:
        Number of threads unsnoozed.
    """
    url = make_url(DATABASE_URL).set(database=db_name)
    engine = create_engine(url, pool_pre_ping=True, poolclass=NullPool)
    SessionLocal = sessionmaker(bind=engine)
    
    unsnoozed_count = 0
    
    try:
        db = SessionLocal()
        try:
            # Find all thread metadata with expired snooze
            now = datetime.now(UTC)
            expired_snoozes = db.query(ThreadUserMetadata).filter(
                ThreadUserMetadata.snooze_until.isnot(None),
                ThreadUserMetadata.snooze_until <= now
            ).all()
            
            for metadata in expired_snoozes:
                try:
                    thread_id = metadata.thread_id
                    user_id = metadata.user_id
                    
                    # Sync thread labels (removes SNOOZED label)
                    sync_thread_labels(db, thread_id, user_id, commit=False)
                    
                    db.commit()
                    unsnoozed_count += 1
                    logger.info(f"Snooze expired for thread {thread_id}, user {user_id} in database {db_name}")
                    
                except Exception as e:
                    db.rollback()
                    logger.error(f"Failed to process expired snooze for thread {metadata.thread_id} in {db_name}: {e}")
                    
        finally:
            db.close()
    except Exception as e:
        if _is_database_not_exists_error(e):
            # Database was dropped by cleanup - this is expected, not an error
            logger.debug(f"Database {db_name} no longer exists (dropped by cleanup)")
        else:
            logger.error(f"Failed to connect to database {db_name}: {e}")
    finally:
        engine.dispose()
    
    return unsnoozed_count


def process_all_expired_snoozes_sync() -> int:
    """Process expired snoozes across all run databases.
    
    Returns:
        Total number of threads unsnoozed.
    """
    logger.info("[SNOOZE] Starting snooze processor cycle")
    
    admin_engine = _admin_engine()
    total_unsnoozed = 0
    
    try:
        # Try to acquire advisory lock - only one worker should process at a time
        with admin_engine.connect() as conn:
            lock_result = conn.execute(
                text("SELECT pg_try_advisory_lock(:key)"),
                {"key": _SNOOZE_PROCESSOR_ADVISORY_LOCK_KEY},
            ).scalar()
            
            if not lock_result:
                # Another worker is already processing
                return 0
            
            try:
                # Get all active run databases
                db_names = _get_active_run_databases()
                
                for db_name in db_names:
                    try:
                        unsnoozed = process_expired_snoozes_for_database(db_name)
                        total_unsnoozed += unsnoozed
                    except Exception as e:
                        logger.error(f"Error processing snoozes in database {db_name}: {e}")
                        
            finally:
                # Release the advisory lock
                conn.execute(
                    text("SELECT pg_advisory_unlock(:key)"),
                    {"key": _SNOOZE_PROCESSOR_ADVISORY_LOCK_KEY},
                )
                
    except Exception as e:
        logger.error(f"Snooze processor task failed: {e}", exc_info=True)
    finally:
        admin_engine.dispose()
    
    logger.info(f"[SNOOZE] Cycle complete. unsnoozed={total_unsnoozed}")
    return total_unsnoozed


async def process_expired_snoozes() -> None:
    """Background task to periodically process expired snoozed threads."""
    if _SNOOZE_PROCESSOR_STARTUP_DELAY_SECONDS > 0:
        await asyncio.sleep(_SNOOZE_PROCESSOR_STARTUP_DELAY_SECONDS)
    
    logger.info("Snooze processor task started")
    
    while True:
        try:
            unsnoozed = process_all_expired_snoozes_sync()
            if unsnoozed:
                logger.info(f"Snooze processor unsnoozed {unsnoozed} thread(s)")
        except Exception as e:
            logger.error(f"Snooze processor task error: {e}", exc_info=True)
        
        await asyncio.sleep(max(1, _SNOOZE_PROCESSOR_INTERVAL_SECONDS))
