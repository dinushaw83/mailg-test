"""Generic Items CRUD endpoint - reference implementation for the mailg.

This module demonstrates:
- Full CRUD operations (Create, Read, Update, Delete, List)
- RBAC authorization with role-based permissions
- Pagination and filtering
- Proper error handling
- Database isolation (each run_id gets isolated items)
- User relationship tracking (created_by, updated_by)
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_
from typing import Optional
import logging

from app.db.session import get_db
from app.models.item import Item
from app.models.user import User
from app.schemas.item import ItemCreate, ItemUpdate, ItemResponse
from app.schemas.pagination import PaginatedListResponse
from app.auth.rbac import authorized
from app.auth.dependencies import auth
from app.core.constants import VALID_ITEM_STATUSES, VALID_ITEM_PRIORITIES, ItemStatus, ItemPriority

logger = logging.getLogger(__name__)
router = APIRouter()


def format_item_response(item: Item, db: Session) -> dict:
    """Format item model to response dict with user information.
    
    Args:
        item: Item model instance.
        db: Database session.
        
    Returns:
        Dictionary with item data and creator/updater names.
    """
    response = {
        "id": item.id,
        "name": item.name,
        "description": item.description,
        "status": item.status,
        "priority": item.priority,
        "is_public": item.is_public,
        "created_by_id": item.created_by_id,
        "updated_by_id": item.updated_by_id,
        "is_deleted": item.is_deleted,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }
    
    # Add creator name
    if item.created_by:
        response["created_by_name"] = item.created_by.name
    
    # Add updater name
    if item.updated_by:
        response["updated_by_name"] = item.updated_by.name
    
    return response


@router.post("/items", response_model=ItemResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(authorized())])
def create_item(
    item_data: ItemCreate,
    db: Session = Depends(get_db),
) -> dict:
    """Create a new item.
    
    Permissions:
    - All authenticated users can create items
    - Creator is automatically set from authenticated user
    
    Args:
        item_data: Item creation data.
        db: Database session.
        
    Returns:
        Created item with metadata.
        
    Raises:
        HTTPException: 400 if validation fails.
    """
    current_user = auth.user
    
    # Validate status
    if item_data.status and item_data.status not in VALID_ITEM_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(VALID_ITEM_STATUSES)}"
        )
    
    # Validate priority
    if item_data.priority and item_data.priority not in VALID_ITEM_PRIORITIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid priority. Must be one of: {', '.join(VALID_ITEM_PRIORITIES)}"
        )
    
    # Create item
    item = Item(
        name=item_data.name,
        description=item_data.description,
        status=item_data.status or ItemStatus.ACTIVE.value,
        priority=item_data.priority or ItemPriority.MEDIUM.value,
        is_public=item_data.is_public if item_data.is_public is not None else True,
        created_by_id=current_user.id,
    )
    
    try:
        db.add(item)
        db.commit()
        db.refresh(item)
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Item {item.id} created by user {current_user.id}")
    
    return format_item_response(item, db)


@router.get("/items", response_model=PaginatedListResponse[ItemResponse], dependencies=[Depends(authorized())])
def list_items(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    status: Optional[str] = Query(None, description="Filter by status"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    search: Optional[str] = Query(None, description="Search in name and description"),
    show_deleted: bool = Query(False, description="Include deleted items (admin only)"),
) -> dict:
    """List items with pagination and filtering.
    
    Permissions:
    - end-user: Can view only public items
    - agent: Can view all items (public and private)
    - admin: Can view all items including deleted (with show_deleted flag)
    
    Args:
        db: Database session.
        page: Page number (1-indexed).
        page_size: Number of items per page.
        status: Filter by status.
        priority: Filter by priority.
        search: Search term for name/description.
        show_deleted: Include deleted items (admin only).
        
    Returns:
        Paginated list of items.
    """
    current_user = auth.user
    
    # Base query
    query = db.query(Item)
    
    # Permission-based filtering
    if current_user.role == "end-user":
        # End users can only see public, non-deleted items
        query = query.filter(Item.is_public == True, Item.is_deleted == False)
    elif current_user.role in ["agent", "admin"]:
        # Agents and admins can see all items (unless deleted)
        if not show_deleted or current_user.role != "admin":
            query = query.filter(Item.is_deleted == False)
    
    # Apply filters
    if status:
        query = query.filter(Item.status == status)
    if priority:
        query = query.filter(Item.priority == priority)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Item.name.ilike(search_term),
                Item.description.ilike(search_term)
            )
        )
    
    # Get total count
    total = query.count()
    
    # Calculate pagination
    total_pages = (total + page_size - 1) // page_size
    offset = (page - 1) * page_size
    
    # Get page of results with eager loading to avoid N+1 queries
    items = query.options(
        joinedload(Item.created_by),
        joinedload(Item.updated_by)
    ).order_by(Item.created_at.desc()).offset(offset).limit(page_size).all()
    
    # Format response
    items_data = [format_item_response(item, db) for item in items]
    
    return PaginatedListResponse[ItemResponse](
        results=items_data,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/items/{item_id}", response_model=ItemResponse, dependencies=[Depends(authorized())])
def get_item(
    item_id: int,
    db: Session = Depends(get_db),
) -> dict:
    """Get a specific item by ID.
    
    Permissions:
    - end-user: Can view only public items
    - agent/admin: Can view all items
    
    Args:
        item_id: Item ID.
        db: Database session.
        
    Returns:
        Item details.
        
    Raises:
        HTTPException: 404 if item not found or insufficient permissions.
    """
    current_user = auth.user
    
    # Query item with eager loading
    item = db.query(Item).options(
        joinedload(Item.created_by),
        joinedload(Item.updated_by)
    ).filter(Item.id == item_id, Item.is_deleted == False).first()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item {item_id} not found"
        )
    
    # Permission check
    if current_user.role == "end-user" and not item.is_public:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item {item_id} not found"
        )
    
    return format_item_response(item, db)


@router.put("/items/{item_id}", response_model=ItemResponse, dependencies=[Depends(authorized(["admin", "agent"]))])
def update_item(
    item_id: int,
    item_data: ItemUpdate,
    db: Session = Depends(get_db),
) -> dict:
    """Update an existing item.
    
    Permissions:
    - admin: Can update any item
    - agent: Can update any item
    - end-user: Not allowed
    
    Args:
        item_id: Item ID.
        item_data: Fields to update.
        db: Database session.
        
    Returns:
        Updated item.
        
    Raises:
        HTTPException: 404 if item not found, 400 if validation fails.
    """
    current_user = auth.user
    
    # Query item
    item = db.query(Item).filter(Item.id == item_id, Item.is_deleted == False).first()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item {item_id} not found"
        )
    
    # Update fields
    update_data = item_data.model_dump(exclude_unset=True)
    
    # Validate status
    if "status" in update_data:
        if update_data["status"] not in VALID_ITEM_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Must be one of: {', '.join(VALID_ITEM_STATUSES)}"
            )
    
    # Validate priority
    if "priority" in update_data:
        if update_data["priority"] not in VALID_ITEM_PRIORITIES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid priority. Must be one of: {', '.join(VALID_ITEM_PRIORITIES)}"
            )
    
    # Apply updates
    for field, value in update_data.items():
        setattr(item, field, value)
    
    # Set updater
    item.updated_by_id = current_user.id
    
    try:
        db.commit()
        db.refresh(item)
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Item {item.id} updated by user {current_user.id}")
    
    return format_item_response(item, db)


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(authorized(["admin"]))])
def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
) -> None:
    """Delete an item (soft delete).
    
    Permissions:
    - admin: Can delete any item
    - agent/end-user: Not allowed
    
    Args:
        item_id: Item ID.
        db: Database session.
        
    Raises:
        HTTPException: 404 if item not found.
    """
    current_user = auth.user
    
    # Query item
    item = db.query(Item).filter(Item.id == item_id, Item.is_deleted == False).first()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item {item_id} not found"
        )
    
    # Soft delete
    item.is_deleted = True
    item.updated_by_id = current_user.id
    
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Item {item.id} deleted by user {current_user.id}")
    
    return None

