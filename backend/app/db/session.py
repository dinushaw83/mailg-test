"""Database connection setup and session management for SQLAlchemy."""

from fastapi import Depends, Request
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool
from sqlalchemy.engine import make_url
from app.db.run_router import get_engine
from app.db.template import initialize_template_Database
from app.core.config import DATABASE_URL, POSTGRES_TEMPLATE_DB
from app.auth.token_dependency import require_token_data

# Seed database engine and session (used by initialization scripts)
_seed_engine = None


def _get_seed_engine():
    """Get or create a SQLAlchemy engine for the template database.
    
    Returns:
        SQLAlchemy engine instance configured for the template database.
    """
    global _seed_engine
    if _seed_engine is None:
        # Ensure template database exists and is initialized.
        initialize_template_Database()
        template_url = make_url(DATABASE_URL).set(database=POSTGRES_TEMPLATE_DB)
        _seed_engine = create_engine(template_url, pool_pre_ping=True, poolclass=NullPool)
    return _seed_engine


def get_db(request: Request):
    """FastAPI dependency that provides a database session with automatic cleanup.
    
    Creates a session for the run-specific database based on run_id
    extracted from the request state by middleware.
    
    Args:
        request: FastAPI request object with run_id in state.
    
    Yields:
        Database session instance for the run-specific database.
        
    Note:
        Session is automatically closed after request completion.
    
    Raises:
        HTTPException: If request is not authenticated (missing/invalid token).
        ValueError: If database path resolves to seed database (should never happen).
    """
    # Ensure token is valid and run_id is populated (middleware usually preloads this,
    # but we enforce it here so dependency ordering can't bypass auth).
    token_data = require_token_data(request)
    run_id = token_data.run_id

    # Postgres "last modified" tracking: record last-used activity per run DB.
    # Best-effort only; must never break request flow.
    try:
        from app.db.registry import touch_run
        touch_run(run_id)
    except Exception:
        pass
    
    engine = get_engine(run_id)

    # Backend-specific safety checks
    from app.db.run_router import get_run_db_name
    expected_db = get_run_db_name(run_id)
    actual_db = getattr(engine.url, "database", None)
    if actual_db != expected_db:
        raise ValueError(
            f"Database engine points to unexpected database. expected={expected_db}, actual={actual_db}"
        )
    if actual_db == POSTGRES_TEMPLATE_DB:
        raise ValueError(
            f"CRITICAL: Engine for run_id {run_id} points to template database {POSTGRES_TEMPLATE_DB}"
        )
    
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        # Postgres engines are pooled and cached; do not dispose per-request.
        # Connections are returned to the pool when the session is closed.


# For backward compatibility with initialization scripts
# Lazy initialization using __getattr__ to avoid creating engine on import
def __getattr__(name):
    """Lazy loading of seed database engine and SessionLocal for scripts."""
    if name == 'engine':
        return _get_seed_engine()
    elif name == 'SessionLocal':
        return sessionmaker(bind=_get_seed_engine())
    raise AttributeError(f"module '{__name__}' has no attribute '{name}'")
