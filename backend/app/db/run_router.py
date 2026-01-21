"""Database router for run_id-based database isolation (Postgres-only).

Each run_id maps to its own Postgres database, created by cloning a template DB.
We keep a bounded, TTL'd cache of per-run SQLAlchemy Engines for connection reuse.
"""

from sqlalchemy import create_engine, text, quoted_name
from sqlalchemy.pool import NullPool, QueuePool
from sqlalchemy.engine import make_url
from threading import Lock
from collections import OrderedDict
from dataclasses import dataclass
from typing import Any, Dict, Optional
import os
import logging
import re
import json
import time
import hashlib
from datetime import datetime, timezone

from app.core.config import (
    DATABASE_URL,
    POSTGRES_ADMIN_DB,
    POSTGRES_TEMPLATE_DB,
    POSTGRES_RUN_DB_PREFIX,
)

logger = logging.getLogger(__name__)

# Lock for synchronizing database file creation
_db_creation_lock = Lock()

# ---- Postgres per-run Engine cache (bounded LRU + TTL) ----
#
# Rationale:
# - We keep per-run engines so pooled connections can be reused across requests.
# - We bound growth to avoid unbounded memory/FD usage when run_id is high-cardinality.
# - We dispose engines on eviction so pooled connections are closed promptly.
_PG_RUN_ENGINE_CACHE_MAX = int(os.getenv("POSTGRES_RUN_ENGINE_CACHE_MAX", "100"))
_PG_RUN_ENGINE_CACHE_TTL_SECONDS = int(os.getenv("POSTGRES_RUN_ENGINE_CACHE_TTL_SECONDS", "1800"))

# Tiny per-run pool sizing (tune with uvicorn workers and pg max_connections).
_PG_RUN_POOL_SIZE = int(os.getenv("POSTGRES_RUN_POOL_SIZE", "5"))
_PG_RUN_MAX_OVERFLOW = int(os.getenv("POSTGRES_RUN_MAX_OVERFLOW", "15"))
_PG_RUN_POOL_TIMEOUT = int(os.getenv("POSTGRES_RUN_POOL_TIMEOUT", "30"))
_PG_RUN_POOL_RECYCLE = int(os.getenv("POSTGRES_RUN_POOL_RECYCLE", "1800"))

# Best-effort: log pool stats occasionally for observability.
_PG_POOL_STATS_LOG_INTERVAL_SECONDS = float(
    os.getenv("POSTGRES_POOL_STATS_LOG_INTERVAL_SECONDS", "60")
)


@dataclass
class _CachedEngine:
    engine: Any
    created_at_mono: float
    last_used_mono: float


_pg_run_engines: "OrderedDict[str, _CachedEngine]" = OrderedDict()
_pg_run_engine_lock = Lock()
_pg_last_pool_log_mono_by_db: Dict[str, float] = {}


def _engine_pool_stats(engine) -> Dict[str, Any]:
    """Return a small, safe snapshot of SQLAlchemy pool stats."""
    try:
        pool = getattr(engine, "pool", None)
        if pool is None:
            return {}
        stats: Dict[str, Any] = {"pool_class": pool.__class__.__name__}

        for key, fn_name in (
            ("size", "size"),
            ("checked_out", "checkedout"),
            ("checked_in", "checkedin"),
            ("overflow", "overflow"),
        ):
            fn = getattr(pool, fn_name, None)
            if callable(fn):
                stats[key] = fn()
        return stats
    except Exception:
        return {}


def _maybe_log_postgres_pool_stats(db_name: str, engine, now_mono: Optional[float] = None) -> None:
    """Best-effort pooled connection observability (throttled)."""
    if _PG_POOL_STATS_LOG_INTERVAL_SECONDS <= 0:
        return
    try:
        now = now_mono if now_mono is not None else time.monotonic()
        last = _pg_last_pool_log_mono_by_db.get(db_name)
        if last is not None and (now - last) < _PG_POOL_STATS_LOG_INTERVAL_SECONDS:
            return
        _pg_last_pool_log_mono_by_db[db_name] = now
        stats = _engine_pool_stats(engine)
        if stats:
            logger.info(f"Postgres pool stats db={db_name} stats={stats}")
    except Exception:
        return


def _pg_evict_cached_engine(db_name: str, reason: str) -> bool:
    """Evict a cached Postgres engine by db_name and dispose it."""
    cached = _pg_run_engines.pop(db_name, None)
    if cached is None:
        return False
    try:
        cached.engine.dispose()
    except Exception:
        pass
    logger.info(f"Evicted cached Postgres engine db={db_name} reason={reason}")
    return True


