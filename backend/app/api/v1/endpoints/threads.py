"""Thread operations endpoints.

This module provides:
- Get all emails in a thread
- Delete/restore thread operations
- Thread metadata management (snooze, archive, important)
"""

from datetime import UTC, datetime
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import func, or_
from uuid import UUID
import logging

from app.db.session import get_db
from app.models.email import Email
from app.models.email_recipient import EmailRecipient
from app.models.thread import Thread
from app.models.thread_user_metadata import ThreadUserMetadata
from app.schemas.email import EmailResponse, EmailSnoozeRequest, EmailImportantUpdate, EmailReadUpdate
from app.schemas.thread import ThreadOperationResponse
from app.auth.rbac import authorized
from app.auth.dependencies import auth
from app.core.constants import SystemLabel, FolderType, EmailStatus
from app.utils.label_utils import (
    remove_system_label_from_thread,
    sync_thread_labels,
)
from app.utils.email_utils import (
    format_email_response,
    mark_emails_as_read_background,
    get_perspective_email_filter,
)
from app.utils.thread_metadata_utils import mark_thread_important

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
        get_perspective_email_filter(db, current_user.id)
    )
    
    # Filter by trash folder if only_trashed is set
    if only_trashed:
        query = query.filter(Email.folder == FolderType.TRASH.value)
    
    emails = query.order_by(func.coalesce(Email.received_at, Email.sent_at, Email.created_at).asc()).all()
    
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
    
    # Check if user has access to this thread (perspective-aware)
    user_emails_in_thread = db.query(Email).filter(
        Email.thread_id == thread_id,
        get_perspective_email_filter(db, current_user.id)
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
    
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    
    # Sync thread labels to reflect trash state (only for non-permanent delete)
    if not permanent:
        sync_thread_labels(db, thread_id, current_user.id, commit=True)
    
    logger.info(f"Thread {thread_id} {'permanently deleted' if permanent else 'moved to trash'} by user {current_user.id}")


@router.post("/{thread_id}/restore", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(authorized())])
def restore_thread(
    thread_id: UUID,
    db: Session = Depends(get_db),
) -> None:
    """Restore a deleted thread for the current user.
    
    Moves all user's emails in the thread from trash back to their appropriate folders:
    - Sent emails are restored to the 'sent' folder
    - Scheduled/queued emails are restored to the 'scheduled' folder
    - Received emails are restored to the 'inbox' folder
    - Draft emails are restored to the 'drafts' folder
    
    Permissions:
    - Users can only restore threads they have access to
    """
    current_user = auth.user
    
    # Find user's emails in this thread that are in trash (perspective-aware)
    user_emails_in_trash = db.query(Email).filter(
        Email.thread_id == thread_id,
        Email.folder == FolderType.TRASH.value,
        get_perspective_email_filter(db, current_user.id)
    ).all()
    
    if not user_emails_in_trash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No emails in trash for this thread"
        )
    
    # Restore emails to appropriate folders based on their status
    for email in user_emails_in_trash:
        if email.status == EmailStatus.DRAFT.value:
            email.folder = FolderType.DRAFTS.value
        elif email.status == EmailStatus.QUEUED.value:
            email.folder = FolderType.SCHEDULED.value
        elif email.status == EmailStatus.SENT.value:
            email.folder = FolderType.SENT.value
        else:
            # For received emails or any other status, restore to inbox
            email.folder = FolderType.INBOX.value
    
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    
    # Sync thread labels to reflect restored folders
    sync_thread_labels(db, thread_id, current_user.id, commit=True)
    
    logger.info(f"Thread {thread_id} restored from trash by user {current_user.id}")


@router.post("/{thread_id}/snooze", response_model=EmailResponse, dependencies=[Depends(authorized())])
def snooze_thread(
    thread_id: UUID,
    snooze_data: EmailSnoozeRequest,
    db: Session = Depends(get_db),
) -> dict:
    """Snooze a thread until a specific date and time.
    
    When snoozed, the thread is temporarily hidden from the inbox and will
    reappear at the specified snooze_until time.
    
    Permissions:
    - Users can only snooze threads they have access to (sent or received)
    """
    current_user = auth.user
    
    # Check if user has access to this thread
    user_email = db.query(Email).options(
        joinedload(Email.sender),
        selectinload(Email.recipients),
        selectinload(Email.attachments),
        joinedload(Email.thread)
            .selectinload(Thread.labels),
        joinedload(Email.thread)
            .selectinload(Thread.user_metadata),
    ).filter(
        Email.thread_id == thread_id,
        get_perspective_email_filter(db, current_user.id)
    ).first()
    
    if not user_email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Thread {thread_id} not found"
        )
    
    # Validate snooze_until is in the future
    if snooze_data.snooze_until <= datetime.now(UTC):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Snooze time must be in the future"
        )
    
    # Update snooze in ThreadUserMetadata (thread-level per user)
    metadata = db.query(ThreadUserMetadata).filter(
        ThreadUserMetadata.thread_id == thread_id,
        ThreadUserMetadata.user_id == current_user.id
    ).first()
    
    if metadata:
        metadata.snooze_until = snooze_data.snooze_until
    else:
        metadata = ThreadUserMetadata(
            thread_id=thread_id,
            user_id=current_user.id,
            snooze_until=snooze_data.snooze_until
        )
        db.add(metadata)
    
    try:
        db.commit()
        db.refresh(user_email)
    except Exception:
        db.rollback()
        raise
    
    # Sync thread labels to reflect snoozed state
    sync_thread_labels(db, thread_id, current_user.id, commit=True)
    
    logger.info(f"Thread {thread_id} snoozed until {snooze_data.snooze_until} by user {current_user.id}")
    
    return format_email_response(user_email, current_user.id)


