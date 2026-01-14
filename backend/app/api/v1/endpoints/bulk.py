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
from datetime import UTC, datetime
import logging

from app.db.session import get_db
from app.models.email import Email
from app.models.email_recipient import EmailRecipient
from app.models.label import Label
from app.models.thread_label import ThreadLabel
from app.models.thread_user_metadata import ThreadUserMetadata
from app.schemas.bulk import (
    BulkImportantRequest, BulkReadRequest, BulkStarRequest, BulkMoveRequest, BulkDeleteRequest,
    BulkLabelsUpdateRequest, BulkSnoozeRequest,
    BulkUnsnoozeRequest, BulkArchiveRequest, BulkCategoryRequest,
    BulkUnarchiveRequest, BulkSpamRequest, BulkUnspamRequest,
    BulkOperationResponse,
)
from app.auth.rbac import authorized
from app.auth.dependencies import auth
from app.core.constants import FolderType, EmailCategory, SystemLabel, VALID_EMAIL_CATEGORIES, VALID_FOLDER_TYPES
from app.utils.label_utils import (
    bulk_add_system_label_to_threads,
    bulk_remove_system_label_from_threads,
    bulk_replace_exclusive_labels,
    bulk_sync_category_labels,
)
from app.utils.bulk_utils import (
    get_user_accessible_emails,
    get_user_accessible_threads,
    create_bulk_response,
    bulk_update_emails_with_threads,
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

    # Get accessible email IDs (without loading full objects)
    accessible_ids = db.query(Email.id).filter(
        Email.id.in_(request.email_ids),
        or_(
            Email.sender_id == current_user.id,
            Email.id.in_(
                db.query(EmailRecipient.email_id).filter(
                    EmailRecipient.recipient_id == current_user.id
                )
            )
        )
    ).all()

    success_ids = [eid[0] for eid in accessible_ids]
    not_found = [eid for eid in request.email_ids if eid not in success_ids]
    failures = {eid: "Email not found or access denied" for eid in not_found}

    # Bulk update with single query
    if success_ids:
        try:
            db.query(Email).filter(
                Email.id.in_(success_ids)
            ).update({Email.is_read: request.is_read}, synchronize_session=False)

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

    # Get accessible email IDs (without loading full objects)
    accessible_ids = db.query(Email.id).filter(
        Email.id.in_(request.email_ids),
        or_(
            Email.sender_id == current_user.id,
            Email.id.in_(
                db.query(EmailRecipient.email_id).filter(
                    EmailRecipient.recipient_id == current_user.id
                )
            )
        )
    ).all()

    success_ids = [eid[0] for eid in accessible_ids]
    not_found = [eid for eid in request.email_ids if eid not in success_ids]
    failures = {eid: "Email not found or access denied" for eid in not_found}

    # Bulk update with single query
    if success_ids:
        try:
            db.query(Email).filter(
                Email.id.in_(success_ids)
            ).update({Email.is_starred: request.is_starred}, synchronize_session=False)

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
    """Mark or unmark multiple threads as important.

    Since is_important is thread-level and user-specific, this operation
    updates ThreadUserMetadata for the provided threads.

    Permissions:
    - Users can only modify their own threads
    """
    current_user = auth.user

    # Get threads that user owns
    threads, not_found = get_user_accessible_threads(db, current_user.id, request.thread_ids)

    success_ids = [t.id for t in threads]
    failures = {tid: "Thread not found or access denied" for tid in not_found}

    if success_ids:
        try:
            # Get existing metadata records
            existing = db.query(ThreadUserMetadata).filter(
                ThreadUserMetadata.thread_id.in_(success_ids),
                ThreadUserMetadata.user_id == current_user.id
            ).all()

            existing_thread_ids = {meta.thread_id for meta in existing}

            # Bulk update existing records
            if existing:
                db.query(ThreadUserMetadata).filter(
                    ThreadUserMetadata.thread_id.in_(success_ids),
                    ThreadUserMetadata.user_id == current_user.id
                ).update({ThreadUserMetadata.is_important: request.is_important}, synchronize_session=False)

            # Bulk insert new records for threads without metadata
            new_metadata = [
                ThreadUserMetadata(
                    thread_id=tid,
                    user_id=current_user.id,
                    is_important=request.is_important
                )
                for tid in success_ids
                if tid not in existing_thread_ids
            ]

            if new_metadata:
                db.bulk_save_objects(new_metadata)

            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Bulk important operation failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Bulk operation failed"
            )

    logger.info(f"Bulk important: {len(success_ids)} threads marked {'important' if request.is_important else 'unimportant'} by user {current_user.id}")

    return create_bulk_response(request.thread_ids, success_ids, failures)


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

    # Get accessible emails and their thread IDs
    email_threads = db.query(Email.id, Email.thread_id).filter(
        Email.id.in_(request.email_ids),
        or_(
            Email.sender_id == current_user.id,
            Email.id.in_(
                db.query(EmailRecipient.email_id).filter(
                    EmailRecipient.recipient_id == current_user.id
                )
            )
        )
    ).all()

    success_ids = [et[0] for et in email_threads]
    not_found = [eid for eid in request.email_ids if eid not in success_ids]
    failures = {eid: "Email not found or access denied" for eid in not_found}

    # Get unique thread IDs
    thread_ids = list(set([et[1] for et in email_threads if et[1] is not None]))

    if success_ids:
        try:
            # Bulk update folder for all emails
            db.query(Email).filter(
                Email.id.in_(success_ids)
            ).update({Email.folder: request.folder}, synchronize_session=False)

            # Bulk update labels for all threads
            target_label = FOLDER_TO_LABEL.get(request.folder)
            if thread_ids and target_label:
                bulk_replace_exclusive_labels(db, thread_ids, current_user.id, target_label, commit=False)

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
def bulk_delete(request: BulkDeleteRequest, db: Session = Depends(get_db)):
    current_user = auth.user

    # 1. Fetch accessible email IDs + folder + thread_id only
    rows = (
        db.query(Email.id, Email.folder, Email.thread_id)
        .filter(
            Email.id.in_(request.email_ids),
            or_(
                Email.sender_id == current_user.id,
                Email.id.in_(
                    db.query(EmailRecipient.email_id).filter(
                        EmailRecipient.recipient_id == current_user.id
                    )
                )
            )
        )
        .all()
    )

    accessible_ids = {r.id for r in rows}
    failures = {
        eid: "Email not found or access denied"
        for eid in request.email_ids
        if eid not in accessible_ids
    }

    if not rows:
        return create_bulk_response(request.email_ids, [], failures)

    trash_ids = {r.id for r in rows if r.folder == FolderType.TRASH.value}
    non_trash_ids = {r.id for r in rows if r.folder != FolderType.TRASH.value}
    thread_ids = {r.thread_id for r in rows if r.thread_id}

    try:
        # 2. Permanent delete
        if request.permanent or trash_ids:
            db.query(Email).filter(
                Email.id.in_(trash_ids if not request.permanent else accessible_ids)
            ).delete(
                synchronize_session=False
            )

        # 3. Move remaining to trash
        if non_trash_ids and not request.permanent:
            db.query(Email).filter(
                Email.id.in_(non_trash_ids)
            ).update(
                {Email.folder: FolderType.TRASH.value},
                synchronize_session=False
            )

            # 4. Replace labels for affected threads
            if thread_ids:
                bulk_replace_exclusive_labels(
                    db,
                    list(thread_ids),
                    current_user.id,
                    SystemLabel.TRASH,
                    commit=False
                )

        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Bulk delete failed: {e}")
        raise HTTPException(500, "Bulk operation failed")

    success_ids = list(accessible_ids)

    logger.info(
        f"Bulk delete optimized: {len(success_ids)} emails processed "
        f"(permanent={request.permanent}) by user {current_user.id}"
    )

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
        "thread_ids": ["uuid1", "uuid2"],
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

    # Get threads that user owns
    threads, not_found = get_user_accessible_threads(db, current_user.id, request.thread_ids)

    success_ids = [t.id for t in threads]
    failures = {tid: "Thread not found or access denied" for tid in not_found}

    if not success_ids:
        return create_bulk_response(request.thread_ids, [], failures)

    try:
        # Remove specified labels if any
        if request.labels.remove:
            db.query(ThreadLabel).filter(
                ThreadLabel.thread_id.in_(success_ids),
                ThreadLabel.label_id.in_(request.labels.remove),
                ThreadLabel.user_id == current_user.id
            ).delete(synchronize_session=False)

        # Add specified labels if any
        if request.labels.add:
            # Get existing label associations to avoid duplicates
            existing = db.query(ThreadLabel).filter(
                ThreadLabel.thread_id.in_(success_ids),
                ThreadLabel.label_id.in_(request.labels.add),
                ThreadLabel.user_id == current_user.id
            ).all()

            existing_pairs = {(tl.thread_id, tl.label_id) for tl in existing}

            # Create new thread label associations
            new_thread_labels = [
                ThreadLabel(thread_id=thread_id, label_id=label_id, user_id=current_user.id)
                for thread_id in success_ids
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
        f"{len(request.labels.remove)} labels removed from {len(success_ids)} threads by user {current_user.id}"
    )

    return create_bulk_response(request.thread_ids, success_ids, failures)


