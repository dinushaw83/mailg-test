"""User settings CRUD endpoints for Gmail-style settings.

This module provides endpoints for managing user settings
including General and Advanced tabs, plus signatures.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Union
import uuid as uuid_lib
import logging

from app.db.session import get_db
from app.models.user import User
from app.models.general_settings import GeneralSettings, DefaultTextStyle, Signature
from app.models.advanced_settings import AdvancedSettings
from app.models.label import Label
from app.schemas.user_settings import (
    GeneralSettingsResponse,
    GeneralSettingsUpdate,
    AdvancedSettingsResponse,
    AdvancedSettingsUpdate,
    UserSettingsResponse,
    UserSettingsUpdate,
    SignatureCreate,
    SignatureUpdate,
    SignatureResponse,
    DefaultTextStyleResponse,
)
from app.auth.rbac import authorized
from app.auth.dependencies import auth

logger = logging.getLogger(__name__)

router = APIRouter()


# =============================================================================
# Default Settings Builders (no DB persistence)
# =============================================================================

def _build_default_general_settings(user_id: UUID) -> GeneralSettingsResponse:
    """Build default general settings response without DB persistence.
    
    Args:
        user_id: User ID.
        
    Returns:
        GeneralSettingsResponse with default values.
    """
    # Generate deterministic UUIDs based on user_id for consistency
    fake_id = uuid_lib.uuid5(uuid_lib.NAMESPACE_DNS, f"general-{user_id}")
    text_style_id = uuid_lib.uuid5(uuid_lib.NAMESPACE_DNS, f"textstyle-{user_id}")
    
    return GeneralSettingsResponse(
        id=fake_id,
        user_id=user_id,
        default_text_style=DefaultTextStyleResponse(
            id=text_style_id,
            font="Sans Serif",
            size="normal",
            color="#000000",
        ),
        signatures=[],
        # All other fields use schema defaults
    )


def _build_default_advanced_settings(user_id: UUID) -> AdvancedSettingsResponse:
    """Build default advanced settings response without DB persistence.
    
    Args:
        user_id: User ID.
        
    Returns:
        AdvancedSettingsResponse with default values.
    """
    # Generate deterministic UUID based on user_id for consistency
    fake_id = uuid_lib.uuid5(uuid_lib.NAMESPACE_DNS, f"advanced-{user_id}")
    
    return AdvancedSettingsResponse(
        id=fake_id,
        user_id=user_id,
        # All other fields use schema defaults
    )


# =============================================================================
# Read-Only Settings Getters (return defaults if not found)
# =============================================================================

def get_general_settings(user_id: UUID, db: Session) -> Union[GeneralSettings, GeneralSettingsResponse]:
    """Get general settings for a user, returning defaults if not found.
    
    This is a read-only operation that does NOT create database records.
    
    Args:
        user_id: User ID.
        db: Database session.
        
    Returns:
        GeneralSettings instance or GeneralSettingsResponse with defaults.
    """
    settings = db.query(GeneralSettings).filter(GeneralSettings.user_id == user_id).first()
    if settings:
        return settings
    return _build_default_general_settings(user_id)


def get_advanced_settings(user_id: UUID, db: Session) -> Union[AdvancedSettings, AdvancedSettingsResponse]:
    """Get advanced settings for a user, returning defaults if not found.
    
    This is a read-only operation that does NOT create database records.
    
    Args:
        user_id: User ID.
        db: Database session.
        
    Returns:
        AdvancedSettings instance or AdvancedSettingsResponse with defaults.
    """
    settings = db.query(AdvancedSettings).filter(AdvancedSettings.user_id == user_id).first()
    if settings:
        return settings
    return _build_default_advanced_settings(user_id)


def get_user_labels(user_id: UUID, db: Session) -> list:
    """Get all labels for a user.
    
    Args:
        user_id: User ID.
        db: Database session.
        
    Returns:
        List of Label instances.
    """
    return db.query(Label).filter(Label.owner_id == user_id).order_by(Label.name).all()


def get_all_settings(user_id: UUID, db: Session) -> dict:
    """Get all settings for a user, returning defaults if not found.
    
    This is a read-only operation that does NOT create database records.
    
    Args:
        user_id: User ID.
        db: Database session.
        
    Returns:
        Dictionary with general, advanced settings, and labels.
    """
    return {
        "general": get_general_settings(user_id, db),
        "advanced": get_advanced_settings(user_id, db),
        "labels": get_user_labels(user_id, db),
    }


# =============================================================================
# Write Settings Functions (create if needed for updates)
# =============================================================================

def ensure_general_settings(user_id: UUID, db: Session) -> GeneralSettings:
    """Get or create general settings for a user (use only for updates).
    
    This function creates database records if they don't exist.
    Use this only when you need to persist changes.
    
    Args:
        user_id: User ID.
        db: Database session.
        
    Returns:
        GeneralSettings instance.
    """
    settings = db.query(GeneralSettings).filter(GeneralSettings.user_id == user_id).first()
    if not settings:
        settings = GeneralSettings(user_id=user_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
        
        # Create default text style
        text_style = DefaultTextStyle(general_settings_id=settings.id)
        db.add(text_style)
        db.commit()
        db.refresh(settings)
    
    return settings


def ensure_advanced_settings(user_id: UUID, db: Session) -> AdvancedSettings:
    """Get or create advanced settings for a user (use only for updates).
    
    This function creates database records if they don't exist.
    Use this only when you need to persist changes.
    
    Args:
        user_id: User ID.
        db: Database session.
        
    Returns:
        AdvancedSettings instance.
    """
    settings = db.query(AdvancedSettings).filter(AdvancedSettings.user_id == user_id).first()
    if not settings:
        settings = AdvancedSettings(user_id=user_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    
    return settings


def ensure_all_settings(user_id: UUID, db: Session) -> dict:
    """Get or create all settings for a user (use only for updates).
    
    This function creates database records if they don't exist.
    Use this only when you need to persist changes.
    
    Args:
        user_id: User ID.
        db: Database session.
        
    Returns:
        Dictionary with general, advanced settings, and labels.
    """
    return {
        "general": ensure_general_settings(user_id, db),
        "advanced": ensure_advanced_settings(user_id, db),
        "labels": get_user_labels(user_id, db),
    }


def verify_user_access(user_id: UUID, db: Session) -> User:
    """Verify user exists and current user has access.
    
    Args:
        user_id: User ID to access.
        db: Database session.
        
    Returns:
        User instance.
        
    Raises:
        HTTPException: 404 if user not found, 403 if access denied.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {user_id} not found"
        )
    
    current_user = auth.user
    # Users can only access their own settings, admins can access any
    if current_user.role != "admin" and str(current_user.id) != str(user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own settings"
        )
    
    return user


