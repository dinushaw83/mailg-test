"""
Logging utility that writes to both file and database
Uses grep-friendly format: key=value pairs
"""

import logging
import json
import time
from datetime import datetime
from typing import Optional, Dict, Any
from pathlib import Path
from sqlalchemy.orm import Session
from sqlalchemy import inspect
from sqlalchemy.exc import OperationalError
from app.models.log import ApiLog
from app.config import BASE_DIR

# Create logs directory
LOG_DIR = BASE_DIR / "logs"
LOG_DIR.mkdir(exist_ok=True)

# Configure file logging with grep-friendly format
LOG_FILE = LOG_DIR / "api.log"
ERROR_LOG_FILE = LOG_DIR / "api_errors.log"


# Custom formatter for grep-friendly output
class GrepFormatter(logging.Formatter):
    """Formatter that outputs key=value pairs for easy grepping"""

    def format(self, record):
        # Build key=value pairs
        parts = [
            f"timestamp={datetime.fromtimestamp(record.created).isoformat()}",
            f"level={record.levelname}",
            f"operation={getattr(record, 'operation', 'N/A')}",
            f"resource={getattr(record, 'resource', 'N/A')}",
            f"resource_id={getattr(record, 'resource_id', 'N/A')}",
            f"method={getattr(record, 'method', 'N/A')}",
            f"endpoint={getattr(record, 'endpoint', 'N/A')}",
            f"status_code={getattr(record, 'status_code', 'N/A')}",
        ]

        if hasattr(record, "user_id") and record.user_id:
            parts.append(f"user_id={record.user_id}")

        if hasattr(record, "ip_address") and record.ip_address:
            parts.append(f"ip_address={record.ip_address}")

        if hasattr(record, "duration_ms") and record.duration_ms:
            parts.append(f"duration_ms={record.duration_ms}")

        if hasattr(record, "error_message") and record.error_message:
            parts.append(f"error={record.error_message}")

        if record.getMessage():
            parts.append(f"message={record.getMessage()}")

        # Add request/response data as JSON if present
        if hasattr(record, "request_data") and record.request_data:
            parts.append(f"request_data={json.dumps(record.request_data)}")

        if hasattr(record, "response_data") and record.response_data:
            # Limit response data size
            response_str = json.dumps(record.response_data)
            if len(response_str) > 500:
                response_str = response_str[:500] + "..."
            parts.append(f"response_data={response_str}")

        return " ".join(parts)


# Setup file logger
file_logger = logging.getLogger("api_file")
file_logger.setLevel(logging.INFO)
file_logger.handlers.clear()  # Clear existing handlers

# File handler for all logs
file_handler = logging.FileHandler(LOG_FILE)
file_handler.setLevel(logging.INFO)
file_handler.setFormatter(GrepFormatter())
file_logger.addHandler(file_handler)

# Error file handler
error_file_handler = logging.FileHandler(ERROR_LOG_FILE)
error_file_handler.setLevel(logging.ERROR)
error_file_handler.setFormatter(GrepFormatter())
file_logger.addHandler(error_file_handler)

# Console handler (optional, for development)
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
console_handler.setFormatter(GrepFormatter())
file_logger.addHandler(console_handler)


def _api_logs_table_exists(db: Session) -> bool:
    """Check if api_logs table exists in the database.
    
    Args:
        db: Database session.
        
    Returns:
        True if table exists, False otherwise.
    """
    try:
        inspector = inspect(db.get_bind())
        return "api_logs" in inspector.get_table_names()
    except Exception:
        # If query fails, assume table doesn't exist
        return False


