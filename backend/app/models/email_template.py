"""Email template model for reusable email content."""

import uuid
from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class EmailTemplate(Base):
    """Email template model for storing reusable email drafts.
    
    Templates allow users to save frequently used email content
    that can be quickly applied when composing new emails.
    """
    __tablename__ = "email_templates"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), nullable=False)  # Template name for identification
    description = Column(String(500))  # Optional description of template purpose
    
    # Template content
    subject = Column(String(500))  # Email subject template
    body = Column(Text)  # Plain text body template
    html_body = Column(Text)  # HTML body template
    
    # Template metadata
    is_shared = Column(Boolean, default=False)  # Whether template is shared with team
    
    # Ownership
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Soft delete and timestamps
    is_deleted = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    owner = relationship("User", foreign_keys=[owner_id], lazy="joined")
    
    # Indexes for common queries
    __table_args__ = (
        Index("ix_email_templates_owner_deleted", "owner_id", "is_deleted"),
        Index("ix_email_templates_shared", "is_shared"),
    )