def _pg_prune_engine_cache(now_mono: Optional[float] = None) -> int:
    """Prune expired/overflow Postgres engines (LRU + TTL)."""
    now = now_mono if now_mono is not None else time.monotonic()
    removed = 0

    # TTL eviction (LRU order): keep evicting from oldest until not expired.
    if _PG_RUN_ENGINE_CACHE_TTL_SECONDS > 0:
        while _pg_run_engines:
            oldest_db, oldest = next(iter(_pg_run_engines.items()))
            if (now - oldest.last_used_mono) <= _PG_RUN_ENGINE_CACHE_TTL_SECONDS:
                break
            if _pg_evict_cached_engine(oldest_db, reason="ttl_expired"):
                removed += 1
            else:
                break

    # Size eviction (LRU order).
    if _PG_RUN_ENGINE_CACHE_MAX >= 0:
        while _PG_RUN_ENGINE_CACHE_MAX >= 0 and len(_pg_run_engines) > _PG_RUN_ENGINE_CACHE_MAX:
            oldest_db, _ = next(iter(_pg_run_engines.items()))
            if _pg_evict_cached_engine(oldest_db, reason="lru_over_max"):
                removed += 1
            else:
                break

    return removed


def get_postgres_engine_cache_status() -> Dict[str, Any]:
    """Introspect Postgres per-run engine cache (safe for diagnostics)."""
    with _pg_run_engine_lock:
        now = time.monotonic()
        items = []
        for db_name, cached in _pg_run_engines.items():
            items.append(
                {
                    "db_name": db_name,
                    "age_seconds": round(now - cached.created_at_mono, 3),
                    "idle_seconds": round(now - cached.last_used_mono, 3),
                    "pool": _engine_pool_stats(cached.engine),
                }
            )
        return {
            "enabled": _PG_RUN_ENGINE_CACHE_MAX > 0 and _PG_RUN_ENGINE_CACHE_TTL_SECONDS > 0,
            "max": _PG_RUN_ENGINE_CACHE_MAX,
            "ttl_seconds": _PG_RUN_ENGINE_CACHE_TTL_SECONDS,
            "size": len(_pg_run_engines),
            "items": items,
        }


def prune_postgres_engine_cache() -> int:
    """Public wrapper to prune the Postgres engine cache."""
    with _pg_run_engine_lock:
        return _pg_prune_engine_cache()


def dispose_postgres_run_engine(db_name: str, reason: str = "external") -> bool:
    """Dispose a cached Postgres run-engine for db_name, if present."""
    if not db_name:
        return False
    with _pg_run_engine_lock:
        return _pg_evict_cached_engine(db_name, reason=reason)


def get_pg_stat_activity_counts(limit: int = 200) -> Dict[str, Any]:
    """Best-effort pg_stat_activity counts by db/user/appname (Postgres only)."""
    engine = _postgres_admin_engine()
    try:
        with engine.connect() as conn:
            rows = (
                conn.execute(
                    text(
                        """
                        SELECT
                          datname AS db_name,
                          usename AS user_name,
                          application_name AS application_name,
                          state AS state,
                          COUNT(*) AS count
                        FROM pg_stat_activity
                        GROUP BY datname, usename, application_name, state
                        ORDER BY count DESC
                        LIMIT :limit
                        """
                    ),
                    {"limit": int(limit)},
                )
                .mappings()
                .all()
            )
            return {"enabled": True, "rows": [dict(r) for r in rows]}
    except Exception as e:
        return {"enabled": False, "reason": str(e), "rows": []}
    finally:
        engine.dispose()

# Postgres advisory lock key to serialize template operations (cloning + ingestion).
# Must be the same across all processes.
_PG_TEMPLATE_LOCK_KEY = 88112233
_PG_DB_META_PREFIX = "mailg_meta:"

_VALID_DB_IDENT = re.compile(r"^[a-zA-Z0-9_]+$")


def _quote_pg_identifier(name: str) -> str:
    """Return a safely quoted PostgreSQL identifier using SQLAlchemy's quoted_name.
    
    Uses double-quote escaping per PostgreSQL standard: embedded quotes are doubled.
    """
    # Create a quoted_name that will always be quoted
    qn = quoted_name(name, quote=True)
    # Manually render as PostgreSQL identifier: "name" with embedded " doubled
    escaped = str(qn).replace('"', '""')
    return f'"{escaped}"'

