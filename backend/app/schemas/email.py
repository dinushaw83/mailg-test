"""Pydantic schemas for Email resource - request/response validation."""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID

from app.schemas.pagination import PaginatedListResponse


class EmailRecipientSchema(BaseModel):
    """Schema for email recipient."""
    email: str = Field(..., description="Recipient email address")
    name: Optional[str] = Field(None, description="Recipient display name")
    type: str = Field(..., description="Recipient type: to, cc, bcc")


class EmailCreate(BaseModel):
    """Schema for creating a new email."""
    subject: str = Field(..., min_length=1, max_length=500, description="Email subject")
    body: Optional[str] = Field(None, description="Plain text body")
    html_body: Optional[str] = Field(None, description="HTML body")
    recipients: List[EmailRecipientSchema] = Field(..., min_length=1, description="List of recipients")
    folder_id: Optional[UUID] = Field(None, description="Target folder ID")
    category: Optional[str] = Field("primary", description="Email category: primary, promotions, social, updates, forums")
    is_draft: bool = Field(False, description="Save as draft instead of sending")
    scheduled_send_at: Optional[datetime] = Field(None, description="Schedule email to be sent at this time (for undo send feature)")


class EmailUpdate(BaseModel):
    """Schema for updating an email."""
    subject: Optional[str] = Field(None, min_length=1, max_length=500)
    body: Optional[str] = None
    html_body: Optional[str] = None
    is_read: Optional[bool] = None
    is_starred: Optional[bool] = None
    is_important: Optional[bool] = None
    folder_id: Optional[UUID] = None
    category: Optional[str] = Field(None, description="Email category: primary, promotions, social, updates, forums")


class EmailReadUpdate(BaseModel):
    """Schema for updating read status."""
    is_read: bool = Field(..., description="Mark as read or unread")


class EmailStarUpdate(BaseModel):
    """Schema for updating starred status."""
    is_starred: bool = Field(..., description="Star or unstar email")


class EmailMoveRequest(BaseModel):
    """Schema for moving email to folder."""
    folder_id: UUID = Field(..., description="Target folder ID")


class EmailLabelRequest(BaseModel):
    """Schema for adding label to email."""
    label_id: UUID = Field(..., description="Label ID to add")


class EmailReplyRequest(BaseModel):
    """Schema for replying to an email."""
    body: str = Field(..., min_length=1, description="Reply body")
    html_body: Optional[str] = Field(None, description="HTML reply body")
    reply_all: bool = Field(False, description="Reply to all recipients")


class EmailForwardRequest(BaseModel):
    """Schema for forwarding an email."""
    recipients: List[EmailRecipientSchema] = Field(..., min_length=1, description="Forward recipients")
    body: Optional[str] = Field(None, description="Additional message")
    html_body: Optional[str] = Field(None, description="HTML additional message")


class EmailSnoozeRequest(BaseModel):
    """Schema for snoozing an email until a specific date/time."""
    snooze_until: datetime = Field(..., description="Date and time when the email should reappear")


class EmailCategoryUpdate(BaseModel):
    """Schema for updating email category."""
    category: str = Field(..., description="Email category: primary, promotions, social, updates, forums")


class EmailRecipientResponse(BaseModel):
    """Schema for email recipient in response."""
    model_config = {"from_attributes": True}
    
    id: UUID
    email: str
    name: Optional[str] = None
    type: str


class AttachmentBriefResponse(BaseModel):
    """Brief attachment info for email response."""
    model_config = {"from_attributes": True}
    
    id: UUID
    filename: str
    content_type: Optional[str] = None
    size_bytes: Optional[int] = None


class LabelBriefResponse(BaseModel):
    """Brief label info for email response."""
    model_config = {"from_attributes": True}
    
    id: UUID
    name: str
    color: Optional[str] = None


class SystemLabelResponse(BaseModel):
    """System label derived from folder type (e.g., Inbox, Spam, Trash)."""
    model_config = {"from_attributes": True}
    
    name: str = Field(..., description="System label name (e.g., Inbox, Spam, Trash)")
    color: Optional[str] = Field(None, description="Display color for the label")


class EmailResponse(BaseModel):
    """Schema for email response with all fields including metadata."""
    model_config = {"from_attributes": True}
    
    id: UUID
    subject: str
    body: Optional[str] = None
    html_body: Optional[str] = None
    status: str
    category: Optional[str] = "primary"
    is_read: bool
    is_starred: bool
    is_important: bool
    sender_id: UUID
    sender_name: Optional[str] = None
    sender_email: Optional[str] = None
    recipients: List[EmailRecipientResponse] = []
    folder_id: Optional[UUID] = None
    folder_name: Optional[str] = None
    thread_id: Optional[UUID] = None
    parent_email_id: Optional[UUID] = None
    sent_at: Optional[datetime] = None
    received_at: Optional[datetime] = None
    scheduled_send_at: Optional[datetime] = None  # When email will actually send (undo send)
    snooze_until: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    attachment_count: int = 0
    attachments: List[AttachmentBriefResponse] = []
    labels: List[LabelBriefResponse] = []
    system_labels: List[SystemLabelResponse] = []  # System labels derived from folder (Inbox, Spam, etc.)
    can_undo_send: bool = False  # True if email is in queued status and can be cancelled


class EmailListResponse(BaseModel):
    """Brief email info for list responses."""
    model_config = {"from_attributes": True}
    
    id: UUID
    subject: str
    snippet: Optional[str] = None  # Preview of body
    status: str
    category: Optional[str] = "primary"
    is_read: bool
    is_starred: bool
    is_important: bool
    sender_id: UUID
    sender_name: Optional[str] = None
    sender_email: Optional[str] = None
    folder_id: Optional[UUID] = None
    thread_id: Optional[UUID] = None
    sent_at: Optional[datetime] = None
    scheduled_send_at: Optional[datetime] = None  # When email will actually send (undo send)
    snooze_until: Optional[datetime] = None
    created_at: datetime
    attachment_count: int = 0
    has_attachments: bool = False
    labels: List[LabelBriefResponse] = []
    system_labels: List[SystemLabelResponse] = []  # System labels derived from folder (Inbox, Spam, etc.)
    can_undo_send: bool = False  # True if email is in queued status and can be cancelled


EmailPaginatedResponse = PaginatedListResponse[EmailListResponse]
