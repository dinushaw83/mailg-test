"""Utility functions for bulk email operations.

This module provides helper functions for:
- Getting user accessible emails and threads
- Creating standardized bulk operation responses
"""

from typing import List, Tuple
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
