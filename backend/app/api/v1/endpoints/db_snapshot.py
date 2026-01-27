"""Database snapshot and admin endpoints for run databases."""

from app.auth.rbac import authorized
from fastapi import APIRouter, Depends, Query, Request, HTTPException
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy import text, inspect, create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.pool import NullPool
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from pathlib import Path
import logging
import json

from app.auth.token_manager import get_token_manager
from app.db.session import get_db, get_seed_db
from app.db.run_router import drop_run_database, get_run_db_name
from app.core.config import DATABASE_URL, POSTGRES_TEMPLATE_DB, POSTGRES_ADMIN_DB, JWT_ACCESS_TOKEN_TTL_SECONDS
from app.db.registry import get_last_used_at, _admin_engine, ensure_registry_table

logger = logging.getLogger(__name__)

router = APIRouter()

# Tables that might be very large or not needed for verification
OPTIONAL_EXCLUDE_TABLES = {
    # Add tables here if they're too large or not needed
    # 'api_logs',  # Example: might be very large
}


def _run_db_exists(run_id: str) -> bool:
    """Check if the run database already exists for the given run_id.
    
    Args:
        run_id: The run/session ID to check.
        
    Returns:
        True if the database exists, False otherwise.
    """
    db_name = get_run_db_name(run_id)
    engine = _admin_engine()
    try:
        with engine.connect() as conn:
            result = conn.execute(
                text("SELECT 1 FROM pg_database WHERE datname = :name"),
                {"name": db_name}
            ).scalar()
            return result is not None
    except Exception as e:
        logger.error(f"Error checking if run database exists for run_id={run_id}: {e}")
        return False


def _get_existing_run_engine(run_id: str):
    """Get a SQLAlchemy engine for an existing run database WITHOUT auto-creating it.
    
    Unlike get_engine from db_router, this does NOT clone/create the database.
    Use this when you want to fail if the database doesn't exist.
    
    Args:
        run_id: The run/session ID.
        
    Returns:
        SQLAlchemy engine for the run database.
        
    Raises:
        HTTPException: If the database doesn't exist (session expired).
    """
    if not _run_db_exists(run_id):
        raise HTTPException(
            status_code=410,
            detail="Session expired or database not found. Please start a new session."
        )
    
    # Create engine directly without calling ensure_run_database
    run_db = get_run_db_name(run_id)
    run_url = make_url(DATABASE_URL).set(database=run_db)
    return create_engine(run_url, pool_pre_ping=True, poolclass=NullPool)


def serialize_value(value: Any) -> Any:
    """Convert database values to JSON-serializable format.
    
    Args:
        value: Value from database (could be datetime, UUID, etc.)
        
    Returns:
        JSON-serializable value (string for dates, etc.)
    """
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, (bytes, bytearray)):
        # Skip binary data in snapshots
        return None
    # Handle other types as needed
    return value


def get_table_primary_keys(db: Session) -> Dict[str, List[str]]:
    """Get primary key columns for all tables in the database.
    
    Args:
        db: Database session.
        
    Returns:
        Dict mapping table names to list of primary key column names.
    """
    pk_map = {}
    try:
        inspector = inspect(db.get_bind())
        try:
            tables = inspector.get_table_names(schema="public")
        except TypeError:
            tables = inspector.get_table_names()
        
        for table_name in tables:
            try:
                pk_constraint = inspector.get_pk_constraint(table_name, schema="public")
                pk_columns = pk_constraint.get("constrained_columns", [])
                if pk_columns:
                    pk_map[table_name] = pk_columns
                else:
                    # Fallback to 'id' if no PK found
                    pk_map[table_name] = ["id"]
            except Exception as e:
                logger.warning(f"Could not get PK for table {table_name}: {e}")
                pk_map[table_name] = ["id"]
        
        logger.debug(f"Primary keys: {pk_map}")
    except Exception as e:
        logger.error(f"Error getting primary keys: {e}", exc_info=True)
    
    return pk_map


def get_all_tables(db: Session) -> List[str]:
    """Get list of all user tables in the database.
    
    Args:
        db: Database session.
        
    Returns:
        List of table names (excluding system tables).
    """
    try:
        inspector = inspect(db.get_bind())
        # Prefer public schema for Postgres.
        try:
            tables = inspector.get_table_names(schema="public")
        except TypeError:
            tables = inspector.get_table_names()

        filtered_tables = [t for t in tables if t not in OPTIONAL_EXCLUDE_TABLES]
        logger.info(f"Found {len(filtered_tables)} tables: {filtered_tables}")
        return filtered_tables
    except Exception as e:
        logger.error(f"Error getting table list: {e}", exc_info=True)
        raise


