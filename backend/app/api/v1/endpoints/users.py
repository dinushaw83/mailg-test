"""Users CRUD endpoint for email application.

This module provides basic user management functionality with RBAC.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
from uuid import UUID
import logging

from app.db.session import get_db
from app.models.user import User
from app.models.label import Label
from app.schemas.user import UserResponse, UserCreate, UserUpdate
from app.schemas.pagination import PaginatedListResponse
from app.auth.rbac import authorized
from app.auth.dependencies import auth
from app.core.constants import (
    VALID_USER_ROLES, UserRole, SystemLabel, CategoryLabel, EXCLUSIVE_SYSTEM_LABELS
)

logger = logging.getLogger(__name__)

# System labels to create for each new user (using enums)
SYSTEM_LABELS = [
    # System labels - check if exclusive using the EXCLUSIVE_SYSTEM_LABELS set
    {"label": sl, "is_exclusive": sl in EXCLUSIVE_SYSTEM_LABELS}
    for sl in SystemLabel
] + [
    # Category labels (never exclusive)
    {"label": cl, "is_exclusive": False}
    for cl in CategoryLabel
]

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
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "email_label": user.email_label,
        "role": user.role,
        "photo": user.photo,
        "company": user.company,
        "job_title": user.job_title,
        "phone": user.phone,
        "phone_country_code": user.phone_country_code,
        "phone_label": user.phone_label,
        "address": user.address,
        "birthday_month": user.birthday_month,
        "birthday_day": user.birthday_day,
        "birthday_year": user.birthday_year,
        "significant_dates": user.significant_dates,
        "website": user.website,
        "related_persons": user.related_persons,
        "labels": user.labels,
        "custom_fields": user.custom_fields,
        "notes": user.notes,
        "undo_send_delay_seconds": user.undo_send_delay_seconds,
        "active": user.active,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
    }


@router.get("/users", response_model=PaginatedListResponse[UserResponse], dependencies=[Depends(authorized())])
def list_users(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    role: Optional[str] = Query(None, description="Filter by role"),
    search: Optional[str] = Query(None, description="Search in name and email"),
) -> dict:
    """List users with pagination and filtering.
    
    Permissions:
    - user: Can view only active users
    - admin: Can view all users including deleted (with show_deleted flag)
    
    Args:
        db: Database session.
        page: Page number (1-indexed).
        page_size: Number of users per page.
        role: Filter by role.
        search: Search term for name/email.
        
    Returns:
        Paginated list of users.
    """
    current_user = auth.user
    
    # Base query
    query = db.query(User)
    
    # Permission-based filtering
    if current_user.role != "admin":
        # Regular users can only see active users
        query = query.filter(User.active == True)
    
    # Apply filters
    if role:
        query = query.filter(User.role == role)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                User.first_name.ilike(search_term),
                User.last_name.ilike(search_term),
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
    user_id: UUID,
    db: Session = Depends(get_db),
) -> dict:
    """Get a specific user by ID.
    
    Permissions:
    - user: Can only view active users
    - admin: Can view all users including inactive
    
    Args:
        user_id: User ID.
        db: Database session.
        
    Returns:
        User details.
        
    Raises:
        HTTPException: 404 if user not found or inactive (for non-admin users).
    """
    current_user = auth.user
    
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {user_id} not found"
        )
    
    # Non-admin users can only see active users
    if current_user.role != "admin" and not user.active:
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
    - user: Not allowed
    
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
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        email=user_data.email,
        email_label=user_data.email_label,
        role=user_data.role,
        photo=user_data.photo,
        company=user_data.company,
        job_title=user_data.job_title,
        phone=user_data.phone,
        phone_country_code=user_data.phone_country_code,
        phone_label=user_data.phone_label,
        address=user_data.address,
        birthday_month=user_data.birthday_month,
        birthday_day=user_data.birthday_day,
        birthday_year=user_data.birthday_year,
        significant_dates=[d.model_dump() for d in user_data.significant_dates] if user_data.significant_dates else [],
        website=user_data.website,
        related_persons=[p.model_dump() for p in user_data.related_persons] if user_data.related_persons else [],
        labels=user_data.labels or [],
        custom_fields=[f.model_dump() for f in user_data.custom_fields] if user_data.custom_fields else [],
        notes=user_data.notes,
    )
    
    try:
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create system labels for new user
        for label_def in SYSTEM_LABELS:
            system_label = Label(
                owner_id=user.id,
                name=label_def["label"].value,  # Get string value from enum
                color="#e1e3e1",  # Default system label color
                is_system=True,
                is_exclusive=label_def["is_exclusive"],
                show_in_label_list=True,
                show_in_message_list=True,
                show_if_unread=False,
            )
            db.add(system_label)
        db.commit()
        
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"User {user.id} created by admin {auth.user.id}")
    
    return format_user_response(user, db)


@router.put("/users/{user_id}", response_model=UserResponse, dependencies=[Depends(authorized(["admin"]))])
def update_user(
    user_id: UUID,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
) -> dict:
    """Update an existing user.
    
    Permissions:
    - admin: Can update any user
    - user: Not allowed
    
    Args:
        user_id: User ID.
        user_data: Fields to update.
        db: Database session.
        
    Returns:
        Updated user.
        
    Raises:
        HTTPException: 404 if user not found, 400 if validation fails.
    """
    user = db.query(User).filter(User.id == user_id).first()
    
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
    user_id: UUID,
    db: Session = Depends(get_db),
) -> None:
    """Delete a user.
    
    Permissions:
    - admin: Can delete any user
    - user: Not allowed
    
    Args:
        user_id: User ID.
        
    Raises:
        HTTPException: 404 if user not found.
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {user_id} not found"
        )
    
    # Permanently delete from database
    db.delete(user)
    
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"User {user.id} permanently deleted by admin {auth.user.id}")

    return None
