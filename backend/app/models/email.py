"""Main email model with relationships for JOIN queries."""

import uuid
from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class Email(Base):
    """Email model with optimized relationships for JOIN queries."""
    __tablename__ = "emails"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    subject = Column(String, nullable=False)
    body = Column(Text)
    html_body = Column(Text)  # HTML version of email
    # Status: draft, queued (pending send), sent, received, archived, cancelled
    status = Column(String, default="draft", index=True)
    is_read = Column(Boolean, default=False, index=True)
    is_starred = Column(Boolean, default=False, index=True)
    
    # Folder type (enum-based): inbox, sent, drafts, trash, spam, starred
    folder = Column(String(20), default="inbox", index=True)
    
    # Undo send functionality
    scheduled_send_at = Column(DateTime(timezone=True), nullable=True, index=True)  # When email will actually be sent

    # Foreign keys
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    thread_id = Column(UUID(as_uuid=True), ForeignKey("threads.id", ondelete="CASCADE"), index=True)
    parent_email_id = Column(UUID(as_uuid=True), ForeignKey("emails.id", ondelete="SET NULL"))  # For replies/forwards
    
    # Timestamps
    sent_at = Column(DateTime(timezone=True))
    received_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships for eager loading (JOIN queries)
    sender = relationship("User", foreign_keys=[sender_id], lazy="joined")
    thread = relationship("Thread", back_populates="emails", lazy="select")
    parent_email = relationship("Email", remote_side=[id], backref="replies", lazy="select")
    
    # One-to-many relationships - use selectinload for collections
    recipients = relationship("EmailRecipient", back_populates="email", lazy="selectin",
                             cascade="all, delete-orphan")
    attachments = relationship("Attachment", back_populates="email", lazy="selectin",
                              cascade="all, delete-orphan")
    # Labels are now linked to threads, not emails directly
    # Access labels via email.thread.labels
    
    # Composite indexes for common query patterns
    __table_args__ = (
        Index("ix_emails_sender_status", "sender_id", "status"),
        Index("ix_emails_thread_created", "thread_id", "created_at"),
        Index("ix_emails_scheduled_send", "scheduled_send_at"),
    )
