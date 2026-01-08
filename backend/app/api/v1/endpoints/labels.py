"""Label CRUD endpoints with hierarchical (nested) label support.

This module provides:
- Full CRUD operations for labels with parent-child nesting
- Hierarchical label tree retrieval
- Email listing per label
"""

from app.core.constants import ProhibitedLabels
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from typing import Optional, List, Dict, Set, Union
from uuid import UUID
import logging

import random

from app.db.session import get_db
from app.models.label import Label
from app.models.email import Email
from app.models.thread import Thread
from app.models.thread_label import ThreadLabel
from app.schemas.label import (
    LabelCreate, LabelUpdate, LabelResponse, LabelListResponse, LabelTreeResponse
)
from app.schemas.email import EmailListResponse
from app.schemas.pagination import PaginatedListResponse
from app.auth.rbac import authorized
from app.auth.dependencies import auth

logger = logging.getLogger(__name__)


def generate_random_light_color() -> str:
    """Generate a random light/pastel hex color."""
    # Generate RGB values in the lighter range (180-255)
    r = random.randint(180, 255)
    g = random.randint(180, 255)
    b = random.randint(180, 255)
    return f"#{r:02x}{g:02x}{b:02x}"


router = APIRouter()


def get_label_hierarchy_name(label: Label) -> str:
    """Build full hierarchical name for a label (e.g., 'grand/parent/child').
    
    Traverses up the parent chain to construct the full path.
    """
    parts = []
    current = label
    while current:
        parts.append(current.name)
        current = current.parent
    # Reverse to get grand -> parent -> child order
    parts.reverse()
    return "/".join(parts)


def format_label_response(label: Label, thread_count: int = 0) -> dict:
    """Format label model to response dict."""
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
        "is_deleted": label.is_deleted,
        "created_at": label.created_at,
        "updated_at": label.updated_at,
        "thread_count": thread_count,
    }


def get_all_descendant_ids(db: Session, label_id: UUID) -> Set[UUID]:
    """Get all descendant label IDs (children, grandchildren, etc.)."""
    descendants = set()
    to_process = [label_id]
    
    while to_process:
        current_id = to_process.pop()
        children = db.query(Label.id).filter(
            Label.parent_id == current_id,
            Label.is_deleted == False
        ).all()
        
        for (child_id,) in children:
            if child_id not in descendants:
                descendants.add(child_id)
                to_process.append(child_id)
    
    return descendants


def would_create_cycle(db: Session, label_id: UUID, new_parent_id: UUID) -> bool:
    """Check if setting new_parent_id would create a circular reference."""
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
    """Build hierarchical tree from flat label list."""
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
            "is_deleted": label.is_deleted,
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


@router.post("/labels", response_model=LabelResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(authorized())])
def create_label(
    label_data: LabelCreate,
    db: Session = Depends(get_db),
) -> dict:
    """Create a new label.
    
    Labels can be nested by specifying a parent_id.
    
    Permissions:
    - All authenticated users can create labels
    """
    current_user = auth.user
    
    # Validate label name
    if label_data.name.strip().lower() in {pl.value for pl in ProhibitedLabels}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Label name {label_data.name} is prohibited"
        )
    
    # Validate parent_id if provided
    if label_data.parent_id is not None:
        parent = db.query(Label).filter(
            Label.id == label_data.parent_id,
            Label.owner_id == current_user.id,
            Label.is_deleted == False
        ).first()
        
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Parent label {label_data.parent_id} not found"
            )
    
    # Check for duplicate name within same parent
    existing = db.query(Label).filter(
        Label.owner_id == current_user.id,
        Label.parent_id == label_data.parent_id,
        Label.name == label_data.name,
        Label.is_deleted == False
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Label '{label_data.name}' already exists at this level"
        )
    
    label = Label(
        name=label_data.name,
        color=generate_random_light_color(),
        parent_id=label_data.parent_id,
        owner_id=current_user.id,
        show_in_label_list=label_data.show_in_label_list,
        show_in_message_list=label_data.show_in_message_list,
        show_if_unread=label_data.show_if_unread,
    )
    
    try:
        db.add(label)
        db.commit()
        db.refresh(label)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Label '{label_data.name}' already exists at this level"
        )
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Label {label.id} created by user {current_user.id} (parent: {label_data.parent_id})")
    
    return format_label_response(label)