@router.post("/{thread_id}/unsnooze", response_model=EmailResponse, dependencies=[Depends(authorized())])
def unsnooze_thread(
    thread_id: UUID,
    db: Session = Depends(get_db),
) -> dict:
    """Unsnooze a thread, making it immediately visible again.
    
    Permissions:
    - Users can only unsnooze threads they have access to (sent or received)
    """
    current_user = auth.user
    
    # Check if user has access to this thread
    user_email = db.query(Email).options(
        joinedload(Email.sender),
        selectinload(Email.recipients),
        selectinload(Email.attachments),
        joinedload(Email.thread)
            .selectinload(Thread.labels),
        joinedload(Email.thread)
            .selectinload(Thread.user_metadata),
    ).filter(
        Email.thread_id == thread_id,
        get_perspective_email_filter(db, current_user.id)
    ).first()
    
    if not user_email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Thread {thread_id} not found"
        )
    
    # Check snooze status in ThreadUserMetadata
    metadata = db.query(ThreadUserMetadata).filter(
        ThreadUserMetadata.thread_id == thread_id,
        ThreadUserMetadata.user_id == current_user.id
    ).first()
    
    if not metadata or not metadata.snooze_until:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Thread is not snoozed"
        )
    
    metadata.snooze_until = None
    
    try:
        db.commit()
        db.refresh(user_email)
    except Exception:
        db.rollback()
        raise
    
    # Sync thread labels to reflect unsnoozed state
    sync_thread_labels(db, thread_id, current_user.id, commit=True)
    
    logger.info(f"Thread {thread_id} unsnoozed by user {current_user.id}")
    
    return format_email_response(user_email, current_user.id)


@router.post("/{thread_id}/archive", response_model=EmailResponse, dependencies=[Depends(authorized())])
def archive_thread(
    thread_id: UUID,
    db: Session = Depends(get_db),
) -> dict:
    """Archive a thread.
    
    Sets is_archived=True in ThreadUserMetadata for the thread.
    Removes the INBOX label so thread doesn't appear in inbox.
    
    Permissions:
    - Users can only archive threads they have access to (sent or received)
    """
    current_user = auth.user
    
    # Check if user has access to this thread
    user_email = db.query(Email).options(
        joinedload(Email.sender),
        selectinload(Email.recipients),
        selectinload(Email.attachments),
        joinedload(Email.thread)
            .selectinload(Thread.labels),
        joinedload(Email.thread)
            .selectinload(Thread.user_metadata),
    ).filter(
        Email.thread_id == thread_id,
        get_perspective_email_filter(db, current_user.id)
    ).first()
    
    if not user_email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Thread {thread_id} not found"
        )
    
    # Update archive status in ThreadUserMetadata (thread-level per user)
    metadata = db.query(ThreadUserMetadata).filter(
        ThreadUserMetadata.thread_id == thread_id,
        ThreadUserMetadata.user_id == current_user.id
    ).first()
    
    if metadata:
        metadata.is_archived = True
    else:
        metadata = ThreadUserMetadata(
            thread_id=thread_id,
            user_id=current_user.id,
            is_archived=True
        )
        db.add(metadata)
    
    try:
        db.commit()
        db.refresh(user_email)
    except Exception:
        db.rollback()
        raise
    
    # Sync thread labels (archive removes INBOX since emails stay in their folders)
    # Note: Archive doesn't change email.folder, just metadata - so sync won't remove INBOX
    # We need to manually remove INBOX for archive since it's a special case
    remove_system_label_from_thread(db, thread_id, current_user.id, SystemLabel.INBOX, commit=True)
    
    logger.info(f"Thread {thread_id} archived by user {current_user.id}")
    
    return format_email_response(user_email, current_user.id)


