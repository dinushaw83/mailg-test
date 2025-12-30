"""Database snapshot and admin endpoints for run databases."""

from app.auth.rbac import authorized
from fastapi import APIRouter, Depends, Query, Request, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text, inspect
from datetime import datetime
from typing import Dict, Any, List, Optional
import logging

from app.db.session import get_db
from app.db.run_router import drop_run_database
from app.schemas.db_snapshot import DbSnapshotResponse, DbDropResponse

logger = logging.getLogger(__name__)

router = APIRouter()

# Tables that might be very large or not needed for verification
OPTIONAL_EXCLUDE_TABLES = {
    # Add tables here if they're too large or not needed
    # 'api_logs',  # Example: might be very large
}


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
        
        # Query all rows using SQLAlchemy's safer identifier quoting
        # Use quoted_name to properly escape the table identifier
        from sqlalchemy.sql import quoted_name
        safe_table_name = quoted_name(table_name, quote=True)
        select_query = text(f'SELECT * FROM {safe_table_name}')
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
        
        logger.debug(f"Retrieved {len(rows)} rows from table {table_name}")
        return {"rows": rows}
        
    except Exception as e:
        logger.error(f"Error querying table {table_name}: {e}", exc_info=True)
        return {"error": str(e), "rows": []}


@router.get("/db_snapshot", response_model=DbSnapshotResponse, dependencies=[Depends(authorized())])
def get_db_snapshot(
    request: Request,
    db: Session = Depends(get_db)
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
    # Get run_id from header (via middleware) or query parameter
    effective_run_id = None
    if hasattr(request.state, 'run_id') and request.state.run_id:
        effective_run_id = request.state.run_id
    
    if not effective_run_id:
        logger.error("db_snapshot called without run_id")
        raise HTTPException(
            status_code=400,
            detail="run_id required. Ensure you are authenticated and have the correct run_id in your token."
        )
    
    logger.info(f"Creating database snapshot for run_id: {effective_run_id}")
    
    # Initialize snapshot structure
    snapshot = {
        "run_id": effective_run_id,
        "captured_at": datetime.now().isoformat(),
        "tables": {},
        "summary": {
            "total_tables": 0,
            "total_rows": 0,
            "tables_with_errors": 0
        }
    }
    
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
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Error creating database snapshot: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create database snapshot: {str(e)}"
        )


@router.delete("/db_drop", response_model=DbDropResponse, dependencies=[Depends(authorized())])
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
    if effective_run_id in ("seed", "deskzen_seed", "template", "default"):
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
