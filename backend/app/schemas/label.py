"""Pydantic schemas for Label resource - request/response validation."""

from pydantic import BaseModel, Field
from typing import Optional, List, ForwardRef, Union, Any
from datetime import datetime
from uuid import UUID

from app.schemas.pagination import PaginatedListResponse


class LabelColorSchema(BaseModel):
    """Color object with background (rgb) and text color."""
    rgb: str = Field(..., description="Background color as rgb string, e.g., 'rgb(22, 167, 101)'")
    text: str = Field(..., description="Text color as rgb string, e.g., 'rgb(255, 255, 255)'")


class LabelCreate(BaseModel):
    """Schema for creating a new label."""
    name: str = Field(..., min_length=1, max_length=100, description="Label name")
    parent_id: Optional[UUID] = Field(None, description="Parent label ID for nesting")
    show_in_label_list: bool = Field(True, description="Show in sidebar label list")
    show_in_message_list: bool = Field(True, description="Show as chip on email messages")
    show_if_unread: bool = Field(False, description="Only show in sidebar if has unread messages")


class LabelUpdate(BaseModel):
    """Schema for updating a label."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    color: Optional[Union[LabelColorSchema, str]] = Field(None, description="Label color")
    parent_id: Optional[UUID] = Field(None, description="Parent label ID (use null to move to root)")
    show_in_label_list: Optional[bool] = Field(None, description="Show in sidebar label list")
    show_in_message_list: Optional[bool] = Field(None, description="Show as chip on email messages")
    show_if_unread: Optional[bool] = Field(None, description="Only show in sidebar if has unread messages")


class LabelResponse(BaseModel):
    """Schema for label response."""
    model_config = {"from_attributes": True}

    id: UUID
    name: str
    color: Optional[Union[LabelColorSchema, dict, str]] = None
    owner_id: UUID
    parent_id: Optional[UUID] = None
    is_system: bool = False
    is_exclusive: bool = False
    show_in_label_list: bool = True
    show_in_message_list: bool = True
    show_if_unread: bool = False
    created_at: datetime
    updated_at: datetime
    thread_count: int = 0
    unread_count: int = 0


class LabelListResponse(BaseModel):
    """Label info for list responses."""
    model_config = {"from_attributes": True}

    id: UUID
    name: str
    full_name: Optional[str] = None  # Hierarchical name (e.g., "parent/child/grandchild")
    color: Optional[Union[LabelColorSchema, dict, str]] = None
    owner_id: UUID
    parent_id: Optional[UUID] = None
    is_system: bool = False
    is_exclusive: bool = False
    show_in_label_list: bool = True
    show_in_message_list: bool = True
    show_if_unread: bool = False
    created_at: datetime
    updated_at: datetime
    thread_count: int = 0
    unread_count: int = 0


class LabelTreeResponse(BaseModel):
    """Hierarchical label response with nested children."""
    model_config = {"from_attributes": True}

    id: UUID
    name: str
    color: Optional[Union[LabelColorSchema, dict, str]] = None
    owner_id: UUID
    parent_id: Optional[UUID] = None
    is_system: bool = False
    is_exclusive: bool = False
    show_in_label_list: bool = True
    show_in_message_list: bool = True
    show_if_unread: bool = False
    created_at: datetime
    updated_at: datetime
    thread_count: int = 0
    unread_count: int = 0
    children: List["LabelTreeResponse"] = []


# Required for self-referential model
LabelTreeResponse.model_rebuild()


LabelPaginatedResponse = PaginatedListResponse[LabelListResponse]
