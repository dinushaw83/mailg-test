"""Pydantic schemas for database snapshot endpoints."""

from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional
from datetime import datetime


class SnapshotSummary(BaseModel):
    """Summary statistics for a database snapshot."""
    total_tables: int = Field(..., description="Total number of tables captured")
    total_rows: int = Field(..., description="Total number of rows across all tables")
    tables_with_errors: int = Field(..., description="Number of tables that had errors during capture")


class DbSnapshotResponse(BaseModel):
    """Response schema for database snapshot endpoint."""
    run_id: str = Field(..., description="The run ID used for this snapshot")
    captured_at: str = Field(..., description="ISO timestamp of when snapshot was captured")
    tables: Dict[str, Any] = Field(..., description="Dictionary mapping table names to arrays of row objects")
    summary: SnapshotSummary = Field(..., description="Summary statistics")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "run_id": "run_abc123",
                "captured_at": "2025-12-10T10:30:45.123456",
                "tables": {
                    "users": [{"id": 1, "username": "admin", "email": "admin@example.com"}],
                    "items": [{"id": 1, "name": "Test Item", "status": "active"}]
                },
                "summary": {
                    "total_tables": 2,
                    "total_rows": 2,
                    "tables_with_errors": 0
                }
            }
        }
    }


class DbDropResult(BaseModel):
    """Result of dropping a database."""
    dropped: bool = Field(..., description="Whether the database was dropped")
    database: Optional[str] = Field(None, description="Name of the database that was dropped")
    reason: Optional[str] = Field(None, description="Reason if not dropped")


class DbDropResponse(BaseModel):
    """Response schema for database drop endpoint."""
    success: bool = Field(..., description="Whether the operation was successful")
    run_id: str = Field(..., description="The run ID of the dropped database")
    result: DbDropResult = Field(..., description="Detailed result of the operation")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "success": True,
                "run_id": "run_abc123",
                "result": {
                    "dropped": True,
                    "database": "boiler_plate_run_abc123"
                }
            }
        }
    }

