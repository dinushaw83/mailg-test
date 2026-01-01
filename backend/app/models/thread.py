"""Email conversation thread model."""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class Thread(Base):
    """Email conversation thread model with relationships."""
    __tablename__ = "threads"
    
    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    subject = Column(String, nullable=False)  # Original subject
    
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    participant_count = Column(Integer, default=1)
    email_count = Column(Integer, default=0)
    
    last_email_at = Column(DateTime)
    is_deleted = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    owner = relationship("User", foreign_keys=[owner_id], lazy="joined")
    emails = relationship("Email", back_populates="thread", lazy="dynamic",
                         order_by="Email.created_at")
    
    # Composite indexes
    __table_args__ = (
        Index("ix_threads_owner_deleted", "owner_id", "is_deleted"),
        Index("ix_threads_last_email", "last_email_at"),
    )

