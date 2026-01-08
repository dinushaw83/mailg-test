"""User-defined label model with hierarchical (nested) support."""

import uuid
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class Label(Base):
    """User-defined label model with hierarchical relationships.
    
    Labels can be nested, creating a tree structure where each label
    can have a parent and multiple children.
    """
    __tablename__ = "labels"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, nullable=False)
    color = Column(String)  # Hex color
    
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Hierarchical relationship - self-referential
    parent_id = Column(UUID(as_uuid=True), ForeignKey("labels.id"), nullable=True, index=True)
    
    is_deleted = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    owner = relationship("User", foreign_keys=[owner_id], lazy="joined")
    threads = relationship("Thread", secondary="thread_labels", back_populates="labels", lazy="dynamic")
    
    # Self-referential relationships for hierarchy
    parent = relationship(
        "Label",
        remote_side=[id],
        foreign_keys=[parent_id],
        backref="children",
        lazy="joined"
    )
    
    # Unique constraint: label name per user within same parent
    __table_args__ = (
        UniqueConstraint("owner_id", "parent_id", "name", name="uq_labels_owner_parent_name"),
        Index("ix_labels_owner_deleted", "owner_id", "is_deleted"),
        Index("ix_labels_parent", "parent_id"),
    )
