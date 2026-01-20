"""Utility functions for label management on threads.

This module provides helper functions to:
- Add, remove, and manage system labels (Inbox, Sent, Drafts, Trash, Spam, etc.)
- Sync thread labels dynamically based on actual email state
- Format label responses
- Build label hierarchy trees
- Generate label colors
- Validate label relationships
"""

import random
from datetime import datetime, UTC
from typing import Optional, Union, List, Dict, Set
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.label import Label
from app.models.thread_label import ThreadLabel
from app.core.constants import (
    EmailCategory,
    SystemLabel,
    CategoryLabel,
    FolderType,
    EXCLUSIVE_SYSTEM_LABELS,
    MUTUALLY_EXCLUSIVE_FOLDER_LABELS,
)


# Mapping from folder type to system label enum
FOLDER_TO_LABEL = {
    FolderType.INBOX.value: SystemLabel.INBOX,
    FolderType.SENT.value: SystemLabel.SENT,
    FolderType.DRAFTS.value: SystemLabel.DRAFTS,
    FolderType.TRASH.value: SystemLabel.TRASH,
    FolderType.SPAM.value: SystemLabel.SPAM,
    FolderType.SCHEDULED.value: SystemLabel.SCHEDULED,
}

# System labels that are dynamically synced (excludes ALL_MAIL which is a virtual view)
SYNCABLE_SYSTEM_LABELS = {
    SystemLabel.INBOX,
    SystemLabel.SENT,
    SystemLabel.DRAFTS,
    SystemLabel.TRASH,
    SystemLabel.SPAM,
    SystemLabel.SCHEDULED,
    SystemLabel.STARRED,
    SystemLabel.IMPORTANT,
    SystemLabel.SNOOZED,
    SystemLabel.ALL_MAIL,  # Always added for any email in thread
}


# Mapping from EmailCategory enum to CategoryLabel enum
CATEGORY_TO_LABEL = {
    EmailCategory.PROMOTIONS: CategoryLabel.PROMOTIONS,
    EmailCategory.SOCIAL: CategoryLabel.SOCIAL,
    EmailCategory.UPDATES: CategoryLabel.UPDATES,
    EmailCategory.FORUMS: CategoryLabel.FORUMS,
    EmailCategory.PURCHASES: CategoryLabel.PURCHASES,
    # PRIMARY has no label - it's the default
}


def _get_label_name(label: Union[SystemLabel, CategoryLabel, str]) -> str:
    """Convert enum or string to label name string."""
    if isinstance(label, (SystemLabel, CategoryLabel)):
        return label.value
    return label


def get_system_label(
    db: Session,
    user_id: UUID,
    label: Union[SystemLabel, CategoryLabel, str]
) -> Optional[Label]:
    """Get a system label by name for a user.
    
    Args:
        db: Database session
        user_id: User ID
        label: SystemLabel, CategoryLabel enum or label name string
        
    Returns:
        Label object if found, None otherwise
    """
    label_name = _get_label_name(label)
    return db.query(Label).filter(
        Label.owner_id == user_id,
        Label.name == label_name,
        Label.is_system == True
    ).first()


def add_system_label_to_thread(
    db: Session, 
    thread_id: UUID, 
    user_id: UUID, 
    label: Union[SystemLabel, CategoryLabel, str],
    commit: bool = False
) -> bool:
    """Add a system label to a thread for a user.
    
    Args:
        db: Database session
        thread_id: Thread ID
        user_id: User ID
        label: SystemLabel, CategoryLabel enum or label name string
        commit: Whether to commit the transaction
        
    Returns:
        True if label was added, False if label not found or already exists
    """
    label_obj = get_system_label(db, user_id, label)
    if not label_obj:
        return False
    
    # Check if already exists
    existing = db.query(ThreadLabel).filter(
        ThreadLabel.thread_id == thread_id,
        ThreadLabel.label_id == label_obj.id,
        ThreadLabel.user_id == user_id
    ).first()
    
    if existing:
        return False
    
    thread_label = ThreadLabel(
        thread_id=thread_id,
        label_id=label_obj.id,
        user_id=user_id
    )
    db.add(thread_label)
    
    if commit:
        db.commit()
    
    return True