def get_table_foreign_keys(db: Session, table_name: str) -> List[Dict[str, str]]:
    """Get foreign key relationships for a table.
    
    Args:
        db: Database session.
        table_name: Name of the table to get foreign keys for.
        
    Returns:
        List of dicts with: column (local FK column), referred_table, referred_column,
        and relation_name (derived field name for the related object).
    """
    result = []
    try:
        inspector = inspect(db.get_bind())
        try:
            fks = inspector.get_foreign_keys(table_name, schema="public")
        except TypeError:
            fks = inspector.get_foreign_keys(table_name)
        
        for fk in fks:
            constrained_columns = fk.get("constrained_columns", [])
            referred_table = fk.get("referred_table")
            referred_columns = fk.get("referred_columns", [])
            
            # Only handle single-column foreign keys for simplicity
            if len(constrained_columns) == 1 and len(referred_columns) == 1 and referred_table:
                local_col = constrained_columns[0]
                # Derive relation name: remove _id suffix if present
                if local_col.endswith("_id"):
                    relation_name = local_col[:-3]  # e.g., "team_id" -> "team"
                else:
                    relation_name = f"{local_col}_obj"  # fallback
                
                result.append({
                    "column": local_col,
                    "referred_table": referred_table,
                    "referred_column": referred_columns[0],
                    "relation_name": relation_name
                })
        
        logger.debug(f"Foreign keys for {table_name}: {result}")
    except Exception as e:
        logger.warning(f"Could not get foreign keys for table {table_name}: {e}")
    
    return result


def fetch_related_object(db: Session, related_table: str, pk_column: str, pk_value: Any) -> Optional[Dict[str, Any]]:
    """Fetch a related object from another table by primary key.
    
    Args:
        db: Database session.
        related_table: Name of the table to fetch from.
        pk_column: Primary key column name (usually 'id').
        pk_value: Value of the primary key to look up.
        
    Returns:
        Serialized dict of the related row, or None if not found.
    """
    if pk_value is None:
        return None
    
    try:
        # Validate table name to prevent SQL injection
        if not all(c.isalnum() or c in ('_', '-') for c in related_table):
            logger.warning(f"Invalid related table name: {related_table}")
            return None
        if not all(c.isalnum() or c in ('_', '-') for c in pk_column):
            logger.warning(f"Invalid pk column name: {pk_column}")
            return None
        
        query = text(f'SELECT * FROM "{related_table}" WHERE "{pk_column}" = :pk_value')
        result = db.execute(query, {"pk_value": pk_value})
        row = result.fetchone()
        
        if row:
            obj_dict = {}
            if hasattr(row, '_mapping'):
                obj_dict = dict(row._mapping)
            elif hasattr(row, '_asdict'):
                obj_dict = row._asdict()
            elif hasattr(row, '_fields'):
                obj_dict = {col: getattr(row, col) for col in row._fields}
            else:
                # Get columns for the related table
                related_inspector = inspect(db.get_bind())
                try:
                    related_columns_info = related_inspector.get_columns(related_table, schema="public")
                except TypeError:
                    related_columns_info = related_inspector.get_columns(related_table)
                related_columns = [c["name"] for c in related_columns_info]
                for i, col in enumerate(related_columns):
                    if i < len(row):
                        obj_dict[col] = row[i]
            
            # Serialize values
            serialized_obj = {}
            for key, value in obj_dict.items():
                serialized_obj[key] = serialize_value(value)
            
            return serialized_obj
    except Exception as e:
        logger.warning(f"Could not fetch {related_table} with {pk_column}={pk_value}: {e}")
    return None


