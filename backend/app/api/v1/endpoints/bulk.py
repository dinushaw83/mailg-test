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
from datetime import datetime
import logging

from app.db.session import get_db
from app.models.label import Label
from app.models.thread_label import ThreadLabel
from app.schemas.bulk import (
    BulkImportantRequest, BulkReadRequest, BulkStarRequest, BulkMoveRequest, BulkDeleteRequest,
    BulkLabelsUpdateRequest, BulkSnoozeRequest,
    BulkUnsnoozeRequest, BulkArchiveRequest, BulkCategoryRequest,
    BulkUnarchiveRequest, BulkSpamRequest, BulkUnspamRequest,
    BulkOperationResponse,
)
from app.auth.rbac import authorized
from app.auth.dependencies import auth
from app.core.constants import FolderType, EmailStatus, EmailCategory, SystemLabel, VALID_EMAIL_CATEGORIES, VALID_FOLDER_TYPES
from app.utils.label_utils import (
    add_system_label_to_thread,
    remove_system_label_from_thread,
    replace_exclusive_labels,
    sync_category_labels,
)
from app.utils.bulk_utils import (
    get_user_accessible_emails,
    get_user_accessible_threads,
    create_bulk_response,
)
from app.utils.email_utils import FOLDER_TO_LABEL

logger = logging.getLogger(__name__)
router = APIRouter()


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
    If permanent=True or already in trash, permanently deletes.
    
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
                # Permanently delete
                db.delete(email)
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


@router.post("/bulk/labels/update", response_model=BulkOperationResponse, dependencies=[Depends(authorized())])
def bulk_update_labels(
    request: BulkLabelsUpdateRequest,
    db: Session = Depends(get_db),
) -> BulkOperationResponse:
    """Update labels on multiple threads by adding and/or removing labels.

    This endpoint allows you to add and remove labels in a single operation.
    You can specify which labels to add and which to remove.

    Permissions:
    - Users can only modify their own threads
    - Labels must belong to the user

    Example request:
    {
        "email_ids": ["uuid1", "uuid2"],
        "labels": {
            "add": ["label_uuid1", "label_uuid2"],
            "remove": ["label_uuid3"]
        }
    }
    """
    current_user = auth.user

    # Combine all label IDs to validate
    all_label_ids = list(set(request.labels.add + request.labels.remove))

    if not all_label_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must specify at least one label to add or remove"
        )

    # Verify all labels belong to user
    labels = db.query(Label).filter(
        Label.id.in_(all_label_ids),
        Label.owner_id == current_user.id
    ).all()

    valid_label_ids = {l.id for l in labels}
    invalid_labels = [lid for lid in all_label_ids if lid not in valid_label_ids]

    if invalid_labels:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid label IDs: {invalid_labels}"
        )

    # Get threads from email IDs
    emails, not_found = get_user_accessible_emails(db, current_user.id, request.email_ids)

    # Extract unique thread IDs
    thread_ids = list(set(email.thread_id for email in emails if email.thread_id))

    if not thread_ids:
        failures = {eid: "Email not found, access denied, or no thread associated" for eid in request.email_ids}
        return create_bulk_response(request.email_ids, [], failures)

    # Verify thread access
    threads, _ = get_user_accessible_threads(db, current_user.id, thread_ids)
    success_thread_ids = [t.id for t in threads]

    # Map back to email IDs for response
    success_email_ids = [email.id for email in emails if email.thread_id in success_thread_ids]
    failed_email_ids = [eid for eid in request.email_ids if eid not in success_email_ids]
    failures = {eid: "Email not found, access denied, or no thread associated" for eid in failed_email_ids}

    if not success_thread_ids:
        return create_bulk_response(request.email_ids, success_email_ids, failures)

    try:
        # Remove specified labels if any
        if request.labels.remove:
            db.query(ThreadLabel).filter(
                ThreadLabel.thread_id.in_(success_thread_ids),
                ThreadLabel.label_id.in_(request.labels.remove),
                ThreadLabel.user_id == current_user.id
            ).delete(synchronize_session=False)

        # Add specified labels if any
        if request.labels.add:
            # Get existing label associations to avoid duplicates
            existing = db.query(ThreadLabel).filter(
                ThreadLabel.thread_id.in_(success_thread_ids),
                ThreadLabel.label_id.in_(request.labels.add),
                ThreadLabel.user_id == current_user.id
            ).all()

            existing_pairs = {(tl.thread_id, tl.label_id) for tl in existing}

            # Create new thread label associations
            new_thread_labels = [
                ThreadLabel(thread_id=thread_id, label_id=label_id, user_id=current_user.id)
                for thread_id in success_thread_ids
                for label_id in request.labels.add
                if (thread_id, label_id) not in existing_pairs
            ]

            if new_thread_labels:
                db.bulk_save_objects(new_thread_labels)

        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Bulk update labels operation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Bulk operation failed"
        )

    logger.info(
        f"Bulk update labels: {len(request.labels.add)} labels added, "
        f"{len(request.labels.remove)} labels removed from {len(success_thread_ids)} threads by user {current_user.id}"
    )

    return create_bulk_response(request.email_ids, success_email_ids, failures)


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