@router.post("/{thread_id}/unarchive", response_model=EmailResponse, dependencies=[Depends(authorized())])
def unarchive_thread(
    thread_id: UUID,
    db: Session = Depends(get_db),
) -> dict:
    """Unarchive a thread.
    
    Sets is_archived=False in ThreadUserMetadata and restores Inbox/Sent label.
    
    Permissions:
    - Users can only unarchive threads they have access to (sent or received)
    """
    current_user = auth.user
    
    # Check if user has access to this thread
    user_email = db.query(Email).options(
        joinedload(Email.sender),
        selectinload(Email.recipients),
        selectinload(Email.attachments),
        joinedload(Email.thread)
            .selectinload(Thread.labels),
        joinedload(Email.thread)
            .selectinload(Thread.user_metadata),
    ).filter(
        Email.thread_id == thread_id,
        get_perspective_email_filter(db, current_user.id)
    ).first()
    
    if not user_email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Thread {thread_id} not found"
        )
    
    # Check archive status in ThreadUserMetadata
    metadata = db.query(ThreadUserMetadata).filter(
        ThreadUserMetadata.thread_id == thread_id,
        ThreadUserMetadata.user_id == current_user.id
    ).first()
    
    if not metadata or not metadata.is_archived:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Thread is not archived"
        )
    
    metadata.is_archived = False
    
    try:
        db.commit()
        db.refresh(user_email)
    except Exception:
        db.rollback()
        raise
    
    # Sync thread labels to restore appropriate labels based on email folders
    sync_thread_labels(db, thread_id, current_user.id, commit=True)
    
    logger.info(f"Thread {thread_id} unarchived by user {current_user.id}")
    
    return format_email_response(user_email, current_user.id)


@router.patch("/{thread_id}/important", response_model=EmailResponse, dependencies=[Depends(authorized())])
def mark_thread_important_endpoint(
    thread_id: UUID,
    important_data: EmailImportantUpdate,
    db: Session = Depends(get_db),
) -> dict:
    """Mark a thread as important or unimportant for the current user.

    This updates the thread-level is_important flag for the current user only.
    Other users' important status for the same thread is not affected.
    """
    current_user = auth.user
    
    # Check if user has access to this thread
    user_email = db.query(Email).options(
        joinedload(Email.sender),
        selectinload(Email.recipients),
        selectinload(Email.attachments),
        joinedload(Email.thread)
            .selectinload(Thread.labels),
        joinedload(Email.thread)
            .selectinload(Thread.user_metadata),
    ).filter(
        Email.thread_id == thread_id,
        get_perspective_email_filter(db, current_user.id)
    ).first()
    
    if not user_email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Thread {thread_id} not found"
        )
    
    # Update thread metadata for this user
    mark_thread_important(db, thread_id, current_user.id, important_data.is_important)
    
    try:
        db.commit()
        db.refresh(user_email)
    except Exception:
        db.rollback()
        raise
    
    # Sync thread labels to reflect important state
    sync_thread_labels(db, thread_id, current_user.id, commit=True)
    
    return format_email_response(user_email, current_user.id)


@router.patch("/{thread_id}/spam", response_model=ThreadOperationResponse, dependencies=[Depends(authorized())])
def mark_thread_spam_endpoint(
    thread_id: UUID,
    db: Session = Depends(get_db),
) -> ThreadOperationResponse:
    """Mark a thread as spam for the current user.

    This updates the folder of all user's emails in the thread to SPAM.
    Also adds the Spam system label accordingly.
    """
    current_user = auth.user
    
    # Check if user has access to this thread
    user_emails = db.query(Email).options(
        joinedload(Email.sender),
        selectinload(Email.recipients),
        selectinload(Email.attachments),
        joinedload(Email.thread)
            .selectinload(Thread.labels),
        joinedload(Email.thread)
            .selectinload(Thread.user_metadata),
    ).filter(
        Email.thread_id == thread_id,
        get_perspective_email_filter(db, current_user.id)
    ).all()
    
    if not user_emails:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Thread {thread_id} not found"
        )

    # Update all user's emails in this thread to spam folder
    for email in user_emails:
        email.folder = FolderType.SPAM.value
    
    emails_count = len(user_emails)
    
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    # Sync thread labels to reflect spam state
    sync_thread_labels(db, thread_id, current_user.id, commit=True)

    logger.info(f"Thread {thread_id} marked as spam by user {current_user.id}")

    return ThreadOperationResponse(
        success=True,
        message=f"Spam status updated for {emails_count} email(s) in thread",
        thread_id=thread_id,
        emails_count=emails_count
    )