def remove_system_label_from_thread(
    db: Session, 
    thread_id: UUID, 
    user_id: UUID, 
    label: Union[SystemLabel, CategoryLabel, str],
    commit: bool = False
) -> bool:
    """Remove a system label from a thread for a user.
    
    Args:
        db: Database session
        thread_id: Thread ID
        user_id: User ID
        label: SystemLabel, CategoryLabel enum or label name string
        commit: Whether to commit the transaction
        
    Returns:
        True if label was removed, False if label not found
    """
    label_obj = get_system_label(db, user_id, label)
    if not label_obj:
        return False
    
    result = db.query(ThreadLabel).filter(
        ThreadLabel.thread_id == thread_id,
        ThreadLabel.label_id == label_obj.id,
        ThreadLabel.user_id == user_id
    ).delete(synchronize_session=False)
    
    if commit:
        db.commit()
    
    return result > 0


def replace_exclusive_labels(
    db: Session, 
    thread_id: UUID, 
    user_id: UUID, 
    new_label: Union[SystemLabel, str],
    commit: bool = False
) -> bool:
    """Remove all exclusive system labels and add a new one.
    
    Used for folder switching operations (move to trash, spam, inbox, etc.)
    This removes any existing exclusive labels (Inbox, Sent, Drafts, Trash, Spam, etc.)
    and adds the new specified label.
    
    Args:
        db: Database session
        thread_id: Thread ID
        user_id: User ID
        new_label: SystemLabel enum or label name string for the new exclusive label
        commit: Whether to commit the transaction
        
    Returns:
        True if successful
    """
    # Get mutually exclusive folder label names
    # This ensures Starred/Snoozed/Important persist across folder changes
    folder_label_names = [sl.value for sl in MUTUALLY_EXCLUSIVE_FOLDER_LABELS]
    
    # Get all user's mutually exclusive folder labels
    folder_label_ids = db.query(Label.id).filter(
        Label.owner_id == user_id,
        Label.name.in_(folder_label_names),
        Label.is_system == True
    ).all()
    
    folder_ids = [lid[0] for lid in folder_label_ids]
    
    # Remove all mutually exclusive folder labels from thread
    if folder_ids:
        db.query(ThreadLabel).filter(
            ThreadLabel.thread_id == thread_id,
            ThreadLabel.label_id.in_(folder_ids),
            ThreadLabel.user_id == user_id
        ).delete(synchronize_session=False)
    
    # Add the new label
    add_system_label_to_thread(db, thread_id, user_id, new_label, commit=False)
    
    if commit:
        db.commit()
    
    return True


def add_category_label_to_thread(
    db: Session,
    thread_id: UUID,
    user_id: UUID,
    category: Optional[EmailCategory],
    commit: bool = False
) -> bool:
    """Add a category label to a thread based on email category.
    
    Args:
        db: Database session
        thread_id: Thread ID
        user_id: User ID
        category: Email category (PRIMARY has no label)
        commit: Whether to commit the transaction
        
    Returns:
        True if label was added, False if no label for category or failed
    """
    if category is None or category == EmailCategory.PRIMARY:
        return False
    
    category_label = CATEGORY_TO_LABEL.get(category)
    if not category_label:
        return False
    
    return add_system_label_to_thread(db, thread_id, user_id, category_label, commit)


def remove_category_label_from_thread(
    db: Session,
    thread_id: UUID,
    user_id: UUID,
    category: Optional[EmailCategory],
    commit: bool = False
) -> bool:
    """Remove a category label from a thread.
    
    Args:
        db: Database session
        thread_id: Thread ID
        user_id: User ID
        category: Email category to remove
        commit: Whether to commit the transaction
        
    Returns:
        True if removed, False otherwise
    """
    if category is None or category == EmailCategory.PRIMARY:
        return False
    
    category_label = CATEGORY_TO_LABEL.get(category)
    if not category_label:
        return False
    
    return remove_system_label_from_thread(db, thread_id, user_id, category_label, commit)


