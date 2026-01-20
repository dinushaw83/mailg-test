"""Pydantic schemas for Bulk operations - request/response validation."""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from uuid import UUID


class BulkEmailIds(BaseModel):
    """Base schema for bulk operations with email IDs."""
    email_ids: List[UUID] = Field(..., min_length=1, max_length=100, description="List of email IDs to operate on")


class BulkThreadIds(BaseModel):
    """Base schema for bulk operations with thread IDs."""
    thread_ids: List[UUID] = Field(..., min_length=1, max_length=100, description="List of thread IDs to operate on")


class BulkReadRequest(BulkEmailIds):
    """Schema for bulk mark read/unread."""
    is_read: bool = Field(..., description="Mark as read (true) or unread (false)")


class BulkStarRequest(BulkEmailIds):
    """Schema for bulk star/unstar."""
    is_starred: bool = Field(..., description="Star (true) or unstar (false)")

class BulkImportantRequest(BulkThreadIds):
    """Schema for bulk important/unimportant (thread-level operation)."""
    is_important: bool = Field(..., description="Important (true) or unimportant (false)")


class BulkMoveRequest(BulkEmailIds):
    """Schema for bulk move to folder."""
    folder: str = Field(..., description="Target folder: inbox, sent, drafts, trash, spam, starred")


class BulkDeleteRequest(BulkEmailIds):
    """Schema for bulk delete emails."""
    permanent: bool = Field(False, description="Permanently delete (true) or move to trash (false)")


class BulkThreadIds(BaseModel):
    """Base schema for bulk operations with thread IDs."""
    thread_ids: List[UUID] = Field(..., min_length=1, max_length=100, description="List of thread IDs to operate on")


class BulkLabelsUpdateOperation(BaseModel):
    """Schema for label update operations."""
    add: List[UUID] = Field(default_factory=list, description="Label IDs to add")
    remove: List[UUID] = Field(default_factory=list, description="Label IDs to remove")


class BulkLabelsUpdateRequest(BulkThreadIds):
    """Schema for bulk update labels on threads (add and/or remove)."""
    labels: BulkLabelsUpdateOperation = Field(..., description="Labels to add and/or remove")


class BulkSnoozeRequest(BulkThreadIds):
    """Schema for bulk snooze threads (thread-level operation)."""
    snooze_until: datetime = Field(..., description="Date and time when threads should reappear")


class BulkUnsnoozeRequest(BulkThreadIds):
    """Schema for bulk unsnooze threads (thread-level operation)."""
    pass


class BulkArchiveRequest(BulkThreadIds):
    """Schema for bulk archive threads (thread-level operation)."""
    pass


class BulkCategoryRequest(BulkEmailIds):
    """Schema for bulk update email category."""
    category: str = Field(..., description="Email category: primary, promotions, social, updates, forums")


class BulkUnarchiveRequest(BulkThreadIds):
    """Schema for bulk unarchive threads (thread-level operation)."""
    pass


class BulkSpamRequest(BulkEmailIds):
    """Schema for bulk mark as spam."""
    pass


class BulkUnspamRequest(BulkEmailIds):
    """Schema for bulk unmark as spam."""
    pass


class BulkThreadUnstarRequest(BulkThreadIds):
    """Schema for bulk unstar threads (unstar all emails in threads)."""
    pass


class BulkThreadReadRequest(BulkThreadIds):
    """Schema for bulk mark threads as read/unread."""
    is_read: bool = Field(..., description="Mark as read (true) or unread (false)")


class BulkOperationResult(BaseModel):
    """Result of a single item in bulk operation."""
    id: UUID = Field(..., description="Email ID or Thread ID")
    success: bool = Field(..., description="Whether operation succeeded")
    error: Optional[str] = Field(None, description="Error message if failed")


class BulkOperationResponse(BaseModel):
    """Response schema for bulk operations."""
    total_requested: int = Field(..., description="Total number of emails requested")
    successful: int = Field(..., description="Number of successfully processed emails")
    failed: int = Field(..., description="Number of failed operations")
    results: List[BulkOperationResult] = Field(default_factory=list, description="Individual results")
