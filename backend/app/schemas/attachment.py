"""Pydantic schemas for Attachment resource - request/response validation."""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

from app.schemas.pagination import PaginatedListResponse


class AttachmentCreate(BaseModel):
    """Schema for creating an attachment (metadata only, file handled separately)."""
    filename: str = Field(..., min_length=1, max_length=255, description="File name")
    content_type: Optional[str] = Field(None, description="MIME type")
    size_bytes: Optional[int] = Field(None, ge=0, description="File size in bytes")


class AttachmentResponse(BaseModel):
    """Schema for attachment response."""
    model_config = {"from_attributes": True}
    
    id: int
    email_id: int
    filename: str
    content_type: Optional[str] = None
    size_bytes: Optional[int] = None
    attachment_type: str
    storage_path: Optional[str] = None
    is_deleted: bool = False
    created_at: datetime


class AttachmentListResponse(BaseModel):
    """Brief attachment info for list responses."""
    model_config = {"from_attributes": True}
    
    id: int
    filename: str
    content_type: Optional[str] = None
    size_bytes: Optional[int] = None
    attachment_type: str


AttachmentPaginatedResponse = PaginatedListResponse[AttachmentListResponse]