def sync_category_labels(
    db: Session,
    thread_id: UUID,
    user_id: UUID,
    old_category: Optional[EmailCategory],
    new_category: Optional[EmailCategory],
    commit: bool = False
) -> None:
    """Sync category labels when email category changes.
    
    Removes old category label and adds new category label.
    
    Args:
        db: Database session
        thread_id: Thread ID
        user_id: User ID
        old_category: Previous email category
        new_category: New email category
        commit: Whether to commit the transaction
    """
    # Remove old category label if it exists
    if old_category and old_category != EmailCategory.PRIMARY:
        remove_category_label_from_thread(db, thread_id, user_id, old_category, commit=False)
    
    # Add new category label
    if new_category and new_category != EmailCategory.PRIMARY:
        add_category_label_to_thread(db, thread_id, user_id, new_category, commit=False)
    
    if commit:
        db.commit()


def generate_random_light_color() -> str:
    """Generate a random light/pastel hex color.
    
    Returns:
        Hex color string like '#aabbcc'
    """
    # Generate RGB values in the lighter range (180-255)
    r = random.randint(180, 255)
    g = random.randint(180, 255)
    b = random.randint(180, 255)
    return f"#{r:02x}{g:02x}{b:02x}"


def format_label_response(label: Label, thread_count: int = 0, unread_count: int = 0) -> dict:
    """Format label model to response dict.

    Args:
        label: Label model instance
        thread_count: Number of threads with this label
        unread_count: Number of threads with this label that have unread emails

    Returns:
        Dictionary with label data formatted for API response
    """
    return {
        "id": label.id,
        "name": label.name,
        "color": label.color,
        "owner_id": label.owner_id,
        "parent_id": label.parent_id,
        "is_system": label.is_system,
        "is_exclusive": label.is_exclusive,
        "show_in_label_list": label.show_in_label_list,
        "show_in_message_list": label.show_in_message_list,
        "show_if_unread": label.show_if_unread,
        "created_at": label.created_at,
        "updated_at": label.updated_at,
        "thread_count": thread_count,
        "unread_count": unread_count,
    }


def get_all_descendant_ids(db: Session, label_id: UUID) -> Set[UUID]:
    """Get all descendant label IDs (children, grandchildren, etc.).
    
    Args:
        db: Database session
        label_id: Parent label ID
        
    Returns:
        Set of all descendant label IDs
    """
    descendants = set()
    to_process = [label_id]
    
    while to_process:
        current_id = to_process.pop()
        children = db.query(Label.id).filter(
            Label.parent_id == current_id
        ).all()
        
        for (child_id,) in children:
            if child_id not in descendants:
                descendants.add(child_id)
                to_process.append(child_id)
    
    return descendants


def would_create_cycle(db: Session, label_id: UUID, new_parent_id: UUID) -> bool:
    """Check if setting new_parent_id would create a circular reference.
    
    Args:
        db: Database session
        label_id: Label being moved
        new_parent_id: Proposed new parent ID
        
    Returns:
        True if would create cycle, False otherwise
    """
    if new_parent_id is None:
        return False
    
    if label_id == new_parent_id:
        return True
    
    # Check if new_parent_id is a descendant of label_id
    descendants = get_all_descendant_ids(db, label_id)
    return new_parent_id in descendants


def build_label_tree(
    labels_with_counts: List[tuple]
) -> List[dict]:
    """Build hierarchical tree from flat label list.

    Args:
        labels_with_counts: List of (label, thread_count, unread_count) tuples

    Returns:
        List of root label dicts with nested children arrays
    """
    # Create lookup dict
    label_map: Dict[UUID, dict] = {}

    for label, thread_count, unread_count in labels_with_counts:
        label_map[label.id] = {
            "id": label.id,
            "name": label.name,
            "color": label.color,
            "owner_id": label.owner_id,
            "parent_id": label.parent_id,
            "is_system": label.is_system,
            "is_exclusive": label.is_exclusive,
            "show_in_label_list": label.show_in_label_list,
            "show_in_message_list": label.show_in_message_list,
            "show_if_unread": label.show_if_unread,
            "created_at": label.created_at,
            "updated_at": label.updated_at,
            "thread_count": thread_count,
            "unread_count": unread_count,
            "children": [],
        }
    
    # Build tree structure
    root_labels = []
    
    for label_id, label_data in label_map.items():
        parent_id = label_data["parent_id"]
        if parent_id is None or parent_id not in label_map:
            root_labels.append(label_data)
        else:
            label_map[parent_id]["children"].append(label_data)
    
    # Sort children at each level by name
    def sort_children(node):
        node["children"].sort(key=lambda x: x["name"])
        for child in node["children"]:
            sort_children(child)
    
    for root in root_labels:
        sort_children(root)
    
    root_labels.sort(key=lambda x: x["name"])
    return root_labels


