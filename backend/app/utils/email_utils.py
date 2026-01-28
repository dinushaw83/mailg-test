"""Utility functions for email formatting and operations.

This module provides helper functions for:
- Email snippet extraction
- Label hierarchy name building
- Email response formatting
- Background email operations
- Email delivery to recipients
"""

import re
import logging
from datetime import UTC, datetime
from typing import Optional, List
from uuid import UUID
from sqlalchemy.orm import Session

from sqlalchemy import and_, or_

from app.core.constants import (
    EmailStatus, FolderType, SystemLabel
)
from app.utils.label_utils import (
    sync_thread_labels,
)

logger = logging.getLogger(__name__)

# Sender statuses - these emails belong to the sender's perspective
SENDER_STATUSES = [
    EmailStatus.DRAFT.value,
    EmailStatus.QUEUED.value,
    EmailStatus.SENT.value,
    EmailStatus.CANCELLED.value,
]


def ensure_utc_aware(dt: Optional[datetime]) -> Optional[datetime]:
    """Ensure datetime is timezone-aware (UTC).
    
    If the datetime is naive (no timezone info), assumes it represents UTC time.
    This is needed because some database operations or Pydantic parsing may
    return naive datetimes, which cannot be compared with timezone-aware ones.
    
    Args:
        dt: A datetime object (naive or aware) or None
        
    Returns:
        Timezone-aware datetime (UTC) or None if input was None
    """
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt


def get_perspective_email_filter(db: Session, user_id: UUID):
    """Get SQLAlchemy filter for user's emails from their perspective.
    
    This filter ensures users only see emails they "own" from their perspective:
    - Sender's emails (draft/queued/sent/cancelled): user is the sender
    - Recipient's emails (received): user is in EmailRecipient
    
    This prevents senders from seeing the "received" copies created for recipients,
    and vice versa.
    
    Args:
        db: Database session (needed for subquery)
        user_id: User ID to filter for
        
    Returns:
        SQLAlchemy filter clause to use in queries
    """
    from app.models.email import Email
    from app.models.email_recipient import EmailRecipient
    
    return or_(
        # Emails user SENT (draft, queued, sent, cancelled)
        and_(
            Email.sender_id == user_id,
            Email.status.in_(SENDER_STATUSES)
        ),
        # Emails user RECEIVED
        and_(
            Email.status == EmailStatus.RECEIVED.value,
            Email.id.in_(
                db.query(EmailRecipient.email_id).filter(
                    EmailRecipient.recipient_id == user_id
                )
            )
        )
    )


def get_snippet(body: Optional[str], max_length: int = 200) -> str:
    """Extract snippet from email body.
    
    Strips HTML tags and normalizes whitespace to create a plain text preview.
    
    Args:
        body: The email body (may contain HTML)
        max_length: Maximum length of the snippet
        
    Returns:
        Plain text snippet truncated to max_length
    """
    if not body:
        return ""
    # Strip HTML if present (basic)
    text = body.replace("<br>", " ").replace("<br/>", " ").replace("<p>", " ").replace("</p>", " ")
    # Remove HTML tags (basic cleanup)
    text = re.sub(r'<[^>]+>', '', text)
    text = ' '.join(text.split())  # Normalize whitespace
    if len(text) > max_length:
        return text[:max_length] + "..."
    return text


def get_label_hierarchy_name(label) -> str:
    """Build full hierarchical name for a label (e.g., 'grand/parent/child').
    
    Traverses up the parent chain to construct the full path.
    
    Args:
        label: Label model instance with optional parent relationship
        
    Returns:
        Full hierarchical name with parts separated by '/'
    """
    parts = []
    current = label
    while current:
        parts.append(current.name)
        current = current.parent
    # Reverse to get grand -> parent -> child order
    parts.reverse()
    return "/".join(parts)


