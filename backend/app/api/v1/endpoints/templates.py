"""Email Templates CRUD and operations endpoints.

This module provides:
- Full CRUD operations for email templates
- Template application to create emails
- Template duplication
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
from uuid import UUID
import logging

from app.db.session import get_db
from app.models.email_template import EmailTemplate
from app.models.email import Email
from app.models.email_recipient import EmailRecipient
from app.models.folder import Folder
from app.models.user import User
from app.schemas.email_template import (
    EmailTemplateCreate, EmailTemplateUpdate, EmailTemplateResponse,
    EmailTemplateListResponse, EmailTemplateApplyRequest
)
from app.schemas.email import EmailResponse
from app.schemas.pagination import PaginatedListResponse
from app.auth.rbac import authorized
from app.auth.dependencies import auth
from app.core.constants import FolderType, EmailStatus

logger = logging.getLogger(__name__)
router = APIRouter()


def format_template_response(template: EmailTemplate) -> dict:
    """Format template model to response dict."""
    return {
        "id": template.id,
        "name": template.name,
        "description": template.description,
        "subject": template.subject,
        "body": template.body,
        "html_body": template.html_body,
        "is_shared": template.is_shared,
        "owner_id": template.owner_id,
        "owner_name": template.owner.name if template.owner else None,
        "owner_email": template.owner.email if template.owner else None,
        "created_at": template.created_at,
        "updated_at": template.updated_at,
    }


def format_template_list_response(template: EmailTemplate) -> dict:
    """Format template model for list responses."""
    return {
        "id": template.id,
        "name": template.name,
        "description": template.description,
        "subject": template.subject,
        "is_shared": template.is_shared,
        "owner_id": template.owner_id,
        "owner_name": template.owner.name if template.owner else None,
        "created_at": template.created_at,
        "updated_at": template.updated_at,
    }


def get_user_folder(db: Session, user_id: UUID, folder_type: str) -> Optional[Folder]:
    """Get user's folder by type."""
    return db.query(Folder).filter(
        Folder.owner_id == user_id,
        Folder.folder_type == folder_type,
        Folder.is_deleted == False
    ).first()


@router.post("/templates", response_model=EmailTemplateResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(authorized())])
def create_template(
    template_data: EmailTemplateCreate,
    db: Session = Depends(get_db),
) -> dict:
    """Create a new email template.
    
    Permissions:
    - All authenticated users can create templates
    """
    current_user = auth.user
    
    template = EmailTemplate(
        name=template_data.name,
        description=template_data.description,
        subject=template_data.subject,
        body=template_data.body,
        html_body=template_data.html_body,
        is_shared=template_data.is_shared,
        owner_id=current_user.id,
    )
    
    try:
        db.add(template)
        db.commit()
        db.refresh(template)
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Template {template.id} created by user {current_user.id}")
    
    return format_template_response(template)


@router.get("/templates", response_model=PaginatedListResponse[EmailTemplateListResponse], dependencies=[Depends(authorized())])
def list_templates(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    include_shared: bool = Query(True, description="Include shared templates from others"),
    search: Optional[str] = Query(None, description="Search in name and description"),
) -> dict:
    """List email templates with pagination and filtering.
    
    Returns user's own templates and optionally shared templates from others.
    
    Permissions:
    - Users can see their own templates and shared templates
    """
    current_user = auth.user
    
    # Base query - user's own templates or shared templates
    if include_shared:
        query = db.query(EmailTemplate).filter(
            EmailTemplate.is_deleted == False,
            or_(
                EmailTemplate.owner_id == current_user.id,
                EmailTemplate.is_shared == True
            )
        )
    else:
        query = db.query(EmailTemplate).filter(
            EmailTemplate.owner_id == current_user.id,
            EmailTemplate.is_deleted == False
        )
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                EmailTemplate.name.ilike(search_term),
                EmailTemplate.description.ilike(search_term),
                EmailTemplate.subject.ilike(search_term)
            )
        )
    
    # Get total count
    total = query.count()
    
    # Calculate pagination
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    offset = (page - 1) * page_size
    
    # Get results ordered by most recently updated
    templates = query.order_by(EmailTemplate.updated_at.desc()).offset(offset).limit(page_size).all()
    
    # Format response
    templates_data = [format_template_list_response(t) for t in templates]
    
    return PaginatedListResponse[EmailTemplateListResponse](
        results=templates_data,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/templates/{template_id}", response_model=EmailTemplateResponse, dependencies=[Depends(authorized())])
def get_template(
    template_id: UUID,
    db: Session = Depends(get_db),
) -> dict:
    """Get a specific template by ID.
    
    Permissions:
    - Users can access their own templates and shared templates
    """
    current_user = auth.user
    
    template = db.query(EmailTemplate).filter(
        EmailTemplate.id == template_id,
        EmailTemplate.is_deleted == False
    ).first()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template {template_id} not found"
        )
    
    # Check access
    is_owner = template.owner_id == current_user.id
    is_shared = template.is_shared
    is_admin = current_user.role == "admin"
    
    if not (is_owner or is_shared or is_admin):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template {template_id} not found"
        )
    
    return format_template_response(template)


