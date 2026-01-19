"""Pydantic schemas for Gmail-style user settings.

This module provides schemas for General and Advanced settings
along with nested schemas for text styles, signatures, and labels.
"""

from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional, List
from datetime import datetime
from uuid import UUID

from app.schemas.label import LabelListResponse


# =============================================================================
# Default Text Style Schemas
# =============================================================================

class DefaultTextStyleBase(BaseModel):
    """Base schema for default text style settings."""
    font: str = "Sans Serif"
    size: str = "normal"  # "small", "normal", "large", "huge"
    color: str = "#000000"


class DefaultTextStyleCreate(DefaultTextStyleBase):
    """Schema for creating default text style."""
    pass


class DefaultTextStyleUpdate(BaseModel):
    """Schema for updating default text style (partial)."""
    font: Optional[str] = None
    size: Optional[str] = None
    color: Optional[str] = None


class DefaultTextStyleResponse(DefaultTextStyleBase):
    """Response schema for default text style."""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# =============================================================================
# Signature Schemas
# =============================================================================

class SignatureBase(BaseModel):
    """Base schema for email signatures."""
    name: str
    content: str = ""
    is_default_for_new: bool = False
    is_default_for_reply: bool = False
    insert_before_quoted: bool = True


class SignatureCreate(SignatureBase):
    """Schema for creating a signature."""
    pass


class SignatureUpdate(BaseModel):
    """Schema for updating a signature (partial)."""
    name: Optional[str] = None
    content: Optional[str] = None
    is_default_for_new: Optional[bool] = None
    is_default_for_reply: Optional[bool] = None
    insert_before_quoted: Optional[bool] = None


class SignatureResponse(SignatureBase):
    """Response schema for a signature."""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# =============================================================================
# General Settings Schemas
# =============================================================================

class GeneralSettingsBase(BaseModel):
    """Base schema for general settings."""
    # Language and input
    language: str = "en"
    input_tools_enabled: bool = False
    right_to_left_editing: bool = False
    
    # Page size
    max_page_size: int = 50
    
    # Undo send
    undo_send_delay_seconds: int = 5
    
    # Reply behavior
    default_reply_behavior: str = "reply"
    
    # Hover actions
    hover_actions_enabled: bool = True
    
    # Send and archive
    send_and_archive_visible: bool = False
    
    # Images
    images_display: str = "always"
    
    # Dynamic email
    dynamic_email_enabled: bool = True
    
    # Grammar and spelling
    grammar_suggestions_enabled: bool = True
    spelling_suggestions_enabled: bool = True
    autocorrect_enabled: bool = True
    
    # Smart Compose
    smart_compose_enabled: bool = True
    smart_compose_personalization_enabled: bool = True
    
    # Conversation view
    conversation_view_enabled: bool = True
    
    # Nudges
    nudges_suggest_reply_enabled: bool = True
    nudges_suggest_followup_enabled: bool = True
    
    # Smart Reply
    smart_reply_enabled: bool = True
    
    # Smart features
    smart_features_enabled: bool = True
    
    # Package tracking
    package_tracking_enabled: bool = False
    
    # Desktop notifications
    desktop_notifications: str = "off"
    
    # Keyboard shortcuts
    keyboard_shortcuts_enabled: bool = False
    
    # Button labels
    button_labels: str = "icons"
    
    # Auto-create contacts
    auto_create_contacts_enabled: bool = True
    
    # Personal level indicators
    personal_level_indicators_enabled: bool = False

    @field_validator('max_page_size')
    @classmethod
    def validate_max_page_size(cls, v: int) -> int:
        """Validate max page size is one of allowed values."""
        allowed = [10, 15, 20, 25, 50, 100]
        if v not in allowed:
            raise ValueError(f"max_page_size must be one of: {allowed}")
        return v

    @field_validator('undo_send_delay_seconds')
    @classmethod
    def validate_undo_send_delay(cls, v: int) -> int:
        """Validate undo send delay is one of allowed values."""
        allowed = [5, 10, 20, 30]
        if v not in allowed:
            raise ValueError(f"undo_send_delay_seconds must be one of: {allowed}")
        return v

    @field_validator('default_reply_behavior')
    @classmethod
    def validate_reply_behavior(cls, v: str) -> str:
        """Validate reply behavior."""
        allowed = ["reply", "reply_all"]
        if v not in allowed:
            raise ValueError(f"default_reply_behavior must be one of: {allowed}")
        return v

    @field_validator('images_display')
    @classmethod
    def validate_images_display(cls, v: str) -> str:
        """Validate images display setting."""
        allowed = ["always", "ask"]
        if v not in allowed:
            raise ValueError(f"images_display must be one of: {allowed}")
        return v

    @field_validator('desktop_notifications')
    @classmethod
    def validate_desktop_notifications(cls, v: str) -> str:
        """Validate desktop notifications setting."""
        allowed = ["new_mail", "important_mail", "off"]
        if v not in allowed:
            raise ValueError(f"desktop_notifications must be one of: {allowed}")
        return v

    @field_validator('button_labels')
    @classmethod
    def validate_button_labels(cls, v: str) -> str:
        """Validate button labels setting."""
        allowed = ["icons", "text"]
        if v not in allowed:
            raise ValueError(f"button_labels must be one of: {allowed}")
        return v


