"""Attachment CRUD endpoints.

This module provides:
- Attachment listing and details
- Attachment metadata creation (mock - no actual file storage)
- Attachment deletion
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID, uuid4
import logging

from app.db.session import get_db
from app.models.attachment import Attachment
from app.models.email import Email
from app.models.email_recipient import EmailRecipient
from app.schemas.attachment import AttachmentCreate, AttachmentResponse, AttachmentListResponse
from app.auth.rbac import authorized
from app.auth.dependencies import auth
from app.core.constants import AttachmentType

logger = logging.getLogger(__name__)
router = APIRouter()


def get_attachment_type(content_type: str) -> str:
    """Determine attachment type from content type."""
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
    """Format attachment model to response dict."""
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
    """Check if user has access to email and return it."""
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


@router.get("/emails/{email_id}/attachments", response_model=List[AttachmentListResponse], dependencies=[Depends(authorized())])
def list_email_attachments(
    email_id: UUID,
    db: Session = Depends(get_db),
) -> List[dict]:
    """List attachments for an email.
    
    Permissions:
    - Users can only access attachments on emails they have access to
    """
    current_user = auth.user
    
    # Verify email access
    check_email_access(db, email_id, current_user.id, current_user.role)
    
    attachments = db.query(Attachment).filter(
        Attachment.email_id == email_id,
        Attachment.is_deleted == False
    ).all()
    
    return [
        {
            "id": a.id,
            "filename": a.filename,
            "content_type": a.content_type,
            "size_bytes": a.size_bytes,
            "attachment_type": a.attachment_type,
        }
        for a in attachments
    ]


@router.post("/emails/{email_id}/attachments", response_model=AttachmentResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(authorized())])
def create_attachment(
    email_id: UUID,
    attachment_data: AttachmentCreate,
    db: Session = Depends(get_db),
) -> dict:
    """Create attachment metadata for an email (mock - no actual file storage).
    
    This endpoint accepts attachment metadata only. In a production system,
    actual file upload would be handled separately via pre-signed URLs or similar.
    
    Permissions:
    - Users can only add attachments to their own draft emails
    """
    current_user = auth.user
    
    email = db.query(Email).filter(
        Email.id == email_id,
        Email.sender_id == current_user.id,
        Email.status == "draft",
        Email.is_deleted == False
    ).first()
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Draft email {email_id} not found"
        )
    
    # Determine attachment type from content_type
    attachment_type = get_attachment_type(attachment_data.content_type)
    
    # Create mock storage path
    storage_path = f"/attachments/{email_id}/{attachment_data.filename}"
    
    attachment = Attachment(
        email_id=email_id,
        filename=attachment_data.filename,
        content_type=attachment_data.content_type,
        size_bytes=attachment_data.size_bytes,
        storage_path=storage_path,
        attachment_type=attachment_type,
    )
    
    try:
        db.add(attachment)
        db.commit()
        db.refresh(attachment)
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Attachment metadata {attachment.id} created for email {email_id} by user {current_user.id}")
    
    return format_attachment_response(attachment)


@router.get("/attachments/{attachment_id}", response_model=AttachmentResponse, dependencies=[Depends(authorized())])
def get_attachment(
    attachment_id: UUID,
    db: Session = Depends(get_db),
) -> dict:
    """Get attachment details.
    
    Permissions:
    - Users can only access attachments on emails they have access to
    """
    current_user = auth.user
    
    attachment = db.query(Attachment).filter(
        Attachment.id == attachment_id,
        Attachment.is_deleted == False
    ).first()
    
    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attachment {attachment_id} not found"
        )
    
    # Verify email access
    check_email_access(db, attachment.email_id, current_user.id, current_user.role)
    
    return format_attachment_response(attachment)


@router.delete("/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(authorized())])
def delete_attachment(
    attachment_id: UUID,
    db: Session = Depends(get_db),
    permanent: bool = Query(False, description="Permanently delete instead of soft delete"),
) -> None:
    """Delete an attachment.
    
    Args:
        permanent: If True, permanently removes from database. If False (default), soft deletes.
    
    Permissions:
    - Users can only delete attachments on their own draft emails
    """
    current_user = auth.user
    
    attachment = db.query(Attachment).filter(
        Attachment.id == attachment_id,
        Attachment.is_deleted == False
    ).first()
    
    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attachment {attachment_id} not found"
        )
    
    # Verify email ownership and draft status
    email = db.query(Email).filter(
        Email.id == attachment.email_id,
        Email.sender_id == current_user.id,
        Email.status == "draft",
        Email.is_deleted == False
    ).first()
    
    if not email and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only delete attachments from your own draft emails"
        )
    
    if permanent:
        # Permanently delete from database
        db.delete(attachment)
    else:
        # Soft delete
        attachment.is_deleted = True
    
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Attachment {attachment.id} {'permanently ' if permanent else ''}deleted by user {current_user.id}")


@router.get("/attachments/{attachment_id}/download", dependencies=[Depends(authorized())])
def download_attachment(
    attachment_id: UUID,
    db: Session = Depends(get_db),
) -> dict:
    """Get download URL for an attachment (mock - returns placeholder info).
    
    In a production system, this would return a pre-signed URL for direct download.
    Since this is a mock system without actual file storage, it returns metadata.
    
    Permissions:
    - Users can only access attachments on emails they have access to
    """
    current_user = auth.user
    
    attachment = db.query(Attachment).filter(
        Attachment.id == attachment_id,
        Attachment.is_deleted == False
    ).first()
    
    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attachment {attachment_id} not found"
        )
    
    # Verify email access
    check_email_access(db, attachment.email_id, current_user.id, current_user.role)
    
    # Return mock download info (in production, this would be a pre-signed URL)
    return {
        "id": attachment.id,
        "filename": attachment.filename,
        "content_type": attachment.content_type,
        "size_bytes": attachment.size_bytes,
        "download_url": f"/mock/download/{attachment.id}/{attachment.filename}",
        "message": "Mock attachment - no actual file content stored"
    }
