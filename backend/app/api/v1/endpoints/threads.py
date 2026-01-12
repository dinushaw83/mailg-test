"""Thread operations endpoints.

This module provides:
- Get all emails in a thread
- Delete/restore thread operations
- Thread metadata management
"""

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import func, or_
from uuid import UUID
import logging

from app.db.session import get_db
from app.models.email import Email
from app.models.email_recipient import EmailRecipient
from app.models.thread import Thread
from app.schemas.email import EmailResponse
from app.auth.rbac import authorized
from app.auth.dependencies import auth
from app.core.constants import SystemLabel, FolderType
from app.utils.label_utils import (
    add_system_label_to_thread,
    replace_exclusive_labels,
)
from app.utils.email_utils import (
    format_email_response,
    mark_emails_as_read_background,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/threads")


@router.get("/{thread_id}/emails", response_model=list[EmailResponse], dependencies=[Depends(authorized())])
def get_thread_emails(
    thread_id: UUID,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    only_trashed: bool = Query(False, description="Include only trashed emails"),
) -> list[dict]:
    """Get all emails in a thread/conversation.
    
    Returns all emails belonging to the specified thread, ordered by sent_at/created_at.
    Emails are automatically marked as read in the background.
    
    Query Parameters:
    - only_trashed: If true, returns only emails in trash folder
    
    Permissions:
    - Users can only access threads containing their own emails (sent or received)
    """
    current_user = auth.user
    
    # Build base query
    query = db.query(Email).options(
        joinedload(Email.sender),
        selectinload(Email.recipients),
        selectinload(Email.attachments),
        joinedload(Email.thread)
            .selectinload(Thread.labels),
        joinedload(Email.thread)
            .selectinload(Thread.user_metadata),
    ).filter(
        Email.thread_id == thread_id,
        or_(
            Email.sender_id == current_user.id,
            Email.id.in_(
                db.query(EmailRecipient.email_id).filter(
                    EmailRecipient.recipient_id == current_user.id
                )
            )
        )
    )
    
    # Filter by trash folder if only_trashed is set
    if only_trashed:
        query = query.filter(Email.folder == FolderType.TRASH.value)
    
    emails = query.order_by(func.coalesce(Email.sent_at, Email.created_at).asc()).all()
    
    if not emails:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No emails found for thread {thread_id}"
        )
    
    # Mark unread emails as read in background (only for non-trashed emails)
    if not only_trashed:
        unread_email_ids = [email.id for email in emails if not email.is_read]
        if unread_email_ids:
            run_id = getattr(request.state, "run_id", None)
            background_tasks.add_task(
                mark_emails_as_read_background,
                unread_email_ids,
                current_user.id,
                run_id
            )
    
    return [format_email_response(email, current_user.id) for email in emails]


@router.delete("/{thread_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(authorized())])
def delete_thread(
    thread_id: UUID,
    db: Session = Depends(get_db),
    permanent: bool = Query(False, description="Permanently delete all emails in thread"),
) -> None:
    """Delete an entire thread for the current user.
    
    Delete behavior:
    - If permanent=False (default): Moves all user's emails in the thread to trash folder
    - If permanent=True: Permanently deletes all user's emails in the thread
    
    Permissions:
    - Users can only delete threads they have access to
    """
    current_user = auth.user
    
    # Check if user has access to this thread
    user_emails_in_thread = db.query(Email).filter(
        Email.thread_id == thread_id,
        or_(
            Email.sender_id == current_user.id,
            Email.id.in_(
                db.query(EmailRecipient.email_id).filter(
                    EmailRecipient.recipient_id == current_user.id
                )
            )
        )
    ).all()
    
    if not user_emails_in_thread:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Thread {thread_id} not found"
        )
    
    if permanent:
        # Permanently delete all user's emails in the thread
        for email in user_emails_in_thread:
            db.delete(email)
    else:
        # Move all user's emails in the thread to trash folder
        for email in user_emails_in_thread:
            email.folder = FolderType.TRASH.value
        
        # Update thread label to trash
        replace_exclusive_labels(db, thread_id, current_user.id, SystemLabel.TRASH)
    
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Thread {thread_id} {'permanently deleted' if permanent else 'moved to trash'} by user {current_user.id}")


@router.post("/{thread_id}/restore", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(authorized())])
def restore_thread(
    thread_id: UUID,
    db: Session = Depends(get_db),
) -> None:
    """Restore a deleted thread for the current user.
    
    Moves all user's emails in the thread from trash back to inbox.
    
    Permissions:
    - Users can only restore threads they have access to
    """
    current_user = auth.user
    
    # Find user's emails in this thread that are in trash
    user_emails_in_trash = db.query(Email).filter(
        Email.thread_id == thread_id,
        Email.folder == FolderType.TRASH.value,
        or_(
            Email.sender_id == current_user.id,
            Email.id.in_(
                db.query(EmailRecipient.email_id).filter(
                    EmailRecipient.recipient_id == current_user.id
                )
            )
        )
    ).all()
    
    if not user_emails_in_trash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No emails in trash for this thread"
        )
    
    # Move emails from trash back to inbox
    for email in user_emails_in_trash:
        email.folder = FolderType.INBOX.value
    
    # Restore inbox label
    add_system_label_to_thread(db, thread_id, current_user.id, SystemLabel.INBOX)
    
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Thread {thread_id} restored from trash by user {current_user.id}")