def _sanitize_run_id_to_db_suffix(run_id: str) -> str:
    """Convert run_id to a safe Postgres database-name suffix with collision prevention.
    
    Uses a hash suffix to prevent collisions between different run_ids that would
    otherwise normalize to the same string (e.g., "run-123" vs "run_123").
    """
    # Create a short hash to prevent collisions
    hash_suffix = hashlib.sha256(run_id.encode()).hexdigest()[:8]
    
    # Replace any non-identifier chars with underscore, collapse repeats, trim.
    safe = re.sub(r"[^a-zA-Z0-9_]", "_", run_id)
    safe = re.sub(r"_+", "_", safe).strip("_")
    if not safe:
        safe = "default"
    
    # Append hash to prevent collisions: "run_123_a1b2c3d4"
    safe_with_hash = f"{safe}_{hash_suffix}"
    
    # Postgres identifier max length is 63
    max_len = 63 - len(POSTGRES_RUN_DB_PREFIX)
    return safe_with_hash[:max_len].lower()

def get_run_db_name(run_id: str) -> str:
    """Get Postgres database name for a run_id."""
    suffix = _sanitize_run_id_to_db_suffix(run_id)
    name = f"{POSTGRES_RUN_DB_PREFIX}{suffix}"
    if not _VALID_DB_IDENT.match(name):
        raise ValueError(f"Invalid derived database name: {name}")
    return name

def _postgres_admin_engine():
    url = make_url(DATABASE_URL).set(database=POSTGRES_ADMIN_DB)
    # Use NullPool to avoid accumulating idle connections.
    return create_engine(
        url, isolation_level="AUTOCOMMIT", pool_pre_ping=True, poolclass=NullPool
    )

def _postgres_db_exists(conn, db_name: str) -> bool:
    return (
        conn.execute(
            text("SELECT 1 FROM pg_database WHERE datname=:name"),
            {"name": db_name},
        ).scalar()
        is not None
    )

def _postgres_terminate_connections(conn, db_name: str):
    # Best-effort disconnect so TEMPLATE cloning can proceed.
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

def _postgres_advisory_lock(conn):
    conn.execute(text("SELECT pg_advisory_lock(:k)"), {"k": _PG_TEMPLATE_LOCK_KEY})

def _postgres_advisory_unlock(conn):
    conn.execute(text("SELECT pg_advisory_unlock(:k)"), {"k": _PG_TEMPLATE_LOCK_KEY})

def _postgres_ensure_run_database(run_id: str):
    """Ensure the run database exists, cloning from template if needed."""
    run_db = get_run_db_name(run_id)
    if not _VALID_DB_IDENT.match(run_db) or not _VALID_DB_IDENT.match(POSTGRES_TEMPLATE_DB):
        raise ValueError("Unsafe Postgres database name detected; refusing to continue.")

    engine = _postgres_admin_engine()
    try:
        with engine.connect() as conn:
            # Serialize template cloning with ingestion/reset operations.
            _postgres_advisory_lock(conn)
            try:
                if not _postgres_db_exists(conn, POSTGRES_TEMPLATE_DB):
                    raise RuntimeError(
                        f"Postgres template database '{POSTGRES_TEMPLATE_DB}' not found. "
                        f"Create it (auto-created empty on startup) and initialize schema/data via "
                        f"`python scripts/init_db.py` and `python scripts/migrate_data.py`."
                    )

                if _postgres_db_exists(conn, run_db):
                    return

                # Template must have no active connections for CREATE DATABASE ... TEMPLATE ...
                _postgres_terminate_connections(conn, POSTGRES_TEMPLATE_DB)

                quoted_run_db = _quote_pg_identifier(run_db)
                quoted_template_db = _quote_pg_identifier(POSTGRES_TEMPLATE_DB)
                conn.execute(text(f"CREATE DATABASE {quoted_run_db} TEMPLATE {quoted_template_db}"))
                # Record a durable created_at marker for cleanup routines.
                #
                # Rationale: Postgres does not expose a reliable DB creation timestamp in catalogs.
                # Storing it as a DB comment is portable (works on managed Postgres) and cheap to query.
                created_at = datetime.now(timezone.utc).isoformat()
                meta = {"created_at": created_at, "run_id": run_id, "v": 1}
                comment = f"{_PG_DB_META_PREFIX}{json.dumps(meta, separators=(',', ':'), ensure_ascii=False)}"
                try:
                    conn.execute(
                        text(f"COMMENT ON DATABASE {quoted_run_db} IS :comment"),
                        {"comment": comment},
                    )
                except Exception:
                    # Non-fatal: cleanup can fall back to other heuristics.
                    pass
                logger.info(f"Created Postgres run database {run_db} from template {POSTGRES_TEMPLATE_DB}")
            finally:
                _postgres_advisory_unlock(conn)
    finally:
        engine.dispose()


