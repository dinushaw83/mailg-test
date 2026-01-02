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
import logging

from app.db.session import get_db
from app.models.email import Email
from app.models.email_recipient import EmailRecipient
from app.models.folder import Folder
from app.models.label import Label
from app.models.email_label import EmailLabel
from app.schemas.bulk import (
    BulkReadRequest, BulkStarRequest, BulkMoveRequest, BulkDeleteRequest,
    BulkLabelAddRequest, BulkLabelRemoveRequest, BulkSnoozeRequest,
    BulkUnsnoozeRequest, BulkArchiveRequest, BulkCategoryRequest,
    BulkOperationResponse, BulkOperationResult
)
from app.auth.rbac import authorized
from app.auth.dependencies import auth
from app.core.constants import FolderType, EmailStatus, VALID_EMAIL_CATEGORIES

logger = logging.getLogger(__name__)
router = APIRouter()


def get_user_accessible_emails(
    db: Session, 
    user_id: int, 
    email_ids: List[int]
) -> Tuple[List[Email], List[int]]:
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


def get_user_folder(db: Session, user_id: int, folder_type: str) -> Folder:
    """Get user's folder by type."""
    return db.query(Folder).filter(
        Folder.owner_id == user_id,
        Folder.folder_type == folder_type,
        Folder.is_deleted == False
    ).first()


def create_bulk_response(
    email_ids: List[int],
    success_ids: List[int],
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
    - Target folder must belong to the user
    """
    current_user = auth.user
    
    # Verify folder belongs to user
    folder = db.query(Folder).filter(
        Folder.id == request.folder_id,
        Folder.owner_id == current_user.id,
        Folder.is_deleted == False
    ).first()
    
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid folder ID or folder not found"
        )
    
    emails, not_found = get_user_accessible_emails(db, current_user.id, request.email_ids)
    
    success_ids = []
    failures = {eid: "Email not found or access denied" for eid in not_found}
    
    for email in emails:
        try:
            email.folder_id = folder.id
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
    
    logger.info(f"Bulk move: {len(success_ids)} emails moved to folder {folder.id} by user {current_user.id}")
    
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
    
    trash_folder = get_user_folder(db, current_user.id, FolderType.TRASH.value)
    
    emails, not_found = get_user_accessible_emails(db, current_user.id, request.email_ids)
    
    success_ids = []
    failures = {eid: "Email not found or access denied" for eid in not_found}
    
    for email in emails:
        try:
            if request.permanent or (trash_folder and email.folder_id == trash_folder.id):
                # Permanent delete (soft delete)
                email.is_deleted = True
            else:
                # Move to trash
                if trash_folder:
                    email.folder_id = trash_folder.id
                else:
                    # No trash folder, just soft delete
                    email.is_deleted = True
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
    """Add labels to multiple emails.
    
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
    
    success_ids = []
    failures = {eid: "Email not found or access denied" for eid in not_found}
    
    for email in emails:
        try:
            # Get existing labels for this email
            existing_labels = db.query(EmailLabel.label_id).filter(
                EmailLabel.email_id == email.id,
                EmailLabel.label_id.in_(request.label_ids)
            ).all()
            existing_label_ids = {el.label_id for el in existing_labels}
            
            # Add only new labels
            for label_id in request.label_ids:
                if label_id not in existing_label_ids:
                    email_label = EmailLabel(email_id=email.id, label_id=label_id)
                    db.add(email_label)
            
            success_ids.append(email.id)
        except Exception as e:
            failures[email.id] = str(e)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Bulk add labels operation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Bulk operation failed"
        )
    
    logger.info(f"Bulk add labels: {len(success_ids)} emails labeled by user {current_user.id}")
    
    return create_bulk_response(request.email_ids, success_ids, failures)


@router.post("/bulk/labels/remove", response_model=BulkOperationResponse, dependencies=[Depends(authorized())])
def bulk_remove_labels(
    request: BulkLabelRemoveRequest,
    db: Session = Depends(get_db),
) -> BulkOperationResponse:
    """Remove labels from multiple emails.
    
    Permissions:
    - Users can only modify their own emails
    """
    current_user = auth.user
    
    emails, not_found = get_user_accessible_emails(db, current_user.id, request.email_ids)
    
    success_ids = []
    failures = {eid: "Email not found or access denied" for eid in not_found}
    
    for email in emails:
        try:
            # Remove the specified labels
            db.query(EmailLabel).filter(
                EmailLabel.email_id == email.id,
                EmailLabel.label_id.in_(request.label_ids)
            ).delete(synchronize_session=False)
            
            success_ids.append(email.id)
        except Exception as e:
            failures[email.id] = str(e)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Bulk remove labels operation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Bulk operation failed"
        )
    
    logger.info(f"Bulk remove labels: {len(success_ids)} emails unlabeled by user {current_user.id}")
    
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