def format_email_response(email, user_id: Optional[UUID] = None) -> dict:
    """Format email model to response dict.

    Args:
        email: The email model instance
        user_id: Current user's ID - used to filter labels, get thread metadata, and show "me" for current user

    Returns:
        Dictionary with email data formatted for API response
    """
    recipients = []
    for r in email.recipients:
        # Show "me" if recipient is the current user
        recipient_name = r.recipient_name
        if user_id and r.recipient_id == user_id:
            recipient_name = "me"
        recipients.append({
            "id": r.id,
            "email": r.recipient_email,
            "name": recipient_name,
            "type": r.recipient_type,
        })

    attachments = []
    for a in email.attachments:
        attachments.append({
            "id": a.id,
            "filename": a.filename,
            "content_type": a.content_type,
            "size_bytes": a.size_bytes,
        })

    # Get labels from the thread - filter by user's ownership for isolation on shared threads
    labels = []
    if email.thread and email.thread.labels:
        for l in email.thread.labels:
            # Only include labels owned by the current user (user-specific label isolation)
            if (user_id is None or l.owner_id == user_id):
                labels.append({
                    "id": l.id,
                    "name": get_label_hierarchy_name(l),
                    "color": l.color,
                    "owner_id": l.owner_id,
                    "parent_id": l.parent_id,
                    "is_system": l.is_system,
                    "is_exclusive": l.is_exclusive
                })

    # Get thread-level metadata for the current user
    is_important = False
    snooze_until = None
    is_archived = False
    if email.thread and hasattr(email.thread, 'user_metadata') and user_id:
        for metadata in email.thread.user_metadata:
            if metadata.user_id == user_id:
                is_important = metadata.is_important
                snooze_until = getattr(metadata, 'snooze_until', None)
                is_archived = getattr(metadata, 'is_archived', False)
                break

    # Determine if email can be cancelled (undo send)
    can_undo = (
        email.status == EmailStatus.QUEUED.value and
        email.scheduled_send_at and
        ensure_utc_aware(email.scheduled_send_at) > datetime.now(UTC)
    )

    # Show "me" if sender is the current user
    sender_name = email.sender.name if email.sender else None
    if user_id and email.sender_id == user_id:
        sender_name = "me"

    return {
        "id": email.id,
        "subject": email.subject,
        "body": email.body,
        "html_body": email.html_body,
        "folder": email.folder or FolderType.INBOX.value,
        "is_read": email.is_read,
        "is_starred": email.is_starred,
        "is_important": is_important,
        "is_archived": is_archived,
        "sender_id": email.sender_id,
        "sender_name": sender_name,
        "sender_email": email.sender.email if email.sender else None,
        "recipients": recipients,
        "thread_id": email.thread_id,
        "parent_email_id": email.parent_email_id,
        "sent_at": email.sent_at,
        "received_at": email.received_at,
        "scheduled_send_at": email.scheduled_send_at,
        "snooze_until": snooze_until,
        "created_at": email.created_at,
        "updated_at": email.updated_at,
        "attachment_count": len(attachments),
        "attachments": attachments,
        "labels": labels,
        "can_undo_send": can_undo,
    }


def format_email_list_response(email, thread_email_count: Optional[int] = None, user_id: Optional[UUID] = None, thread_is_starred: Optional[bool] = None, thread_is_read: Optional[bool] = None) -> dict:
    """Format email model for list responses.

    Args:
        email: The email model instance (with thread.user_metadata eager loaded if available)
        thread_email_count: Optional count of emails in the thread
        user_id: Current user's ID - used to filter labels, get thread metadata, and show "me" for current user
        thread_is_starred: Optional thread-level starred status (true if any email in thread is starred).
        thread_is_read: Optional thread-level read status (true if all emails in thread are read).

    Returns:
        Dictionary with email data formatted for list API response
    """
    # Get labels from the thread - filter by user's ownership for isolation on shared threads
    labels = []
    if email.thread and email.thread.labels:
        for l in email.thread.labels:
            # Only include labels owned by the current user (user-specific label isolation)
            if (user_id is None or l.owner_id == user_id):
                labels.append({
                    "id": l.id,
                    "name": get_label_hierarchy_name(l),
                    "color": l.color,
                    "owner_id": l.owner_id,
                    "parent_id": l.parent_id,
                    "is_system": l.is_system,
                    "is_exclusive": l.is_exclusive
                })

    attachment_count = len([a for a in email.attachments])

    # Get thread-level metadata for the current user
    is_important = False
    snooze_until = None
    is_archived = False
    if email.thread and hasattr(email.thread, 'user_metadata') and user_id:
        for metadata in email.thread.user_metadata:
            if metadata.user_id == user_id:
                is_important = metadata.is_important
                snooze_until = getattr(metadata, 'snooze_until', None)
                is_archived = getattr(metadata, 'is_archived', False)
                break

    # Determine if email can be cancelled (undo send)
    can_undo = (
        email.status == EmailStatus.QUEUED.value and
        email.scheduled_send_at and
        ensure_utc_aware(email.scheduled_send_at) > datetime.now(UTC)
    )

    # Show "me" if sender is the current user
    sender_name = email.sender.name if email.sender else None
    if user_id and email.sender_id == user_id:
        sender_name = "me"

    return {
        "id": email.id,
        "subject": email.subject,
        "snippet": get_snippet(email.body),
        "folder": email.folder or FolderType.INBOX.value,
        "is_read": email.is_read,
        "is_starred": email.is_starred,
        "thread_is_starred": thread_is_starred if thread_is_starred is not None else email.is_starred,
        "thread_is_read": thread_is_read if thread_is_read is not None else email.is_read,
        "is_important": is_important,
        "is_archived": is_archived,
        "sender_id": email.sender_id,
        "sender_name": sender_name,
        "sender_email": email.sender.email if email.sender else None,
        "thread_id": email.thread_id,
        "thread_email_count": thread_email_count,
        "sent_at": email.sent_at,
        "scheduled_send_at": email.scheduled_send_at,
        "snooze_until": snooze_until,
        "created_at": email.created_at,
        "attachment_count": attachment_count,
        "has_attachments": attachment_count > 0,
        "labels": labels,
        "can_undo_send": can_undo,
    }


