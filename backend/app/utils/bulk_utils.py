"""Utility functions for bulk email operations.

This module provides helper functions for:
- Getting user accessible emails and threads
- Creating standardized bulk operation responses
- Generic bulk email update with thread label support
"""

from typing import Callable, Tuple, Dict, List
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.email import Email
from app.models.email_recipient import EmailRecipient
from app.models.thread import Thread
from app.schemas.bulk import BulkOperationResponse, BulkOperationResult


def get_user_accessible_emails(
    db: Session, 
    user_id: UUID, 
    email_ids: List[UUID]
) -> Tuple[List[Email], List[UUID]]:
    """
    Get emails that the user has access to (owned or received).
    
    Args:
        db: Database session
        user_id: User ID to check access for
        email_ids: List of email IDs to check
    
    Returns:
        Tuple of (accessible emails list, inaccessible email ids list)
    """
    # Query emails that user can access
    emails = db.query(Email).filter(
        Email.id.in_(email_ids),
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
    
    Args:
        db: Database session
        user_id: User ID to check ownership for
        thread_ids: List of thread IDs to check
    
    Returns:
        Tuple of (accessible threads list, inaccessible thread ids list)
    """
    threads = db.query(Thread).filter(
        Thread.id.in_(thread_ids),
        Thread.owner_id == user_id
    ).all()
    
    found_ids = {t.id for t in threads}
    not_found = [tid for tid in thread_ids if tid not in found_ids]
    
    return threads, not_found


def create_bulk_response(
    item_ids: List[UUID],
    success_ids: List[UUID],
    failures: dict
) -> BulkOperationResponse:
    """Create standardized bulk operation response.
    
    Args:
        item_ids: All item IDs that were requested
        success_ids: IDs of successfully processed items
        failures: Dict mapping failed IDs to error messages
        
    Returns:
        BulkOperationResponse with detailed results
    """
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


def bulk_update_emails_with_threads(
    db: Session,
    user_id: UUID,
    email_ids: List[UUID],
    email_updates: Dict[str, any] = None,
    label_operation: Callable[[List[UUID]], None] = None,
    additional_filters: List = None
) -> Tuple[List[UUID], List[UUID], Dict[UUID, str]]:
    """Generic bulk email update with thread label support.

    This is the core pattern used by most bulk operations:
    1. Get accessible email IDs and thread IDs in single query
    2. Bulk UPDATE emails table with single query
    3. Apply label operations to threads (if provided)

    Args:
        db: Database session
        user_id: Current user ID
        email_ids: List of email IDs to update
        email_updates: Dict of column:value pairs to update on Email model
        label_operation: Optional callable that takes list of thread_ids
        additional_filters: Additional filter conditions for the query

    Returns:
        Tuple of (success_email_ids, thread_ids, failures_dict)
    """
    # Build query to get accessible emails with their thread IDs
    query = db.query(Email.id, Email.thread_id).filter(
        Email.id.in_(email_ids),
        or_(
            Email.sender_id == user_id,
            Email.id.in_(
                db.query(EmailRecipient.email_id).filter(
                    EmailRecipient.recipient_id == user_id
                )
            )
        )
    )

    # Apply additional filters if provided
    if additional_filters:
        for filter_condition in additional_filters:
            query = query.filter(filter_condition)

    # Execute query
    email_threads = query.all()

    success_ids = [et[0] for et in email_threads]
    not_found = [eid for eid in email_ids if eid not in success_ids]
    failures = {eid: "Email not found or access denied" for eid in not_found}

    # Get unique thread IDs
    thread_ids = list(set([et[1] for et in email_threads if et[1] is not None]))

    # Bulk update emails if we have updates and accessible emails
    if email_updates and success_ids:
        db.query(Email).filter(
            Email.id.in_(success_ids)
        ).update(email_updates, synchronize_session=False)

    # Apply label operation to threads if provided
    if label_operation and thread_ids:
        label_operation(thread_ids)

    return success_ids, thread_ids, failures
