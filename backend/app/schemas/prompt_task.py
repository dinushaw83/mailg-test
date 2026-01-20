"""PromptTask schemas."""

from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any
from datetime import datetime


class PromptTaskBase(BaseModel):
    """Base prompt task schema with common fields."""
    
    prompt: str
    db_verification_config: Optional[dict] = None


class PromptTaskCreate(PromptTaskBase):
    """Schema for creating a new prompt task."""
    
    id: str


class PromptTaskUpdate(BaseModel):
    """Schema for updating a prompt task."""
    
    new_id: Optional[str] = None  # New ID to rename the task to
    prompt: Optional[str] = None
    db_verification_config: Optional[dict] = None


class PromptTaskRead(PromptTaskBase):
    """Schema for reading prompt task data."""
    
    id: str
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class PromptTaskListResponse(BaseModel):
    """Response schema for list of prompt tasks."""
    
    prompt_tasks: List[PromptTaskRead]
    total: int


class PromptTaskBulkUpdateItem(BaseModel):
    """Schema for a single item in bulk update."""
    
    id: str
    prompt: Optional[str] = None
    db_verification_config: Optional[dict] = None


class PromptTaskBulkReplaceItem(BaseModel):
    """Schema for a single item in bulk replace."""
    
    id: str
    prompt: str
    db_verification_config: Optional[dict] = None


class PromptTaskBulkReplaceRequest(BaseModel):
    """Schema for bulk replace request."""
    
    prompt_tasks: List[PromptTaskBulkReplaceItem]