"""Email folder model."""

import uuid
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class Folder(Base):
    """Email folder model with relationships for JOIN queries."""
    __tablename__ = "folders"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, nullable=False)
    folder_type = Column(String, default="custom", index=True)  # inbox, sent, drafts, trash, spam, starred, custom
    color = Column(String)  # Hex color for UI
    icon = Column(String)  # Icon name for UI
    
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    parent_folder_id = Column(UUID(as_uuid=True), ForeignKey("folders.id"))  # For nested folders
    
    is_system = Column(Boolean, default=False)  # System folders cannot be deleted
    is_deleted = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships for JOIN queries
    owner = relationship("User", foreign_keys=[owner_id], lazy="joined")
    parent_folder = relationship("Folder", remote_side=[id], backref="subfolders", lazy="select")
    emails = relationship("Email", back_populates="folder", lazy="dynamic")  # Use dynamic for large collections
    
    # Composite indexes
    __table_args__ = (
        Index("ix_folders_owner_type", "owner_id", "folder_type"),
        Index("ix_folders_owner_deleted", "owner_id", "is_deleted"),
    )