@router.get("/labels", dependencies=[Depends(authorized())])
def list_labels(
    db: Session = Depends(get_db),
    include_counts: bool = Query(True, description="Include thread counts"),
    flat: bool = Query(True, description="Return flat list (True) or hierarchical tree (False)"),
):
    """List user's labels with thread counts.
    
    Args:
        include_counts: Include thread counts for each label
        flat: If True, returns flat list. If False, returns hierarchical tree structure.
    
    Permissions:
    - Users can only see their own labels
    """
    current_user = auth.user
    
    if include_counts:
        # Subquery for thread counts - filter by user_id for user-specific label associations
        thread_count_subq = (
            db.query(
                ThreadLabel.label_id,
                func.count(ThreadLabel.thread_id).label("thread_count")
            )
            .join(Thread, Thread.id == ThreadLabel.thread_id)
            .filter(
                Thread.is_deleted == False,
                ThreadLabel.user_id == current_user.id  # Only count this user's label associations
            )
            .group_by(ThreadLabel.label_id)
            .subquery()
        )
        
        # Main query with JOIN to subquery
        labels = (
            db.query(
                Label,
                func.coalesce(thread_count_subq.c.thread_count, 0).label("thread_count")
            )
            .outerjoin(thread_count_subq, Label.id == thread_count_subq.c.label_id)
            .filter(
                Label.owner_id == current_user.id,
                Label.is_deleted == False
            )
            .order_by(Label.name)
            .all()
        )
        
        thread_counts = {label.id: count for label, count in labels}
    else:
        labels = db.query(Label).filter(
            Label.owner_id == current_user.id,
            Label.is_deleted == False
        ).order_by(Label.name).all()
        
        labels = [(label, 0) for label in labels]
        thread_counts = {}
    
    if not flat:
        # Return hierarchical tree structure
        return build_label_tree(labels, thread_counts)
    
    # Return flat list with hierarchical names
    return [
        {
            "id": label.id,
            "name": label.name,
            "full_name": get_label_hierarchy_name(label),
            "color": label.color,
            "owner_id": label.owner_id,
            "parent_id": label.parent_id,
            "is_system": label.is_system,
            "is_exclusive": label.is_exclusive,
            "show_in_label_list": label.show_in_label_list,
            "show_in_message_list": label.show_in_message_list,
            "show_if_unread": label.show_if_unread,
            "is_deleted": label.is_deleted,
            "created_at": label.created_at,
            "updated_at": label.updated_at,
            "thread_count": thread_count,
        }
        for label, thread_count in labels
    ]


@router.get("/labels/tree", response_model=List[LabelTreeResponse], dependencies=[Depends(authorized())])
def list_labels_tree(
    db: Session = Depends(get_db),
    include_counts: bool = Query(True, description="Include thread counts"),
) -> List[dict]:
    """List user's labels as hierarchical tree structure.
    
    Returns labels organized in parent-child hierarchy with nested children arrays.
    
    Permissions:
    - Users can only see their own labels
    """
    current_user = auth.user
    
    if include_counts:
        # Subquery for thread counts - filter by user_id for user-specific label associations
        thread_count_subq = (
            db.query(
                ThreadLabel.label_id,
                func.count(ThreadLabel.thread_id).label("thread_count")
            )
            .join(Thread, Thread.id == ThreadLabel.thread_id)
            .filter(
                Thread.is_deleted == False,
                ThreadLabel.user_id == current_user.id  # Only count this user's label associations
            )
            .group_by(ThreadLabel.label_id)
            .subquery()
        )
        
        labels = (
            db.query(
                Label,
                func.coalesce(thread_count_subq.c.thread_count, 0).label("thread_count")
            )
            .outerjoin(thread_count_subq, Label.id == thread_count_subq.c.label_id)
            .filter(
                Label.owner_id == current_user.id,
                Label.is_deleted == False
            )
            .all()
        )
        
        thread_counts = {label.id: count for label, count in labels}
    else:
        labels_raw = db.query(Label).filter(
            Label.owner_id == current_user.id,
            Label.is_deleted == False
        ).all()
        
        labels = [(label, 0) for label in labels_raw]
        thread_counts = {}
    
    return build_label_tree(labels, thread_counts)


