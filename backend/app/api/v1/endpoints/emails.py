"""Email CRUD and operations endpoints.

This module provides:
- Full CRUD operations for emails
- Send, reply, forward operations
- Read/star/move actions
- Label management for emails
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import func, or_, and_
from typing import Optional
from datetime import datetime
from uuid import UUID
import logging

from app.db.session import get_db
from app.models.email import Email
from app.models.email_recipient import EmailRecipient
from app.models.label import Label
from app.models.email_label import EmailLabel
from app.models.attachment import Attachment
from app.models.thread import Thread
from app.models.user import User
from app.schemas.email import (
    EmailCreate, EmailUpdate, EmailResponse, EmailListResponse,
    EmailReadUpdate, EmailStarUpdate, EmailMoveRequest, EmailLabelRequest,
    EmailReplyRequest, EmailForwardRequest, EmailRecipientResponse,
    AttachmentBriefResponse, LabelBriefResponse, EmailSnoozeRequest,
    EmailCategoryUpdate, EmailCategoryCountsResponse
)
from app.schemas.pagination import PaginatedListResponse
from app.auth.rbac import authorized
from app.auth.dependencies import auth
from app.core.constants import (
    VALID_EMAIL_STATUSES, VALID_RECIPIENT_TYPES, VALID_EMAIL_CATEGORIES,
    VALID_FOLDER_TYPES, EmailStatus, FolderType, EmailCategory
)

logger = logging.getLogger(__name__)
router = APIRouter()


def get_snippet(body: Optional[str], max_length: int = 200) -> str:
    """Extract snippet from email body."""
    if not body:
        return ""
    # Strip HTML if present (basic)
    text = body.replace("<br>", " ").replace("<br/>", " ").replace("<p>", " ").replace("</p>", " ")
    # Remove HTML tags (basic cleanup)
    import re
    text = re.sub(r'<[^>]+>', '', text)
    text = ' '.join(text.split())  # Normalize whitespace
    if len(text) > max_length:
        return text[:max_length] + "..."
    return text


def get_label_hierarchy_name(label) -> str:
    """Build full hierarchical name for a label (e.g., 'grand/parent/child').
    
    Traverses up the parent chain to construct the full path.
    """
    parts = []
    current = label
    while current:
        parts.append(current.name)
        current = current.parent
    # Reverse to get grand -> parent -> child order
    parts.reverse()
    return "/".join(parts)


def format_email_response(email: Email) -> dict:
    """Format email model to response dict."""
    recipients = []
    for r in email.recipients:
        recipients.append({
            "id": r.id,
            "email": r.recipient_email,
            "name": r.recipient_name,
            "type": r.recipient_type,
        })
    
    attachments = []
    for a in email.attachments:
        if not a.is_deleted:
            attachments.append({
                "id": a.id,
                "filename": a.filename,
                "content_type": a.content_type,
                "size_bytes": a.size_bytes,
            })
    
    labels = []
    for l in email.labels:
        if not l.is_deleted:
            labels.append({
                "id": l.id,
                "name": get_label_hierarchy_name(l),
                "color": l.color,
            })
    
    # Determine if email can be cancelled (undo send)
    can_undo = (
        email.status == EmailStatus.QUEUED.value and 
        email.scheduled_send_at and 
        email.scheduled_send_at > datetime.utcnow()
    )
    
    return {
        "id": email.id,
        "subject": email.subject,
        "body": email.body,
        "html_body": email.html_body,
        "folder": email.folder or FolderType.INBOX.value,
        "category": email.category or EmailCategory.PRIMARY.value,
        "is_read": email.is_read,
        "is_starred": email.is_starred,
        "is_important": email.is_important,
        "sender_id": email.sender_id,
        "sender_name": email.sender.name if email.sender else None,
        "sender_email": email.sender.email if email.sender else None,
        "recipients": recipients,
        "thread_id": email.thread_id,
        "parent_email_id": email.parent_email_id,
        "sent_at": email.sent_at,
        "received_at": email.received_at,
        "scheduled_send_at": email.scheduled_send_at,
        "snooze_until": email.snooze_until,
        "created_at": email.created_at,
        "updated_at": email.updated_at,
        "attachment_count": len(attachments),
        "attachments": attachments,
        "labels": labels,
        "can_undo_send": can_undo,
    }


def format_email_list_response(email: Email) -> dict:
    """Format email model for list responses."""
    labels = []
    for l in email.labels:
        if not l.is_deleted:
            labels.append({
                "id": l.id,
                "name": get_label_hierarchy_name(l),
                "color": l.color,
            })
    
    attachment_count = len([a for a in email.attachments if not a.is_deleted])
    
    # Determine if email can be cancelled (undo send)
    can_undo = (
        email.status == EmailStatus.QUEUED.value and 
        email.scheduled_send_at and 
        email.scheduled_send_at > datetime.utcnow()
    )
    
    return {
        "id": email.id,
        "subject": email.subject,
        "snippet": get_snippet(email.body),
        "folder": email.folder or FolderType.INBOX.value,
        "category": email.category or EmailCategory.PRIMARY.value,
        "is_read": email.is_read,
        "is_starred": email.is_starred,
        "is_important": email.is_important,
        "sender_id": email.sender_id,
        "sender_name": email.sender.name if email.sender else None,
        "sender_email": email.sender.email if email.sender else None,
        "thread_id": email.thread_id,
        "sent_at": email.sent_at,
        "scheduled_send_at": email.scheduled_send_at,
        "snooze_until": email.snooze_until,
        "created_at": email.created_at,
        "attachment_count": attachment_count,
        "has_attachments": attachment_count > 0,
        "labels": labels,
        "can_undo_send": can_undo,
    }


@router.post("/emails", response_model=EmailResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(authorized())])
def create_email(
    email_data: EmailCreate,
    db: Session = Depends(get_db),
) -> dict:
    """Create a new email (draft or send immediately).
    
    Permissions:
    - All authenticated users can create emails
    """
    current_user = auth.user
    
    # Validate recipients
    for recipient in email_data.recipients:
        if recipient.type not in VALID_RECIPIENT_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid recipient type. Must be one of: {', '.join(VALID_RECIPIENT_TYPES)}"
            )
    
    # Determine status and folder
    if email_data.is_draft:
        email_status = EmailStatus.DRAFT.value
        email_folder = FolderType.DRAFTS.value
    else:
        email_status = EmailStatus.SENT.value
        email_folder = FolderType.SENT.value
    
    # Handle scheduled send (undo send feature)
    scheduled_send_at = email_data.scheduled_send_at
    if scheduled_send_at and not email_data.is_draft:
        # Email is scheduled for later - queue it
        email_status = EmailStatus.QUEUED.value
    
    try:
        # Create a new thread for this email (new conversation)
        thread = Thread(
            subject=email_data.subject or "(No Subject)",
            owner_id=current_user.id,
            participant_count=len(email_data.recipients) + 1,
            email_count=1,
            last_email_at=datetime.utcnow(),
        )
        db.add(thread)
        db.flush()  # Get thread ID
        
        # Create email with thread
        email = Email(
            subject=email_data.subject,
            body=email_data.body,
            html_body=email_data.html_body,
            status=email_status,
            folder=email_folder,
            sender_id=current_user.id,
            thread_id=thread.id,
            is_read=True,  # Sender has read their own email
            sent_at=None if email_data.is_draft or scheduled_send_at else datetime.utcnow(),
            scheduled_send_at=scheduled_send_at,
        )
        db.add(email)
        db.flush()  # Get email ID
        
        # Create recipients
        for recipient in email_data.recipients:
            # Try to find user by email
            recipient_user = db.query(User).filter(
                User.email == recipient.email,
                User.is_deleted == False
            ).first()
            
            email_recipient = EmailRecipient(
                email_id=email.id,
                recipient_id=recipient_user.id if recipient_user else None,
                recipient_email=recipient.email,
                recipient_name=recipient.name or (recipient_user.name if recipient_user else None),
                recipient_type=recipient.type,
            )
            db.add(email_recipient)
            
            # If sending immediately (not draft, not queued), create received copy for recipients who are users
            if not email_data.is_draft and not scheduled_send_at and recipient_user:
                received_email = Email(
                    subject=email_data.subject,
                    body=email_data.body,
                    html_body=email_data.html_body,
                    status=EmailStatus.RECEIVED.value,
                    folder=FolderType.INBOX.value,
                    sender_id=current_user.id,
                    is_read=False,
                    received_at=datetime.utcnow(),
                    thread_id=email.thread_id,
                )
                db.add(received_email)
                db.flush()
                
                # Add recipient record
                recv_recipient = EmailRecipient(
                    email_id=received_email.id,
                    recipient_id=recipient_user.id,
                    recipient_email=recipient.email,
                    recipient_name=recipient.name or recipient_user.name,
                    recipient_type=recipient.type,
                )
                db.add(recv_recipient)
        
        db.commit()
        db.refresh(email)
        
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Email {email.id} created by user {current_user.id}")
    
    return format_email_response(email)


@router.get("/emails", response_model=PaginatedListResponse[EmailListResponse], dependencies=[Depends(authorized())])
def list_emails(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    folder: Optional[FolderType] = Query(None, description="Filter by folder"),
    thread_id: Optional[UUID] = Query(None, description="Filter by thread ID to get all emails in a conversation"),
    category: Optional[EmailCategory] = Query(None, description="Filter by category"),
    is_read: Optional[bool] = Query(None, description="Filter by read status"),
    is_starred: Optional[bool] = Query(None, description="Filter by starred"),
    is_snoozed: Optional[bool] = Query(None, description="Filter by snoozed status (True=snoozed, False=not snoozed)"),
    is_important: Optional[bool] = Query(None, description="Filter by important"),
    include_archived: Optional[bool] = Query(False, description="Include archived emails"),
    search: Optional[str] = Query(None, description="Search in subject and body"),
    threaded: bool = Query(False, description="Group by thread and return only latest email from each thread"),
) -> dict:
    """List emails with pagination and filtering.
    
    Permissions:
    - Users can only see their own emails (sent or received)
    """
    current_user = auth.user
    
    # Base query - user's emails (sent by them or received by them)
    query = db.query(Email).options(
        joinedload(Email.sender),
        selectinload(Email.attachments),
        selectinload(Email.labels),
    ).filter(
        Email.is_deleted == False,
        or_(
            Email.sender_id == current_user.id,
            Email.id.in_(
                db.query(EmailRecipient.email_id).filter(
                    EmailRecipient.recipient_id == current_user.id
                )
            )
        )
    )
    
    # Apply folder filter
    if folder:
        query = query.filter(Email.folder == folder.value)
    
    if thread_id:
        query = query.filter(Email.thread_id == thread_id)
    
    if category:
        query = query.filter(Email.category == category.value)
    
    if is_read is not None:
        query = query.filter(Email.is_read == is_read)
    
    if is_starred is not None:
        query = query.filter(Email.is_starred == is_starred)
    
    if is_snoozed is not None:
        if is_snoozed:
            # Show only snoozed emails (snooze_until is set and in the future)
            query = query.filter(
                Email.snooze_until.isnot(None),
                Email.snooze_until > datetime.utcnow()
            )
        else:
            # Show only non-snoozed emails (snooze_until is null or in the past)
            query = query.filter(
                or_(
                    Email.snooze_until.is_(None),
                    Email.snooze_until <= datetime.utcnow()
                )
            )
    
    if is_important is not None:
        query = query.filter(Email.is_important == is_important)
    
    if include_archived is False:
        query = query.filter(Email.status != EmailStatus.ARCHIVED.value)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Email.subject.ilike(search_term),
                Email.body.ilike(search_term)
            )
        )
    
    # Apply threaded grouping - return only latest email from each thread
    if threaded:
        # Use sent_at for sorting, fallback to created_at if null
        sort_date = func.coalesce(Email.sent_at, Email.created_at)
        
        # Subquery to get max sent_at per thread_id (for emails with thread_id)
        latest_per_thread = db.query(
            Email.thread_id,
            func.max(func.coalesce(Email.sent_at, Email.created_at)).label("max_date")
        ).filter(
            Email.is_deleted == False,
            Email.thread_id.isnot(None),
            or_(
                Email.sender_id == current_user.id,
                Email.id.in_(
                    db.query(EmailRecipient.email_id).filter(
                        EmailRecipient.recipient_id == current_user.id
                    )
                )
            )
        ).group_by(Email.thread_id).subquery()
        
        # Filter to only include:
        # 1. Emails that match the max date for their thread, OR
        # 2. Emails without a thread_id (each is its own "thread")
        query = query.filter(
            or_(
                and_(
                    Email.thread_id.isnot(None),
                    Email.thread_id == latest_per_thread.c.thread_id,
                    sort_date == latest_per_thread.c.max_date
                ),
                Email.thread_id.is_(None)
            )
        )
    
    # Get total count
    total = query.count()
    
    # Calculate pagination
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    offset = (page - 1) * page_size
    
    # Get results - sort by sent_at when threaded, otherwise by created_at
    if threaded:
        emails = query.order_by(func.coalesce(Email.sent_at, Email.created_at).desc()).offset(offset).limit(page_size).all()
    else:
        emails = query.order_by(Email.created_at.desc()).offset(offset).limit(page_size).all()
    
    # Format response
    emails_data = [format_email_list_response(email) for email in emails]
    
    return PaginatedListResponse[EmailListResponse](
        results=emails_data,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/emails/{email_id}", response_model=EmailResponse, dependencies=[Depends(authorized())])
def get_email(
    email_id: UUID,
    db: Session = Depends(get_db),
) -> dict:
    """Get a specific email by ID.
    
    Permissions:
    - Users can only access their own emails
    """
    current_user = auth.user
    
    email = db.query(Email).options(
        joinedload(Email.sender),
        selectinload(Email.recipients),
        selectinload(Email.attachments),
        selectinload(Email.labels),
    ).filter(
        Email.id == email_id,
        Email.is_deleted == False
    ).first()
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    # Check ownership
    is_sender = email.sender_id == current_user.id
    is_recipient = any(r.recipient_id == current_user.id for r in email.recipients)
    is_admin = current_user.role == "admin"
    
    if not (is_sender or is_recipient or is_admin):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    return format_email_response(email)


@router.put("/emails/{email_id}", response_model=EmailResponse, dependencies=[Depends(authorized())])
def update_email(
    email_id: UUID,
    email_data: EmailUpdate,
    db: Session = Depends(get_db),
) -> dict:
    """Update an email (draft only for content changes).
    
    Permissions:
    - Users can only update their own drafts
    """
    current_user = auth.user
    
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
    if email.sender_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this email"
        )
    
    # Only drafts can have content updated
    update_data = email_data.model_dump(exclude_unset=True)
    content_fields = {"subject", "body", "html_body"}
    
    if any(field in update_data for field in content_fields):
        if email.status != EmailStatus.DRAFT.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only draft emails can have content updated"
            )
    
    # Apply updates
    for field, value in update_data.items():
        setattr(email, field, value)
    
    try:
        db.commit()
        db.refresh(email)
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Email {email.id} updated by user {current_user.id}")
    
    return format_email_response(email)


@router.delete("/emails/{email_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(authorized())])
def delete_email(
    email_id: UUID,
    db: Session = Depends(get_db),
    permanent: bool = Query(False, description="Permanently delete instead of soft delete"),
) -> None:
    """Delete an email.
    
    Args:
        permanent: If True, permanently removes from database. 
                   If False (default), moves to trash or soft deletes if already in trash.
    """
    current_user = auth.user
    
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
    if email.sender_id != current_user.id and current_user.role != "admin":
        is_recipient = db.query(EmailRecipient).filter(
            EmailRecipient.email_id == email_id,
            EmailRecipient.recipient_id == current_user.id
        ).first()
        if not is_recipient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Email {email_id} not found"
            )
    
    if permanent:
        # Permanently delete from database
        db.delete(email)
    else:
        # Check if already in trash
        if email.folder == FolderType.TRASH.value:
            # Already in trash, soft delete
            email.is_deleted = True
        else:
            # Move to trash
            email.folder = FolderType.TRASH.value
    
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Email {email.id} {'permanently ' if permanent else ''}deleted by user {current_user.id}")


@router.post("/emails/{email_id}/send", response_model=EmailResponse, dependencies=[Depends(authorized())])
def send_email(
    email_id: UUID,
    db: Session = Depends(get_db),
) -> dict:
    """Send a draft email.
    
    If the user has undo_send_delay_seconds > 0 configured, the email will be
    queued with a scheduled send time. During this window, the user can cancel
    the send using the /emails/{email_id}/cancel-send endpoint.
    
    If undo_send_delay_seconds is 0 or not set, the email is sent immediately.
    """
    current_user = auth.user
    
    email = db.query(Email).options(
        selectinload(Email.recipients),
    ).filter(
        Email.id == email_id,
        Email.sender_id == current_user.id,
        Email.is_deleted == False
    ).first()
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    if email.status != EmailStatus.DRAFT.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only draft emails can be sent"
        )
    
    if not email.recipients:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email must have at least one recipient"
        )
    
    # Get user's undo send delay preference (default 10 seconds, 0 to disable)
    undo_delay = current_user.undo_send_delay_seconds or 0
    
    # Clamp to valid range (0 = disabled, 5-30 seconds)
    if undo_delay > 0:
        undo_delay = max(5, min(30, undo_delay))
    
    if undo_delay > 0:
        # Queue the email with scheduled send time (undo send enabled)
        from datetime import timedelta
        email.status = EmailStatus.QUEUED.value
        email.scheduled_send_at = datetime.utcnow() + timedelta(seconds=undo_delay)
        email.folder = FolderType.SENT.value
        
        try:
            db.commit()
            db.refresh(email)
        except Exception:
            db.rollback()
            raise
        
        logger.info(f"Email {email.id} queued for send in {undo_delay}s by user {current_user.id}")
        return format_email_response(email)
    
    # Immediate send (undo send disabled)
    email.status = EmailStatus.SENT.value
    email.sent_at = datetime.utcnow()
    email.folder = FolderType.SENT.value
    
    # Create received copies for recipients who are users
    _deliver_email_to_recipients(db, email, current_user)
    
    try:
        db.commit()
        db.refresh(email)
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Email {email.id} sent by user {current_user.id}")
    
    return format_email_response(email)


def _deliver_email_to_recipients(db: Session, email: Email, sender) -> None:
    """Create received copies of an email for all recipients who are system users."""
    for recipient in email.recipients:
        if recipient.recipient_id:
            recipient_user = db.query(User).filter(
                User.id == recipient.recipient_id,
                User.is_deleted == False
            ).first()
            if recipient_user:
                received_email = Email(
                    subject=email.subject,
                    body=email.body,
                    html_body=email.html_body,
                    status=EmailStatus.RECEIVED.value,
                    folder=FolderType.INBOX.value,
                    category=email.category,
                    sender_id=sender.id,
                    is_read=False,
                    received_at=datetime.utcnow(),
                    thread_id=email.thread_id,
                )
                db.add(received_email)
                db.flush()
                
                recv_recipient = EmailRecipient(
                    email_id=received_email.id,
                    recipient_id=recipient_user.id,
                    recipient_email=recipient.recipient_email,
                    recipient_name=recipient.recipient_name,
                    recipient_type=recipient.recipient_type,
                )
                db.add(recv_recipient)


@router.post("/emails/{email_id}/cancel-send", response_model=EmailResponse, dependencies=[Depends(authorized())])
def cancel_send(
    email_id: UUID,
    db: Session = Depends(get_db),
) -> dict:
    """Cancel a queued email before it's sent (undo send).
    
    Only works for emails in 'queued' status before their scheduled_send_at time.
    The email will be moved back to draft status so it can be edited or re-sent.
    """
    current_user = auth.user
    
    email = db.query(Email).options(
        joinedload(Email.sender),
        selectinload(Email.recipients),
        selectinload(Email.attachments),
        selectinload(Email.labels),
    ).filter(
        Email.id == email_id,
        Email.sender_id == current_user.id,
        Email.is_deleted == False
    ).first()
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    if email.status != EmailStatus.QUEUED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only queued emails can be cancelled. This email has already been sent."
        )
    
    # Check if still within the undo window
    if email.scheduled_send_at and email.scheduled_send_at <= datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Undo window has expired. The email has been sent."
        )
    
    # Move back to drafts
    email.status = EmailStatus.DRAFT.value
    email.scheduled_send_at = None
    email.folder = FolderType.DRAFTS.value
    
    try:
        db.commit()
        db.refresh(email)
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Email {email.id} send cancelled (undo send) by user {current_user.id}")
    
    return format_email_response(email)


@router.post("/emails/{email_id}/confirm-send", response_model=EmailResponse, dependencies=[Depends(authorized())])
def confirm_send(
    email_id: UUID,
    db: Session = Depends(get_db),
) -> dict:
    """Immediately send a queued email without waiting for the scheduled time.
    
    Use this if you want to skip the undo send waiting period.
    """
    current_user = auth.user
    
    email = db.query(Email).options(
        joinedload(Email.sender),
        selectinload(Email.recipients),
        selectinload(Email.attachments),
        selectinload(Email.labels),
    ).filter(
        Email.id == email_id,
        Email.sender_id == current_user.id,
        Email.is_deleted == False
    ).first()
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    if email.status != EmailStatus.QUEUED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only queued emails can be confirmed for immediate send"
        )
    
    # Send immediately
    email.status = EmailStatus.SENT.value
    email.sent_at = datetime.utcnow()
    email.scheduled_send_at = None
    
    # Deliver to recipients
    _deliver_email_to_recipients(db, email, current_user)
    
    try:
        db.commit()
        db.refresh(email)
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Email {email.id} confirmed and sent immediately by user {current_user.id}")
    
    return format_email_response(email)


@router.post("/emails/{email_id}/reply", response_model=EmailResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(authorized())])
def reply_to_email(
    email_id: UUID,
    reply_data: EmailReplyRequest,
    db: Session = Depends(get_db),
) -> dict:
    """Reply to an email."""
    current_user = auth.user
    
    original_email = db.query(Email).options(
        joinedload(Email.sender),
        selectinload(Email.recipients),
    ).filter(
        Email.id == email_id,
        Email.is_deleted == False
    ).first()
    
    if not original_email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    # Determine reply recipients
    recipients = []
    if reply_data.reply_all:
        # Reply to sender and all recipients
        recipients.append({
            "email": original_email.sender.email,
            "name": original_email.sender.name,
            "type": "to",
        })
        for r in original_email.recipients:
            if r.recipient_email != current_user.email:
                recipients.append({
                    "email": r.recipient_email,
                    "name": r.recipient_name,
                    "type": r.recipient_type,
                })
    else:
        # Reply to sender only
        recipients.append({
            "email": original_email.sender.email,
            "name": original_email.sender.name,
            "type": "to",
        })
    
    # Create reply subject
    subject = original_email.subject
    if not subject.lower().startswith("re:"):
        subject = f"Re: {subject}"
    
    # Get or create thread
    thread_id = original_email.thread_id
    if not thread_id:
        thread = Thread(
            subject=original_email.subject,
            owner_id=current_user.id,
            participant_count=len(recipients) + 1,
            email_count=2,
            last_email_at=datetime.utcnow(),
        )
        db.add(thread)
        db.flush()
        thread_id = thread.id
        original_email.thread_id = thread_id
    
    # Create reply email
    reply_email = Email(
        subject=subject,
        body=reply_data.body,
        html_body=reply_data.html_body,
        status=EmailStatus.SENT.value,
        folder=FolderType.SENT.value,
        sender_id=current_user.id,
        thread_id=thread_id,
        parent_email_id=email_id,
        is_read=True,
        sent_at=datetime.utcnow(),
    )
    
    try:
        db.add(reply_email)
        db.flush()
        
        # Add recipients
        for recipient in recipients:
            recipient_user = db.query(User).filter(
                User.email == recipient["email"],
                User.is_deleted == False
            ).first()
            
            email_recipient = EmailRecipient(
                email_id=reply_email.id,
                recipient_id=recipient_user.id if recipient_user else None,
                recipient_email=recipient["email"],
                recipient_name=recipient["name"],
                recipient_type=recipient["type"],
            )
            db.add(email_recipient)
            
            # Create received copy
            if recipient_user:
                received_email = Email(
                    subject=subject,
                    body=reply_data.body,
                    html_body=reply_data.html_body,
                    status=EmailStatus.RECEIVED.value,
                    folder=FolderType.INBOX.value,
                    sender_id=current_user.id,
                    thread_id=thread_id,
                    parent_email_id=email_id,
                    is_read=False,
                    received_at=datetime.utcnow(),
                )
                db.add(received_email)
                db.flush()
                
                recv_recipient = EmailRecipient(
                    email_id=received_email.id,
                    recipient_id=recipient_user.id,
                    recipient_email=recipient["email"],
                    recipient_name=recipient["name"],
                    recipient_type=recipient["type"],
                )
                db.add(recv_recipient)
        
        db.commit()
        db.refresh(reply_email)
        
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Reply {reply_email.id} to email {email_id} by user {current_user.id}")
    
    return format_email_response(reply_email)


@router.post("/emails/{email_id}/forward", response_model=EmailResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(authorized())])
def forward_email(
    email_id: UUID,
    forward_data: EmailForwardRequest,
    db: Session = Depends(get_db),
) -> dict:
    """Forward an email."""
    current_user = auth.user
    
    original_email = db.query(Email).filter(
        Email.id == email_id,
        Email.is_deleted == False
    ).first()
    
    if not original_email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    # Create forward subject
    subject = original_email.subject
    if not subject.lower().startswith("fwd:"):
        subject = f"Fwd: {subject}"
    
    # Combine bodies
    separator = "\n\n---------- Forwarded message ---------\n\n"
    body = (forward_data.body or "") + separator + (original_email.body or "")
    html_body = None
    if forward_data.html_body or original_email.html_body:
        html_body = (forward_data.html_body or "") + "<hr><p>---------- Forwarded message ---------</p>" + (original_email.html_body or "")
    
    # Create forward email
    forward_email_obj = Email(
        subject=subject,
        body=body,
        html_body=html_body,
        status=EmailStatus.SENT.value,
        folder=FolderType.SENT.value,
        sender_id=current_user.id,
        parent_email_id=email_id,
        is_read=True,
        sent_at=datetime.utcnow(),
    )
    
    try:
        db.add(forward_email_obj)
        db.flush()
        
        # Add recipients
        for recipient in forward_data.recipients:
            recipient_user = db.query(User).filter(
                User.email == recipient.email,
                User.is_deleted == False
            ).first()
            
            email_recipient = EmailRecipient(
                email_id=forward_email_obj.id,
                recipient_id=recipient_user.id if recipient_user else None,
                recipient_email=recipient.email,
                recipient_name=recipient.name,
                recipient_type=recipient.type,
            )
            db.add(email_recipient)
            
            # Create received copy
            if recipient_user:
                received_email = Email(
                    subject=subject,
                    body=body,
                    html_body=html_body,
                    status=EmailStatus.RECEIVED.value,
                    folder=FolderType.INBOX.value,
                    sender_id=current_user.id,
                    is_read=False,
                    received_at=datetime.utcnow(),
                )
                db.add(received_email)
                db.flush()
                
                recv_recipient = EmailRecipient(
                    email_id=received_email.id,
                    recipient_id=recipient_user.id,
                    recipient_email=recipient.email,
                    recipient_name=recipient.name,
                    recipient_type=recipient.type,
                )
                db.add(recv_recipient)
        
        db.commit()
        db.refresh(forward_email_obj)
        
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Forward {forward_email_obj.id} of email {email_id} by user {current_user.id}")
    
    return format_email_response(forward_email_obj)


@router.patch("/emails/{email_id}/read", response_model=EmailResponse, dependencies=[Depends(authorized())])
def mark_email_read(
    email_id: UUID,
    read_data: EmailReadUpdate,
    db: Session = Depends(get_db),
) -> dict:
    """Mark an email as read or unread."""
    current_user = auth.user
    
    email = db.query(Email).filter(
        Email.id == email_id,
        Email.is_deleted == False
    ).first()
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    email.is_read = read_data.is_read
    
    try:
        db.commit()
        db.refresh(email)
    except Exception:
        db.rollback()
        raise
    
    return format_email_response(email)


@router.patch("/emails/{email_id}/star", response_model=EmailResponse, dependencies=[Depends(authorized())])
def star_email(
    email_id: UUID,
    star_data: EmailStarUpdate,
    db: Session = Depends(get_db),
) -> dict:
    """Star or unstar an email."""
    current_user = auth.user
    
    email = db.query(Email).filter(
        Email.id == email_id,
        Email.is_deleted == False
    ).first()
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    email.is_starred = star_data.is_starred
    
    try:
        db.commit()
        db.refresh(email)
    except Exception:
        db.rollback()
        raise
    
    return format_email_response(email)


@router.post("/emails/{email_id}/move", response_model=EmailResponse, dependencies=[Depends(authorized())])
def move_email(
    email_id: UUID,
    move_data: EmailMoveRequest,
    db: Session = Depends(get_db),
) -> dict:
    """Move an email to a different folder."""
    current_user = auth.user
    
    # Validate folder type
    if move_data.folder not in VALID_FOLDER_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid folder. Must be one of: {', '.join(VALID_FOLDER_TYPES)}"
        )
    
    email = db.query(Email).filter(
        Email.id == email_id,
        Email.is_deleted == False
    ).first()
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    email.folder = move_data.folder
    
    try:
        db.commit()
        db.refresh(email)
    except Exception:
        db.rollback()
        raise
    
    return format_email_response(email)


@router.post("/emails/{email_id}/labels", response_model=EmailResponse, dependencies=[Depends(authorized())])
def add_label_to_email(
    email_id: UUID,
    label_data: EmailLabelRequest,
    db: Session = Depends(get_db),
) -> dict:
    """Add a label to an email."""
    current_user = auth.user
    
    email = db.query(Email).filter(
        Email.id == email_id,
        Email.is_deleted == False
    ).first()
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    # Verify label belongs to user
    label = db.query(Label).filter(
        Label.id == label_data.label_id,
        Label.owner_id == current_user.id,
        Label.is_deleted == False
    ).first()
    
    if not label:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid label ID"
        )
    
    # Check if already labeled
    existing = db.query(EmailLabel).filter(
        EmailLabel.email_id == email_id,
        EmailLabel.label_id == label_data.label_id
    ).first()
    
    if not existing:
        email_label = EmailLabel(email_id=email_id, label_id=label_data.label_id)
        db.add(email_label)
        
        try:
            db.commit()
        except Exception:
            db.rollback()
            raise
    
    db.refresh(email)
    return format_email_response(email)


@router.delete("/emails/{email_id}/labels/{label_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(authorized())])
def remove_label_from_email(
    email_id: UUID,
    label_id: UUID,
    db: Session = Depends(get_db),
) -> None:
    """Remove a label from an email."""
    current_user = auth.user
    
    email_label = db.query(EmailLabel).filter(
        EmailLabel.email_id == email_id,
        EmailLabel.label_id == label_id
    ).first()
    
    if email_label:
        db.delete(email_label)
        try:
            db.commit()
        except Exception:
            db.rollback()
            raise


@router.post("/emails/{email_id}/snooze", response_model=EmailResponse, dependencies=[Depends(authorized())])
def snooze_email(
    email_id: UUID,
    snooze_data: EmailSnoozeRequest,
    db: Session = Depends(get_db),
) -> dict:
    """Snooze an email until a specific date and time.
    
    When snoozed, the email is temporarily hidden from the inbox and will
    reappear at the specified snooze_until time.
    
    Permissions:
    - Users can only snooze their own emails (sent or received)
    """
    current_user = auth.user
    
    email = db.query(Email).options(
        joinedload(Email.sender),
        selectinload(Email.recipients),
        selectinload(Email.attachments),
        selectinload(Email.labels),
    ).filter(
        Email.id == email_id,
        Email.is_deleted == False
    ).first()
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    # Check ownership
    is_sender = email.sender_id == current_user.id
    is_recipient = any(r.recipient_id == current_user.id for r in email.recipients)
    is_admin = current_user.role == "admin"
    
    if not (is_sender or is_recipient or is_admin):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    # Validate snooze_until is in the future
    if snooze_data.snooze_until <= datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Snooze time must be in the future"
        )
    
    email.snooze_until = snooze_data.snooze_until
    
    try:
        db.commit()
        db.refresh(email)
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Email {email.id} snoozed until {snooze_data.snooze_until} by user {current_user.id}")
    
    return format_email_response(email)


@router.post("/emails/{email_id}/unsnooze", response_model=EmailResponse, dependencies=[Depends(authorized())])
def unsnooze_email(
    email_id: UUID,
    db: Session = Depends(get_db),
) -> dict:
    """Unsnooze an email, making it immediately visible again.
    
    Permissions:
    - Users can only unsnooze their own emails (sent or received)
    """
    current_user = auth.user
    
    email = db.query(Email).options(
        joinedload(Email.sender),
        selectinload(Email.recipients),
        selectinload(Email.attachments),
        selectinload(Email.labels),
    ).filter(
        Email.id == email_id,
        Email.is_deleted == False
    ).first()
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    # Check ownership
    is_sender = email.sender_id == current_user.id
    is_recipient = any(r.recipient_id == current_user.id for r in email.recipients)
    is_admin = current_user.role == "admin"
    
    if not (is_sender or is_recipient or is_admin):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    if not email.snooze_until:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is not snoozed"
        )
    
    email.snooze_until = None
    
    try:
        db.commit()
        db.refresh(email)
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Email {email.id} unsnoozed by user {current_user.id}")
    
    return format_email_response(email)


@router.post("/emails/{email_id}/archive", response_model=EmailResponse, dependencies=[Depends(authorized())])
def archive_email(
    email_id: UUID,
    db: Session = Depends(get_db),
) -> dict:
    """Archive an email.
    
    Sets the email status to 'archived'.
    
    Permissions:
    - Users can only archive their own emails (sent or received)
    """
    current_user = auth.user
    
    email = db.query(Email).options(
        joinedload(Email.sender),
        selectinload(Email.recipients),
        selectinload(Email.attachments),
        selectinload(Email.labels),
    ).filter(
        Email.id == email_id,
        Email.is_deleted == False
    ).first()
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    # Check ownership
    is_sender = email.sender_id == current_user.id
    is_recipient = any(r.recipient_id == current_user.id for r in email.recipients)
    is_admin = current_user.role == "admin"
    
    if not (is_sender or is_recipient or is_admin):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    email.status = EmailStatus.ARCHIVED.value
    
    try:
        db.commit()
        db.refresh(email)
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Email {email.id} archived by user {current_user.id}")
    
    return format_email_response(email)


@router.post("/emails/{email_id}/unarchive", response_model=EmailResponse, dependencies=[Depends(authorized())])
def unarchive_email(
    email_id: UUID,
    db: Session = Depends(get_db),
) -> dict:
    """Unarchive an email.
    
    Restores an archived email back to its original folder (inbox for received, sent for sent emails).
    
    Permissions:
    - Users can only unarchive their own emails (sent or received)
    """
    current_user = auth.user
    
    email = db.query(Email).options(
        joinedload(Email.sender),
        selectinload(Email.recipients),
        selectinload(Email.attachments),
        selectinload(Email.labels),
    ).filter(
        Email.id == email_id,
        Email.is_deleted == False
    ).first()
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    # Check ownership
    is_sender = email.sender_id == current_user.id
    is_recipient = any(r.recipient_id == current_user.id for r in email.recipients)
    is_admin = current_user.role == "admin"
    
    if not (is_sender or is_recipient or is_admin):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    if email.status != EmailStatus.ARCHIVED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is not archived"
        )
    
    # Restore to original status based on whether user sent or received it
    if email.sender_id == current_user.id:
        email.status = EmailStatus.SENT.value
    else:
        email.status = EmailStatus.RECEIVED.value
    
    try:
        db.commit()
        db.refresh(email)
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Email {email.id} unarchived by user {current_user.id}")
    
    return format_email_response(email)


@router.post("/emails/{email_id}/spam", response_model=EmailResponse, dependencies=[Depends(authorized())])
def mark_email_spam(
    email_id: UUID,
    db: Session = Depends(get_db),
) -> dict:
    """Mark an email as spam.
    
    Moves the email to the spam folder.
    
    Permissions:
    - Users can only mark their own emails as spam (sent or received)
    """
    current_user = auth.user
    
    email = db.query(Email).options(
        joinedload(Email.sender),
        selectinload(Email.recipients),
        selectinload(Email.attachments),
        selectinload(Email.labels),
    ).filter(
        Email.id == email_id,
        Email.is_deleted == False
    ).first()
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    # Check ownership
    is_sender = email.sender_id == current_user.id
    is_recipient = any(r.recipient_id == current_user.id for r in email.recipients)
    is_admin = current_user.role == "admin"
    
    if not (is_sender or is_recipient or is_admin):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    if email.folder == FolderType.SPAM.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already marked as spam"
        )
    
    email.folder = FolderType.SPAM.value
    
    try:
        db.commit()
        db.refresh(email)
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Email {email.id} marked as spam by user {current_user.id}")
    
    return format_email_response(email)


@router.post("/emails/{email_id}/unspam", response_model=EmailResponse, dependencies=[Depends(authorized())])
def unmark_email_spam(
    email_id: UUID,
    db: Session = Depends(get_db),
) -> dict:
    """Remove spam mark from an email.
    
    Moves the email from spam folder back to inbox.
    
    Permissions:
    - Users can only unmark their own emails from spam (sent or received)
    """
    current_user = auth.user
    
    email = db.query(Email).options(
        joinedload(Email.sender),
        selectinload(Email.recipients),
        selectinload(Email.attachments),
        selectinload(Email.labels),
    ).filter(
        Email.id == email_id,
        Email.is_deleted == False
    ).first()
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    # Check ownership
    is_sender = email.sender_id == current_user.id
    is_recipient = any(r.recipient_id == current_user.id for r in email.recipients)
    is_admin = current_user.role == "admin"
    
    if not (is_sender or is_recipient or is_admin):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    if email.folder != FolderType.SPAM.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is not in spam folder"
        )
    
    email.folder = FolderType.INBOX.value
    
    try:
        db.commit()
        db.refresh(email)
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Email {email.id} removed from spam by user {current_user.id}")
    
    return format_email_response(email)


@router.patch("/emails/{email_id}/category", response_model=EmailResponse, dependencies=[Depends(authorized())])
def update_email_category(
    email_id: UUID,
    category_data: EmailCategoryUpdate,
    db: Session = Depends(get_db),
) -> dict:
    """Update an email's category (Primary, Promotions, Social, Updates, Forums).
    
    Categories help organize inbox similar to Gmail tabs.
    
    Permissions:
    - Users can only update categories on their own emails (sent or received)
    """
    current_user = auth.user
    
    # Validate category
    if category_data.category not in VALID_EMAIL_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid category. Must be one of: {', '.join(VALID_EMAIL_CATEGORIES)}"
        )
    
    email = db.query(Email).options(
        joinedload(Email.sender),
        selectinload(Email.recipients),
        selectinload(Email.attachments),
        selectinload(Email.labels),
    ).filter(
        Email.id == email_id,
        Email.is_deleted == False
    ).first()
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    # Check ownership
    is_sender = email.sender_id == current_user.id
    is_recipient = any(r.recipient_id == current_user.id for r in email.recipients)
    is_admin = current_user.role == "admin"
    
    if not (is_sender or is_recipient or is_admin):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found"
        )
    
    email.category = category_data.category
    
    try:
        db.commit()
        db.refresh(email)
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Email {email.id} category changed to {category_data.category} by user {current_user.id}")

    return format_email_response(email)


@router.get("/emails/stats/category-counts", response_model=EmailCategoryCountsResponse, dependencies=[Depends(authorized())])
def get_email_category_counts(
    db: Session = Depends(get_db),
    folder: Optional[FolderType] = Query(None, description="Filter by folder"),
    is_read: Optional[bool] = Query(None, description="Filter by read status"),
    is_starred: Optional[bool] = Query(None, description="Filter by starred"),
) -> dict:
    """Get count of emails in each category (primary, promotions, social, updates, forums).

    Returns the number of emails in each category for the current user.
    Optionally filter by folder, read status, or starred status.

    Permissions:
    - Users can only see counts for their own emails (sent or received)
    """
    current_user = auth.user

    # Base query - user's emails (sent by them or received by them)
    base_query = db.query(
        Email.category,
        func.count(Email.id).label('count')
    ).filter(
        Email.is_deleted == False,
        or_(
            Email.sender_id == current_user.id,
            Email.id.in_(
                db.query(EmailRecipient.email_id).filter(
                    EmailRecipient.recipient_id == current_user.id
                )
            )
        )
    )

    # Apply filters
    if folder:
        base_query = base_query.filter(Email.folder == folder.value)

    if is_read is not None:
        base_query = base_query.filter(Email.is_read == is_read)

    if is_starred is not None:
        base_query = base_query.filter(Email.is_starred == is_starred)

    # Group by category
    results = base_query.group_by(Email.category).all()

    # Build category counts dictionary dynamically from VALID_EMAIL_CATEGORIES
    category_counts = {category: 0 for category in VALID_EMAIL_CATEGORIES}

    # Fill in actual counts from query results
    for category, count in results:
        category_key = category or EmailCategory.PRIMARY.value
        if category_key in category_counts:
            category_counts[category_key] = count

    return category_counts