# =============================================================================
# Combined Settings Endpoints
# =============================================================================

@router.get("/users/{user_id}/settings", response_model=UserSettingsResponse, dependencies=[Depends(authorized())])
def get_user_settings_endpoint(
    user_id: UUID,
    db: Session = Depends(get_db),
) -> UserSettingsResponse:
    """Get all settings for a user.
    
    Permissions:
    - user: Can only access their own settings
    - admin: Can access any user's settings
    
    Args:
        user_id: User ID.
        db: Database session.
        
    Returns:
        All user settings (general, advanced).
    """
    verify_user_access(user_id, db)
    settings = get_all_settings(user_id, db)
    
    return UserSettingsResponse(
        general=settings["general"],
        advanced=settings["advanced"],
        labels=settings["labels"],
    )


@router.put("/users/{user_id}/settings", response_model=UserSettingsResponse, dependencies=[Depends(authorized())])
def update_user_settings(
    user_id: UUID,
    settings_data: UserSettingsUpdate,
    db: Session = Depends(get_db),
) -> UserSettingsResponse:
    """Update all settings for a user.
    
    Permissions:
    - user: Can only update their own settings
    - admin: Can update any user's settings
    
    Args:
        user_id: User ID.
        settings_data: Settings data to update.
        db: Database session.
        
    Returns:
        Updated settings.
    """
    verify_user_access(user_id, db)
    settings = ensure_all_settings(user_id, db)
    
    try:
        # Update general settings if provided
        if settings_data.general:
            update_data = settings_data.general.model_dump(exclude_unset=True)
            text_style_data = update_data.pop("default_text_style", None)
            
            for field, value in update_data.items():
                setattr(settings["general"], field, value)
            
            if text_style_data and settings["general"].default_text_style:
                for field, value in text_style_data.items():
                    if value is not None:
                        setattr(settings["general"].default_text_style, field, value)
        
        # Update advanced settings if provided
        if settings_data.advanced:
            update_data = settings_data.advanced.model_dump(exclude_unset=True)
            for field, value in update_data.items():
                setattr(settings["advanced"], field, value)
        
        db.commit()
        db.refresh(settings["general"])
        db.refresh(settings["advanced"])
        
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Settings updated for user {user_id}")
    
    # Refetch labels in case they were modified
    labels = get_user_labels(user_id, db)
    
    return UserSettingsResponse(
        general=settings["general"],
        advanced=settings["advanced"],
        labels=labels,
    )


