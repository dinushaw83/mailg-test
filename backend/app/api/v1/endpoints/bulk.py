"""Bulk operations endpoints for emails.

This module provides:
- Bulk mark read/unread
- Bulk star/unstar
- Bulk move to folder
- Bulk delete
- Bulk label add/remove
- Bulk snooze/unsnooze
- Bulk archive
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
    BulkUnsnoozeRequest, BulkArchiveRequest,
    BulkUnarchiveRequest, BulkSpamRequest, BulkUnspamRequest,
    BulkThreadUnstarRequest, BulkThreadReadRequest,
    BulkOperationResponse,
)
from app.auth.rbac import authorized
from app.auth.dependencies import auth
from app.core.constants import FolderType, SystemLabel, VALID_FOLDER_TYPES
from app.utils.label_utils import (
    bulk_remove_system_label_from_threads,
    bulk_sync_thread_labels,
)
from app.utils.bulk_utils import (
    get_user_accessible_threads,
    create_bulk_response,
    bulk_update_emails_with_threads,
)
from app.utils.email_utils import get_perspective_email_filter, ensure_utc_aware

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

    # Get accessible email IDs (without loading full objects) - perspective-aware
    accessible_ids = db.query(Email.id).filter(
        Email.id.in_(request.email_ids),
        get_perspective_email_filter(db, current_user.id)
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

    # Get accessible email IDs (without loading full objects) - perspective-aware
    accessible_ids = db.query(Email.id).filter(
        Email.id.in_(request.email_ids),
        get_perspective_email_filter(db, current_user.id)
    ).all()

    success_ids = [eid[0] for eid in accessible_ids]
    not_found = [eid for eid in request.email_ids if eid not in success_ids]
    failures = {eid: "Email not found or access denied" for eid in not_found}

    # Bulk update with single query
    if success_ids:
        try:
            # Get thread IDs for affected emails (for label sync)
            email_threads = db.query(Email.thread_id).filter(
                Email.id.in_(success_ids),
                Email.thread_id.isnot(None)
            ).distinct().all()
            thread_ids = [et[0] for et in email_threads]

            db.query(Email).filter(
                Email.id.in_(success_ids)
            ).update({Email.is_starred: request.is_starred}, synchronize_session=False)

            db.commit()

            # Sync thread labels to reflect starred state
            if thread_ids:
                bulk_sync_thread_labels(db, thread_ids, current_user.id, commit=True)
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

            # Sync thread labels to reflect important state
            bulk_sync_thread_labels(db, success_ids, current_user.id, commit=True)
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

    # Get accessible emails and their thread IDs (perspective-aware)
    email_threads = db.query(Email.id, Email.thread_id).filter(
        Email.id.in_(request.email_ids),
        get_perspective_email_filter(db, current_user.id)
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

            # When moving to inbox, clear the archived status in ThreadUserMetadata
            if request.folder == FolderType.INBOX.value and thread_ids:
                db.query(ThreadUserMetadata).filter(
                    ThreadUserMetadata.thread_id.in_(thread_ids),
                    ThreadUserMetadata.user_id == current_user.id,
                    ThreadUserMetadata.is_archived == True
                ).update({ThreadUserMetadata.is_archived: False}, synchronize_session=False)

            db.commit()

            # Sync thread labels to reflect the folder changes
            if thread_ids:
                bulk_sync_thread_labels(db, thread_ids, current_user.id, commit=True)
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

    # 1. Fetch accessible email IDs + folder + thread_id only (perspective-aware)
    rows = (
        db.query(Email.id, Email.folder, Email.thread_id)
        .filter(
            Email.id.in_(request.email_ids),
            get_perspective_email_filter(db, current_user.id)
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

        db.commit()

        # 4. Sync labels for affected threads (only for non-permanent delete)
        if thread_ids and not request.permanent:
            bulk_sync_thread_labels(db, list(thread_ids), current_user.id, commit=True)
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
    if ensure_utc_aware(request.snooze_until) <= datetime.now(UTC):
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

            db.commit()

            # Sync thread labels to reflect snoozed state
            bulk_sync_thread_labels(db, success_ids, current_user.id, commit=True)
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

            db.commit()

            # Sync thread labels to reflect unsnoozed state
            bulk_sync_thread_labels(db, success_ids, current_user.id, commit=True)
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

            db.commit()

            # Sync thread labels to restore appropriate labels based on email folders
            bulk_sync_thread_labels(db, success_ids, current_user.id, commit=True)
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
            label_operation=None,  # We'll sync labels after commit
            additional_filters=[Email.folder != FolderType.SPAM.value]
        )

        # Mark already-spam emails as failures
        for eid in request.email_ids:
            if eid not in success_ids and eid not in failures:
                failures[eid] = "Email is already marked as spam"

        db.commit()

        # Sync thread labels to reflect spam state
        if thread_ids:
            bulk_sync_thread_labels(db, thread_ids, current_user.id, commit=True)
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

    Moves emails from spam folder back to their appropriate folder:
    - Sent emails are restored to the 'sent' folder
    - Scheduled/queued emails are restored to the 'scheduled' folder
    - Received emails are restored to the 'inbox' folder
    - Draft emails are restored to the 'drafts' folder

    Permissions:
    - Users can only unmark their own emails from spam
    """
    current_user = auth.user

    try:
        # Fetch accessible spam emails with their status and thread_id (perspective-aware)
        spam_emails = db.query(Email.id, Email.status, Email.thread_id).filter(
            Email.id.in_(request.email_ids),
            Email.folder == FolderType.SPAM.value,
            get_perspective_email_filter(db, current_user.id)
        ).all()

        success_ids = [e.id for e in spam_emails]
        not_found = [eid for eid in request.email_ids if eid not in success_ids]
        failures = {eid: "Email not found, access denied, or not in spam folder" for eid in not_found}

        if spam_emails:
            from app.core.constants import EmailStatus

            # Group emails by target folder based on status
            drafts = [e for e in spam_emails if e.status == EmailStatus.DRAFT.value]
            scheduled = [e for e in spam_emails if e.status == EmailStatus.QUEUED.value]
            sent = [e for e in spam_emails if e.status == EmailStatus.SENT.value]
            inbox = [e for e in spam_emails if e.status not in [EmailStatus.DRAFT.value, EmailStatus.QUEUED.value, EmailStatus.SENT.value]]

            # Bulk update each group to its appropriate folder
            # Collect all affected thread IDs
            all_thread_ids = set()

            if drafts:
                draft_ids = [e.id for e in drafts]
                db.query(Email).filter(Email.id.in_(draft_ids)).update(
                    {Email.folder: FolderType.DRAFTS.value},
                    synchronize_session=False
                )
                all_thread_ids.update(e.thread_id for e in drafts if e.thread_id)

            if scheduled:
                scheduled_ids = [e.id for e in scheduled]
                db.query(Email).filter(Email.id.in_(scheduled_ids)).update(
                    {Email.folder: FolderType.SCHEDULED.value},
                    synchronize_session=False
                )
                all_thread_ids.update(e.thread_id for e in scheduled if e.thread_id)

            if sent:
                sent_ids = [e.id for e in sent]
                db.query(Email).filter(Email.id.in_(sent_ids)).update(
                    {Email.folder: FolderType.SENT.value},
                    synchronize_session=False
                )
                all_thread_ids.update(e.thread_id for e in sent if e.thread_id)

            if inbox:
                inbox_ids = [e.id for e in inbox]
                db.query(Email).filter(Email.id.in_(inbox_ids)).update(
                    {Email.folder: FolderType.INBOX.value},
                    synchronize_session=False
                )
                all_thread_ids.update(e.thread_id for e in inbox if e.thread_id)

            db.commit()

            # Sync thread labels to reflect restored folders
            if all_thread_ids:
                bulk_sync_thread_labels(db, list(all_thread_ids), current_user.id, commit=True)

    except Exception as e:
        db.rollback()
        logger.error(f"Bulk unspam operation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Bulk operation failed"
        )

    logger.info(f"Bulk unspam: {len(success_ids)} emails removed from spam by user {current_user.id}")

    return create_bulk_response(request.email_ids, success_ids, failures)