def ensure_run_database(run_id: str) -> dict:
    """Ensure the run database exists for this run_id.

    This is safe to call multiple times and is concurrency-safe:
    - Postgres: clone via CREATE DATABASE ... TEMPLATE ... if missing (serialized by advisory lock)

    Returns a small info dict that is useful for logging/diagnostics.
    """
    if not run_id:
        raise ValueError("run_id cannot be None or empty")

    with _db_creation_lock:
        _postgres_ensure_run_database(run_id)
    return {"backend": "postgres", "database": get_run_db_name(run_id), "run_id": run_id}


def get_engine(run_id: str):
    """Get or create a SQLAlchemy engine for a specific run_id (Postgres).

    Ensures the run database exists (cloned from template if missing), then returns
    a cached pooled Engine for that run DB (bounded by LRU + TTL).
    """
    if not run_id:
        raise ValueError("run_id cannot be None or empty")

    # Serialize run DB creation and (best-effort) cache access so DROP DATABASE
    # doesn't race with returning an Engine for that DB.
    with _db_creation_lock:
        _postgres_ensure_run_database(run_id)

        run_db = get_run_db_name(run_id)
        run_url = make_url(DATABASE_URL).set(database=run_db)
        now = time.monotonic()

        # If caching is disabled, fall back to NullPool per call.
        if _PG_RUN_ENGINE_CACHE_MAX <= 0 or _PG_RUN_ENGINE_CACHE_TTL_SECONDS <= 0:
            return create_engine(run_url, pool_pre_ping=True, poolclass=NullPool)

        with _pg_run_engine_lock:
            _pg_prune_engine_cache(now_mono=now)

            cached = _pg_run_engines.get(run_db)
            if cached is not None:
                cached.last_used_mono = now
                _pg_run_engines.move_to_end(run_db)
                _maybe_log_postgres_pool_stats(run_db, cached.engine, now_mono=now)
                return cached.engine

            engine = create_engine(
                run_url,
                pool_pre_ping=True,
                poolclass=QueuePool,
                pool_size=_PG_RUN_POOL_SIZE,
                max_overflow=_PG_RUN_MAX_OVERFLOW,
                pool_timeout=_PG_RUN_POOL_TIMEOUT,
                pool_recycle=_PG_RUN_POOL_RECYCLE,
                pool_reset_on_return="rollback",
                connect_args=(
                    {"application_name": os.getenv("POSTGRES_APP_NAME", "mailg-backend")}
                    if "application_name" not in (getattr(run_url, "query", {}) or {})
                    else {}
                ),
            )
            _pg_run_engines[run_db] = _CachedEngine(
                engine=engine, created_at_mono=now, last_used_mono=now
            )
            _pg_run_engines.move_to_end(run_db)
            _pg_prune_engine_cache(now_mono=now)
            _maybe_log_postgres_pool_stats(run_db, engine, now_mono=now)
            return engine


def drop_run_database(run_id: str) -> dict:
    """Drop/delete the run-specific database for a run_id.

    - Postgres: terminates connections and DROP DATABASE of the run DB (cloned via TEMPLATE)

    Also disposes and removes any cached SQLAlchemy engine for the run_id.
    """
    if not run_id:
        raise ValueError("run_id cannot be None or empty")
    if run_id == "default":
        raise ValueError("Refusing to drop the default run database.")

    # Ensure engine cache is updated atomically with drop/delete.
    with _db_creation_lock:
        run_db = get_run_db_name(run_id)
        if run_db == POSTGRES_TEMPLATE_DB:
            raise ValueError("Refusing to drop the template database.")
        if run_db == POSTGRES_ADMIN_DB:
            raise ValueError("Refusing to drop the admin database.")

        # Dispose any cached pooled engine for this run DB (if present).
        with _pg_run_engine_lock:
            _pg_evict_cached_engine(run_db, reason="drop_run_database")

        engine = _postgres_admin_engine()
        try:
            with engine.connect() as conn:
                if not _postgres_db_exists(conn, run_db):
                    return {"dropped": False, "reason": "not_found", "database": run_db}

                _postgres_terminate_connections(conn, run_db)
                quoted_run_db = _quote_pg_identifier(run_db)
                conn.execute(text(f"DROP DATABASE {quoted_run_db}"))
                logger.info(f"Dropped Postgres run database {run_db} for run_id={run_id}")
                return {"dropped": True, "database": run_db}
        finally:
            engine.dispose()