class GeneralSettingsCreate(GeneralSettingsBase):
    """Schema for creating general settings."""
    pass


class GeneralSettingsUpdate(BaseModel):
    """Schema for updating general settings (partial)."""
    language: Optional[str] = None
    input_tools_enabled: Optional[bool] = None
    right_to_left_editing: Optional[bool] = None
    max_page_size: Optional[int] = None
    undo_send_delay_seconds: Optional[int] = None
    default_reply_behavior: Optional[str] = None
    hover_actions_enabled: Optional[bool] = None
    send_and_archive_visible: Optional[bool] = None
    images_display: Optional[str] = None
    dynamic_email_enabled: Optional[bool] = None
    grammar_suggestions_enabled: Optional[bool] = None
    spelling_suggestions_enabled: Optional[bool] = None
    autocorrect_enabled: Optional[bool] = None
    smart_compose_enabled: Optional[bool] = None
    smart_compose_personalization_enabled: Optional[bool] = None
    conversation_view_enabled: Optional[bool] = None
    nudges_suggest_reply_enabled: Optional[bool] = None
    nudges_suggest_followup_enabled: Optional[bool] = None
    smart_reply_enabled: Optional[bool] = None
    smart_features_enabled: Optional[bool] = None
    package_tracking_enabled: Optional[bool] = None
    desktop_notifications: Optional[str] = None
    keyboard_shortcuts_enabled: Optional[bool] = None
    button_labels: Optional[str] = None
    auto_create_contacts_enabled: Optional[bool] = None
    personal_level_indicators_enabled: Optional[bool] = None
    default_text_style: Optional[DefaultTextStyleUpdate] = None

    @field_validator('max_page_size')
    @classmethod
    def validate_max_page_size(cls, v: Optional[int]) -> Optional[int]:
        """Validate max page size if provided."""
        if v is not None:
            allowed = [10, 15, 20, 25, 50, 100]
            if v not in allowed:
                raise ValueError(f"max_page_size must be one of: {allowed}")
        return v

    @field_validator('undo_send_delay_seconds')
    @classmethod
    def validate_undo_send_delay(cls, v: Optional[int]) -> Optional[int]:
        """Validate undo send delay if provided."""
        if v is not None:
            allowed = [5, 10, 20, 30]
            if v not in allowed:
                raise ValueError(f"undo_send_delay_seconds must be one of: {allowed}")
        return v

    @field_validator('default_reply_behavior')
    @classmethod
    def validate_reply_behavior(cls, v: Optional[str]) -> Optional[str]:
        """Validate reply behavior if provided."""
        if v is not None:
            allowed = ["reply", "reply_all"]
            if v not in allowed:
                raise ValueError(f"default_reply_behavior must be one of: {allowed}")
        return v

    @field_validator('images_display')
    @classmethod
    def validate_images_display(cls, v: Optional[str]) -> Optional[str]:
        """Validate images display setting if provided."""
        if v is not None:
            allowed = ["always", "ask"]
            if v not in allowed:
                raise ValueError(f"images_display must be one of: {allowed}")
        return v

    @field_validator('desktop_notifications')
    @classmethod
    def validate_desktop_notifications(cls, v: Optional[str]) -> Optional[str]:
        """Validate desktop notifications if provided."""
        if v is not None:
            allowed = ["new_mail", "important_mail", "off"]
            if v not in allowed:
                raise ValueError(f"desktop_notifications must be one of: {allowed}")
        return v

    @field_validator('button_labels')
    @classmethod
    def validate_button_labels(cls, v: Optional[str]) -> Optional[str]:
        """Validate button labels if provided."""
        if v is not None:
            allowed = ["icons", "text"]
            if v not in allowed:
                raise ValueError(f"button_labels must be one of: {allowed}")
        return v