def get_table_data(db: Session, table_name: str) -> Dict[str, Any]:
    """Get all data from a table.
    
    Args:
        db: Database session.
        table_name: Name of the table to query.
        
    Returns:
        Dictionary with 'rows' (list of dicts) or 'error' if query failed.
    """
    try:
        # Validate table name to prevent SQL injection
        # Only allow alphanumeric, underscore, and hyphen
        if not all(c.isalnum() or c in ('_', '-') for c in table_name):
            raise ValueError(f"Invalid table name: {table_name}")
        
        inspector = inspect(db.get_bind())
        columns_info = inspector.get_columns(table_name)
        columns = [c["name"] for c in columns_info]
        
        if not columns:
            logger.warning(f"Table {table_name} has no columns or doesn't exist")
            return {"rows": []}
        
        # Query all rows using parameterized query where possible
        # For SELECT * we need to use the validated table name
        select_query = text(f'SELECT * FROM "{table_name}"')
        result = db.execute(select_query)
        db_rows = result.fetchall()
        
        rows = []
        for row in db_rows:
            # Convert row to dict with column names
            # Handle both Row objects (SQLAlchemy 2.0) and tuples
            row_dict = {}
            
            try:
                # Try SQLAlchemy 2.0 Row object with _mapping
                if hasattr(row, '_mapping'):
                    row_dict = dict(row._mapping)
                # Try named tuple
                elif hasattr(row, '_asdict'):
                    row_dict = row._asdict()
                # Try direct dict conversion (SQLAlchemy 1.4+ Row)
                elif hasattr(row, '_fields'):
                    row_dict = {col: getattr(row, col) for col in row._fields}
                else:
                    # Fallback: tuple/list access by index
                    for i, col in enumerate(columns):
                        if i < len(row):
                            value = row[i]
                            row_dict[col] = value
            except Exception as e:
                logger.warning(f"Error converting row to dict for table {table_name}: {e}, using index-based access")
                # Last resort: index-based access
                row_dict = {}
                for i, col in enumerate(columns):
                    if i < len(row):
                        value = row[i]
                        row_dict[col] = value
            
            # Serialize all values in the row
            serialized_dict = {}
            for key, value in row_dict.items():
                serialized_dict[key] = serialize_value(value)
            rows.append(serialized_dict)
        
        # Generic FK-based relation fetching for all tables
        foreign_keys = get_table_foreign_keys(db, table_name)
        
        if foreign_keys and rows:
            # Build self-reference lookup for tables that reference themselves (e.g., parent_id)
            self_ref_fks = [fk for fk in foreign_keys if fk["referred_table"] == table_name]
            self_lookup = {}
            if self_ref_fks:
                # Build lookup by the referred column (usually 'id')
                pk_col = self_ref_fks[0]["referred_column"]
                self_lookup = {row.get(pk_col): row for row in rows if row.get(pk_col) is not None}
            
            # Process each row and add first-level relations
            for row_data in rows:
                for fk in foreign_keys:
                    fk_column = fk["column"]
                    referred_table = fk["referred_table"]
                    referred_column = fk["referred_column"]
                    relation_name = fk["relation_name"]
                    
                    fk_value = row_data.get(fk_column)
                    if fk_value is None:
                        continue
                    
                    # Handle self-referencing FK (e.g., parent_id on tickets)
                    if referred_table == table_name:
                        # Try to find in current result set first
                        related_obj = self_lookup.get(fk_value)
                        if related_obj:
                            # Make a copy to avoid circular references
                            related_copy = related_obj.copy()
                            # Remove any nested relation fields to avoid deep nesting
                            for nested_fk in foreign_keys:
                                related_copy.pop(nested_fk["relation_name"], None)
                            row_data[relation_name] = related_copy
                        else:
                            # Not in result set, fetch separately
                            related_obj = fetch_related_object(db, referred_table, referred_column, fk_value)
                            if related_obj:
                                row_data[relation_name] = related_obj
                    else:
                        # Regular FK to another table
                        related_obj = fetch_related_object(db, referred_table, referred_column, fk_value)
                        if related_obj:
                            row_data[relation_name] = related_obj
        
        logger.debug(f"Retrieved {len(rows)} rows from table {table_name}")
        return {"rows": rows}
        
    except Exception as e:
        logger.error(f"Error querying table {table_name}: {e}", exc_info=True)
        return {"error": str(e), "rows": []}


@router.get("/db_snapshot")
def get_db_snapshot(
    session_id: str = Query(..., description="The session ID to use for the snapshot"),
):
    """
    Capture a snapshot of the current database state for a specific run_id.
    
    This endpoint queries all tables in the gym's database and returns their contents as JSON. The run_id is determined based on the authenticated user's token, ensuring we're querying the correct isolated database instance for that user.
    
    Returns:
        JSON object with:
        - run_id: The run ID used for this snapshot
        - captured_at: ISO timestamp of when snapshot was captured
        - tables: Dictionary mapping table names to arrays of row objects
        - summary: Summary statistics (total_tables, total_rows, tables_with_errors)
        
    Example response:
    {
        "run_id": "run_abc123",
        "captured_at": "2025-12-10T10:30:45.123456",
        "tables": {
            "users": [{"id": 1, "username": "admin"}],
            "tickets": [{"id": 1, "subject": "Test"}]
        },
        "summary": {
            "total_tables": 2,
            "total_rows": 2,
            "tables_with_errors": 0
        }
    }
    """
    if not session_id:
        logger.error("db_snapshot called without session_id")
        raise HTTPException(
            status_code=400,
            detail="session_id required."
        )
    
    effective_run_id = session_id
    logger.info(f"Creating database snapshot for run_id: {effective_run_id}")
    
    # Initialize snapshot structure
    snapshot = {
        "session_id": effective_run_id,
        "captured_at": datetime.now().isoformat(),
        "tables": {},
        "summary": {
            "total_tables": 0,
            "total_rows": 0,
            "tables_with_errors": 0
        }
    }
    
    try:
        # Get engine for existing database (raises 410 if not found)
        engine = _get_existing_run_engine(effective_run_id)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        try:
            # Get all tables in the database
            tables = get_all_tables(db)
            logger.info(f"Found {len(tables)} tables to snapshot")
            
            # Filter out optional exclude tables
            tables = [t for t in tables if t not in OPTIONAL_EXCLUDE_TABLES]
            
            if not tables:
                logger.warning(f"No tables found in database for run_id: {effective_run_id}")
            
            total_rows = 0
            tables_with_errors = 0
            
            # Query each table
            for table_name in tables:
                logger.debug(f"Querying table: {table_name}")
                try:
                    table_data = get_table_data(db, table_name)
                    
                    if "error" in table_data:
                        logger.error(f"Error querying table {table_name}: {table_data['error']}")
                        snapshot["tables"][table_name] = {
                            "error": str(table_data["error"]),
                            "rows": []
                        }
                        tables_with_errors += 1
                    else:
                        rows = table_data["rows"]
                        snapshot["tables"][table_name] = rows
                        total_rows += len(rows)
                        logger.debug(f"Table {table_name}: {len(rows)} rows")
                except Exception as table_error:
                    logger.error(f"Unexpected error processing table {table_name}: {table_error}", exc_info=True)
                    snapshot["tables"][table_name] = {
                        "error": str(table_error),
                        "rows": []
                    }
                    tables_with_errors += 1
            
            # Update summary
            snapshot["summary"] = {
                "total_tables": len(tables),
                "total_rows": total_rows,
                "tables_with_errors": tables_with_errors
            }
            
            logger.info(f"Snapshot complete: {snapshot['summary']['total_tables']} tables, {snapshot['summary']['total_rows']} rows")
            
            return snapshot
        finally:
            db.close()
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Error creating database snapshot: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create database snapshot: {str(e)}"
        )