@router.get("/labels/{label_id}", response_model=LabelResponse, dependencies=[Depends(authorized())])
def get_label(
    label_id: UUID,
    db: Session = Depends(get_db),
) -> dict:
    """Get a specific label by ID.
    
    Permissions:
    - Users can only access their own labels
    """
    current_user = auth.user
    
    label = db.query(Label).filter(
        Label.id == label_id,
        Label.owner_id == current_user.id,
        Label.is_deleted == False
    ).first()
    
    if not label:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Label {label_id} not found"
        )
    
    # Get thread count - filter by user_id for user-specific label associations
    thread_count = db.query(func.count(ThreadLabel.thread_id)).join(
        Thread, Thread.id == ThreadLabel.thread_id
    ).filter(
        ThreadLabel.label_id == label_id,
        ThreadLabel.user_id == current_user.id,  # Only count this user's label associations
        Thread.is_deleted == False
    ).scalar() or 0
    
    return format_label_response(label, thread_count=thread_count)


@router.put("/labels/{label_id}", response_model=LabelResponse, dependencies=[Depends(authorized())])
def update_label(
    label_id: UUID,
    label_data: LabelUpdate,
    db: Session = Depends(get_db),
) -> dict:
    """Update a label.
    
    Labels can be moved to a different parent by updating parent_id.
    Use parent_id=null to move to root level.
    
    Permissions:
    - Users can only update their own labels
    """
    current_user = auth.user
    
    label = db.query(Label).filter(
        Label.id == label_id,
        Label.owner_id == current_user.id,
        Label.is_deleted == False
    ).first()
    
    if not label:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Label {label_id} not found"
        )
    
    # Prevent modification of system labels
    if label.is_system:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="System labels cannot be modified"
        )
    
    update_data = label_data.model_dump(exclude_unset=True)
    
    # Handle parent_id update
    if "parent_id" in update_data:
        new_parent_id = update_data["parent_id"]
        
        # Treat zero UUID as null (move to root)
        zero_uuid = UUID("00000000-0000-0000-0000-000000000000")
        if new_parent_id == zero_uuid:
            new_parent_id = None
            update_data["parent_id"] = None
        
        if new_parent_id is not None:
            # Validate parent exists and belongs to user
            parent = db.query(Label).filter(
                Label.id == new_parent_id,
                Label.owner_id == current_user.id,
                Label.is_deleted == False
            ).first()
            
            if not parent:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Parent label {new_parent_id} not found"
                )
            
            # Check for circular reference
            if would_create_cycle(db, label_id, new_parent_id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot set parent: would create circular reference"
                )
    
    # Determine target parent_id for name uniqueness check
    target_parent_id = update_data.get("parent_id", label.parent_id)
    
    # Check for duplicate name within same parent if updating name
    if "name" in update_data and update_data["name"] != label.name:
        existing = db.query(Label).filter(
            Label.owner_id == current_user.id,
            Label.parent_id == target_parent_id,
            Label.name == update_data["name"],
            Label.is_deleted == False,
            Label.id != label_id
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Label '{update_data['name']}' already exists at this level"
            )
    
    # If only moving (parent_id change), check name doesn't conflict at new level
    if "parent_id" in update_data and "name" not in update_data:
        existing = db.query(Label).filter(
            Label.owner_id == current_user.id,
            Label.parent_id == update_data["parent_id"],
            Label.name == label.name,
            Label.is_deleted == False,
            Label.id != label_id
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Label '{label.name}' already exists at target level"
            )
    
    # Apply updates
    for field, value in update_data.items():
        setattr(label, field, value)
    
    try:
        db.commit()
        db.refresh(label)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Label name already exists at this level"
        )
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Label {label.id} updated by user {current_user.id}")
    
    return format_label_response(label)


