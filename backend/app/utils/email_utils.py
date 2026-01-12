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
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from sqlalchemy.orm import Session

from app.core.constants import (
    EmailStatus, FolderType, EmailCategory, SystemLabel
)
from app.utils.label_utils import (
    add_system_label_to_thread,
    add_category_label_to_thread,
)

logger = logging.getLogger(__name__)


# Mapping from folder type to system label enum
FOLDER_TO_LABEL = {
    FolderType.INBOX.value: SystemLabel.INBOX,
    FolderType.SENT.value: SystemLabel.SENT,
    FolderType.DRAFTS.value: SystemLabel.DRAFTS,
    FolderType.TRASH.value: SystemLabel.TRASH,
    FolderType.SPAM.value: SystemLabel.SPAM,
    FolderType.SCHEDULED.value: SystemLabel.SCHEDULED,
}


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
        user_id: Current user's ID - used to filter labels and get thread metadata

    Returns:
        Dictionary with email data formatted for API response
    """
    recipients = []
    for r in email.recipients:
        recipients.append({
            "id": r.id,
            "email": r.recipient_email,
            "name": r.recipient_name,
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

    # Get is_important from thread metadata for the current user
    # Similar to how labels work - filter from the loaded relationship
    is_important = False
    if email.thread and hasattr(email.thread, 'user_metadata') and user_id:
        for metadata in email.thread.user_metadata:
            if metadata.user_id == user_id:
                is_important = metadata.is_important
                break

    # Determine if email can be cancelled (undo send)
    can_undo = (
        email.status == EmailStatus.QUEUED.value and
        email.scheduled_send_at and
        email.scheduled_send_at > datetime.utcnow()
    )

    return {
        "id": email.id,
        "subject": email.subject,
        "body": email.body,
        "html_body": email.html_body,
        "folder": email.folder or FolderType.INBOX.value,
        "category": email.category or EmailCategory.PRIMARY.value,
        "is_read": email.is_read,
        "is_starred": email.is_starred,
        "is_important": is_important,
        "sender_id": email.sender_id,
        "sender_name": email.sender.name if email.sender else None,
        "sender_email": email.sender.email if email.sender else None,
        "recipients": recipients,
        "thread_id": email.thread_id,
        "parent_email_id": email.parent_email_id,
        "sent_at": email.sent_at,
        "received_at": email.received_at,
        "scheduled_send_at": email.scheduled_send_at,
        "snooze_until": email.snooze_until,
        "created_at": email.created_at,
        "updated_at": email.updated_at,
        "attachment_count": len(attachments),
        "attachments": attachments,
        "labels": labels,
        "can_undo_send": can_undo,
    }


def format_email_list_response(email, thread_email_count: Optional[int] = None, user_id: Optional[UUID] = None) -> dict:
    """Format email model for list responses.

    Args:
        email: The email model instance (with thread.user_metadata eager loaded if available)
        thread_email_count: Optional count of emails in the thread
        user_id: Current user's ID - used to filter labels and get thread metadata

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

    # Get is_important from thread metadata for the current user
    # Similar to how labels work - filter from the loaded relationship
    is_important = False
    if email.thread and hasattr(email.thread, 'user_metadata') and user_id:
        for metadata in email.thread.user_metadata:
            if metadata.user_id == user_id:
                is_important = metadata.is_important
                break

    # Determine if email can be cancelled (undo send)
    can_undo = (
        email.status == EmailStatus.QUEUED.value and
        email.scheduled_send_at and
        email.scheduled_send_at > datetime.utcnow()
    )

    return {
        "id": email.id,
        "subject": email.subject,
        "snippet": get_snippet(email.body),
        "folder": email.folder or FolderType.INBOX.value,
        "category": email.category or EmailCategory.PRIMARY.value,
        "is_read": email.is_read,
        "is_starred": email.is_starred,
        "is_important": is_important,
        "sender_id": email.sender_id,
        "sender_name": email.sender.name if email.sender else None,
        "sender_email": email.sender.email if email.sender else None,
        "thread_id": email.thread_id,
        "thread_email_count": thread_email_count,
        "sent_at": email.sent_at,
        "scheduled_send_at": email.scheduled_send_at,
        "snooze_until": email.snooze_until,
        "created_at": email.created_at,
        "attachment_count": attachment_count,
        "has_attachments": attachment_count > 0,
        "labels": labels,
        "can_undo_send": can_undo,
    }


def mark_emails_as_read_background(email_ids: List[UUID], user_id: UUID, run_id: str = None) -> None:
    """Background task to mark emails as read.
    
    Uses a fresh database session since the original request session may be closed.
    
    Args:
        email_ids: List of email IDs to mark as read
        user_id: User ID for logging purposes
        run_id: Optional run ID for database session
    """
    from app.db.session import get_db_session
    from app.models.email import Email
    
    try:
        db = get_db_session(run_id=run_id)
        db.query(Email).filter(
            Email.id.in_(email_ids),
            Email.is_read == False
        ).update({Email.is_read: True}, synchronize_session=False)
        db.commit()
        logger.debug(f"Marked {len(email_ids)} emails as read for user {user_id}")
    except Exception as e:
        logger.warning(f"Failed to mark emails as read in background: {e}")
    finally:
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
    
    # Use provided sender_id or fall back to email's sender_id
    actual_sender_id = sender_id if sender_id is not None else email.sender_id
    
    for recipient in email.recipients:
        if recipient.recipient_id:
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
                    category=email.category,
                    sender_id=actual_sender_id,
                    is_read=False,
                    received_at=datetime.utcnow(),
                    thread_id=email.thread_id,
                )
                db.add(received_email)
                db.flush()
                
                recv_recipient = EmailRecipient(
                    email_id=received_email.id,
                    recipient_id=recipient_user.id,
                    recipient_email=recipient.recipient_email,
                    recipient_name=recipient.recipient_name,
                    recipient_type=recipient.recipient_type,
                )
                db.add(recv_recipient)
                
                # Add Inbox label for recipient
                add_system_label_to_thread(db, email.thread_id, recipient_user.id, SystemLabel.INBOX)
                # Add category label if applicable
                if email.category:
                    add_category_label_to_thread(db, email.thread_id, recipient_user.id, EmailCategory(email.category))