class GeneralSettingsResponse(GeneralSettingsBase):
    """Response schema for general settings."""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    user_id: UUID
    default_text_style: Optional[DefaultTextStyleResponse] = None
    signatures: List[SignatureResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# =============================================================================
# Advanced Settings Schemas
# =============================================================================

class AdvancedSettingsBase(BaseModel):
    """Base schema for advanced settings."""
    auto_advance_enabled: bool = False
    templates_enabled: bool = True
    custom_keyboard_shortcuts_enabled: bool = False
    unread_message_icon_enabled: bool = True


class AdvancedSettingsCreate(AdvancedSettingsBase):
    """Schema for creating advanced settings."""
    pass


class AdvancedSettingsUpdate(BaseModel):
    """Schema for updating advanced settings (partial)."""
    auto_advance_enabled: Optional[bool] = None
    templates_enabled: Optional[bool] = None
    custom_keyboard_shortcuts_enabled: Optional[bool] = None
    unread_message_icon_enabled: Optional[bool] = None


class AdvancedSettingsResponse(AdvancedSettingsBase):
    """Response schema for advanced settings."""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    user_id: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# =============================================================================
# Combined Settings Schemas
# =============================================================================

class UserSettingsResponse(BaseModel):
    """Combined response for all user settings."""
    general: GeneralSettingsResponse
    advanced: AdvancedSettingsResponse
    labels: List[LabelListResponse] = []


class UserSettingsUpdate(BaseModel):
    """Combined update schema for all user settings."""
    general: Optional[GeneralSettingsUpdate] = None
    advanced: Optional[AdvancedSettingsUpdate] = None


# =============================================================================
# User with Settings Response
# =============================================================================

class UserWithSettingsResponse(BaseModel):
    """User response including all settings - used in auth responses."""
    model_config = ConfigDict(from_attributes=True)
    
    # User fields
    id: UUID
    first_name: str
    last_name: str
    email: str
    email_label: Optional[str] = "Home"
    role: str
    photo: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    phone: Optional[str] = None
    phone_country_code: Optional[str] = "+1"
    phone_label: Optional[str] = "Mobile"
    address: Optional[str] = None
    birthday_month: Optional[int] = None
    birthday_day: Optional[int] = None
    birthday_year: Optional[int] = None
    significant_dates: Optional[List[dict]] = None
    website: Optional[str] = None
    related_persons: Optional[List[dict]] = None
    labels: Optional[List[str]] = None
    custom_fields: Optional[List[dict]] = None
    notes: Optional[str] = None
    active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    # Settings
    settings: UserSettingsResponse
