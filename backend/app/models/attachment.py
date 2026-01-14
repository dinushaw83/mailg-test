"""Email attachment model."""

import uuid
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class Attachment(Base):
    """Email attachment model with relationships."""
    __tablename__ = "attachments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    email_id = Column(UUID(as_uuid=True), ForeignKey("emails.id", ondelete="CASCADE"), nullable=False, index=True)
    
    filename = Column(String, nullable=False)
    content_type = Column(String)  # MIME type
    size_bytes = Column(Integer)
    storage_path = Column(String)  # Path in storage system
    attachment_type = Column(String, default="file")  # file, image, document
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    email = relationship("Email", back_populates="attachments")
    
    # Index for filtering attachments by type
    __table_args__ = (
        Index("ix_attachments_type", "attachment_type"),
    )
