"""Email recipient model for to/cc/bcc handling."""

import uuid
from sqlalchemy import Column, Integer, String, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base


class EmailRecipient(Base):
    """Email recipient model for to/cc/bcc handling."""
    __tablename__ = "email_recipients"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email_id = Column(UUID(as_uuid=True), ForeignKey("emails.id", ondelete="CASCADE"), nullable=False, index=True)
    recipient_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True)
    recipient_email = Column(String, nullable=False)
    recipient_name = Column(String)
    recipient_type = Column(String, nullable=False)  # to, cc, bcc
    
    # Relationships for JOIN queries
    email = relationship("Email", back_populates="recipients")
    recipient_user = relationship("User", foreign_keys=[recipient_id], lazy="joined")
    
    # Indexes for query optimization
    __table_args__ = (
        Index("ix_email_recipients_email_type", "email_id", "recipient_type"),
        Index("ix_email_recipients_recipient", "recipient_id", "email_id"),
    )