@router.delete("/db_drop",dependencies=[Depends(authorized())])
def drop_db_for_run(
    request: Request,
):
    """Drop/delete the run database for a run_id.

    Safety:
    - Never drops the Postgres template database.
    - Never drops the default run database.
    """
    effective_run_id = None
    if hasattr(request.state, "run_id") and request.state.run_id:
        effective_run_id = request.state.run_id

    if not effective_run_id:
        raise HTTPException(
            status_code=400,
            detail="run_id required. Ensure you are authenticated and have the correct run_id in your token.",
        )

    # Explicitly protect special run ids early (in addition to deeper DB checks)
    if effective_run_id in ("seed", "mira_seed", "template", "default", "deskzen_seed"):
        raise HTTPException(status_code=400, detail=f"Refusing to drop protected run_id '{effective_run_id}'")

    try:
        result = drop_run_database(effective_run_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error dropping database for run_id={effective_run_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to drop database: {str(e)}")

    if result.get("dropped") is False and result.get("reason") == "not_found":
        raise HTTPException(status_code=404, detail=f"Run database not found for run_id={effective_run_id}")

    return {
        "success": True,
        "run_id": effective_run_id,
        "result": result,
    }



def _sql_type_to_json_type(sql_type: str) -> str:
    """Map SQL column types to JSON schema types."""
    sql_type_lower = sql_type.lower()
    
    # Integer types
    if any(t in sql_type_lower for t in ['int', 'serial', 'smallint', 'bigint']):
        return "integer"
    
    # Numeric/float types
    if any(t in sql_type_lower for t in ['float', 'double', 'decimal', 'numeric', 'real']):
        return "number"
    
    # Boolean
    if 'bool' in sql_type_lower:
        return "boolean"
    
    # Array/JSON types
    if any(t in sql_type_lower for t in ['json', 'array', '[]']):
        return "array"
    
    # Default to string (varchar, text, uuid, timestamp, date, etc.)
    return "string"


def _compute_diff(
    before_snapshot: Dict[str, Any],
    after_snapshot: Dict[str, Any],
    ignore_tables: Optional[List[str]] = None
) -> Dict[str, Any]:
    """Compare two database snapshots and calculate changes.
    
    Args:
        before_snapshot: The seed/before database state
        after_snapshot: The current/after database state  
        ignore_tables: Tables to skip during comparison
        
    Returns:
        Dictionary with computed_at, summary, changes_by_table, and tables_unchanged.
        Format matches Deskzen structure:
        {
            "computed_at": "ISO timestamp",
            "summary": {
                "tables_with_changes": int,
                "total_rows_added": int,
                "total_rows_modified": int,
                "total_rows_deleted": int
            },
            "changes_by_table": {
                "table_name": {
                    "added": [
                        {
                            "id": 1,
                            "name": "xyz",
                            ...,
                            "_context": {
                                "context_before": [...],
                                "context_after": [...],
                                "row_index": int,
                                "total_rows": int
                            }
                        }
                    ],
                    "modified": [...],
                    "deleted": [...]
                }
            },
            "tables_unchanged": ["table1", "table2", ...]
        }
    """
    ignore_tables = ignore_tables or []
    
    diff = {
        "computed_at": datetime.now().isoformat(),
        "summary": {
            "tables_with_changes": 0,
            "total_rows_added": 0,
            "total_rows_modified": 0,
            "total_rows_deleted": 0
        },
        "changes_by_table": {},
        "tables_unchanged": []
    }
    
    before_tables = before_snapshot.get("tables", {})
    after_tables = after_snapshot.get("tables", {})
    
    # Get primary keys from snapshots (prefer after_snapshot, fallback to before)
    primary_keys = after_snapshot.get("primary_keys", {}) or before_snapshot.get("primary_keys", {})
    
    # Get all table names from both snapshots
    all_tables = set(before_tables.keys()) | set(after_tables.keys())
    
    for table_name in all_tables:
        if table_name in ignore_tables:
            continue
            
        before_rows = before_tables.get(table_name, [])
        after_rows = after_tables.get(table_name, [])
        
        # Handle error entries
        if isinstance(before_rows, dict) and "error" in before_rows:
            before_rows = before_rows.get("rows", [])
        if isinstance(after_rows, dict) and "error" in after_rows:
            after_rows = after_rows.get("rows", [])
        
        # Get primary key columns for this table (default to 'id')
        pk_columns = primary_keys.get(table_name, ["id"])
        
        # Create lookup by primary key for comparison
        before_by_key = {}
        for row in before_rows:
            key = _make_row_key(row, pk_columns)
            if key is not None:
                before_by_key[key] = row
                
        after_by_key = {}
        for row in after_rows:
            key = _make_row_key(row, pk_columns)
            if key is not None:
                after_by_key[key] = row
        
        # Sort rows by primary key for context calculation
        def _sort_key(row):
            key = _make_row_key(row, pk_columns)
            if key is None:
                return (float('inf'),)  # Put rows without PK at the end
            return key
        
        sorted_after_rows = sorted(after_rows, key=_sort_key)
        sorted_before_rows = sorted(before_rows, key=_sort_key)
        total_after_rows = len(sorted_after_rows)
        total_before_rows = len(sorted_before_rows)
        
        # Find added rows with context
        added_rows = []
        for idx, row in enumerate(sorted_after_rows):
            row_key = _make_row_key(row, pk_columns)
            if row_key is not None and row_key not in before_by_key:
                # Get context: rows before and after this one
                # Include 1 row before and up to 2 rows after (matching Deskzen sample)
                context_before = sorted_after_rows[max(0, idx - 1):idx] if idx > 0 else []
                context_after = sorted_after_rows[idx + 1:min(idx + 3, total_after_rows)] if idx < total_after_rows - 1 else []
                
                # Create row with context
                row_with_context = row.copy()
                row_with_context["_context"] = {
                    "context_before": context_before,
                    "context_after": context_after,
                    "row_index": idx + 1,  # 1-indexed
                    "total_rows": total_after_rows
                }
                added_rows.append(row_with_context)
        
        # Find modified rows with before and after context
        modified_rows = []
        for row_key in after_by_key:
            if row_key in before_by_key:
                before_row = before_by_key[row_key]
                after_row = after_by_key[row_key]
                
                # Find all changed fields (exclude relation objects - they're nested dicts)
                changes = {}
                for key in set(before_row.keys()) | set(after_row.keys()):
                    before_val = before_row.get(key)
                    after_val = after_row.get(key)
                    # Skip relation objects (nested dicts) and context fields
                    if isinstance(before_val, dict) or isinstance(after_val, dict):
                        continue
                    if key.startswith("_"):  # Skip internal fields like _context
                        continue
                    if before_val != after_val:
                        changes[key] = {
                            "before": before_val,
                            "after": after_val
                        }
                
                # Only add if there are actual changes
                if changes:
                    # Find the row index in sorted_after_rows for after context
                    after_row_idx = next((i for i, r in enumerate(sorted_after_rows) if _make_row_key(r, pk_columns) == row_key), None)
                    # Find the row index in sorted_before_rows for before context
                    before_row_idx = next((i for i, r in enumerate(sorted_before_rows) if _make_row_key(r, pk_columns) == row_key), None)
                    
                    # Build primary key object
                    primary_key_obj = {}
                    for pk_col in pk_columns:
                        primary_key_obj[pk_col] = after_row.get(pk_col)
                    
                    modified_entry = {
                        "primary_key": primary_key_obj,
                        "changes": changes,
                        "before": before_row.copy(),
                        "after": after_row.copy()
                    }
                    
                    # Add before_context
                    if before_row_idx is not None:
                        before_context_before = sorted_before_rows[max(0, before_row_idx - 1):before_row_idx] if before_row_idx > 0 else []
                        before_context_after = sorted_before_rows[before_row_idx + 1:min(before_row_idx + 3, total_before_rows)] if before_row_idx < total_before_rows - 1 else []
                        
                        modified_entry["before_context"] = {
                            "context_before": before_context_before,
                            "context_after": before_context_after,
                            "row_index": before_row_idx + 1,  # 1-indexed
                            "total_rows": total_before_rows
                        }
                    
                    # Add after_context
                    if after_row_idx is not None:
                        after_context_before = sorted_after_rows[max(0, after_row_idx - 1):after_row_idx] if after_row_idx > 0 else []
                        after_context_after = sorted_after_rows[after_row_idx + 1:min(after_row_idx + 3, total_after_rows)] if after_row_idx < total_after_rows - 1 else []
                        
                        modified_entry["after_context"] = {
                            "context_before": after_context_before,
                            "context_after": after_context_after,
                            "row_index": after_row_idx + 1,  # 1-indexed
                            "total_rows": total_after_rows
                        }
                    
                    modified_rows.append(modified_entry)
        
        # Find deleted rows with context
        deleted_rows = []
        for idx, row in enumerate(sorted_before_rows):
            row_key = _make_row_key(row, pk_columns)
            if row_key is not None and row_key not in after_by_key:
                # Get context: rows before and after this one
                context_before = sorted_before_rows[max(0, idx - 1):idx] if idx > 0 else []
                context_after = sorted_before_rows[idx + 1:min(idx + 3, total_before_rows)] if idx < total_before_rows - 1 else []
                
                # Create row with context
                row_with_context = row.copy()
                row_with_context["_context"] = {
                    "context_before": context_before,
                    "context_after": context_after,
                    "row_index": idx + 1,  # 1-indexed
                    "total_rows": total_before_rows
                }
                deleted_rows.append(row_with_context)
        
        # Only add to diff if there are changes
        if len(added_rows) > 0 or len(modified_rows) > 0 or len(deleted_rows) > 0:
            diff["changes_by_table"][table_name] = {
                "added": added_rows,
                "modified": modified_rows,
                "deleted": deleted_rows,
                "primary_key_columns": pk_columns
            }
            diff["summary"]["tables_with_changes"] += 1
            diff["summary"]["total_rows_added"] += len(added_rows)
            diff["summary"]["total_rows_modified"] += len(modified_rows)
            diff["summary"]["total_rows_deleted"] += len(deleted_rows)
        else:
            diff["tables_unchanged"].append(table_name)
    
    return diff

@router.get("/db_changes", dependencies=[Depends(authorized())])
def get_db_changes(
    request: Request,
    db: Session = Depends(get_db),
    seed_db: Session = Depends(get_seed_db)
):
    """
    Compare the seed database with the current run database and return changes.
    
    Returns:
        JSON object with:
        - computed_at: ISO timestamp
        - summary: Summary of changes (tables_with_changes, total_rows_added, etc.)
        - changes_by_table: Dictionary mapping table names to their changes
        - tables_unchanged: List of table names that didn't change
    """
    try:
        # Get run_id
        effective_run_id = None
        if hasattr(request.state, 'run_id') and request.state.run_id:
            effective_run_id = request.state.run_id
        
        if not effective_run_id:
            raise HTTPException(
                status_code=400,
                detail="run_id required. Ensure you are authenticated and have the correct run_id in your token."
            )
        
        logger.info(f"Comparing databases for run_id: {effective_run_id}")
        
        # Get snapshots for both databases with primary keys
        # Initial snapshot (seed database)
        initial_tables = get_all_tables(seed_db)
        initial_snapshot = {
            "tables": {},
            "primary_keys": get_table_primary_keys(seed_db)
        }
        for table_name in initial_tables:
            if table_name not in OPTIONAL_EXCLUDE_TABLES:
                table_data = get_table_data(seed_db, table_name)
                if "error" not in table_data:
                    initial_snapshot["tables"][table_name] = table_data.get("rows", [])
        
        # Current snapshot (run database)
        current_tables = get_all_tables(db)
        current_snapshot = {
            "tables": {},
            "primary_keys": get_table_primary_keys(db)
        }
        for table_name in current_tables:
            if table_name not in OPTIONAL_EXCLUDE_TABLES:
                table_data = get_table_data(db, table_name)
                if "error" not in table_data:
                    current_snapshot["tables"][table_name] = table_data.get("rows", [])
        
        # Compare snapshots
        result = _compute_diff(
            before_snapshot=initial_snapshot,
            after_snapshot=current_snapshot
        )
        
        logger.info(f"Database comparison complete: {result['summary']['tables_with_changes']} tables changed")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error comparing databases: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to compare databases: {str(e)}"
        )


@router.get("/db_schema")
def get_db_schema():
    """
    Return the static database schema for this gym.
    
    This endpoint returns the pre-defined schema JSON that describes all tables,
    columns, types, and constraints. No authentication required since this is
    static metadata used for verification configuration.
    
    Returns:
        JSON object with database schema definition including:
        - tables: Dictionary of table definitions with columns, types, constraints
        - relationships: Foreign key relationships between tables
    """
    try:
        # Path to the static schema file - adjust path as needed
        # Try multiple possible locations
        possible_paths = [
            Path(__file__).parent.parent.parent / "database_schema.json",
            Path(__file__).parent.parent.parent.parent / "database_schema.json",
            Path(__file__).parent.parent.parent / "utils" / "import_data" / "config" / "deskzen-schema.json",
        ]
        
        schema_path = None
        for path in possible_paths:
            if path.exists():
                schema_path = path
                break
        
        if not schema_path:
            logger.warning(f"Schema file not found in any of: {possible_paths}")
            # Fallback to inspecting database
            from app.db.session import get_seed_db
            db = next(get_seed_db())
            try:
                inspector = inspect(db.get_bind())
                try:
                    tables = inspector.get_table_names(schema="public")
                except TypeError:
                    tables = inspector.get_table_names()
                
                tables_properties = {}
                for table_name in tables:
                    columns_info = inspector.get_columns(table_name)
                    column_properties = {}
                    for col in columns_info:
                        col_name = col["name"]
                        col_type = str(col["type"])
                        json_type = _sql_type_to_json_type(col_type)
                        column_properties[col_name] = {"type": json_type}
                    tables_properties[table_name] = {"properties": column_properties}
                
                schema = {
                    "properties": {
                        "tables": {
                            "properties": tables_properties
                        }
                    }
                }
                logger.info(f"Returning database schema from inspection with {len(tables)} tables")
                return schema
            finally:
                db.close()
        
        with open(schema_path, "r", encoding="utf-8") as f:
            schema = json.load(f)
        
        logger.info(f"Returning database schema from {schema_path}")
        return schema
        
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing schema JSON: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse schema file: {str(e)}"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reading schema file: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to read schema file: {str(e)}"
        )


