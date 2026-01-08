"""Association table for thread-label many-to-many relationship.

This is a user-specific association - each user can apply their own labels
to a shared thread independently.
"""

import uuid
from sqlalchemy import Column, DateTime, ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class ThreadLabel(Base):
    """Association table for thread-label many-to-many relationship.
    
    Each record represents a specific user applying a specific label to a thread.
    This allows different users to have different labels on the same shared thread.
    """
    __tablename__ = "thread_labels"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    thread_id = Column(UUID(as_uuid=True), ForeignKey("threads.id", ondelete="CASCADE"), nullable=False, index=True)
    label_id = Column(UUID(as_uuid=True), ForeignKey("labels.id", ondelete="CASCADE"), nullable=False, index=True)
    # User who applied this label - enables user-specific label isolation on shared threads
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    user = relationship("User", lazy="joined")
    
    # Unique constraint: one user can apply a label to a thread only once
    # Composite index for efficient queries by user
    __table_args__ = (
        UniqueConstraint("thread_id", "label_id", "user_id", name="uq_thread_labels_user"),
        Index("ix_thread_labels_composite", "thread_id", "label_id"),
        Index("ix_thread_labels_user", "user_id", "thread_id"),
    )