@router.post("/bulk/snooze", response_model=BulkOperationResponse, dependencies=[Depends(authorized())])
def bulk_snooze(
    request: BulkSnoozeRequest,
    db: Session = Depends(get_db),
) -> BulkOperationResponse:
    """Snooze multiple threads until a specific date/time.

    Since snooze is thread-level and user-specific, this operation updates
    ThreadUserMetadata for the provided threads.

    Optimized to use bulk upsert operations.

    Permissions:
    - Users can only snooze their own threads
    """
    current_user = auth.user

    # Validate snooze time is in the future
    if request.snooze_until <= datetime.now(UTC):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Snooze time must be in the future"
        )

    # Get threads that user owns
    threads, not_found = get_user_accessible_threads(db, current_user.id, request.thread_ids)

    success_ids = [t.id for t in threads]
    failures = {tid: "Thread not found or access denied" for tid in not_found}

    if success_ids:
        try:
            # Get existing metadata records
            existing = db.query(ThreadUserMetadata).filter(
                ThreadUserMetadata.thread_id.in_(success_ids),
                ThreadUserMetadata.user_id == current_user.id
            ).all()

            existing_thread_ids = {meta.thread_id for meta in existing}

            # Bulk update existing records
            if existing:
                db.query(ThreadUserMetadata).filter(
                    ThreadUserMetadata.thread_id.in_(success_ids),
                    ThreadUserMetadata.user_id == current_user.id
                ).update({ThreadUserMetadata.snooze_until: request.snooze_until}, synchronize_session=False)

            # Bulk insert new records for threads without metadata
            new_metadata = [
                ThreadUserMetadata(
                    thread_id=tid,
                    user_id=current_user.id,
                    snooze_until=request.snooze_until
                )
                for tid in success_ids
                if tid not in existing_thread_ids
            ]

            if new_metadata:
                db.bulk_save_objects(new_metadata)

            # Add Snoozed label to all threads
            bulk_add_system_label_to_threads(db, success_ids, current_user.id, SystemLabel.SNOOZED)

            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Bulk snooze operation failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Bulk operation failed"
            )

    logger.info(f"Bulk snooze: {len(success_ids)} threads snoozed until {request.snooze_until} by user {current_user.id}")

    return create_bulk_response(request.thread_ids, success_ids, failures)


