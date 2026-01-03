"""Label CRUD endpoints with hierarchical (nested) label support.

This module provides:
- Full CRUD operations for labels with parent-child nesting
- Hierarchical label tree retrieval
- Email listing per label
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from typing import Optional, List, Dict, Set, Union
from uuid import UUID
import logging

from app.db.session import get_db
from app.models.label import Label
from app.models.email import Email
from app.models.email_label import EmailLabel
from app.schemas.label import (
    LabelCreate, LabelUpdate, LabelResponse, LabelListResponse, LabelTreeResponse
)
from app.schemas.email import EmailListResponse
from app.schemas.pagination import PaginatedListResponse
from app.auth.rbac import authorized
from app.auth.dependencies import auth

logger = logging.getLogger(__name__)
router = APIRouter()


def format_label_response(label: Label, email_count: int = 0) -> dict:
    """Format label model to response dict."""
    return {
        "id": label.id,
        "name": label.name,
        "color": label.color,
        "owner_id": label.owner_id,
        "parent_id": label.parent_id,
        "is_deleted": label.is_deleted,
        "created_at": label.created_at,
        "updated_at": label.updated_at,
        "email_count": email_count,
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
    email_counts: Dict[UUID, int]
) -> List[dict]:
    """Build hierarchical tree from flat label list."""
    # Create lookup dict
    label_map: Dict[UUID, dict] = {}
    
    for label, count in labels_with_counts:
        label_map[label.id] = {
            "id": label.id,
            "name": label.name,
            "color": label.color,
            "parent_id": label.parent_id,
            "email_count": count,
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
        color=label_data.color,
        parent_id=label_data.parent_id,
        owner_id=current_user.id,
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
    include_counts: bool = Query(True, description="Include email counts"),
    flat: bool = Query(True, description="Return flat list (True) or hierarchical tree (False)"),
):
    """List user's labels with email counts.
    
    Args:
        include_counts: Include email counts for each label
        flat: If True, returns flat list. If False, returns hierarchical tree structure.
    
    Permissions:
    - Users can only see their own labels
    """
    current_user = auth.user
    
    if include_counts:
        # Subquery for email counts
        email_count_subq = (
            db.query(
                EmailLabel.label_id,
                func.count(EmailLabel.email_id).label("email_count")
            )
            .join(Email, Email.id == EmailLabel.email_id)
            .filter(Email.is_deleted == False)
            .group_by(EmailLabel.label_id)
            .subquery()
        )
        
        # Main query with JOIN to subquery
        labels = (
            db.query(
                Label,
                func.coalesce(email_count_subq.c.email_count, 0).label("email_count")
            )
            .outerjoin(email_count_subq, Label.id == email_count_subq.c.label_id)
            .filter(
                Label.owner_id == current_user.id,
                Label.is_deleted == False
            )
            .order_by(Label.name)
            .all()
        )
        
        email_counts = {label.id: count for label, count in labels}
    else:
        labels = db.query(Label).filter(
            Label.owner_id == current_user.id,
            Label.is_deleted == False
        ).order_by(Label.name).all()
        
        labels = [(label, 0) for label in labels]
        email_counts = {}
    
    if not flat:
        # Return hierarchical tree structure
        return build_label_tree(labels, email_counts)
    
    # Return flat list
    return [
        {
            "id": label.id,
            "name": label.name,
            "color": label.color,
            "parent_id": label.parent_id,
            "email_count": email_count,
        }
        for label, email_count in labels
    ]


@router.get("/labels/tree", response_model=List[LabelTreeResponse], dependencies=[Depends(authorized())])
def list_labels_tree(
    db: Session = Depends(get_db),
    include_counts: bool = Query(True, description="Include email counts"),
) -> List[dict]:
    """List user's labels as hierarchical tree structure.
    
    Returns labels organized in parent-child hierarchy with nested children arrays.
    
    Permissions:
    - Users can only see their own labels
    """
    current_user = auth.user
    
    if include_counts:
        # Subquery for email counts
        email_count_subq = (
            db.query(
                EmailLabel.label_id,
                func.count(EmailLabel.email_id).label("email_count")
            )
            .join(Email, Email.id == EmailLabel.email_id)
            .filter(Email.is_deleted == False)
            .group_by(EmailLabel.label_id)
            .subquery()
        )
        
        labels = (
            db.query(
                Label,
                func.coalesce(email_count_subq.c.email_count, 0).label("email_count")
            )
            .outerjoin(email_count_subq, Label.id == email_count_subq.c.label_id)
            .filter(
                Label.owner_id == current_user.id,
                Label.is_deleted == False
            )
            .all()
        )
        
        email_counts = {label.id: count for label, count in labels}
    else:
        labels_raw = db.query(Label).filter(
            Label.owner_id == current_user.id,
            Label.is_deleted == False
        ).all()
        
        labels = [(label, 0) for label in labels_raw]
        email_counts = {}
    
    return build_label_tree(labels, email_counts)


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
    
    # Get email count
    email_count = db.query(func.count(EmailLabel.email_id)).join(
        Email, Email.id == EmailLabel.email_id
    ).filter(
        EmailLabel.label_id == label_id,
        Email.is_deleted == False
    ).scalar() or 0
    
    return format_label_response(label, email_count=email_count)


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
    
    update_data = label_data.model_dump(exclude_unset=True)
    
    # Handle parent_id update
    if "parent_id" in update_data:
        new_parent_id = update_data["parent_id"]
        
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
    
    # Get all descendant IDs and delete them all (cascade delete)
    all_ids_to_delete = {label_id} | get_all_descendant_ids(db, label_id)
    
    # Remove all email associations for labels being deleted
    db.query(EmailLabel).filter(EmailLabel.label_id.in_(all_ids_to_delete)).delete(synchronize_session=False)
    
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


@router.get("/labels/{label_id}/emails", response_model=PaginatedListResponse[EmailListResponse], dependencies=[Depends(authorized())])
def list_label_emails(
    label_id: UUID,
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
) -> dict:
    """List emails with a specific label.
    
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
    
    # Base query
    query = db.query(Email).options(
        joinedload(Email.sender),
        selectinload(Email.attachments),
        selectinload(Email.labels),
    ).join(
        EmailLabel, Email.id == EmailLabel.email_id
    ).filter(
        EmailLabel.label_id == label_id,
        Email.is_deleted == False
    )
    
    # Get total count
    total = query.count()
    
    # Calculate pagination
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    offset = (page - 1) * page_size
    
    # Get results
    emails = query.order_by(Email.created_at.desc()).offset(offset).limit(page_size).all()
    
    # Format response
    emails_data = [format_email_list_response(email) for email in emails]
    
    return PaginatedListResponse[EmailListResponse](
        results=emails_data,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )
