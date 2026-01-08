"""Pydantic schemas for Bulk operations - request/response validation."""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from uuid import UUID


class BulkEmailIds(BaseModel):
    """Base schema for bulk operations with email IDs."""
    email_ids: List[UUID] = Field(..., min_length=1, max_length=100, description="List of email IDs to operate on")


class BulkReadRequest(BulkEmailIds):
    """Schema for bulk mark read/unread."""
    is_read: bool = Field(..., description="Mark as read (true) or unread (false)")


class BulkStarRequest(BulkEmailIds):
    """Schema for bulk star/unstar."""
    is_starred: bool = Field(..., description="Star (true) or unstar (false)")


class BulkMoveRequest(BulkEmailIds):
    """Schema for bulk move to folder."""
    folder: str = Field(..., description="Target folder: inbox, sent, drafts, trash, spam, starred")


class BulkDeleteRequest(BulkEmailIds):
    """Schema for bulk delete emails."""
    permanent: bool = Field(False, description="Permanently delete (true) or move to trash (false)")


class BulkThreadIds(BaseModel):
    """Base schema for bulk operations with thread IDs."""
    thread_ids: List[UUID] = Field(..., min_length=1, max_length=100, description="List of thread IDs to operate on")


class BulkLabelAddRequest(BulkThreadIds):
    """Schema for bulk add labels to threads."""
    label_ids: List[UUID] = Field(..., min_length=1, description="Label IDs to add")


class BulkLabelRemoveRequest(BulkThreadIds):
    """Schema for bulk remove labels from threads."""
    label_ids: List[UUID] = Field(..., min_length=1, description="Label IDs to remove")


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


class BulkUnarchiveRequest(BulkEmailIds):
    """Schema for bulk unarchive emails."""
    pass


class BulkSpamRequest(BulkEmailIds):
    """Schema for bulk mark as spam."""
    pass


class BulkUnspamRequest(BulkEmailIds):
    """Schema for bulk unmark as spam."""
    pass


class BulkOperationResult(BaseModel):
    """Result of a single item in bulk operation."""
    id: UUID = Field(..., description="Email ID")
    success: bool = Field(..., description="Whether operation succeeded")
    error: Optional[str] = Field(None, description="Error message if failed")


class BulkOperationResponse(BaseModel):
    """Response schema for bulk operations."""
    total_requested: int = Field(..., description="Total number of emails requested")
    successful: int = Field(..., description="Number of successfully processed emails")
    failed: int = Field(..., description="Number of failed operations")
    results: List[BulkOperationResult] = Field(default_factory=list, description="Individual results")