@router.post("/bulk/unsnooze", response_model=BulkOperationResponse, dependencies=[Depends(authorized())])
def bulk_unsnooze(
    request: BulkUnsnoozeRequest,
    db: Session = Depends(get_db),
) -> BulkOperationResponse:
    """Unsnooze multiple threads.

    Since snooze is thread-level and user-specific, this operation updates
    ThreadUserMetadata for the provided threads.

    Optimized to use bulk operations.

    Permissions:
    - Users can only unsnooze their own threads
    """
    current_user = auth.user

    # Get threads that user owns
    threads, not_found = get_user_accessible_threads(db, current_user.id, request.thread_ids)

    success_ids = [t.id for t in threads]
    failures = {tid: "Thread not found or access denied" for tid in not_found}

    if success_ids:
        try:
            # Bulk update ThreadUserMetadata to clear snooze
            db.query(ThreadUserMetadata).filter(
                ThreadUserMetadata.thread_id.in_(success_ids),
                ThreadUserMetadata.user_id == current_user.id
            ).update({ThreadUserMetadata.snooze_until: None}, synchronize_session=False)

            # Remove Snoozed label and add Inbox label
            bulk_remove_system_label_from_threads(db, success_ids, current_user.id, SystemLabel.SNOOZED)
            bulk_add_system_label_to_threads(db, success_ids, current_user.id, SystemLabel.INBOX)

            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Bulk unsnooze operation failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Bulk operation failed"
            )

    logger.info(f"Bulk unsnooze: {len(success_ids)} threads unsnoozed by user {current_user.id}")

    return create_bulk_response(request.thread_ids, success_ids, failures)