def _get_seed_snapshot() -> Dict[str, Any]:
    """
    Capture a snapshot of the seed/template database.
    
    The seed database is the baseline state that each run DB is cloned from.
    This represents the "before" state for verification.
    """
    logger.info("Capturing seed database snapshot...")
    
    # Connect directly to template/seed database
    seed_url = make_url(DATABASE_URL).set(database=POSTGRES_TEMPLATE_DB)
    engine = create_engine(seed_url, pool_pre_ping=True, poolclass=NullPool)
    
    snapshot = {
        "run_id": "seed",
        "captured_at": datetime.now().isoformat(),
        "tables": {},
        "primary_keys": {},
        "summary": {
            "total_tables": 0,
            "total_rows": 0,
            "tables_with_errors": 0
        }
    }
    
    try:
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        
        with SessionLocal() as db:
            # Get all tables
            inspector = inspect(db.get_bind())
            try:
                tables = inspector.get_table_names(schema="public")
            except TypeError:
                tables = inspector.get_table_names()
            
            logger.info(f"Found {len(tables)} tables in seed database")
            
            # Get primary keys for all tables
            snapshot["primary_keys"] = get_table_primary_keys(db)
            
            total_rows = 0
            tables_with_errors = 0
            
            for table_name in tables:
                try:
                    table_data = get_table_data(db, table_name)
                    
                    if "error" in table_data:
                        snapshot["tables"][table_name] = {"error": str(table_data["error"]), "rows": []}
                        tables_with_errors += 1
                    else:
                        rows = table_data["rows"]
                        snapshot["tables"][table_name] = rows
                        total_rows += len(rows)
                except Exception as e:
                    logger.error(f"Error getting seed table {table_name}: {e}")
                    snapshot["tables"][table_name] = {"error": str(e), "rows": []}
                    tables_with_errors += 1
            
            snapshot["summary"] = {
                "total_tables": len(tables),
                "total_rows": total_rows,
                "tables_with_errors": tables_with_errors
            }
            
    finally:
        engine.dispose()
    
    logger.info(f"Seed snapshot captured: {snapshot['summary']['total_tables']} tables, {snapshot['summary']['total_rows']} rows")
    return snapshot


