"""Saved search query model."""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class SavedSearch(Base):
    """Saved search query model."""
    __tablename__ = "saved_searches"
    
    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    name = Column(String, nullable=False)
    query = Column(String, nullable=False)  # The search query string
    filters = Column(JSON)  # Additional parsed filters as JSON
    
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    use_count = Column(Integer, default=0)  # Track usage for suggestions
    last_used_at = Column(DateTime)
    is_deleted = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationship
    owner = relationship("User", foreign_keys=[owner_id], lazy="joined")
    
    # Indexes
    __table_args__ = (
        Index("ix_saved_searches_owner_deleted", "owner_id", "is_deleted"),
    )