def mark_emails_as_read_background(email_ids: List[UUID], user_id: UUID, run_id: str = None) -> None:
    """Background task to mark emails as read.

    Uses a fresh database session since the original request session may be closed.
    Also clears expired snooze_until for the affected threads.

    Args:
        email_ids: List of email IDs to mark as read
        user_id: User ID for logging purposes
        run_id: Optional run ID for database session
    """
    from app.db.session import get_db_session
    from app.models.email import Email
    from app.models.thread_user_metadata import ThreadUserMetadata

    db = None
    try:
        db = get_db_session(run_id=run_id)
        db.query(Email).filter(
            Email.id.in_(email_ids),
            Email.is_read == False
        ).update({Email.is_read: True}, synchronize_session=False)

        # Clear expired snooze_until for the affected threads
        thread_ids = db.query(Email.thread_id).filter(
            Email.id.in_(email_ids),
            Email.thread_id.isnot(None)
        ).distinct().all()
        thread_ids = [tid[0] for tid in thread_ids]

        if thread_ids:
            now = datetime.now(UTC)
            db.query(ThreadUserMetadata).filter(
                ThreadUserMetadata.thread_id.in_(thread_ids),
                ThreadUserMetadata.user_id == user_id,
                ThreadUserMetadata.snooze_until.isnot(None),
                ThreadUserMetadata.snooze_until <= now
            ).update({ThreadUserMetadata.snooze_until: None}, synchronize_session=False)

        db.commit()
        logger.debug(f"Marked {len(email_ids)} emails as read for user {user_id}")
    except Exception as e:
        logger.warning(f"Failed to mark emails as read in background: {e}")
    finally:
        if db is not None:
            db.close()


def deliver_email_to_recipients(db: Session, email, sender_id: Optional[UUID] = None) -> None:
    """Create received copies of an email for all recipients who are system users.

    This function is used by both the send API endpoint and the background job
    that processes scheduled/queued emails.

    Args:
        db: Database session
        email: The email being sent (must have recipients loaded)
        sender_id: The sender's user ID. If None, uses email.sender_id
    """
    from app.models.email import Email
    from app.models.email_recipient import EmailRecipient
    from app.models.user import User
    from app.models.thread import Thread

    # Use provided sender_id or fall back to email's sender_id
    actual_sender_id = sender_id if sender_id is not None else email.sender_id

    emails_created = 0
    for recipient in email.recipients:
        if recipient.recipient_id:
            # Skip creating received copy for the sender themselves
            # The sender already has the SENT copy, no need for a duplicate RECEIVED copy
            if recipient.recipient_id == actual_sender_id:
                continue
            
            recipient_user = db.query(User).filter(
                User.id == recipient.recipient_id
            ).first()
            if recipient_user:
                received_email = Email(
                    subject=email.subject,
                    body=email.body,
                    html_body=email.html_body,
                    status=EmailStatus.RECEIVED.value,
                    folder=FolderType.INBOX.value,
                    sender_id=actual_sender_id,
                    is_read=False,
                    received_at=datetime.now(UTC),
                    thread_id=email.thread_id,
                )
                db.add(received_email)
                db.flush()
                emails_created += 1

                # Copy ALL recipients from original email to received copy
                # This allows recipients to see who else received the email
                for orig_recipient in email.recipients:
                    recv_recipient = EmailRecipient(
                        email_id=received_email.id,
                        recipient_id=orig_recipient.recipient_id,
                        recipient_email=orig_recipient.recipient_email,
                        recipient_name=orig_recipient.recipient_name,
                        recipient_type=orig_recipient.recipient_type,
                    )
                    db.add(recv_recipient)

                # Sync thread labels for recipient (adds INBOX label based on received email)
                sync_thread_labels(db, email.thread_id, recipient_user.id)

    # Update thread email count if any emails were created
    if emails_created > 0 and email.thread_id:
        thread = db.query(Thread).filter(Thread.id == email.thread_id).first()
        if thread:
            thread.email_count = (thread.email_count or 0) + emails_created


def deliver_email_to_recipients_background(email_id: UUID, sender_id: UUID, run_id: str = None) -> None:
    """Background task to deliver email to recipients.

    Creates received copies of an email for all recipients who are system users.
    Uses a fresh database session since the original request session may be closed.

    Args:
        email_id: ID of the email being sent
        sender_id: The sender's user ID
        run_id: Optional run ID for database session
    """
    from app.db.session import get_db_session
    from app.models.email import Email
    from app.models.email_recipient import EmailRecipient
    from sqlalchemy.orm import selectinload

    db = None
    try:
        db = get_db_session(run_id=run_id)

        # Load the email with recipients
        email = db.query(Email).options(
            selectinload(Email.recipients)
        ).filter(Email.id == email_id).first()

        if not email:
            logger.warning(f"Email {email_id} not found for background delivery")
            return

        # Deliver to all recipients
        deliver_email_to_recipients(db, email, sender_id)

        db.commit()
        logger.debug(f"Delivered email {email_id} to recipients in background for sender {sender_id}")
    except Exception as e:
        logger.warning(f"Failed to deliver email to recipients in background: {e}")
        if db is not None:
            try:
                db.rollback()
            except:
                pass
    finally:
        if db is not None:
            db.close()
