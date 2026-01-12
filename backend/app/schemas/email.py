"""Pydantic schemas for Email resource - request/response validation."""

from pydantic import BaseModel, Field, RootModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID

from app.schemas.pagination import PaginatedListResponse
from app.core.constants import EmailCategory, FolderType, EmailStatus


class EmailRecipientSchema(BaseModel):
    """Schema for email recipient."""
    email: str = Field(..., description="Recipient email address")
    name: Optional[str] = Field(None, description="Recipient display name")
    type: str = Field(..., description="Recipient type: to, cc, bcc")


class EmailCreate(BaseModel):
    """Schema for creating a new draft email.
    
    This endpoint only creates drafts. Use POST /emails/{id}/send to send.
    All fields are optional to allow creating empty drafts.
    """
    subject: Optional[str] = Field(default="", max_length=500, description="Email subject")
    body: Optional[str] = Field(None, description="Plain text body")
    html_body: Optional[str] = Field(None, description="HTML body")
    recipients: List[EmailRecipientSchema] = Field(default_factory=list, description="List of recipients")


class EmailUpdate(BaseModel):
    """Schema for updating an email."""
    subject: Optional[str] = Field(default="", max_length=500, description="Email subject")
    body: Optional[str] = Field(None, description="Plain text body")
    html_body: Optional[str] = Field(None, description="HTML body")
    recipients: Optional[List[EmailRecipientSchema]] = Field(default_factory=list, description="List of recipients (only for drafts)")


class EmailReadUpdate(BaseModel):
    """Schema for updating read status."""
    is_read: bool = Field(..., description="Mark as read or unread")


class EmailStarUpdate(BaseModel):
    """Schema for updating starred status."""
    is_starred: bool = Field(..., description="Star or unstar email")


class EmailImportantUpdate(BaseModel):
    """Schema for updating important status."""
    is_important: bool = Field(..., description="Important or un important email")


class EmailMoveRequest(BaseModel):
    """Schema for moving email to folder."""
    folder: str = Field(..., description="Target folder: inbox, sent, drafts, trash, spam, scheduled")


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


class EmailSendRequest(BaseModel):
    """Schema for sending an email with optional scheduling."""
    scheduled_send_at: Optional[datetime] = Field(None, description="Schedule email to be sent at this time")


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
    """Label info for email response."""
    model_config = {"from_attributes": True}
    
    id: UUID
    name: str
    color: Optional[str] = None
    owner_id: UUID
    parent_id: Optional[UUID] = None
    is_system: bool = False
    is_exclusive: bool = False


class EmailResponse(BaseModel):
    """Schema for email response with all fields including metadata."""
    model_config = {"from_attributes": True}
    
    id: UUID
    subject: str
    body: Optional[str] = None
    html_body: Optional[str] = None
    folder: Optional[str] = "inbox"  # Folder type: inbox, sent, drafts, trash, spam, scheduled
    category: Optional[str] = "primary"
    is_read: bool
    is_starred: bool
    is_important: bool  # User-specific, derived from thread metadata
    sender_id: UUID
    sender_name: Optional[str] = None
    sender_email: Optional[str] = None
    recipients: List[EmailRecipientResponse] = []
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
    can_undo_send: bool = False  # True if email is in queued status and can be cancelled


class EmailListResponse(BaseModel):
    """Brief email info for list responses."""
    model_config = {"from_attributes": True}
    
    id: UUID
    subject: str
    snippet: Optional[str] = None  # Preview of body
    folder: Optional[FolderType] = FolderType.INBOX
    category: Optional[EmailCategory] = EmailCategory.PRIMARY
    is_read: bool
    is_starred: bool
    is_important: bool  # User-specific, derived from thread metadata
    sender_id: UUID
    sender_name: Optional[str] = None
    sender_email: Optional[str] = None
    thread_id: Optional[UUID] = None
    thread_email_count: Optional[int] = None  # Number of emails in the thread
    sent_at: Optional[datetime] = None
    scheduled_send_at: Optional[datetime] = None  # When email will actually send (undo send)
    snooze_until: Optional[datetime] = None
    created_at: datetime
    attachment_count: int = 0
    has_attachments: bool = False
    labels: List[LabelBriefResponse] = []
    can_undo_send: bool = False  # True if email is in queued status and can be cancelled


EmailPaginatedResponse = PaginatedListResponse[EmailListResponse]


class EmailCategoryCountsResponse(RootModel[dict[str, int]]):
    """Dynamic email category counts response.

    Returns counts for each category as key-value pairs.
    Automatically adapts to new categories added to the system.

    Example: {"primary": 15, "promotions": 8, "social": 12, "updates": 3, "forums": 0}
    """
    root: dict[str, int]
