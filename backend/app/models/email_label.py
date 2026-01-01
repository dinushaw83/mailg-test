"""Association table for email-label many-to-many relationship."""

from sqlalchemy import Column, Integer, DateTime, ForeignKey, Index, UniqueConstraint
from sqlalchemy.sql import func
from app.db.base import Base


class EmailLabel(Base):
    """Association table for email-label many-to-many relationship."""
    __tablename__ = "email_labels"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    email_id = Column(Integer, ForeignKey("emails.id", ondelete="CASCADE"), nullable=False, index=True)
    label_id = Column(Integer, ForeignKey("labels.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.now())
    
    # Unique constraint and composite index
    __table_args__ = (
        UniqueConstraint("email_id", "label_id", name="uq_email_labels"),
        Index("ix_email_labels_composite", "email_id", "label_id"),
    )