def log_to_database(
    db: Session,
    level: str,
    operation: str,
    resource: str,
    method: str,
    endpoint: str,
    status_code: int,
    resource_id: Optional[str] = None,
    user_id: Optional[int] = None,
    ip_address: Optional[str] = None,
    request_data: Optional[Dict[str, Any]] = None,
    response_data: Optional[Dict[str, Any]] = None,
    error_message: Optional[str] = None,
    duration_ms: Optional[int] = None,
):
    """Log operation to database.
    
    Note: This function should be called BEFORE the main transaction is committed,
    or it will use a separate session to avoid transaction conflicts.
    
    If the api_logs table doesn't exist, this function will silently skip database logging
    and only file logging will occur.
    """
    # Check if api_logs table exists before attempting to log
    if not _api_logs_table_exists(db):
        file_logger.warning(
            f"api_logs table does not exist, skipping database logging for {operation} {resource}. "
            f"Please run database initialization scripts (init_db.py) to create the required tables."
        )
        return
    
    try:
        # Limit response data size for database
        db_response_data = None
        if response_data:
            db_response_data = response_data.copy()
            # Remove large fields or truncate
            if isinstance(db_response_data, dict):
                for key in ["conversations", "body", "html_body", "plain_body"]:
                    if key in db_response_data:
                        db_response_data[key] = (
                            f"[{len(str(db_response_data[key]))} chars]"
                        )

        log_entry = ApiLog(
            level=level,
            operation=operation,
            resource=resource,
            resource_id=resource_id,
            method=method,
            endpoint=endpoint,
            status_code=status_code,
            user_id=user_id,
            ip_address=ip_address,
            request_data=request_data,
            response_data=db_response_data,
            error_message=error_message,
            duration_ms=duration_ms,
        )
        
        # Check if session is in a valid state for committing
        # If session was already committed, we need to rollback any pending state first
        try:
            # Check if there are any pending statements that might cause issues
            # If the session is not active or has errors, skip database logging
            if not db.is_active:
                file_logger.warning(f"Session not active for database logging, skipping DB log for {operation} {resource}")
                return
            
            db.add(log_entry)
            db.flush()  # Flush to ensure the log entry is added to the transaction
            db.commit()
        except Exception as commit_error:
            # Check if error is due to missing table
            error_msg = str(commit_error.orig) if hasattr(commit_error, 'orig') else str(commit_error)
            msg = error_msg.lower()
            missing_table = ("no such table" in msg) or ("relation" in msg and "does not exist" in msg)
            if isinstance(commit_error, OperationalError) and missing_table:
                file_logger.warning(
                    f"api_logs table does not exist, skipping database logging for {operation} {resource}. "
                    f"Please run database initialization scripts (init_db.py) to create the required tables."
                )
            else:
                file_logger.warning(f"Could not commit log entry to database: {str(commit_error)}, skipping DB log")
            try:
                db.rollback()
            except Exception:
                pass
            # Don't fail the request if logging fails - just skip database logging
            return
            
    except Exception as e:
        # Check if error is due to missing table
        error_msg = str(e.orig) if hasattr(e, 'orig') else str(e)
        msg = error_msg.lower()
        missing_table = ("no such table" in msg) or ("relation" in msg and "does not exist" in msg)
        if isinstance(e, OperationalError) and missing_table:
            file_logger.warning(
                f"api_logs table does not exist, skipping database logging for {operation} {resource}. "
                f"Please run database initialization scripts (init_db.py) to create the required tables."
            )
        else:
            # Don't fail the request if logging fails
            file_logger.error(f"Failed to log to database: {str(e)}", exc_info=True)
        try:
            db.rollback()
        except Exception:
            # If rollback fails, session is likely already closed/invalid
            pass


def get_client_ip(request) -> Optional[str]:
    """Extract client IP address from request"""
    if hasattr(request, "client") and request.client:
        return request.client.host
    return None


def log_crud_operation(
    db: Session,
    level: str,
    operation: str,
    resource: str,
    method: str,
    endpoint: str,
    status_code: int,
    resource_id: Optional[str] = None,
    user_id: Optional[int] = None,
    ip_address: Optional[str] = None,
    request_data: Optional[Dict[str, Any]] = None,
    response_data: Optional[Dict[str, Any]] = None,
    error_message: Optional[str] = None,
    duration_ms: Optional[int] = None,
):
    """Log CRUD operation to both file and database"""
    # Create log record for file logging
    record = logging.LogRecord(
        name="api_file",
        level=getattr(logging, level, logging.INFO),
        pathname="",
        lineno=0,
        msg="",
        args=(),
        exc_info=None,
    )

    # Add custom attributes
    record.operation = operation
    record.resource = resource
    record.resource_id = resource_id or "N/A"
    record.method = method
    record.endpoint = endpoint
    record.status_code = status_code
    record.user_id = user_id
    record.ip_address = ip_address
    record.request_data = request_data
    record.response_data = response_data
    record.error_message = error_message
    record.duration_ms = duration_ms

    # Log to file
    file_logger.handle(record)

    # Log to database
    log_to_database(
        db=db,
        level=level,
        operation=operation,
        resource=resource,
        method=method,
        endpoint=endpoint,
        status_code=status_code,
        resource_id=resource_id,
        user_id=user_id,
        ip_address=ip_address,
        request_data=request_data,
        response_data=response_data,
        error_message=error_message,
        duration_ms=duration_ms,
    )
