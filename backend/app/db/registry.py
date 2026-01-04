"""Postgres run-database registry (created_at / last_used_at).

Postgres does not expose a reliable "database last modified" timestamp.
To support cleanup based on "last used", we track a heartbeat in the admin DB.
"""

from __future__ import annotations

from datetime import datetime, timezone
import logging
from typing import Optional
import os
import time
from threading import Lock

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

from app.core.config import DATABASE_URL, POSTGRES_ADMIN_DB
from app.db.run_router import get_run_db_name

logger = logging.getLogger(__name__)


_ADMIN_POOL_SIZE = int(os.getenv("POSTGRES_RUN_REGISTRY_ADMIN_POOL_SIZE", "1"))
_ADMIN_MAX_OVERFLOW = int(os.getenv("POSTGRES_RUN_REGISTRY_ADMIN_MAX_OVERFLOW", "2"))
_ADMIN_POOL_TIMEOUT = int(os.getenv("POSTGRES_RUN_REGISTRY_ADMIN_POOL_TIMEOUT", "10"))
_ADMIN_POOL_RECYCLE = int(os.getenv("POSTGRES_RUN_REGISTRY_ADMIN_POOL_RECYCLE", "1800"))

_TOUCH_MIN_INTERVAL_SECONDS = float(os.getenv("POSTGRES_RUN_REGISTRY_TOUCH_MIN_INTERVAL_SECONDS", "30"))

_admin_engine_cached = None
_admin_engine_lock = Lock()

_last_touch_monotonic_by_db = {}
_last_touch_lock = Lock()

_table_ensured = False
_table_ensured_lock = Lock()


def _admin_engine():
    """Cached pooled Engine for the admin DB (registry writes)."""
    global _admin_engine_cached
    if _admin_engine_cached is None:
        with _admin_engine_lock:
            if _admin_engine_cached is None:
                url = make_url(DATABASE_URL).set(database=POSTGRES_ADMIN_DB)
                _admin_engine_cached = create_engine(
                    url,
                    isolation_level="AUTOCOMMIT",
                    pool_pre_ping=True,
                    pool_size=_ADMIN_POOL_SIZE,
                    max_overflow=_ADMIN_MAX_OVERFLOW,
                    pool_timeout=_ADMIN_POOL_TIMEOUT,
                    pool_recycle=_ADMIN_POOL_RECYCLE,
                )
    return _admin_engine_cached


def ensure_registry_table(conn) -> None:
    conn.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS deskzen_run_registry (
              db_name      text PRIMARY KEY,
              run_id       text,
              created_at   timestamptz NOT NULL,
              last_used_at timestamptz NOT NULL
            )
            """
        )
    )
    # Helpful index for cleanup queries (PK already exists for lookups).
    conn.execute(
        text(
            """
            CREATE INDEX IF NOT EXISTS deskzen_run_registry_last_used_at_idx
            ON deskzen_run_registry (last_used_at)
            """
        )
    )


def touch_run(run_id: str) -> None:
    """Record activity for a run database (best-effort, non-fatal)."""
    global _table_ensured

    try:
        db_name = get_run_db_name(run_id)
    except Exception:
        return

    # Throttle: under load this endpoint is called on every request; we only need
    # a coarse "last_used_at" signal (e.g., once every ~30s per run DB).
    now_mono = time.monotonic()
    with _last_touch_lock:
        last = _last_touch_monotonic_by_db.get(db_name)
        if last is not None and (now_mono - last) < _TOUCH_MIN_INTERVAL_SECONDS:
            return
        _last_touch_monotonic_by_db[db_name] = now_mono

    now = datetime.now(timezone.utc)

    engine = _admin_engine()
    try:
        with engine.connect() as conn:
            if not _table_ensured:
                with _table_ensured_lock:
                    if not _table_ensured:
                        ensure_registry_table(conn)
                        _table_ensured = True
            conn.execute(
                text(
                    """
                    INSERT INTO deskzen_run_registry (db_name, run_id, created_at, last_used_at)
                    VALUES (:db_name, :run_id, :now, :now)
                    ON CONFLICT (db_name)
                    DO UPDATE SET last_used_at = EXCLUDED.last_used_at,
                                  run_id = EXCLUDED.run_id
                    """
                ),
                {"db_name": db_name, "run_id": run_id, "now": now},
            )
    except Exception as e:
        # Never break request flow if registry update fails.
        logger.debug(f"Failed to touch run registry for {run_id}: {e}")
        # If the failure was due to missing table (rare race), allow a retry later.
        try:
            with _table_ensured_lock:
                _table_ensured = False
        except Exception:
            pass


def get_last_used_at(conn, db_name: str) -> Optional[datetime]:
    """Return last_used_at for db_name, using an existing admin connection."""
    row = (
        conn.execute(
            text("SELECT last_used_at FROM deskzen_run_registry WHERE db_name = :db_name"),
            {"db_name": db_name},
        )
        .mappings()
        .first()
    )
    if not row:
        return None
    return row.get("last_used_at")