def bulk_add_system_label_to_threads(
    db: Session,
    thread_ids: List[UUID],
    user_id: UUID,
    label: Union[SystemLabel, CategoryLabel, str],
    commit: bool = False
) -> int:
    """Add a system label to multiple threads for a user.

    Args:
        db: Database session
        thread_ids: List of thread IDs
        user_id: User ID
        label: SystemLabel, CategoryLabel enum or label name string
        commit: Whether to commit the transaction

    Returns:
        Number of thread-label associations created
    """
    if not thread_ids:
        return 0

    label_obj = get_system_label(db, user_id, label)
    if not label_obj:
        return 0

    # Get existing thread-label associations
    existing = db.query(ThreadLabel.thread_id).filter(
        ThreadLabel.thread_id.in_(thread_ids),
        ThreadLabel.label_id == label_obj.id,
        ThreadLabel.user_id == user_id
    ).all()

    existing_thread_ids = {tid[0] for tid in existing}

    # Create new associations for threads that don't have this label
    new_thread_labels = [
        ThreadLabel(
            thread_id=thread_id,
            label_id=label_obj.id,
            user_id=user_id
        )
        for thread_id in thread_ids
        if thread_id not in existing_thread_ids
    ]

    if new_thread_labels:
        db.bulk_save_objects(new_thread_labels)

    if commit:
        db.commit()

    return len(new_thread_labels)


def bulk_remove_system_label_from_threads(
    db: Session,
    thread_ids: List[UUID],
    user_id: UUID,
    label: Union[SystemLabel, CategoryLabel, str],
    commit: bool = False
) -> int:
    """Remove a system label from multiple threads for a user.

    Args:
        db: Database session
        thread_ids: List of thread IDs
        user_id: User ID
        label: SystemLabel, CategoryLabel enum or label name string
        commit: Whether to commit the transaction

    Returns:
        Number of thread-label associations removed
    """
    if not thread_ids:
        return 0

    label_obj = get_system_label(db, user_id, label)
    if not label_obj:
        return 0

    result = db.query(ThreadLabel).filter(
        ThreadLabel.thread_id.in_(thread_ids),
        ThreadLabel.label_id == label_obj.id,
        ThreadLabel.user_id == user_id
    ).delete(synchronize_session=False)

    if commit:
        db.commit()

    return result


def bulk_replace_exclusive_labels(
    db: Session,
    thread_ids: List[UUID],
    user_id: UUID,
    new_label: Union[SystemLabel, str],
    commit: bool = False
) -> int:
    """Remove all exclusive system labels and add a new one for multiple threads.

    Used for folder switching operations (move to trash, spam, inbox, etc.)
    This removes any existing exclusive labels (Inbox, Sent, Drafts, Trash, Spam, etc.)
    and adds the new specified label.

    Args:
        db: Database session
        thread_ids: List of thread IDs
        user_id: User ID
        new_label: SystemLabel enum or label name string for the new exclusive label
        commit: Whether to commit the transaction

    Returns:
        Number of threads processed
    """
    if not thread_ids:
        return 0

    # Get mutually exclusive folder label names
    # This ensures Starred/Snoozed/Important persist across folder changes
    folder_label_names = [sl.value for sl in MUTUALLY_EXCLUSIVE_FOLDER_LABELS]

    # Get all user's mutually exclusive folder labels
    folder_label_ids = db.query(Label.id).filter(
        Label.owner_id == user_id,
        Label.name.in_(folder_label_names),
        Label.is_system == True
    ).all()

    folder_ids = [lid[0] for lid in folder_label_ids]

    # Remove all mutually exclusive folder labels from threads
    if folder_ids:
        db.query(ThreadLabel).filter(
            ThreadLabel.thread_id.in_(thread_ids),
            ThreadLabel.label_id.in_(folder_ids),
            ThreadLabel.user_id == user_id
        ).delete(synchronize_session=False)

    # Add the new label to all threads
    bulk_add_system_label_to_threads(db, thread_ids, user_id, new_label, commit=False)

    if commit:
        db.commit()

    return len(thread_ids)


