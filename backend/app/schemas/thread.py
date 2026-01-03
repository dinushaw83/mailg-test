"""Pydantic schemas for Thread resource - request/response validation."""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID

from app.schemas.pagination import PaginatedListResponse
from app.schemas.email import EmailListResponse


class ThreadResponse(BaseModel):
    """Schema for thread response."""
    model_config = {"from_attributes": True}
    
    id: UUID
    subject: str
    owner_id: UUID
    participant_count: int
    email_count: int
    last_email_at: Optional[datetime] = None
    is_deleted: bool = False
    created_at: datetime
    updated_at: datetime
    emails: List[EmailListResponse] = []


class ThreadListResponse(BaseModel):
    """Brief thread info for list responses."""
    model_config = {"from_attributes": True}
    
    id: UUID
    subject: str
    participant_count: int
    email_count: int
    last_email_at: Optional[datetime] = None
    created_at: datetime
    # Preview info
    has_unread: bool = False
    has_attachments: bool = False
    latest_sender_name: Optional[str] = None


ThreadPaginatedResponse = PaginatedListResponse[ThreadListResponse]
