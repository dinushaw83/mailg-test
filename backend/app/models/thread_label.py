"""Association table for thread-label many-to-many relationship."""

import uuid
from sqlalchemy import Column, DateTime, ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base import Base


class ThreadLabel(Base):
    """Association table for thread-label many-to-many relationship."""
    __tablename__ = "thread_labels"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    thread_id = Column(UUID(as_uuid=True), ForeignKey("threads.id", ondelete="CASCADE"), nullable=False, index=True)
    label_id = Column(UUID(as_uuid=True), ForeignKey("labels.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.now())
    
    # Unique constraint and composite index
    __table_args__ = (
        UniqueConstraint("thread_id", "label_id", name="uq_thread_labels"),
        Index("ix_thread_labels_composite", "thread_id", "label_id"),
    )
