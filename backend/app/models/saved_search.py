"""Saved search query model."""

import uuid
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class SavedSearch(Base):
    """Saved search query model."""
    __tablename__ = "saved_searches"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, nullable=False)
    query = Column(String, nullable=False)  # The search query string
    filters = Column(JSON)  # Additional parsed filters as JSON
    
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    use_count = Column(Integer, default=0)  # Track usage for suggestions
    last_used_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationship
    owner = relationship("User", foreign_keys=[owner_id], lazy="joined")