@router.post("/bulk/threads/unstar", response_model=BulkOperationResponse, dependencies=[Depends(authorized())])
def bulk_thread_unstar(
    request: BulkThreadUnstarRequest,
    db: Session = Depends(get_db),
) -> BulkOperationResponse:
    """Unstar all emails in multiple threads.

    Sets is_starred=False for all emails in the specified threads where the user
    is either the sender or recipient.

    Optimized to use a single bulk UPDATE query for all emails across all threads.

    Permissions:
    - Users can only unstar emails in threads they have access to
    """
    current_user = auth.user

    # Get accessible threads
    threads, not_found = get_user_accessible_threads(db, current_user.id, request.thread_ids)

    success_ids = [t.id for t in threads]
    failures = {tid: "Thread not found or access denied" for tid in not_found}

    if success_ids:
        try:
            # Bulk update all emails in the accessible threads with single query
            # Only update emails from user's perspective
            db.query(Email).filter(
                Email.thread_id.in_(success_ids),
                get_perspective_email_filter(db, current_user.id)
            ).update({Email.is_starred: False}, synchronize_session=False)

            db.commit()

            # Sync thread labels to reflect unstarred state
            bulk_sync_thread_labels(db, success_ids, current_user.id, commit=True)
        except Exception as e:
            db.rollback()
            logger.error(f"Bulk thread unstar operation failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Bulk operation failed"
            )

    logger.info(f"Bulk thread unstar: {len(success_ids)} threads unstarred by user {current_user.id}")

    return create_bulk_response(request.thread_ids, success_ids, failures)


@router.post("/bulk/threads/read", response_model=BulkOperationResponse, dependencies=[Depends(authorized())])
def bulk_thread_read(
    request: BulkThreadReadRequest,
    db: Session = Depends(get_db),
) -> BulkOperationResponse:
    """Mark all emails in multiple threads as read or unread.

    Sets is_read for all emails in the specified threads where the user
    is either the sender or recipient.

    Optimized to use a single bulk UPDATE query for all emails across all threads.

    Permissions:
    - Users can only mark emails in threads they have access to
    """
    current_user = auth.user

    # Get accessible threads
    threads, not_found = get_user_accessible_threads(db, current_user.id, request.thread_ids)

    success_ids = [t.id for t in threads]
    failures = {tid: "Thread not found or access denied" for tid in not_found}

    if success_ids:
        try:
            # Bulk update all emails in the accessible threads with single query
            # Only update emails from user's perspective
            db.query(Email).filter(
                Email.thread_id.in_(success_ids),
                get_perspective_email_filter(db, current_user.id)
            ).update({Email.is_read: request.is_read}, synchronize_session=False)

            db.commit()

            # Sync thread labels
            bulk_sync_thread_labels(db, success_ids, current_user.id, commit=True)
        except Exception as e:
            db.rollback()
            logger.error(f"Bulk thread read operation failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Bulk operation failed"
            )

    status_text = "read" if request.is_read else "unread"
    logger.info(f"Bulk thread read: {len(success_ids)} threads marked as {status_text} by user {current_user.id}")

    return create_bulk_response(request.thread_ids, success_ids, failures)