# =============================================================================
# General Settings Endpoints
# =============================================================================

@router.get("/users/{user_id}/settings/general", response_model=GeneralSettingsResponse, dependencies=[Depends(authorized())])
def get_general_settings_endpoint(
    user_id: UUID,
    db: Session = Depends(get_db),
) -> Union[GeneralSettings, GeneralSettingsResponse]:
    """Get general settings for a user.
    
    Args:
        user_id: User ID.
        db: Database session.
        
    Returns:
        General settings.
    """
    verify_user_access(user_id, db)
    return get_general_settings(user_id, db)


@router.patch("/users/{user_id}/settings/general", response_model=GeneralSettingsResponse, dependencies=[Depends(authorized())])
def update_general_settings(
    user_id: UUID,
    settings_data: GeneralSettingsUpdate,
    db: Session = Depends(get_db),
) -> GeneralSettings:
    """Update general settings for a user.
    
    Args:
        user_id: User ID.
        settings_data: Settings data to update.
        db: Database session.
        
    Returns:
        Updated general settings.
    """
    verify_user_access(user_id, db)
    settings = ensure_general_settings(user_id, db)
    
    try:
        update_data = settings_data.model_dump(exclude_unset=True)
        text_style_data = update_data.pop("default_text_style", None)
        
        for field, value in update_data.items():
            setattr(settings, field, value)
        
        if text_style_data and settings.default_text_style:
            for field, value in text_style_data.items():
                if value is not None:
                    setattr(settings.default_text_style, field, value)
        
        db.commit()
        db.refresh(settings)
        
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"General settings updated for user {user_id}")
    return settings


# =============================================================================
# Advanced Settings Endpoints
# =============================================================================

@router.get("/users/{user_id}/settings/advanced", response_model=AdvancedSettingsResponse, dependencies=[Depends(authorized())])
def get_advanced_settings_endpoint(
    user_id: UUID,
    db: Session = Depends(get_db),
) -> Union[AdvancedSettings, AdvancedSettingsResponse]:
    """Get advanced settings for a user.
    
    Args:
        user_id: User ID.
        db: Database session.
        
    Returns:
        Advanced settings.
    """
    verify_user_access(user_id, db)
    return get_advanced_settings(user_id, db)


@router.patch("/users/{user_id}/settings/advanced", response_model=AdvancedSettingsResponse, dependencies=[Depends(authorized())])
def update_advanced_settings(
    user_id: UUID,
    settings_data: AdvancedSettingsUpdate,
    db: Session = Depends(get_db),
) -> AdvancedSettings:
    """Update advanced settings for a user.
    
    Args:
        user_id: User ID.
        settings_data: Settings data to update.
        db: Database session.
        
    Returns:
        Updated advanced settings.
    """
    verify_user_access(user_id, db)
    settings = ensure_advanced_settings(user_id, db)
    
    try:
        update_data = settings_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(settings, field, value)
        
        db.commit()
        db.refresh(settings)
        
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Advanced settings updated for user {user_id}")
    return settings


# =============================================================================
# Signature Endpoints
# =============================================================================

@router.get("/users/{user_id}/settings/signatures", response_model=list[SignatureResponse], dependencies=[Depends(authorized())])
def list_signatures(
    user_id: UUID,
    db: Session = Depends(get_db),
) -> list[Signature]:
    """List all signatures for a user.
    
    Args:
        user_id: User ID.
        db: Database session.
        
    Returns:
        List of signatures.
    """
    verify_user_access(user_id, db)
    # Check if settings exist in DB - if not, no signatures exist yet
    settings = db.query(GeneralSettings).filter(GeneralSettings.user_id == user_id).first()
    if not settings:
        return []
    return settings.signatures