@router.post("/bulk/archive", response_model=BulkOperationResponse, dependencies=[Depends(authorized())])
def bulk_archive(
    request: BulkArchiveRequest,
    db: Session = Depends(get_db),
) -> BulkOperationResponse:
    """Archive multiple threads.

    Since archive is thread-level and user-specific, this operation updates
    ThreadUserMetadata for the provided threads.

    Optimized to use bulk upsert operations.

    Permissions:
    - Users can only archive their own threads
    """
    current_user = auth.user

    # Get threads that user owns
    threads, not_found = get_user_accessible_threads(db, current_user.id, request.thread_ids)

    success_ids = [t.id for t in threads]
    failures = {tid: "Thread not found or access denied" for tid in not_found}

    if success_ids:
        try:
            # Get existing metadata records
            existing = db.query(ThreadUserMetadata).filter(
                ThreadUserMetadata.thread_id.in_(success_ids),
                ThreadUserMetadata.user_id == current_user.id
            ).all()

            existing_thread_ids = {meta.thread_id for meta in existing}

            # Bulk update existing records
            if existing:
                db.query(ThreadUserMetadata).filter(
                    ThreadUserMetadata.thread_id.in_(success_ids),
                    ThreadUserMetadata.user_id == current_user.id
                ).update({ThreadUserMetadata.is_archived: True}, synchronize_session=False)

            # Bulk insert new records for threads without metadata
            new_metadata = [
                ThreadUserMetadata(
                    thread_id=tid,
                    user_id=current_user.id,
                    is_archived=True
                )
                for tid in success_ids
                if tid not in existing_thread_ids
            ]

            if new_metadata:
                db.bulk_save_objects(new_metadata)

            # Remove Inbox label (emails stay in All Mail)
            bulk_remove_system_label_from_threads(db, success_ids, current_user.id, SystemLabel.INBOX)

            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Bulk archive operation failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Bulk operation failed"
            )

    logger.info(f"Bulk archive: {len(success_ids)} threads archived by user {current_user.id}")

    return create_bulk_response(request.thread_ids, success_ids, failures)