def bulk_sync_category_labels(
    db: Session,
    thread_category_map: Dict[UUID, tuple],
    user_id: UUID,
    commit: bool = False
) -> None:
    """Sync category labels when email categories change for multiple threads.

    Removes old category labels and adds new category labels in bulk.

    Args:
        db: Database session
        thread_category_map: Dict mapping thread_id to (old_category, new_category) tuples
        user_id: User ID
        commit: Whether to commit the transaction
    """
    if not thread_category_map:
        return

    # Collect threads by old and new categories
    threads_to_remove_category = {}  # category -> [thread_ids]
    threads_to_add_category = {}  # category -> [thread_ids]

    for thread_id, (old_cat, new_cat) in thread_category_map.items():
        # Track old category removal
        if old_cat and old_cat != EmailCategory.PRIMARY:
            if old_cat not in threads_to_remove_category:
                threads_to_remove_category[old_cat] = []
            threads_to_remove_category[old_cat].append(thread_id)

        # Track new category addition
        if new_cat and new_cat != EmailCategory.PRIMARY:
            if new_cat not in threads_to_add_category:
                threads_to_add_category[new_cat] = []
            threads_to_add_category[new_cat].append(thread_id)

    # Bulk remove old category labels
    for category, thread_ids in threads_to_remove_category.items():
        category_label = CATEGORY_TO_LABEL.get(category)
        if category_label:
            bulk_remove_system_label_from_threads(db, thread_ids, user_id, category_label, commit=False)

    # Bulk add new category labels
    for category, thread_ids in threads_to_add_category.items():
        category_label = CATEGORY_TO_LABEL.get(category)
        if category_label:
            bulk_add_system_label_to_threads(db, thread_ids, user_id, category_label, commit=False)

    if commit:
        db.commit()


def get_user_emails_in_thread(
    db: Session,
    thread_id: UUID,
    user_id: UUID
) -> List:
    """Get all emails in a thread that belong to a user from THEIR perspective.
    
    Perspective-aware ownership:
    - For sent/draft/queued/cancelled emails: User must be the sender
    - For received emails: User must be a recipient
    
    This prevents senders from seeing "received" copies created for recipients,
    ensuring correct folder-based label assignment.
    
    Args:
        db: Database session
        thread_id: Thread ID
        user_id: User ID
        
    Returns:
        List of Email objects for this user in the thread from their perspective
    """
    from app.models.email import Email
    from app.models.email_recipient import EmailRecipient
    from app.utils.email_utils import get_perspective_email_filter
    
    return db.query(Email).filter(
        Email.thread_id == thread_id,
        get_perspective_email_filter(db, user_id)
    ).all()


def get_threads_with_system_label(
    db: Session,
    user_id: UUID,
    label: Union[SystemLabel, str]
):
    """Get a subquery of thread IDs that have a specific system label for this user.
    
    Args:
        db: Database session
        user_id: User ID
        label: SystemLabel enum or label name string
        
    Returns:
        Subquery that can be used in .in_() filters, or None if label not found
    """
    label_obj = get_system_label(db, user_id, label)
    if not label_obj:
        return None
    
    return db.query(ThreadLabel.thread_id).filter(
        ThreadLabel.label_id == label_obj.id,
        ThreadLabel.user_id == user_id
    ).subquery()