@router.put("/templates/{template_id}", response_model=EmailTemplateResponse, dependencies=[Depends(authorized())])
def update_template(
    template_id: UUID,
    template_data: EmailTemplateUpdate,
    db: Session = Depends(get_db),
) -> dict:
    """Update an email template.
    
    Permissions:
    - Users can only update their own templates
    - Admins can update any template
    """
    current_user = auth.user
    
    template = db.query(EmailTemplate).filter(
        EmailTemplate.id == template_id,
        EmailTemplate.is_deleted == False
    ).first()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template {template_id} not found"
        )
    
    # Check ownership
    if template.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this template"
        )
    
    # Apply updates
    update_data = template_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(template, field, value)
    
    try:
        db.commit()
        db.refresh(template)
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Template {template.id} updated by user {current_user.id}")
    
    return format_template_response(template)


@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(authorized())])
def delete_template(
    template_id: UUID,
    db: Session = Depends(get_db),
    permanent: bool = Query(False, description="Permanently delete instead of soft delete"),
) -> None:
    """Delete an email template.
    
    Args:
        permanent: If True, permanently removes from database. If False (default), soft deletes.
    
    Permissions:
    - Users can only delete their own templates
    - Admins can delete any template
    """
    current_user = auth.user
    
    template = db.query(EmailTemplate).filter(
        EmailTemplate.id == template_id,
        EmailTemplate.is_deleted == False
    ).first()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template {template_id} not found"
        )
    
    # Check ownership
    if template.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this template"
        )
    
    if permanent:
        # Permanently delete from database
        db.delete(template)
    else:
        # Soft delete
        template.is_deleted = True
    
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Template {template.id} {'permanently ' if permanent else ''}deleted by user {current_user.id}")


@router.post("/templates/{template_id}/apply", response_model=EmailResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(authorized())])
def apply_template(
    template_id: UUID,
    apply_data: EmailTemplateApplyRequest,
    db: Session = Depends(get_db),
) -> dict:
    """Apply a template to create a new email draft.
    
    Creates a new email draft using the template content.
    Increments the template's usage count.
    
    Permissions:
    - Users can apply their own templates and shared templates
    """
    current_user = auth.user
    
    template = db.query(EmailTemplate).filter(
        EmailTemplate.id == template_id,
        EmailTemplate.is_deleted == False
    ).first()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template {template_id} not found"
        )
    
    # Check access
    is_owner = template.owner_id == current_user.id
    is_shared = template.is_shared
    
    if not (is_owner or is_shared):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template {template_id} not found"
        )
    
    # Get drafts folder
    drafts_folder = get_user_folder(db, current_user.id, FolderType.DRAFTS.value)
    
    # Create email body with optional additional content
    body = template.body or ""
    html_body = template.html_body
    
    if apply_data.additional_body:
        body = body + "\n\n" + apply_data.additional_body if body else apply_data.additional_body
        if html_body:
            html_body = html_body + "<br><br>" + apply_data.additional_body
    
    # Create draft email from template
    email = Email(
        subject=template.subject or "",
        body=body,
        html_body=html_body,
        status=EmailStatus.DRAFT.value,
        sender_id=current_user.id,
        folder_id=drafts_folder.id if drafts_folder else None,
        is_read=True,
    )
    
    try:
        db.add(email)
        db.flush()
        
        # Add recipients if provided
        if apply_data.recipients:
            for recipient in apply_data.recipients:
                # Try to find user by email
                recipient_email = recipient.get("email", "")
                recipient_name = recipient.get("name")
                recipient_type = recipient.get("type", "to")
                
                recipient_user = db.query(User).filter(
                    User.email == recipient_email,
                    User.is_deleted == False
                ).first()
                
                email_recipient = EmailRecipient(
                    email_id=email.id,
                    recipient_id=recipient_user.id if recipient_user else None,
                    recipient_email=recipient_email,
                    recipient_name=recipient_name or (recipient_user.name if recipient_user else None),
                    recipient_type=recipient_type,
                )
                db.add(email_recipient)
        
        db.commit()
        db.refresh(email)
        
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Template {template.id} applied to create email {email.id} by user {current_user.id}")
    
    # Format email response
    recipients = []
    for r in email.recipients:
        recipients.append({
            "id": r.id,
            "email": r.recipient_email,
            "name": r.recipient_name,
            "type": r.recipient_type,
        })
    
    return {
        "id": email.id,
        "subject": email.subject,
        "body": email.body,
        "html_body": email.html_body,
        "status": email.status,
        "is_read": email.is_read,
        "is_starred": email.is_starred,
        "is_important": email.is_important,
        "sender_id": email.sender_id,
        "sender_name": email.sender.name if email.sender else None,
        "sender_email": email.sender.email if email.sender else None,
        "recipients": recipients,
        "folder_id": email.folder_id,
        "folder_name": email.folder.name if email.folder else None,
        "thread_id": email.thread_id,
        "parent_email_id": email.parent_email_id,
        "sent_at": email.sent_at,
        "received_at": email.received_at,
        "snooze_until": email.snooze_until,
        "created_at": email.created_at,
        "updated_at": email.updated_at,
        "attachment_count": 0,
        "attachments": [],
        "labels": [],
    }
