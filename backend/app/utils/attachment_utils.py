"""Utility functions for attachment operations.

This module provides helper functions for:
- Determining attachment types
- Formatting attachment responses
- Checking email access permissions
"""

from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.attachment import Attachment
from app.models.email import Email
from app.models.email_recipient import EmailRecipient
from app.core.constants import AttachmentType


def get_attachment_type(content_type: str) -> str:
    """Determine attachment type from content type.
    
    Args:
        content_type: MIME content type string
        
    Returns:
        AttachmentType value (image, document, or file)
    """
    if content_type:
        if content_type.startswith("image/"):
            return AttachmentType.IMAGE.value
        elif content_type in [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "text/plain",
            "text/csv",
        ]:
            return AttachmentType.DOCUMENT.value
    return AttachmentType.FILE.value


def format_attachment_response(attachment: Attachment) -> dict:
    """Format attachment model to response dict.
    
    Args:
        attachment: Attachment model instance
        
    Returns:
        Dictionary with attachment data formatted for API response
    """
    return {
        "id": attachment.id,
        "email_id": attachment.email_id,
        "filename": attachment.filename,
        "content_type": attachment.content_type,
        "size_bytes": attachment.size_bytes,
        "attachment_type": attachment.attachment_type,
        "storage_path": attachment.storage_path,
        "is_deleted": attachment.is_deleted,
        "created_at": attachment.created_at,
    }


def check_email_access(db: Session, email_id: UUID, user_id: UUID, user_role: str) -> Email:
    """Check if user has access to email and return it.
    
    Args:
        db: Database session
        email_id: Email ID to check
        user_id: User ID checking access
        user_role: User's role (admin bypasses ownership check)
        
    Returns:
        Email model instance if user has access
        
    Raises:
        HTTPException: If email not found or user doesn't have access
    """
    email = db.query(Email).filter(
        Email.id == email_id,
        Email.is_deleted == False
    ).first()
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    # Check ownership
    is_sender = email.sender_id == user_id
    is_recipient = db.query(EmailRecipient).filter(
        EmailRecipient.email_id == email_id,
        EmailRecipient.recipient_id == user_id
    ).first() is not None
    is_admin = user_role == "admin"
    
    if not (is_sender or is_recipient or is_admin):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    return email
