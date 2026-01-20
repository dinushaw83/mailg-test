"""Pydantic schemas for EmailTemplate resource - request/response validation."""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


class EmailTemplateCreate(BaseModel):
    """Schema for creating a new email template."""
    name: str = Field(..., min_length=1, max_length=255, description="Template name / Email subject")
    body: Optional[str] = Field(None, description="Plain text body template")
    html_body: Optional[str] = Field(None, description="HTML body template")
    is_shared: bool = Field(False, description="Share template with team")


class EmailTemplateUpdate(BaseModel):
    """Schema for updating an email template."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    body: Optional[str] = None
    html_body: Optional[str] = None
    is_shared: Optional[bool] = None


class EmailTemplateResponse(BaseModel):
    """Schema for email template response."""
    model_config = {"from_attributes": True}
    
    id: UUID
    name: str
    body: Optional[str] = None
    html_body: Optional[str] = None
    is_shared: bool
    owner_id: UUID
    owner_name: Optional[str] = None
    owner_email: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class EmailTemplateListResponse(BaseModel):
    """Brief template info for list responses."""
    model_config = {"from_attributes": True}
    
    id: UUID
    name: str
    is_shared: bool
    owner_id: UUID
    owner_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class EmailTemplateApplyRequest(BaseModel):
    """Schema for applying a template to create a new email."""
    template_id: UUID = Field(..., description="Template ID to apply")
    additional_body: Optional[str] = Field(None, description="Additional text to append")
    save_as_draft: bool = Field(True, description="Save as draft or just return content")