def sync_thread_labels(
    db: Session,
    thread_id: UUID,
    user_id: UUID,
    commit: bool = False
) -> None:
    """Sync all system labels for a thread based on actual state.
    
    Scans the thread's actual state and ensures labels match:
    1. Folder-based labels: Based on email.folder values (INBOX, SENT, DRAFTS, etc.)
    2. STARRED: If any email in thread is starred
    3. IMPORTANT: From ThreadUserMetadata.is_important
    4. SNOOZED: From ThreadUserMetadata.snooze_until (if set and in future)
    
    Adds missing labels and removes labels that no longer apply.
    
    Args:
        db: Database session
        thread_id: Thread ID (required, None will skip silently)
        user_id: User ID
        commit: Whether to commit the transaction
    """
    # Guard against None thread_id (e.g., emails not yet assigned to a thread)
    if thread_id is None:
        return
    
    from app.models.thread_user_metadata import ThreadUserMetadata
    
    # Get all user's emails in this thread
    user_emails = get_user_emails_in_thread(db, thread_id, user_id)
    
    # Determine which labels should exist based on actual state
    labels_should_have: Set[SystemLabel] = set()
    
    # 1. Folder-based labels - scan email folders
    for email in user_emails:
        folder_label = FOLDER_TO_LABEL.get(email.folder)
        if folder_label:
            labels_should_have.add(folder_label)
    
    # All emails belong to ALL_MAIL (if user has any emails in this thread)
    if user_emails:
        labels_should_have.add(SystemLabel.ALL_MAIL)
    
    # 2. STARRED - if any email is starred
    if any(email.is_starred for email in user_emails):
        labels_should_have.add(SystemLabel.STARRED)
    
    # 3. IMPORTANT and SNOOZED - from thread metadata
    metadata = db.query(ThreadUserMetadata).filter(
        ThreadUserMetadata.thread_id == thread_id,
        ThreadUserMetadata.user_id == user_id
    ).first()
    
    if metadata:
        if metadata.is_important:
            labels_should_have.add(SystemLabel.IMPORTANT)
        if metadata.snooze_until and metadata.snooze_until > datetime.now(UTC):
            labels_should_have.add(SystemLabel.SNOOZED)
            # Snoozed threads should not appear in Inbox - remove INBOX if present
            labels_should_have.discard(SystemLabel.INBOX)
    
    # Get all user's syncable system labels
    syncable_label_names = [sl.value for sl in SYNCABLE_SYSTEM_LABELS]
    user_system_labels = db.query(Label).filter(
        Label.owner_id == user_id,
        Label.name.in_(syncable_label_names),
        Label.is_system == True
    ).all()
    
    # Create lookup: label_name -> label_id
    label_name_to_id = {label.name: label.id for label in user_system_labels}
    label_id_to_name = {label.id: label.name for label in user_system_labels}
    
    # Get current labels on thread for this user (only syncable ones)
    current_thread_labels = db.query(ThreadLabel).filter(
        ThreadLabel.thread_id == thread_id,
        ThreadLabel.user_id == user_id,
        ThreadLabel.label_id.in_([l.id for l in user_system_labels])
    ).all()
    
    current_label_ids = {tl.label_id for tl in current_thread_labels}
    
    # Determine labels to add and remove
    labels_should_have_ids = {
        label_name_to_id.get(label.value) 
        for label in labels_should_have 
        if label.value in label_name_to_id
    }
    labels_should_have_ids.discard(None)
    
    labels_to_add = labels_should_have_ids - current_label_ids
    labels_to_remove = current_label_ids - labels_should_have_ids
    
    # Add missing labels
    for label_id in labels_to_add:
        thread_label = ThreadLabel(
            thread_id=thread_id,
            label_id=label_id,
            user_id=user_id
        )
        db.add(thread_label)
    
    # Remove labels that no longer apply
    if labels_to_remove:
        db.query(ThreadLabel).filter(
            ThreadLabel.thread_id == thread_id,
            ThreadLabel.user_id == user_id,
            ThreadLabel.label_id.in_(labels_to_remove)
        ).delete(synchronize_session=False)
    
    if commit:
        db.commit()


def bulk_sync_thread_labels(
    db: Session,
    thread_ids: List[UUID],
    user_id: UUID,
    commit: bool = False
) -> int:
    """Sync system labels for multiple threads based on actual state.
    
    Calls sync_thread_labels for each thread.
    
    Args:
        db: Database session
        thread_ids: List of thread IDs
        user_id: User ID
        commit: Whether to commit the transaction
        
    Returns:
        Number of threads processed
    """
    if not thread_ids:
        return 0
    
    for thread_id in thread_ids:
        sync_thread_labels(db, thread_id, user_id, commit=False)
    
    if commit:
        db.commit()
    
    return len(thread_ids)
