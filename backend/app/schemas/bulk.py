"""Pydantic schemas for Bulk operations - request/response validation."""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class BulkEmailIds(BaseModel):
    """Base schema for bulk operations with email IDs."""
    email_ids: List[int] = Field(..., min_length=1, max_length=100, description="List of email IDs to operate on")


class BulkReadRequest(BulkEmailIds):
    """Schema for bulk mark read/unread."""
    is_read: bool = Field(..., description="Mark as read (true) or unread (false)")


class BulkStarRequest(BulkEmailIds):
    """Schema for bulk star/unstar."""
    is_starred: bool = Field(..., description="Star (true) or unstar (false)")


class BulkMoveRequest(BulkEmailIds):
    """Schema for bulk move to folder."""
    folder_id: int = Field(..., description="Target folder ID")


class BulkDeleteRequest(BulkEmailIds):
    """Schema for bulk delete emails."""
    permanent: bool = Field(False, description="Permanently delete (true) or move to trash (false)")


class BulkLabelAddRequest(BulkEmailIds):
    """Schema for bulk add labels."""
    label_ids: List[int] = Field(..., min_length=1, description="Label IDs to add")


class BulkLabelRemoveRequest(BulkEmailIds):
    """Schema for bulk remove labels."""
    label_ids: List[int] = Field(..., min_length=1, description="Label IDs to remove")


class BulkSnoozeRequest(BulkEmailIds):
    """Schema for bulk snooze emails."""
    snooze_until: datetime = Field(..., description="Date and time when emails should reappear")


class BulkUnsnoozeRequest(BulkEmailIds):
    """Schema for bulk unsnooze emails."""
    pass


class BulkArchiveRequest(BulkEmailIds):
    """Schema for bulk archive emails."""
    pass


class BulkCategoryRequest(BulkEmailIds):
    """Schema for bulk update email category."""
    category: str = Field(..., description="Email category: primary, promotions, social, updates, forums")


class BulkOperationResult(BaseModel):
    """Result of a single item in bulk operation."""
    id: int = Field(..., description="Email ID")
    success: bool = Field(..., description="Whether operation succeeded")
    error: Optional[str] = Field(None, description="Error message if failed")


class BulkOperationResponse(BaseModel):
    """Response schema for bulk operations."""
    total_requested: int = Field(..., description="Total number of emails requested")
    successful: int = Field(..., description="Number of successfully processed emails")
    failed: int = Field(..., description="Number of failed operations")
    results: List[BulkOperationResult] = Field(default_factory=list, description="Individual results")

