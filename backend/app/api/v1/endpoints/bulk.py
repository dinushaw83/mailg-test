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
from app.models.email_label import EmailLabel
from app.schemas.bulk import (
    BulkReadRequest, BulkStarRequest, BulkMoveRequest, BulkDeleteRequest,
    BulkLabelAddRequest, BulkLabelRemoveRequest, BulkSnoozeRequest,
    BulkUnsnoozeRequest, BulkArchiveRequest, BulkCategoryRequest,
    BulkUnarchiveRequest, BulkSpamRequest, BulkUnspamRequest,
    BulkOperationResponse, BulkOperationResult
)
from app.auth.rbac import authorized
from app.auth.dependencies import auth
from app.core.constants import FolderType, EmailStatus, VALID_EMAIL_CATEGORIES, VALID_FOLDER_TYPES

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


def create_bulk_response(
    email_ids: List[UUID],
    success_ids: List[UUID],
    failures: dict
) -> BulkOperationResponse:
    """Create standardized bulk operation response."""
    results = []
    for eid in email_ids:
        if eid in success_ids:
            results.append(BulkOperationResult(id=eid, success=True, error=None))
        else:
            error_msg = failures.get(eid, "Unknown error")
            results.append(BulkOperationResult(id=eid, success=False, error=error_msg))
    
    return BulkOperationResponse(
        total_requested=len(email_ids),
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
    
    for email in emails:
        try:
            email.folder = request.folder
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
    """Replace all labels on multiple emails with new ones.
    
    This operation drops all existing labels from the emails and assigns
    the new labels provided in the request.
    
    Permissions:
    - Users can only modify their own emails
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
    
    emails, not_found = get_user_accessible_emails(db, current_user.id, request.email_ids)
    
    failures = {eid: "Email not found or access denied" for eid in not_found}
    success_ids = [email.id for email in emails]
    
    if not success_ids:
        return create_bulk_response(request.email_ids, success_ids, failures)
    
    try:
        # Bulk delete all existing labels for these emails
        db.query(EmailLabel).filter(
            EmailLabel.email_id.in_(success_ids)
        ).delete(synchronize_session=False)
        
        # Bulk insert new labels for all emails
        new_email_labels = [
            EmailLabel(email_id=email_id, label_id=label_id)
            for email_id in success_ids
            for label_id in request.label_ids
        ]
        db.bulk_save_objects(new_email_labels)
        
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Bulk add labels operation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Bulk operation failed"
        )
    
    logger.info(f"Bulk assign labels: {len(success_ids)} emails re-labeled by user {current_user.id}")
    
    return create_bulk_response(request.email_ids, success_ids, failures)


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
    
    for email in emails:
        try:
            email.category = request.category
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
            else:
                email.status = EmailStatus.RECEIVED.value
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
