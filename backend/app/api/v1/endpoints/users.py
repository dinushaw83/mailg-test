"""Users CRUD endpoint - simplified mailg version.

This module provides basic user management functionality with RBAC.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
import logging

from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserResponse, UserCreate, UserUpdate
from app.schemas.pagination import PaginatedListResponse
from app.auth.rbac import authorized
from app.auth.dependencies import auth
from app.core.constants import VALID_USER_ROLES, UserRole

logger = logging.getLogger(__name__)
router = APIRouter()


def format_user_response(user: User, db: Session) -> dict:
    """Format user model to API response format.
    
    Args:
        user: User model instance to format.
        db: Database session.
        
    Returns:
        Dictionary containing formatted user data.
    """
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "phone": user.phone,
        "timezone": user.timezone,
        "locale": user.locale,
        "photo": user.photo,
        "verified": user.verified,
        "active": user.active,
        "suspended": user.suspended,
        "suspended_at": user.suspended_at.isoformat() + "Z" if user.suspended_at else None,
        "suspended_reason": user.suspended_reason,
        "notes": user.notes,
        "last_login_at": user.last_login_at.isoformat() + "Z" if user.last_login_at else None,
        "created_at": user.created_at.isoformat() + "Z" if user.created_at else None,
        "updated_at": user.updated_at.isoformat() + "Z" if user.updated_at else None,
    }


@router.get("/users", response_model=PaginatedListResponse[UserResponse], dependencies=[Depends(authorized())])
def list_users(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    role: Optional[str] = Query(None, description="Filter by role"),
    search: Optional[str] = Query(None, description="Search in name and email"),
    show_deleted: bool = Query(False, description="Include deleted users (admin only)"),
) -> dict:
    """List users with pagination and filtering.
    
    Permissions:
    - end-user: Can view only active users
    - agent: Can view all users (non-deleted)
    - admin: Can view all users including deleted (with show_deleted flag)
    
    Args:
        db: Database session.
        page: Page number (1-indexed).
        page_size: Number of users per page.
        role: Filter by role.
        search: Search term for name/email.
        show_deleted: Include deleted users (admin only).
        
    Returns:
        Paginated list of users.
    """
    current_user = auth.user
    
    # Base query
    query = db.query(User)
    
    # Permission-based filtering
    if current_user.role == "end-user":
        # End users can only see active, non-deleted users
        query = query.filter(User.is_deleted == False, User.active == True)
    elif current_user.role == "agent":
        # Agents can see all non-deleted users
        query = query.filter(User.is_deleted == False)
    elif current_user.role == "admin":
        # Admins can see deleted users if requested
        if not show_deleted:
            query = query.filter(User.is_deleted == False)
    
    # Apply filters
    if role:
        query = query.filter(User.role == role)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                User.name.ilike(search_term),
                User.email.ilike(search_term)
            )
        )
    
    # Get total count
    total = query.count()
    
    # Calculate pagination
    total_pages = (total + page_size - 1) // page_size
    offset = (page - 1) * page_size
    
    # Get page of results
    users = query.order_by(User.created_at.desc()).offset(offset).limit(page_size).all()
    
    # Format response
    users_data = [format_user_response(user, db) for user in users]
    
    return PaginatedListResponse[UserResponse](
        results=users_data,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/users/{user_id}", response_model=UserResponse, dependencies=[Depends(authorized())])
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
) -> dict:
    """Get a specific user by ID.
    
    Args:
        user_id: User ID.
        db: Database session.
        
    Returns:
        User details.
        
    Raises:
        HTTPException: 404 if user not found.
    """
    user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {user_id} not found"
        )
    
    return format_user_response(user, db)


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(authorized(["admin"]))])
def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
) -> dict:
    """Create a new user.
    
    Permissions:
    - admin: Can create users
    - agent/end-user: Not allowed
    
    Args:
        user_data: User creation data.
        db: Database session.
        
    Returns:
        Created user.
        
    Raises:
        HTTPException: 400 if email already exists or validation fails.
    """
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with email {user_data.email} already exists"
        )
    
    # Create user
    user = User(
        name=user_data.name,
        email=user_data.email,
        role=user_data.role,
        phone=user_data.phone,
        timezone=user_data.timezone,
        locale=user_data.locale or "en-US",
        photo=user_data.photo,
        notes=user_data.notes,
    )
    
    try:
        db.add(user)
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"User {user.id} created by admin {auth.user.id}")
    
    return format_user_response(user, db)


@router.put("/users/{user_id}", response_model=UserResponse, dependencies=[Depends(authorized(["admin"]))])
def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
) -> dict:
    """Update an existing user.
    
    Permissions:
    - admin: Can update any user
    - agent/end-user: Not allowed
    
    Args:
        user_id: User ID.
        user_data: Fields to update.
        db: Database session.
        
    Returns:
        Updated user.
        
    Raises:
        HTTPException: 404 if user not found, 400 if validation fails.
    """
    user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {user_id} not found"
        )
    
    # Update fields
    update_data = user_data.model_dump(exclude_unset=True)
    
    # Check email uniqueness if email is being updated
    if "email" in update_data and update_data["email"] != user.email:
        existing_user = db.query(User).filter(User.email == update_data["email"]).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User with email {update_data['email']} already exists"
            )
    
    # Apply updates
    for field, value in update_data.items():
        setattr(user, field, value)
    
    try:
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"User {user.id} updated by admin {auth.user.id}")
    
    return format_user_response(user, db)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(authorized(["admin"]))])
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
) -> None:
    """Delete a user (soft delete).
    
    Permissions:
    - admin: Can delete any user
    - agent/end-user: Not allowed
    
    Args:
        user_id: User ID.
        db: Database session.
        
    Raises:
        HTTPException: 404 if user not found.
    """
    user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {user_id} not found"
        )
    
    # Soft delete
    user.is_deleted = True
    
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"User {user.id} deleted by admin {auth.user.id}")
    
    return None
