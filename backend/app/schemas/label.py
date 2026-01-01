"""Pydantic schemas for Label resource - request/response validation."""

from pydantic import BaseModel, Field
from typing import Optional, List, ForwardRef
from datetime import datetime

from app.schemas.pagination import PaginatedListResponse


class LabelCreate(BaseModel):
    """Schema for creating a new label."""
    name: str = Field(..., min_length=1, max_length=100, description="Label name")
    color: Optional[str] = Field(None, description="Hex color")
    parent_id: Optional[int] = Field(None, description="Parent label ID for nesting")


class LabelUpdate(BaseModel):
    """Schema for updating a label."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    color: Optional[str] = None
    parent_id: Optional[int] = Field(None, description="Parent label ID (use 0 or null to move to root)")


class LabelResponse(BaseModel):
    """Schema for label response."""
    model_config = {"from_attributes": True}
    
    id: int
    name: str
    color: Optional[str] = None
    owner_id: int
    parent_id: Optional[int] = None
    is_deleted: bool = False
    created_at: datetime
    updated_at: datetime
    email_count: int = 0


class LabelListResponse(BaseModel):
    """Brief label info for list responses."""
    model_config = {"from_attributes": True}
    
    id: int
    name: str
    color: Optional[str] = None
    parent_id: Optional[int] = None
    email_count: int = 0


class LabelTreeResponse(BaseModel):
    """Hierarchical label response with nested children."""
    model_config = {"from_attributes": True}
    
    id: int
    name: str
    color: Optional[str] = None
    parent_id: Optional[int] = None
    email_count: int = 0
    children: List["LabelTreeResponse"] = []


# Required for self-referential model
LabelTreeResponse.model_rebuild()


LabelPaginatedResponse = PaginatedListResponse[LabelListResponse]