@router.delete("/labels/{label_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(authorized())])
def delete_label(
    label_id: UUID,
    db: Session = Depends(get_db),
    permanent: bool = Query(False, description="Permanently delete instead of soft delete"),
) -> None:
    """Delete a label and all its child labels.
    
    When a label is deleted, all descendant labels (children, grandchildren, etc.)
    are also deleted along with their email associations.
    
    Args:
        permanent: If True, permanently removes from database. If False (default), soft deletes.
    
    Permissions:
    - Users can only delete their own labels
    """
    current_user = auth.user
    
    label = db.query(Label).filter(
        Label.id == label_id,
        Label.owner_id == current_user.id,
        Label.is_deleted == False
    ).first()
    
    if not label:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Label {label_id} not found"
        )
    
    # Prevent deletion of system labels
    if label.is_system:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="System labels cannot be deleted"
        )
    
    # Get all descendant IDs and delete them all (cascade delete)
    all_ids_to_delete = {label_id} | get_all_descendant_ids(db, label_id)
    
    # Remove all thread associations for labels being deleted (only this user's associations)
    db.query(ThreadLabel).filter(
        ThreadLabel.label_id.in_(all_ids_to_delete),
        ThreadLabel.user_id == current_user.id
    ).delete(synchronize_session=False)
    
    if permanent:
        # Permanently delete from database
        db.query(Label).filter(Label.id.in_(all_ids_to_delete)).delete(synchronize_session=False)
    else:
        # Soft delete - mark as deleted
        db.query(Label).filter(Label.id.in_(all_ids_to_delete)).update(
            {"is_deleted": True},
            synchronize_session=False
        )
    
    deleted_count = len(all_ids_to_delete)
    
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Label {label_id} {'permanently ' if permanent else ''}deleted by user {current_user.id} (deleted {deleted_count} labels)")


@router.get("/labels/{label_id}/threads", response_model=PaginatedListResponse[EmailListResponse], dependencies=[Depends(authorized())])
def list_label_threads(
    label_id: UUID,
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
) -> dict:
    """List threads with a specific label.
    
    Returns the latest email from each thread that has this label.
    
    Permissions:
    - Users can only access their own labels
    """
    from app.api.v1.endpoints.emails import format_email_list_response
    
    current_user = auth.user
    
    # Verify label ownership
    label = db.query(Label).filter(
        Label.id == label_id,
        Label.owner_id == current_user.id,
        Label.is_deleted == False
    ).first()
    
    if not label:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Label {label_id} not found"
        )
    
    # Get threads with this label - filter by user_id for user-specific label associations
    threads_with_label = db.query(Thread).options(
        selectinload(Thread.labels),
    ).join(
        ThreadLabel, Thread.id == ThreadLabel.thread_id
    ).filter(
        ThreadLabel.label_id == label_id,
        ThreadLabel.user_id == current_user.id,  # Only this user's label associations
        Thread.is_deleted == False
    )
    
    # Get total count
    total = threads_with_label.count()
    
    # Calculate pagination
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    offset = (page - 1) * page_size
    
    # Get threads with pagination
    threads = threads_with_label.order_by(Thread.last_email_at.desc()).offset(offset).limit(page_size).all()
    
    # For each thread, get the latest email
    emails_data = []
    for thread in threads:
        latest_email = db.query(Email).options(
            joinedload(Email.sender),
            selectinload(Email.attachments),
        ).filter(
            Email.thread_id == thread.id,
            Email.is_deleted == False
        ).order_by(func.coalesce(Email.sent_at, Email.created_at).desc()).first()
        
        if latest_email:
            emails_data.append(format_email_list_response(latest_email, thread.email_count, current_user.id))
    
    return PaginatedListResponse[EmailListResponse](
        results=emails_data,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )
