"""Advanced settings model for Gmail-style advanced preferences.

This module contains settings for auto-advance, templates,
keyboard shortcuts, and unread message icon.
"""

import uuid
from sqlalchemy import (
    Column,
    Boolean,
    DateTime,
    ForeignKey,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base import Base


class AdvancedSettings(Base):
    """Advanced settings for a user - Gmail Advanced tab equivalent.
    
    Contains feature toggles for auto-advance, templates,
    custom keyboard shortcuts, and unread message icon.
    """
    __tablename__ = "advanced_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    
    # Auto-advance - show next conversation after delete/archive/mute
    auto_advance_enabled = Column(Boolean, default=False, nullable=False)
    
    # Templates (canned responses)
    templates_enabled = Column(Boolean, default=True, nullable=False)
    
    # Custom keyboard shortcuts
    custom_keyboard_shortcuts_enabled = Column(Boolean, default=False, nullable=False)
    
    # Unread message icon and badge in browser tab
    unread_message_icon_enabled = Column(Boolean, default=True, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
