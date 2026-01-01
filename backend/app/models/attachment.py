"""Email attachment model."""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class Attachment(Base):
    """Email attachment model with relationships."""
    __tablename__ = "attachments"
    
    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    email_id = Column(Integer, ForeignKey("emails.id", ondelete="CASCADE"), nullable=False, index=True)
    
    filename = Column(String, nullable=False)
    content_type = Column(String)  # MIME type
    size_bytes = Column(Integer)
    storage_path = Column(String)  # Path in storage system
    attachment_type = Column(String, default="file")  # file, image, document
    
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    email = relationship("Email", back_populates="attachments")
    
    # Index for filtering attachments by type
    __table_args__ = (
        Index("ix_attachments_email_deleted", "email_id", "is_deleted"),
        Index("ix_attachments_type", "attachment_type"),
    )