@router.patch("/{thread_id}/unspam", response_model=ThreadOperationResponse, dependencies=[Depends(authorized())])
def unmark_thread_spam_endpoint(
    thread_id: UUID,
    db: Session = Depends(get_db),
) -> ThreadOperationResponse:
    """Unmark a thread as spam for the current user.

    This updates the folder of all user's emails in the thread to their appropriate folder:
    - Sent emails are restored to the 'sent' folder
    - Scheduled/queued emails are restored to the 'scheduled' folder
    - Received emails are restored to the 'inbox' folder
    - Draft emails are restored to the 'drafts' folder

    Also replaces the Spam system label with the appropriate label.
    """
    current_user = auth.user

    # Check if user has access to this thread
    user_emails = db.query(Email).options(
        joinedload(Email.sender),
        selectinload(Email.recipients),
        selectinload(Email.attachments),
        joinedload(Email.thread)
            .selectinload(Thread.labels),
        joinedload(Email.thread)
            .selectinload(Thread.user_metadata),
    ).filter(
        Email.thread_id == thread_id,
        get_perspective_email_filter(db, current_user.id)
    ).all()

    if not user_emails:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Thread {thread_id} not found"
        )

    # Update all user's emails in this thread to their appropriate folder based on status
    for email in user_emails:
        if email.status == EmailStatus.DRAFT.value:
            email.folder = FolderType.DRAFTS.value
        elif email.status == EmailStatus.QUEUED.value:
            email.folder = FolderType.SCHEDULED.value
        elif email.status == EmailStatus.SENT.value:
            email.folder = FolderType.SENT.value
        else:
            # For received emails or any other status, restore to inbox
            email.folder = FolderType.INBOX.value

    emails_count = len(user_emails)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    # Sync thread labels to reflect restored folders
    sync_thread_labels(db, thread_id, current_user.id, commit=True)

    logger.info(f"Thread {thread_id} marked as not spam by user {current_user.id}")

    return ThreadOperationResponse(
        success=True,
        message=f"Unmarked spam status for {emails_count} email(s) in thread",
        thread_id=thread_id,
        emails_count=emails_count
    )


@router.post("/{thread_id}/unstar", status_code=status.HTTP_200_OK, dependencies=[Depends(authorized())])
def unstar_thread(
    thread_id: UUID,
    db: Session = Depends(get_db),
) -> dict:
    """Unstar all emails in a thread for the current user.
    
    Removes the starred flag from all emails in the thread where the user
    is either the sender or recipient.
    
    Permissions:
    - Users can only unstar emails in threads they have access to
    """
    current_user = auth.user
    
    # Get all user's emails in this thread (perspective-aware)
    user_emails = db.query(Email).filter(
        Email.thread_id == thread_id,
        get_perspective_email_filter(db, current_user.id)
    ).all()
    
    if not user_emails:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Thread {thread_id} not found"
        )
    
    # Unstar all emails in the thread
    unstarred_count = 0
    for email in user_emails:
        if email.is_starred:
            email.is_starred = False
            unstarred_count += 1
    
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    
    # Sync thread labels to reflect starred state (removes STARRED if no emails are starred)
    sync_thread_labels(db, thread_id, current_user.id, commit=True)
    
    logger.info(f"Unstarred {unstarred_count} emails in thread {thread_id} for user {current_user.id}")
    
    return {
        "success": True,
        "message": f"Unstarred {unstarred_count} email(s) in thread",
        "thread_id": str(thread_id),
        "unstarred_count": unstarred_count
    }


@router.patch("/{thread_id}/read", response_model=ThreadOperationResponse, dependencies=[Depends(authorized())])
def mark_thread_read(
    thread_id: UUID,
    read_data: EmailReadUpdate,
    db: Session = Depends(get_db),
) -> ThreadOperationResponse:
    """Mark all emails in a thread as read or unread for the current user.
    
    Updates the is_read flag for all emails in the thread where the user
    is either the sender or recipient.
    
    Permissions:
    - Users can only mark emails in threads they have access to
    """
    current_user = auth.user
    
    # Get all user's emails in this thread (perspective-aware)
    user_emails = db.query(Email).filter(
        Email.thread_id == thread_id,
        get_perspective_email_filter(db, current_user.id)
    ).all()
    
    if not user_emails:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Thread {thread_id} not found"
        )
    
    # Update read status for all emails in the thread
    updated_count = 0
    for email in user_emails:
        if email.is_read != read_data.is_read:
            email.is_read = read_data.is_read
            updated_count += 1
    
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    
    # Sync thread labels
    sync_thread_labels(db, thread_id, current_user.id, commit=True)
    
    status_text = "read" if read_data.is_read else "unread"
    logger.info(f"Marked {updated_count} emails as {status_text} in thread {thread_id} for user {current_user.id}")
    
    return ThreadOperationResponse(
        message=f"Marked {updated_count} email(s) as {status_text} in thread",
        thread_id=thread_id,
        emails_affected=updated_count
    )
