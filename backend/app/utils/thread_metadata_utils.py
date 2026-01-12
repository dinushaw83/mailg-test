"""Utility functions for managing thread user metadata (is_important, etc.)."""

from uuid import UUID
from sqlalchemy.orm import Session
from app.models.thread_user_metadata import ThreadUserMetadata


def mark_thread_important(
    db: Session,
    thread_id: UUID,
    user_id: UUID,
    is_important: bool = True
) -> ThreadUserMetadata:
    """Mark a thread as important/unimportant for a specific user.

    Args:
        db: Database session
        thread_id: Thread ID
        user_id: User ID
        is_important: True to mark as important, False to unmark

    Returns:
        ThreadUserMetadata record
    """
    # Check if metadata record exists
    metadata = db.query(ThreadUserMetadata).filter(
        ThreadUserMetadata.thread_id == thread_id,
        ThreadUserMetadata.user_id == user_id
    ).first()

    if metadata:
        # Update existing record
        metadata.is_important = is_important
    else:
        # Create new record
        metadata = ThreadUserMetadata(
            thread_id=thread_id,
            user_id=user_id,
            is_important=is_important
        )
        db.add(metadata)

    return metadata


def get_thread_is_important(
    db: Session,
    thread_id: UUID,
    user_id: UUID
) -> bool:
    """Check if a thread is marked as important by a specific user.

    Args:
        db: Database session
        thread_id: Thread ID
        user_id: User ID

    Returns:
        True if thread is marked as important by the user, False otherwise
    """
    metadata = db.query(ThreadUserMetadata).filter(
        ThreadUserMetadata.thread_id == thread_id,
        ThreadUserMetadata.user_id == user_id
    ).first()

    return metadata.is_important if metadata else False


def get_user_important_thread_ids(
    db: Session,
    user_id: UUID
) -> list[UUID]:
    """Get all thread IDs marked as important by a specific user.

    Args:
        db: Database session
        user_id: User ID

    Returns:
        List of thread IDs marked as important
    """
    metadata_records = db.query(ThreadUserMetadata.thread_id).filter(
        ThreadUserMetadata.user_id == user_id,
        ThreadUserMetadata.is_important == True
    ).all()

    return [record[0] for record in metadata_records]


def mark_thread_spam(
    db: Session,
    thread_id: UUID,
    user_id: UUID,
    is_spam: bool = True
) -> ThreadUserMetadata:
    """Mark a thread as spam/not spam for a specific user.

    Args:
        db: Database session
        thread_id: Thread ID
        user_id: User ID
        is_spam: True to mark as spam, False to unmark

    Returns:
        ThreadUserMetadata record
    """
    # Check if metadata record exists
    metadata = db.query(ThreadUserMetadata).filter(
        ThreadUserMetadata.thread_id == thread_id,
        ThreadUserMetadata.user_id == user_id
    ).first()

    if metadata:
        # Update existing record
        metadata.is_spam = is_spam
    else:
        # Create new record
        metadata = ThreadUserMetadata(
            thread_id=thread_id,
            user_id=user_id,
            is_spam=is_spam
        )
        db.add(metadata)

    return metadata
