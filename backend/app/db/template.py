"""Postgres template database management for run_id isolation.

The backend uses a Postgres "template" database (`POSTGRES_TEMPLATE_DB`) as the
source for per-run databases (created via `CREATE DATABASE ... TEMPLATE ...`).
This module ensures the template database exists and is initialized with schema/fixtures.
"""

import logging

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.pool import NullPool

from app.core.config import DATABASE_URL, POSTGRES_ADMIN_DB, POSTGRES_TEMPLATE_DB

logger = logging.getLogger(__name__)


def _postgres_admin_engine():
    """Create an admin engine for Postgres (AUTOCOMMIT)."""
    url = make_url(DATABASE_URL).set(database=POSTGRES_ADMIN_DB)
    return create_engine(
        url, isolation_level="AUTOCOMMIT", pool_pre_ping=True, poolclass=NullPool
    )


def _postgres_database_exists(db_name: str) -> bool:
    engine = _postgres_admin_engine()
    try:
        with engine.connect() as conn:
            return (
                conn.execute(
                    text("SELECT 1 FROM pg_database WHERE datname=:name"),
                    {"name": db_name},
                ).scalar()
                is not None
            )
    finally:
        engine.dispose()


def _postgres_ensure_template_database():
    """Ensure the Postgres template database exists."""
    if _postgres_database_exists(POSTGRES_TEMPLATE_DB):
        return

    engine = _postgres_admin_engine()
    try:
        with engine.connect() as conn:
            conn.execute(text(f"CREATE DATABASE {POSTGRES_TEMPLATE_DB}"))
            logger.info(f"Created Postgres template database: {POSTGRES_TEMPLATE_DB}")
    finally:
        engine.dispose()


def initialize_template_Database():
    """Ensure the Postgres template database exists (idempotent)."""
    _postgres_ensure_template_database()

