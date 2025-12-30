"""Background cleanup service for stale Postgres run databases.

The backend creates one Postgres database per run_id by cloning a template DB.
To prevent unbounded growth, we periodically drop old/unused run databases.

Signal source for "last used":
- `app.run_registry.touch_run()` writes a heartbeat row in the admin DB.
"""

from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.pool import NullPool

from app.core.config import DATABASE_URL, POSTGRES_ADMIN_DB, POSTGRES_TEMPLATE_DB, POSTGRES_RUN_DB_PREFIX
from app.db.run_router import dispose_postgres_run_engine
from app.db.registry import ensure_registry_table

logger = logging.getLogger(__name__)


_CLEANUP_STARTUP_DELAY_SECONDS = int(os.getenv("CLEANUP_STARTUP_DELAY_SECONDS", str(5 * 60)))
_CLEANUP_INTERVAL_SECONDS = int(os.getenv("POSTGRES_CLEANUP_INTERVAL_SECONDS", str(5 * 60)))
_CLEANUP_AGE_HOURS_DEFAULT = float(os.getenv("POSTGRES_CLEANUP_AGE_HOURS_DEFAULT", "1.5"))  # 90 minutes

# If multiple workers/processes run this code, we only want ONE of them performing cleanup at a time.
# A Postgres advisory lock is a simple, robust leader-election primitive.
_POSTGRES_CLEANUP_ADVISORY_LOCK_KEY = int(os.getenv("POSTGRES_CLEANUP_ADVISORY_LOCK_KEY", "99887766"))


def _admin_engine():
    url = make_url(DATABASE_URL).set(database=POSTGRES_ADMIN_DB)
    return create_engine(url, isolation_level="AUTOCOMMIT", pool_pre_ping=True, poolclass=NullPool)


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

    engine = _admin_engine()
    dropped = 0
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
                return 0
            try:
                rows = (
                    conn.execute(
                        text(
                            """
                            SELECT db_name, run_id, last_used_at
                            FROM deskzen_run_registry
                            ORDER BY last_used_at ASC
                            """
                        )
                    )
                    .mappings()
                    .all()
                )

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
                    if not last_used_at or last_used_at >= cutoff:
                        continue

                    # Dispose any cached pooled engine for this DB before dropping.
                    dispose_postgres_run_engine(db_name, reason="background_cleanup")

                    try:
                        _terminate_connections(conn, db_name)
                        conn.execute(text(f'DROP DATABASE "{db_name}"'))
                        conn.execute(
                            text("DELETE FROM deskzen_run_registry WHERE db_name = :db_name"),
                            {"db_name": db_name},
                        )
                        dropped += 1
                        logger.info(
                            f"Dropped stale run database db_name={db_name} run_id={run_id} last_used_at={last_used_at}"
                        )
                    except Exception as e:
                        logger.warning(f"Failed dropping run database {db_name}: {e}")
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

    return dropped


async def cleanup_old_databases() -> None:
    """Background task to periodically drop stale run databases."""
    if _CLEANUP_STARTUP_DELAY_SECONDS > 0:
        await asyncio.sleep(_CLEANUP_STARTUP_DELAY_SECONDS)

    while True:
        try:
            cleaned = cleanup_old_databases_sync()
            if cleaned:
                logger.info(f"Background cleanup dropped {cleaned} run database(s)")
        except Exception as e:
            logger.error(f"Background cleanup failed: {e}", exc_info=True)

        await asyncio.sleep(max(1, _CLEANUP_INTERVAL_SECONDS))