def _get_run_snapshot(db: Session, run_id: str) -> Dict[str, Any]:
    """
    Capture a snapshot of the current run database.
    
    This represents the "after" state for verification.
    """
    logger.info(f"Capturing run database snapshot for run_id: {run_id}")
    
    snapshot = {
        "run_id": run_id,
        "captured_at": datetime.now().isoformat(),
        "tables": {},
        "primary_keys": {},
        "summary": {
            "total_tables": 0,
            "total_rows": 0,
            "tables_with_errors": 0
        }
    }
    
    # Get all tables
    tables = get_all_tables(db)
    logger.info(f"Found {len(tables)} tables in run database")
    
    # Get primary keys for all tables
    snapshot["primary_keys"] = get_table_primary_keys(db)
    
    total_rows = 0
    tables_with_errors = 0
    
    for table_name in tables:
        try:
            table_data = get_table_data(db, table_name)
            
            if "error" in table_data:
                snapshot["tables"][table_name] = {"error": str(table_data["error"]), "rows": []}
                tables_with_errors += 1
            else:
                rows = table_data["rows"]
                snapshot["tables"][table_name] = rows
                total_rows += len(rows)
        except Exception as e:
            logger.error(f"Error getting run table {table_name}: {e}")
            snapshot["tables"][table_name] = {"error": str(e), "rows": []}
            tables_with_errors += 1
    
    snapshot["summary"] = {
        "total_tables": len(tables),
        "total_rows": total_rows,
        "tables_with_errors": tables_with_errors
    }
    
    logger.info(f"Run snapshot captured: {snapshot['summary']['total_tables']} tables, {snapshot['summary']['total_rows']} rows")
    return snapshot


