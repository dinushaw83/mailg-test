"""Generic Item model - example CRUD resource for the mailg."""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    Text,
    DateTime,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class Item(Base):
    """Generic Item model demonstrating CRUD patterns.
    
    This is a reference implementation showing:
    - Common field types (String, Text, Boolean, DateTime)
    - User relationships (created_by, updated_by)
    - Soft delete pattern
    - Indexing strategy
    - Timestamps
    
    Extend this model for your domain-specific resources.
    """
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    
    # Core fields
    name = Column(String, nullable=False)
    description = Column(Text)
    status = Column(String, default="active", index=True)  # active, inactive, archived
    priority = Column(String, default="medium")  # low, medium, high
    
    # Ownership and tracking
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    updated_by_id = Column(Integer, ForeignKey("users.id"),index=True)
    
    # Flags
    is_public = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False, index=True)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        # Common filter patterns: is_deleted with status and created_by
        Index("ix_items_is_deleted_status", "is_deleted", "status"),
        Index("ix_items_is_deleted_created_by", "is_deleted", "created_by_id"),
    )
    
    # Relationships
    created_by = relationship("User", foreign_keys=[created_by_id])
    updated_by = relationship("User", foreign_keys=[updated_by_id])

