"""General settings models for Gmail-style user preferences.

This module contains settings for language, undo send, reply behavior,
text styling, images, grammar/spelling, smart features, and email signatures.
"""

import uuid
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Text,
    ForeignKey,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base


class GeneralSettings(Base):
    """General settings for a user - Gmail General tab equivalent.
    
    Contains all Gmail General tab settings including language, page size,
    undo send, reply behavior, hover actions, text style, images, 
    grammar/spelling, smart features, notifications, and signatures.
    """
    __tablename__ = "general_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    
    # Language and input
    language = Column(String, default="en", nullable=False)  # e.g., "en", "es", "fr"
    input_tools_enabled = Column(Boolean, default=False, nullable=False)
    right_to_left_editing = Column(Boolean, default=False, nullable=False)
    
    # Page size
    max_page_size = Column(Integer, default=50, nullable=False)  # 10, 15, 20, 25, 50, 100
    
    # Undo send
    undo_send_delay_seconds = Column(Integer, default=5, nullable=False)  # 5, 10, 20, 30 seconds
    
    # Reply behavior
    default_reply_behavior = Column(String, default="reply", nullable=False)  # "reply" or "reply_all"
    
    # Hover actions
    hover_actions_enabled = Column(Boolean, default=True, nullable=False)
    
    # Send and archive
    send_and_archive_visible = Column(Boolean, default=False, nullable=False)
    
    # Images
    images_display = Column(String, default="always", nullable=False)  # "always" or "ask"
    
    # Dynamic email
    dynamic_email_enabled = Column(Boolean, default=True, nullable=False)
    
    # Grammar and spelling
    grammar_suggestions_enabled = Column(Boolean, default=True, nullable=False)
    spelling_suggestions_enabled = Column(Boolean, default=True, nullable=False)
    autocorrect_enabled = Column(Boolean, default=True, nullable=False)
    
    # Smart Compose
    smart_compose_enabled = Column(Boolean, default=True, nullable=False)
    smart_compose_personalization_enabled = Column(Boolean, default=True, nullable=False)
    
    # Conversation view
    conversation_view_enabled = Column(Boolean, default=True, nullable=False)
    
    # Nudges
    nudges_suggest_reply_enabled = Column(Boolean, default=True, nullable=False)
    nudges_suggest_followup_enabled = Column(Boolean, default=True, nullable=False)
    
    # Smart Reply
    smart_reply_enabled = Column(Boolean, default=True, nullable=False)
    
    # Smart features
    smart_features_enabled = Column(Boolean, default=True, nullable=False)
    
    # Package tracking
    package_tracking_enabled = Column(Boolean, default=False, nullable=False)
    
    # Desktop notifications: "new_mail", "important_mail", "off"
    desktop_notifications = Column(String, default="off", nullable=False)
    
    # Keyboard shortcuts
    keyboard_shortcuts_enabled = Column(Boolean, default=False, nullable=False)
    
    # Button labels: "icons" or "text"
    button_labels = Column(String, default="icons", nullable=False)
    
    # Auto-create contacts
    auto_create_contacts_enabled = Column(Boolean, default=True, nullable=False)
    
    # Personal level indicators
    personal_level_indicators_enabled = Column(Boolean, default=False, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    default_text_style = relationship("DefaultTextStyle", back_populates="general_settings", uselist=False, cascade="all, delete-orphan")
    signatures = relationship("Signature", back_populates="general_settings", cascade="all, delete-orphan")


class DefaultTextStyle(Base):
    """Default text style settings for composing emails.
    
    Contains font family, size, and color preferences.
    """
    __tablename__ = "default_text_styles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    general_settings_id = Column(UUID(as_uuid=True), ForeignKey("general_settings.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    
    # Text style
    font = Column(String, default="Sans Serif", nullable=False)  # "Sans Serif", "Serif", "Fixed Width", etc.
    size = Column(String, default="normal", nullable=False)  # "small", "normal", "large", "huge"
    color = Column(String, default="#000000", nullable=False)  # Hex color code
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationship
    general_settings = relationship("GeneralSettings", back_populates="default_text_style")


class Signature(Base):
    """Email signature for composing emails.
    
    Users can have multiple signatures and set defaults for
    new emails and replies.
    """
    __tablename__ = "signatures"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    general_settings_id = Column(UUID(as_uuid=True), ForeignKey("general_settings.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Signature content
    name = Column(String, nullable=False)  # Signature name/label
    content = Column(Text, default="", nullable=False)  # HTML content of signature
    
    # Default settings
    is_default_for_new = Column(Boolean, default=False, nullable=False)  # Use for new emails
    is_default_for_reply = Column(Boolean, default=False, nullable=False)  # Use for replies/forwards
    insert_before_quoted = Column(Boolean, default=True, nullable=False)  # Insert before quoted text
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationship
    general_settings = relationship("GeneralSettings", back_populates="signatures")