def _make_row_key(row: Dict[str, Any], pk_columns: List[str]) -> Optional[tuple]:
    """Create a hashable key for a row based on primary key columns.
    
    Args:
        row: The row dict
        pk_columns: List of primary key column names
        
    Returns:
        Tuple of primary key values, or None if any PK value is missing
    """
    key_values = []
    for col in pk_columns:
        val = row.get(col)
        if val is None:
            return None
        key_values.append(val)
    return tuple(key_values)


@router.get("/db_diff")
def get_db_diff(
    session_id: str = Query(..., description="The session ID to use for the diff"),
):
    """
    Get the diff between seed database and current run database.
    
    This endpoint compares the seed/template database (baseline) with the 
    current run database to show what has changed. This is used for 
    verification to compare actual changes against expected changes.
    
    Returns:
        JSON object with:
        - computed_at: ISO timestamp of when diff was computed
        - summary: Statistics about changes (tables_with_changes, rows added/modified/deleted)
        - changes_by_table: Dict mapping table names to their changes
        - tables_unchanged: List of tables with no changes
    """
    logger.info(f"Computing diff for session_id: {session_id}")
    
    try:
        # Get engine for existing database (raises 410 if not found)
        engine = _get_existing_run_engine(session_id)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        try:
            # Capture snapshots
            seed_snapshot = _get_seed_snapshot()
            run_snapshot = _get_run_snapshot(db, session_id)
            
            # Compute diff
            diff = _compute_diff(
                before_snapshot=seed_snapshot,
                after_snapshot=run_snapshot,
                ignore_tables=["alembic_version", "api_logs", "sessions", "audit_logs", "prompt_tasks"]
            )
            
            logger.info(
                f"Diff computed: {diff['summary']['tables_with_changes']} tables changed, "
                f"{diff['summary']['total_rows_added']} added, "
                f"{diff['summary']['total_rows_modified']} modified, "
                f"{diff['summary']['total_rows_deleted']} deleted"
            )
            
            return diff
        finally:
            db.close()
        
    except HTTPException as http_exc:
        # Re-raise HTTP exceptions as-is (e.g., 410 for expired session)
        # This preserves the original status code and detail
        raise http_exc
    except Exception as e:
        logger.error(f"Failed to compute diff: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to compute diff: {str(e)}")