@router.post("/users/{user_id}/settings/signatures", response_model=SignatureResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(authorized())])
def create_signature(
    user_id: UUID,
    signature_data: SignatureCreate,
    db: Session = Depends(get_db),
) -> Signature:
    """Create a new signature for a user.
    
    Args:
        user_id: User ID.
        signature_data: Signature data.
        db: Database session.
        
    Returns:
        Created signature.
    """
    verify_user_access(user_id, db)
    general_settings = ensure_general_settings(user_id, db)
    
    try:
        # If this is set as default for new, unset others
        if signature_data.is_default_for_new:
            db.query(Signature).filter(
                Signature.general_settings_id == general_settings.id,
                Signature.is_default_for_new == True
            ).update({"is_default_for_new": False})
        
        # If this is set as default for reply, unset others
        if signature_data.is_default_for_reply:
            db.query(Signature).filter(
                Signature.general_settings_id == general_settings.id,
                Signature.is_default_for_reply == True
            ).update({"is_default_for_reply": False})
        
        signature = Signature(
            general_settings_id=general_settings.id,
            **signature_data.model_dump()
        )
        db.add(signature)
        db.commit()
        db.refresh(signature)
        
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Signature {signature.id} created for user {user_id}")
    return signature


@router.get("/users/{user_id}/settings/signatures/{signature_id}", response_model=SignatureResponse, dependencies=[Depends(authorized())])
def get_signature(
    user_id: UUID,
    signature_id: UUID,
    db: Session = Depends(get_db),
) -> Signature:
    """Get a specific signature.
    
    Args:
        user_id: User ID.
        signature_id: Signature ID.
        db: Database session.
        
    Returns:
        Signature.
    """
    verify_user_access(user_id, db)
    # Check if settings exist in DB - if not, signature can't exist
    general_settings = db.query(GeneralSettings).filter(GeneralSettings.user_id == user_id).first()
    
    if not general_settings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Signature {signature_id} not found"
        )
    
    signature = db.query(Signature).filter(
        Signature.id == signature_id,
        Signature.general_settings_id == general_settings.id
    ).first()
    
    if not signature:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Signature {signature_id} not found"
        )
    
    return signature


@router.put("/users/{user_id}/settings/signatures/{signature_id}", response_model=SignatureResponse, dependencies=[Depends(authorized())])
def update_signature(
    user_id: UUID,
    signature_id: UUID,
    signature_data: SignatureUpdate,
    db: Session = Depends(get_db),
) -> Signature:
    """Update a signature.
    
    Args:
        user_id: User ID.
        signature_id: Signature ID.
        signature_data: Signature data to update.
        db: Database session.
        
    Returns:
        Updated signature.
    """
    verify_user_access(user_id, db)
    general_settings = ensure_general_settings(user_id, db)
    
    signature = db.query(Signature).filter(
        Signature.id == signature_id,
        Signature.general_settings_id == general_settings.id
    ).first()
    
    if not signature:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Signature {signature_id} not found"
        )
    
    try:
        update_data = signature_data.model_dump(exclude_unset=True)
        
        # If setting as default for new, unset others
        if update_data.get("is_default_for_new"):
            db.query(Signature).filter(
                Signature.general_settings_id == general_settings.id,
                Signature.id != signature_id,
                Signature.is_default_for_new == True
            ).update({"is_default_for_new": False})
        
        # If setting as default for reply, unset others
        if update_data.get("is_default_for_reply"):
            db.query(Signature).filter(
                Signature.general_settings_id == general_settings.id,
                Signature.id != signature_id,
                Signature.is_default_for_reply == True
            ).update({"is_default_for_reply": False})
        
        for field, value in update_data.items():
            setattr(signature, field, value)
        
        db.commit()
        db.refresh(signature)
        
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Signature {signature_id} updated for user {user_id}")
    return signature


@router.delete("/users/{user_id}/settings/signatures/{signature_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(authorized())])
def delete_signature(
    user_id: UUID,
    signature_id: UUID,
    db: Session = Depends(get_db),
) -> None:
    """Delete a signature.
    
    Args:
        user_id: User ID.
        signature_id: Signature ID.
        db: Database session.
    """
    verify_user_access(user_id, db)
    # For delete, if settings don't exist, signature can't exist
    general_settings = db.query(GeneralSettings).filter(GeneralSettings.user_id == user_id).first()
    
    if not general_settings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Signature {signature_id} not found"
        )
    
    signature = db.query(Signature).filter(
        Signature.id == signature_id,
        Signature.general_settings_id == general_settings.id
    ).first()
    
    if not signature:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Signature {signature_id} not found"
        )
    
    try:
        db.delete(signature)
        db.commit()
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Signature {signature_id} deleted for user {user_id}")
    return None
