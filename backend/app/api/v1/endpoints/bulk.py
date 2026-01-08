"""Bulk operations endpoints for emails.

This module provides:
- Bulk mark read/unread
- Bulk star/unstar
- Bulk move to folder
- Bulk delete
- Bulk label add/remove
- Bulk snooze/unsnooze
- Bulk archive
- Bulk category update
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Tuple
from datetime import datetime
from uuid import UUID
import logging

from app.db.session import get_db
from app.models.email import Email
from app.models.email_recipient import EmailRecipient
from app.models.label import Label
from app.models.thread import Thread
from app.models.thread_label import ThreadLabel
from app.schemas.bulk import (
    BulkImportantRequest, BulkReadRequest, BulkStarRequest, BulkMoveRequest, BulkDeleteRequest,
    BulkLabelAddRequest, BulkLabelRemoveRequest, BulkSnoozeRequest,
    BulkUnsnoozeRequest, BulkArchiveRequest, BulkCategoryRequest,
    BulkUnarchiveRequest, BulkSpamRequest, BulkUnspamRequest,
    BulkOperationResponse, BulkOperationResult
)
from app.auth.rbac import authorized
from app.auth.dependencies import auth
from app.core.constants import FolderType, EmailStatus, EmailCategory, SystemLabel, VALID_EMAIL_CATEGORIES, VALID_FOLDER_TYPES
from app.api.v1.endpoints.label_utils import (
    add_system_label_to_thread,
    remove_system_label_from_thread,
    replace_exclusive_labels,
    sync_category_labels,
)

logger = logging.getLogger(__name__)
router = APIRouter()


def get_user_accessible_emails(
    db: Session, 
    user_id: UUID, 
    email_ids: List[UUID]
) -> Tuple[List[Email], List[UUID]]:
    """
    Get emails that the user has access to (owned or received).
    
    Returns:
        Tuple of (accessible emails list, inaccessible email ids list)
    """
    # Query emails that user can access
    emails = db.query(Email).filter(
        Email.id.in_(email_ids),
        Email.is_deleted == False,
        or_(
            Email.sender_id == user_id,
            Email.id.in_(
                db.query(EmailRecipient.email_id).filter(
                    EmailRecipient.recipient_id == user_id
                )
            )
        )
    ).all()
    
    found_ids = {e.id for e in emails}
    not_found = [eid for eid in email_ids if eid not in found_ids]
    
    return emails, not_found


def get_user_accessible_threads(
    db: Session, 
    user_id: UUID, 
    thread_ids: List[UUID]
) -> Tuple[List[Thread], List[UUID]]:
    """
    Get threads that the user owns.
    
    Returns:
        Tuple of (accessible threads list, inaccessible thread ids list)
    """
    threads = db.query(Thread).filter(
        Thread.id.in_(thread_ids),
        Thread.owner_id == user_id,
        Thread.is_deleted == False
    ).all()
    
    found_ids = {t.id for t in threads}
    not_found = [tid for tid in thread_ids if tid not in found_ids]
    
    return threads, not_found


def create_bulk_response(
    item_ids: List[UUID],
    success_ids: List[UUID],
    failures: dict
) -> BulkOperationResponse:
    """Create standardized bulk operation response."""
    results = []
    for item_id in item_ids:
        if item_id in success_ids:
            results.append(BulkOperationResult(id=item_id, success=True, error=None))
        else:
            error_msg = failures.get(item_id, "Unknown error")
            results.append(BulkOperationResult(id=item_id, success=False, error=error_msg))
    
    return BulkOperationResponse(
        total_requested=len(item_ids),
        successful=len(success_ids),
        failed=len(failures),
        results=results
    )


@router.post("/bulk/read", response_model=BulkOperationResponse, dependencies=[Depends(authorized())])
def bulk_mark_read(
    request: BulkReadRequest,
    db: Session = Depends(get_db),
) -> BulkOperationResponse:
    """Mark multiple emails as read or unread.
    
    Permissions:
    - Users can only modify their own emails (sent or received)
    """
    current_user = auth.user
    
    emails, not_found = get_user_accessible_emails(db, current_user.id, request.email_ids)
    
    success_ids = []
    failures = {eid: "Email not found or access denied" for eid in not_found}
    
    for email in emails:
        try:
            email.is_read = request.is_read
            success_ids.append(email.id)
        except Exception as e:
            failures[email.id] = str(e)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Bulk read operation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Bulk operation failed"
        )
    
    logger.info(f"Bulk read: {len(success_ids)} emails marked {'read' if request.is_read else 'unread'} by user {current_user.id}")
    
    return create_bulk_response(request.email_ids, success_ids, failures)


@router.post("/bulk/star", response_model=BulkOperationResponse, dependencies=[Depends(authorized())])
def bulk_star(
    request: BulkStarRequest,
    db: Session = Depends(get_db),
) -> BulkOperationResponse:
    """Star or unstar multiple emails.
    
    Permissions:
    - Users can only modify their own emails
    """
    current_user = auth.user
    
    emails, not_found = get_user_accessible_emails(db, current_user.id, request.email_ids)
    
    success_ids = []
    failures = {eid: "Email not found or access denied" for eid in not_found}
    
    for email in emails:
        try:
            email.is_starred = request.is_starred
            success_ids.append(email.id)
        except Exception as e:
            failures[email.id] = str(e)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Bulk star operation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Bulk operation failed"
        )
    
    logger.info(f"Bulk star: {len(success_ids)} emails {'starred' if request.is_starred else 'unstarred'} by user {current_user.id}")
    
    return create_bulk_response(request.email_ids, success_ids, failures)

@router.post("/bulk/important", response_model=BulkOperationResponse, dependencies=[Depends(authorized())])
def bulk_important(
    request: BulkImportantRequest,
    db: Session = Depends(get_db),
) -> BulkOperationResponse:
    """Important or un important multiple emails.
    
    Permissions:
    - Users can only modify their own emails
    """
    current_user = auth.user
    
    emails, not_found = get_user_accessible_emails(db, current_user.id, request.email_ids)
    
    success_ids = []
    failures = {eid: "Email not found or access denied" for eid in not_found}
    
    for email in emails:
        try:
            email.is_important = request.is_important
            success_ids.append(email.id)
        except Exception as e:
            failures[email.id] = str(e)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Bulk important operation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Bulk operation failed"
        )
    
    logger.info(f"Bulk important: {len(success_ids)} emails {'important' if request.is_important else 'unimportant'} by user {current_user.id}")
    
    return create_bulk_response(request.email_ids, success_ids, failures)


# Mapping from folder type to system label enum
FOLDER_TO_LABEL = {
    FolderType.INBOX.value: SystemLabel.INBOX,
    FolderType.SENT.value: SystemLabel.SENT,
    FolderType.DRAFTS.value: SystemLabel.DRAFTS,
    FolderType.TRASH.value: SystemLabel.TRASH,
    FolderType.SPAM.value: SystemLabel.SPAM,
    FolderType.SCHEDULED.value: SystemLabel.SCHEDULED,
}


@router.post("/bulk/move", response_model=BulkOperationResponse, dependencies=[Depends(authorized())])
def bulk_move(
    request: BulkMoveRequest,
    db: Session = Depends(get_db),
) -> BulkOperationResponse:
    """Move multiple emails to a folder.
    
    Permissions:
    - Users can only move their own emails
    """
    current_user = auth.user
    
    # Validate folder type
    if request.folder not in VALID_FOLDER_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid folder. Must be one of: {', '.join(VALID_FOLDER_TYPES)}"
        )
    
    emails, not_found = get_user_accessible_emails(db, current_user.id, request.email_ids)
    
    success_ids = []
    failures = {eid: "Email not found or access denied" for eid in not_found}
    
    # Get target label name
    target_label = FOLDER_TO_LABEL.get(request.folder)
    
    for email in emails:
        try:
            email.folder = request.folder
            # Update labels to match folder change
            if email.thread_id and target_label:
                replace_exclusive_labels(db, email.thread_id, current_user.id, target_label)
            success_ids.append(email.id)
        except Exception as e:
            failures[email.id] = str(e)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Bulk move operation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Bulk operation failed"
        )
    
    logger.info(f"Bulk move: {len(success_ids)} emails moved to folder {request.folder} by user {current_user.id}")
    
    return create_bulk_response(request.email_ids, success_ids, failures)


@router.post("/bulk/delete", response_model=BulkOperationResponse, dependencies=[Depends(authorized())])
def bulk_delete(
    request: BulkDeleteRequest,
    db: Session = Depends(get_db),
) -> BulkOperationResponse:
    """Delete multiple emails.
    
    If permanent=False (default), moves emails to trash.
    If permanent=True or already in trash, permanently deletes (soft delete).
    
    Permissions:
    - Users can only delete their own emails
    """
    current_user = auth.user
    
    emails, not_found = get_user_accessible_emails(db, current_user.id, request.email_ids)
    
    success_ids = []
    failures = {eid: "Email not found or access denied" for eid in not_found}
    
    for email in emails:
        try:
            if request.permanent or email.folder == FolderType.TRASH.value:
                # Permanent delete (soft delete)
                email.is_deleted = True
            else:
                # Move to trash
                email.folder = FolderType.TRASH.value
                # Update labels: Replace with Trash
                if email.thread_id:
                    replace_exclusive_labels(db, email.thread_id, current_user.id, SystemLabel.TRASH)
            success_ids.append(email.id)
        except Exception as e:
            failures[email.id] = str(e)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Bulk delete operation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Bulk operation failed"
        )
    
    action = "permanently deleted" if request.permanent else "moved to trash"
    logger.info(f"Bulk delete: {len(success_ids)} emails {action} by user {current_user.id}")
    
    return create_bulk_response(request.email_ids, success_ids, failures)


@router.post("/bulk/labels/add", response_model=BulkOperationResponse, dependencies=[Depends(authorized())])
def bulk_add_labels(
    request: BulkLabelAddRequest,
    db: Session = Depends(get_db),
) -> BulkOperationResponse:
    """Replace all labels on multiple threads with new ones.
    
    This operation drops all existing labels from the threads and assigns
    the new labels provided in the request.
    
    Permissions:
    - Users can only modify their own threads
    - Labels must belong to the user
    """
    current_user = auth.user
    
    # Verify labels belong to user
    labels = db.query(Label).filter(
        Label.id.in_(request.label_ids),
        Label.owner_id == current_user.id,
        Label.is_deleted == False
    ).all()
    
    valid_label_ids = {l.id for l in labels}
    invalid_labels = [lid for lid in request.label_ids if lid not in valid_label_ids]
    
    if invalid_labels:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid label IDs: {invalid_labels}"
        )
    
    threads, not_found = get_user_accessible_threads(db, current_user.id, request.thread_ids)
    
    failures = {tid: "Thread not found or access denied" for tid in not_found}
    success_ids = [t.id for t in threads]
    
    if not success_ids:
        return create_bulk_response(request.thread_ids, success_ids, failures)
    
    try:
        # Bulk delete all existing labels for these threads (only this user's label associations)
        db.query(ThreadLabel).filter(
            ThreadLabel.thread_id.in_(success_ids),
            ThreadLabel.user_id == current_user.id
        ).delete(synchronize_session=False)
        
        # Bulk insert new labels for all threads (with user_id for user-specific isolation)
        new_thread_labels = [
            ThreadLabel(thread_id=thread_id, label_id=label_id, user_id=current_user.id)
            for thread_id in success_ids
            for label_id in request.label_ids
        ]
        db.bulk_save_objects(new_thread_labels)
        
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Bulk add labels operation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Bulk operation failed"
        )
    
    logger.info(f"Bulk assign labels: {len(success_ids)} threads re-labeled by user {current_user.id}")
    
    return create_bulk_response(request.thread_ids, success_ids, failures)


@router.post("/bulk/labels/remove", response_model=BulkOperationResponse, dependencies=[Depends(authorized())])
def bulk_remove_labels(
    request: BulkLabelRemoveRequest,
    db: Session = Depends(get_db),
) -> BulkOperationResponse:
    """Remove specified labels from multiple threads.
    
    Permissions:
    - Users can only modify their own threads
    - Labels must belong to the user
    """
    current_user = auth.user
    
    # Verify labels belong to user
    labels = db.query(Label).filter(
        Label.id.in_(request.label_ids),
        Label.owner_id == current_user.id,
        Label.is_deleted == False
    ).all()
    
    valid_label_ids = {l.id for l in labels}
    invalid_labels = [lid for lid in request.label_ids if lid not in valid_label_ids]
    
    if invalid_labels:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid label IDs: {invalid_labels}"
        )
    
    threads, not_found = get_user_accessible_threads(db, current_user.id, request.thread_ids)
    
    failures = {tid: "Thread not found or access denied" for tid in not_found}
    success_ids = [t.id for t in threads]
    
    if not success_ids:
        return create_bulk_response(request.thread_ids, success_ids, failures)
    
    try:
        # Bulk delete specified labels for these threads (only this user's label associations)
        db.query(ThreadLabel).filter(
            ThreadLabel.thread_id.in_(success_ids),
            ThreadLabel.label_id.in_(request.label_ids),
            ThreadLabel.user_id == current_user.id
        ).delete(synchronize_session=False)
        
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Bulk remove labels operation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Bulk operation failed"
        )
    
    logger.info(f"Bulk remove labels: labels removed from {len(success_ids)} threads by user {current_user.id}")
    
    return create_bulk_response(request.thread_ids, success_ids, failures)


@router.post("/bulk/snooze", response_model=BulkOperationResponse, dependencies=[Depends(authorized())])
def bulk_snooze(
    request: BulkSnoozeRequest,
    db: Session = Depends(get_db),
) -> BulkOperationResponse:
    """Snooze multiple emails until a specific date/time.
    
    Permissions:
    - Users can only snooze their own emails
    """
    current_user = auth.user
    
    # Validate snooze time is in the future
    if request.snooze_until <= datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Snooze time must be in the future"
        )
    
    emails, not_found = get_user_accessible_emails(db, current_user.id, request.email_ids)
    
    success_ids = []
    failures = {eid: "Email not found or access denied" for eid in not_found}
    
    for email in emails:
        try:
            email.snooze_until = request.snooze_until
            # Add Snoozed label
            if email.thread_id:
                add_system_label_to_thread(db, email.thread_id, current_user.id, SystemLabel.SNOOZED)
            success_ids.append(email.id)
        except Exception as e:
            failures[email.id] = str(e)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Bulk snooze operation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Bulk operation failed"
        )
    
    logger.info(f"Bulk snooze: {len(success_ids)} emails snoozed until {request.snooze_until} by user {current_user.id}")
    
    return create_bulk_response(request.email_ids, success_ids, failures)


@router.post("/bulk/unsnooze", response_model=BulkOperationResponse, dependencies=[Depends(authorized())])
def bulk_unsnooze(
    request: BulkUnsnoozeRequest,
    db: Session = Depends(get_db),
) -> BulkOperationResponse:
    """Unsnooze multiple emails.
    
    Permissions:
    - Users can only unsnooze their own emails
    """
    current_user = auth.user
    
    emails, not_found = get_user_accessible_emails(db, current_user.id, request.email_ids)
    
    success_ids = []
    failures = {eid: "Email not found or access denied" for eid in not_found}
    
    for email in emails:
        try:
            email.snooze_until = None
            # Remove Snoozed label and add Inbox back
            if email.thread_id:
                remove_system_label_from_thread(db, email.thread_id, current_user.id, SystemLabel.SNOOZED)
                add_system_label_to_thread(db, email.thread_id, current_user.id, SystemLabel.INBOX)
            success_ids.append(email.id)
        except Exception as e:
            failures[email.id] = str(e)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Bulk unsnooze operation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Bulk operation failed"
        )
    
    logger.info(f"Bulk unsnooze: {len(success_ids)} emails unsnoozed by user {current_user.id}")
    
    return create_bulk_response(request.email_ids, success_ids, failures)


@router.post("/bulk/archive", response_model=BulkOperationResponse, dependencies=[Depends(authorized())])
def bulk_archive(
    request: BulkArchiveRequest,
    db: Session = Depends(get_db),
) -> BulkOperationResponse:
    """Archive multiple emails.
    
    Archives emails by setting their status to 'archived'.
    
    Permissions:
    - Users can only archive their own emails
    """
    current_user = auth.user
    
    emails, not_found = get_user_accessible_emails(db, current_user.id, request.email_ids)
    
    success_ids = []
    failures = {eid: "Email not found or access denied" for eid in not_found}
    
    for email in emails:
        try:
            email.status = EmailStatus.ARCHIVED.value
            # Remove Inbox label (email stays in All Mail)
            if email.thread_id:
                remove_system_label_from_thread(db, email.thread_id, current_user.id, SystemLabel.INBOX)
            success_ids.append(email.id)
        except Exception as e:
            failures[email.id] = str(e)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Bulk archive operation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Bulk operation failed"
        )
    
    logger.info(f"Bulk archive: {len(success_ids)} emails archived by user {current_user.id}")
    
    return create_bulk_response(request.email_ids, success_ids, failures)


@router.post("/bulk/category", response_model=BulkOperationResponse, dependencies=[Depends(authorized())])
def bulk_update_category(
    request: BulkCategoryRequest,
    db: Session = Depends(get_db),
) -> BulkOperationResponse:
    """Update category for multiple emails.
    
    Categories: primary, promotions, social, updates, forums (Gmail-style tabs).
    
    Permissions:
    - Users can only update category on their own emails
    """
    current_user = auth.user
    
    # Validate category
    if request.category not in VALID_EMAIL_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid category. Must be one of: {', '.join(VALID_EMAIL_CATEGORIES)}"
        )
    
    emails, not_found = get_user_accessible_emails(db, current_user.id, request.email_ids)
    
    success_ids = []
    failures = {eid: "Email not found or access denied" for eid in not_found}
    
    new_category = EmailCategory(request.category)
    
    for email in emails:
        try:
            old_category = EmailCategory(email.category) if email.category else None
            email.category = request.category
            # Sync category labels
            if email.thread_id:
                sync_category_labels(db, email.thread_id, current_user.id, old_category, new_category)
            success_ids.append(email.id)
        except Exception as e:
            failures[email.id] = str(e)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Bulk category update operation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Bulk operation failed"
        )
    
    logger.info(f"Bulk category: {len(success_ids)} emails updated to '{request.category}' by user {current_user.id}")
    
    return create_bulk_response(request.email_ids, success_ids, failures)


@router.post("/bulk/unarchive", response_model=BulkOperationResponse, dependencies=[Depends(authorized())])
def bulk_unarchive(
    request: BulkUnarchiveRequest,
    db: Session = Depends(get_db),
) -> BulkOperationResponse:
    """Unarchive multiple emails.
    
    Restores archived emails back to their original status (sent or received).
    
    Permissions:
    - Users can only unarchive their own emails
    """
    current_user = auth.user
    
    emails, not_found = get_user_accessible_emails(db, current_user.id, request.email_ids)
    
    success_ids = []
    failures = {eid: "Email not found or access denied" for eid in not_found}
    
    for email in emails:
        try:
            if email.status != EmailStatus.ARCHIVED.value:
                failures[email.id] = "Email is not archived"
                continue
            
            # Restore to original status based on whether user sent or received it
            if email.sender_id == current_user.id:
                email.status = EmailStatus.SENT.value
                # Add Sent label back
                if email.thread_id:
                    add_system_label_to_thread(db, email.thread_id, current_user.id, SystemLabel.SENT)
            else:
                email.status = EmailStatus.RECEIVED.value
                # Add Inbox label back
                if email.thread_id:
                    add_system_label_to_thread(db, email.thread_id, current_user.id, SystemLabel.INBOX)
            success_ids.append(email.id)
        except Exception as e:
            failures[email.id] = str(e)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Bulk unarchive operation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Bulk operation failed"
        )
    
    logger.info(f"Bulk unarchive: {len(success_ids)} emails unarchived by user {current_user.id}")
    
    return create_bulk_response(request.email_ids, success_ids, failures)


@router.post("/bulk/spam", response_model=BulkOperationResponse, dependencies=[Depends(authorized())])
def bulk_spam(
    request: BulkSpamRequest,
    db: Session = Depends(get_db),
) -> BulkOperationResponse:
    """Mark multiple emails as spam.
    
    Moves emails to the spam folder.
    
    Permissions:
    - Users can only mark their own emails as spam
    """
    current_user = auth.user
    
    emails, not_found = get_user_accessible_emails(db, current_user.id, request.email_ids)
    
    success_ids = []
    failures = {eid: "Email not found or access denied" for eid in not_found}
    
    for email in emails:
        try:
            if email.folder == FolderType.SPAM.value:
                failures[email.id] = "Email is already marked as spam"
                continue
            
            email.folder = FolderType.SPAM.value
            # Update labels: Replace with Spam
            if email.thread_id:
                replace_exclusive_labels(db, email.thread_id, current_user.id, SystemLabel.SPAM)
            success_ids.append(email.id)
        except Exception as e:
            failures[email.id] = str(e)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Bulk spam operation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Bulk operation failed"
        )
    
    logger.info(f"Bulk spam: {len(success_ids)} emails marked as spam by user {current_user.id}")
    
    return create_bulk_response(request.email_ids, success_ids, failures)


@router.post("/bulk/unspam", response_model=BulkOperationResponse, dependencies=[Depends(authorized())])
def bulk_unspam(
    request: BulkUnspamRequest,
    db: Session = Depends(get_db),
) -> BulkOperationResponse:
    """Remove spam mark from multiple emails.
    
    Moves emails from spam folder back to inbox.
    
    Permissions:
    - Users can only unmark their own emails from spam
    """
    current_user = auth.user
    
    emails, not_found = get_user_accessible_emails(db, current_user.id, request.email_ids)
    
    success_ids = []
    failures = {eid: "Email not found or access denied" for eid in not_found}
    
    for email in emails:
        try:
            if email.folder != FolderType.SPAM.value:
                failures[email.id] = "Email is not in spam folder"
                continue
            
            email.folder = FolderType.INBOX.value
            # Update labels: Replace Spam with Inbox
            if email.thread_id:
                replace_exclusive_labels(db, email.thread_id, current_user.id, SystemLabel.INBOX)
            success_ids.append(email.id)
        except Exception as e:
            failures[email.id] = str(e)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Bulk unspam operation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Bulk operation failed"
        )
    
    logger.info(f"Bulk unspam: {len(success_ids)} emails removed from spam by user {current_user.id}")
    
    return create_bulk_response(request.email_ids, success_ids, failures)