# Session/DB status constants
SESSION_TTL_SECONDS = JWT_ACCESS_TOKEN_TTL_SECONDS  # Session expires after this many seconds
DB_INACTIVE_MINUTES = 90  # DB is considered inactive after 90 minutes


@router.get("/session_status")
def get_session_status(session_id: str = Query(..., description="The session ID to use for the status")):
    """
    Get the status of the current session and its associated database.
    
    Returns:
        JSON object with:
        - session_active: boolean (token not expired)
        - session_expires_at: ISO timestamp when session expires
        - session_created_at: ISO timestamp when session was created
        - db_active: boolean (last_used_at within 90 minutes)
        - db_last_used_at: ISO timestamp of last database activity
        - run_id: the session's run_id
    """
    run_id = session_id
    
    # Auto-create database if it doesn't exist (makes API more user-friendly)
    # This ensures the database exists before we try to query it
    try:
        from app.db_router import ensure_run_database
        ensure_run_database(run_id)
    except Exception as e:
        logger.error(f"Failed to ensure database exists for session_id={session_id}: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"Failed to initialize database for session: {str(e)}"
        )
    
    # Session status
    now = datetime.now(timezone.utc)
    # DB status - check last_used_at from run registry
    db_active = False
    db_last_used_at = None
    db_created_at = None
    
    try:
        db_name = get_run_db_name(run_id)
        engine = _admin_engine()
        
        with engine.connect() as conn:
            # Ensure table exists
            ensure_registry_table(conn)
            
            # Query for both created_at and last_used_at
            row = conn.execute(
                text("SELECT created_at, last_used_at FROM mira_run_registry WHERE db_name = :db_name"),
                {"db_name": db_name}
            ).mappings().first()
            
            if row:
                db_created_at = row.get("created_at")
                db_last_used_at = row.get("last_used_at")
                
                if db_last_used_at:
                    # Ensure timezone aware
                    if db_last_used_at.tzinfo is None:
                        db_last_used_at = db_last_used_at.replace(tzinfo=timezone.utc)
                    
                    # DB is active if last used within 90 minutes
                    inactive_threshold = now - timedelta(minutes=DB_INACTIVE_MINUTES)
                    db_active = db_last_used_at > inactive_threshold
                    
    except Exception as e:
        logger.warning(f"Could not get DB status for session_id {session_id}: {e}")
    
    return {
        "db_active": db_active,
        "db_last_used_at": db_last_used_at.isoformat() if db_last_used_at else None,
        "db_created_at": db_created_at.isoformat() if db_created_at else None,
        "run_id": run_id
    }


@router.get("/get_session_id")
def get_session_id(
    auth_token: str = Query(..., description="The authentication token to use for the session"),
):
    """
    Get the session ID for the current user.
    
    Returns:
        JSON object with:
        - session_id: The session ID for the current user
    """
    token_manager = get_token_manager()
    token_data = token_manager.validate_token(auth_token)
    if not token_data:
        raise HTTPException(status_code=401, detail="Invalid token")
    session_id = token_data.run_id
    return {
        "session_id": session_id
    }