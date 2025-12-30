"""Pydantic schemas for Item resource - request/response validation."""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

from app.schemas.pagination import PaginatedListResponse

class ItemBase(BaseModel):
    """Base schema with common Item fields."""
    name: str = Field(..., min_length=1, max_length=255, description="Item name")
    description: Optional[str] = Field(None, description="Detailed description")
    status: Optional[str] = Field("active", description="Item status: active, inactive, archived")
    priority: Optional[str] = Field("medium", description="Priority: low, medium, high")
    is_public: Optional[bool] = Field(True, description="Whether item is publicly visible")


class ItemCreate(ItemBase):
    """Schema for creating a new item.
    
    Created_by is automatically set from the authenticated user.
    """
    pass


class ItemUpdate(BaseModel):
    """Schema for updating an existing item.
    
    All fields are optional - only provided fields will be updated.
    Updated_by is automatically set from the authenticated user.
    """
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    is_public: Optional[bool] = None


class ItemResponse(ItemBase):
    """Schema for item response with all fields including metadata."""
    model_config = {"from_attributes": True}
    
    id: int
    created_by_id: int
    updated_by_id: Optional[int]
    is_deleted: bool
    created_at: datetime
    updated_at: datetime
    
    # Nested user information (optional - can be expanded)
    created_by_name: Optional[str] = None
    updated_by_name: Optional[str] = None


ItemListResponse = PaginatedListResponse[ItemResponse]

