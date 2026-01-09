"""Utility functions for label management on threads.

This module provides helper functions to:
- Add, remove, and manage system labels (Inbox, Sent, Drafts, Trash, Spam, etc.)
- Format label responses
- Build label hierarchy trees
- Generate label colors
- Validate label relationships
"""

import random
from typing import Optional, Union, List, Dict, Set
from uuid import UUID
from sqlalchemy.orm import Session

from app.models.label import Label
from app.models.thread_label import ThreadLabel
from app.core.constants import (
    EmailCategory,
    SystemLabel,
    CategoryLabel,
    EXCLUSIVE_SYSTEM_LABELS,
)


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
    # Get exclusive label names from the enum set
    exclusive_label_names = [sl.value for sl in EXCLUSIVE_SYSTEM_LABELS]
    
    # Get all user's system labels that are exclusive
    exclusive_label_ids = db.query(Label.id).filter(
        Label.owner_id == user_id,
        Label.name.in_(exclusive_label_names),
        Label.is_system == True
    ).all()
    
    exclusive_ids = [lid[0] for lid in exclusive_label_ids]
    
    # Remove all exclusive labels from thread
    if exclusive_ids:
        db.query(ThreadLabel).filter(
            ThreadLabel.thread_id == thread_id,
            ThreadLabel.label_id.in_(exclusive_ids),
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


def format_label_response(label: Label, thread_count: int = 0) -> dict:
    """Format label model to response dict.
    
    Args:
        label: Label model instance
        thread_count: Number of threads with this label
        
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
    labels_with_counts: List[tuple],
    thread_counts: Dict[UUID, int]
) -> List[dict]:
    """Build hierarchical tree from flat label list.
    
    Args:
        labels_with_counts: List of (label, count) tuples
        thread_counts: Dict mapping label IDs to thread counts
        
    Returns:
        List of root label dicts with nested children arrays
    """
    # Create lookup dict
    label_map: Dict[UUID, dict] = {}
    
    for label, count in labels_with_counts:
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
            "thread_count": count,
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
