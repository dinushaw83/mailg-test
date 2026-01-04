"""Pydantic schemas for Folder resource - request/response validation."""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID

from app.schemas.pagination import PaginatedListResponse


class FolderCreate(BaseModel):
    """Schema for creating a new folder."""
    name: str = Field(..., min_length=1, max_length=255, description="Folder name")
    folder_type: str = Field("custom", description="Folder type")
    color: Optional[str] = Field(None, description="Hex color for UI")
    icon: Optional[str] = Field(None, description="Icon name for UI")
    parent_folder_id: Optional[UUID] = Field(None, description="Parent folder for nesting")


class FolderUpdate(BaseModel):
    """Schema for updating a folder."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    color: Optional[str] = None
    icon: Optional[str] = None


class FolderResponse(BaseModel):
    """Schema for folder response."""
    model_config = {"from_attributes": True}
    
    id: UUID
    name: str
    folder_type: str
    color: Optional[str] = None
    icon: Optional[str] = None
    owner_id: UUID
    parent_folder_id: Optional[UUID] = None
    is_system: bool
    is_deleted: bool = False
    created_at: datetime
    updated_at: datetime
    email_count: int = 0
    unread_count: int = 0


class FolderListResponse(BaseModel):
    """Brief folder info for list responses."""
    model_config = {"from_attributes": True}
    
    id: UUID
    name: str
    folder_type: str
    color: Optional[str] = None
    icon: Optional[str] = None
    is_system: bool
    email_count: int = 0
    unread_count: int = 0


FolderPaginatedResponse = PaginatedListResponse[FolderListResponse]