@router.post("/bulk/category", response_model=BulkOperationResponse, dependencies=[Depends(authorized())])
def bulk_update_category(
    request: BulkCategoryRequest,
    db: Session = Depends(get_db),
) -> BulkOperationResponse:
    """Update category for multiple emails.

    Optimized to use generic bulk update helper with batch category label sync.

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

    new_category = EmailCategory(request.category)

    # Get emails with their current categories and thread IDs
    email_data = db.query(Email.id, Email.thread_id, Email.category).filter(
        Email.id.in_(request.email_ids),
        or_(
            Email.sender_id == current_user.id,
            Email.id.in_(
                db.query(EmailRecipient.email_id).filter(
                    EmailRecipient.recipient_id == current_user.id
                )
            )
        )
    ).all()

    success_ids = [ed[0] for ed in email_data]
    not_found = [eid for eid in request.email_ids if eid not in success_ids]
    failures = {eid: "Email not found or access denied" for eid in not_found}

    # Build thread category mapping for bulk sync
    thread_category_map = {}
    for email_id, thread_id, old_cat_str in email_data:
        if thread_id:
            old_category = EmailCategory(old_cat_str) if old_cat_str else None
            thread_category_map[thread_id] = (old_category, new_category)

    if success_ids:
        try:
            # Bulk update category for all emails
            db.query(Email).filter(
                Email.id.in_(success_ids)
            ).update({Email.category: request.category}, synchronize_session=False)

            # Bulk sync category labels
            if thread_category_map:
                bulk_sync_category_labels(db, thread_category_map, current_user.id, commit=False)

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
    """Unarchive multiple threads.

    Since archive is thread-level and user-specific, this operation updates
    ThreadUserMetadata for the provided threads.

    Optimized to use bulk operations.

    Permissions:
    - Users can only unarchive their own threads
    """
    current_user = auth.user

    # Get threads that user owns
    threads, not_found = get_user_accessible_threads(db, current_user.id, request.thread_ids)

    success_ids = [t.id for t in threads]
    failures = {tid: "Thread not found or access denied" for tid in not_found}

    if success_ids:
        try:
            # Bulk update ThreadUserMetadata to unarchive
            db.query(ThreadUserMetadata).filter(
                ThreadUserMetadata.thread_id.in_(success_ids),
                ThreadUserMetadata.user_id == current_user.id
            ).update({ThreadUserMetadata.is_archived: False}, synchronize_session=False)

            # Add Inbox label back
            bulk_add_system_label_to_threads(db, success_ids, current_user.id, SystemLabel.INBOX)

            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Bulk unarchive operation failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Bulk operation failed"
            )

    logger.info(f"Bulk unarchive: {len(success_ids)} threads unarchived by user {current_user.id}")

    return create_bulk_response(request.thread_ids, success_ids, failures)


@router.post("/bulk/spam", response_model=BulkOperationResponse, dependencies=[Depends(authorized())])
def bulk_spam(
    request: BulkSpamRequest,
    db: Session = Depends(get_db),
) -> BulkOperationResponse:
    """Mark multiple emails as spam.

    Optimized to use generic bulk update helper with single UPDATE query.

    Moves emails to the spam folder.

    Permissions:
    - Users can only mark their own emails as spam
    """
    current_user = auth.user

    try:
        # Use generic helper - filter out emails already in spam
        success_ids, thread_ids, failures = bulk_update_emails_with_threads(
            db=db,
            user_id=current_user.id,
            email_ids=request.email_ids,
            email_updates={Email.folder: FolderType.SPAM.value},
            label_operation=lambda tids: bulk_replace_exclusive_labels(
                db, tids, current_user.id, SystemLabel.SPAM
            ),
            additional_filters=[Email.folder != FolderType.SPAM.value]
        )

        # Mark already-spam emails as failures
        for eid in request.email_ids:
            if eid not in success_ids and eid not in failures:
                failures[eid] = "Email is already marked as spam"

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

    Optimized to use generic bulk update helper with single UPDATE query.

    Moves emails from spam folder back to inbox.

    Permissions:
    - Users can only unmark their own emails from spam
    """
    current_user = auth.user

    try:
        # Use generic helper - filter only emails in spam folder
        success_ids, thread_ids, failures = bulk_update_emails_with_threads(
            db=db,
            user_id=current_user.id,
            email_ids=request.email_ids,
            email_updates={Email.folder: FolderType.INBOX.value},
            label_operation=lambda tids: bulk_replace_exclusive_labels(
                db, tids, current_user.id, SystemLabel.INBOX
            ),
            additional_filters=[Email.folder == FolderType.SPAM.value]
        )

        # Mark non-spam emails as failures
        for eid in request.email_ids:
            if eid not in success_ids and eid not in failures:
                failures[eid] = "Email is not in spam folder"

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
