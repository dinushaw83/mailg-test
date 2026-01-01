"""Main email model with relationships for JOIN queries."""

from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class Email(Base):
    """Email model with optimized relationships for JOIN queries."""
    __tablename__ = "emails"
    
    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    subject = Column(String, nullable=False)
    body = Column(Text)
    html_body = Column(Text)  # HTML version of email
    status = Column(String, default="draft", index=True)  # draft, sent, received, archived
    is_read = Column(Boolean, default=False, index=True)
    is_starred = Column(Boolean, default=False, index=True)
    is_important = Column(Boolean, default=False)
    
    # Snooze functionality
    snooze_until = Column(DateTime, nullable=True, index=True)  # When email should reappear
    
    # Foreign keys
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    thread_id = Column(Integer, ForeignKey("threads.id"), index=True)
    folder_id = Column(Integer, ForeignKey("folders.id"), index=True)
    parent_email_id = Column(Integer, ForeignKey("emails.id"))  # For replies/forwards
    
    # Timestamps
    sent_at = Column(DateTime)
    received_at = Column(DateTime)
    is_deleted = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships for eager loading (JOIN queries)
    sender = relationship("User", foreign_keys=[sender_id], lazy="joined")
    folder = relationship("Folder", back_populates="emails", lazy="select")
    thread = relationship("Thread", back_populates="emails", lazy="select")
    parent_email = relationship("Email", remote_side=[id], backref="replies", lazy="select")
    
    # One-to-many relationships - use selectinload for collections
    recipients = relationship("EmailRecipient", back_populates="email", lazy="selectin",
                             cascade="all, delete-orphan")
    attachments = relationship("Attachment", back_populates="email", lazy="selectin",
                              cascade="all, delete-orphan")
    labels = relationship("Label", secondary="email_labels", back_populates="emails", lazy="selectin")
    
    # Composite indexes for common query patterns
    __table_args__ = (
        Index("ix_emails_sender_status", "sender_id", "status"),
        Index("ix_emails_folder_is_deleted", "folder_id", "is_deleted"),
        Index("ix_emails_is_deleted_is_read", "is_deleted", "is_read"),
        Index("ix_emails_thread_created", "thread_id", "created_at"),
    )

