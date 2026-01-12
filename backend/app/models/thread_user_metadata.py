"""Association table for thread-user metadata.

This tracks user-specific attributes for threads, such as whether a user
marked a thread as important. This allows different users to have different
metadata on the same shared thread.
"""

import uuid
from sqlalchemy import Column, Boolean, DateTime, ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class ThreadUserMetadata(Base):
    """Association table for tracking user-specific thread metadata.

    Each record represents metadata about a thread for a specific user.
    This allows different users to have different settings on the same shared thread.
    """
    __tablename__ = "thread_user_metadata"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    thread_id = Column(UUID(as_uuid=True), ForeignKey("threads.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # User-specific metadata
    is_important = Column(Boolean, default=False, index=True)
    snooze_until = Column(DateTime, nullable=True, index=True)  # Thread-level snooze
    is_archived = Column(Boolean, default=False, index=True)    # Thread-level archive

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", lazy="joined")
    thread = relationship("Thread", lazy="select")

    # Unique constraint: one metadata record per user per thread
    # Composite indexes for efficient queries
    __table_args__ = (
        UniqueConstraint("thread_id", "user_id", name="uq_thread_user_metadata"),
        Index("ix_thread_user_metadata_user_thread", "user_id", "thread_id"),
        Index("ix_thread_user_metadata_important", "user_id", "is_important"),
        Index("ix_thread_user_metadata_snooze", "user_id", "snooze_until"),
        Index("ix_thread_user_metadata_archived", "user_id", "is_archived"),
    )
