"""Folder CRUD endpoints.

This module provides:
- Full CRUD operations for folders
- System folder protection
- Email listing per folder
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, case
from typing import Optional, List
from uuid import UUID
import logging

from app.db.session import get_db
from app.models.folder import Folder
from app.models.email import Email
from app.schemas.folder import FolderCreate, FolderUpdate, FolderResponse, FolderListResponse
from app.schemas.email import EmailListResponse
from app.schemas.pagination import PaginatedListResponse
from app.auth.rbac import authorized
from app.auth.dependencies import auth
from app.core.constants import VALID_FOLDER_TYPES, FolderType

logger = logging.getLogger(__name__)
router = APIRouter()


def format_folder_response(folder: Folder, email_count: int = 0, unread_count: int = 0) -> dict:
    """Format folder model to response dict."""
    return {
        "id": folder.id,
        "name": folder.name,
        "folder_type": folder.folder_type,
        "color": folder.color,
        "icon": folder.icon,
        "owner_id": folder.owner_id,
        "parent_folder_id": folder.parent_folder_id,
        "is_system": folder.is_system,
        "is_deleted": folder.is_deleted,
        "created_at": folder.created_at,
        "updated_at": folder.updated_at,
        "email_count": email_count,
        "unread_count": unread_count,
    }


@router.post("/folders", response_model=FolderResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(authorized())])
def create_folder(
    folder_data: FolderCreate,
    db: Session = Depends(get_db),
) -> dict:
    """Create a new custom folder.
    
    Permissions:
    - All authenticated users can create folders
    """
    current_user = auth.user
    
    # Validate folder type
    if folder_data.folder_type not in VALID_FOLDER_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid folder type. Must be one of: {', '.join(VALID_FOLDER_TYPES)}"
        )
    
    # Only custom folders can be created
    if folder_data.folder_type != FolderType.CUSTOM.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only custom folders can be created"
        )
    
    # Check parent folder if specified
    if folder_data.parent_folder_id:
        parent = db.query(Folder).filter(
            Folder.id == folder_data.parent_folder_id,
            Folder.owner_id == current_user.id,
            Folder.is_deleted == False
        ).first()
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid parent folder ID"
            )
    
    folder = Folder(
        name=folder_data.name,
        folder_type=folder_data.folder_type,
        color=folder_data.color,
        icon=folder_data.icon,
        owner_id=current_user.id,
        parent_folder_id=folder_data.parent_folder_id,
        is_system=False,
    )
    
    try:
        db.add(folder)
        db.commit()
        db.refresh(folder)
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Folder {folder.id} created by user {current_user.id}")
    
    return format_folder_response(folder)


@router.get("/folders", response_model=List[FolderListResponse], dependencies=[Depends(authorized())])
def list_folders(
    db: Session = Depends(get_db),
    include_counts: bool = Query(True, description="Include email counts"),
) -> List[dict]:
    """List user's folders with email counts.
    
    Permissions:
    - Users can only see their own folders
    """
    current_user = auth.user
    
    if include_counts:
        # Subquery for email counts
        email_count_subq = (
            db.query(
                Email.folder_id,
                func.count(Email.id).label("email_count"),
                func.sum(case((Email.is_read == False, 1), else_=0)).label("unread_count")
            )
            .filter(Email.is_deleted == False)
            .group_by(Email.folder_id)
            .subquery()
        )
        
        # Main query with JOIN to subquery
        folders = (
            db.query(
                Folder,
                func.coalesce(email_count_subq.c.email_count, 0).label("email_count"),
                func.coalesce(email_count_subq.c.unread_count, 0).label("unread_count")
            )
            .outerjoin(email_count_subq, Folder.id == email_count_subq.c.folder_id)
            .filter(
                Folder.owner_id == current_user.id,
                Folder.is_deleted == False
            )
            .order_by(Folder.is_system.desc(), Folder.name)
            .all()
        )
        
        return [
            {
                "id": folder.id,
                "name": folder.name,
                "folder_type": folder.folder_type,
                "color": folder.color,
                "icon": folder.icon,
                "is_system": folder.is_system,
                "email_count": email_count,
                "unread_count": unread_count,
            }
            for folder, email_count, unread_count in folders
        ]
    else:
        folders = db.query(Folder).filter(
            Folder.owner_id == current_user.id,
            Folder.is_deleted == False
        ).order_by(Folder.is_system.desc(), Folder.name).all()
        
        return [
            {
                "id": folder.id,
                "name": folder.name,
                "folder_type": folder.folder_type,
                "color": folder.color,
                "icon": folder.icon,
                "is_system": folder.is_system,
                "email_count": 0,
                "unread_count": 0,
            }
            for folder in folders
        ]


@router.get("/folders/{folder_id}", response_model=FolderResponse, dependencies=[Depends(authorized())])
def get_folder(
    folder_id: UUID,
    db: Session = Depends(get_db),
) -> dict:
    """Get a specific folder by ID.
    
    Permissions:
    - Users can only access their own folders
    """
    current_user = auth.user
    
    folder = db.query(Folder).filter(
        Folder.id == folder_id,
        Folder.owner_id == current_user.id,
        Folder.is_deleted == False
    ).first()
    
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Folder {folder_id} not found"
        )
    
    # Get counts
    counts = db.query(
        func.count(Email.id).label("email_count"),
        func.sum(case((Email.is_read == False, 1), else_=0)).label("unread_count")
    ).filter(
        Email.folder_id == folder_id,
        Email.is_deleted == False
    ).first()
    
    return format_folder_response(
        folder,
        email_count=counts.email_count or 0,
        unread_count=int(counts.unread_count or 0)
    )


@router.put("/folders/{folder_id}", response_model=FolderResponse, dependencies=[Depends(authorized())])
def update_folder(
    folder_id: UUID,
    folder_data: FolderUpdate,
    db: Session = Depends(get_db),
) -> dict:
    """Update a folder (custom folders only for name changes).
    
    Permissions:
    - Users can only update their own folders
    - System folders can only have color/icon updated
    """
    current_user = auth.user
    
    folder = db.query(Folder).filter(
        Folder.id == folder_id,
        Folder.owner_id == current_user.id,
        Folder.is_deleted == False
    ).first()
    
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Folder {folder_id} not found"
        )
    
    update_data = folder_data.model_dump(exclude_unset=True)
    
    # System folders can't have name changed
    if folder.is_system and "name" in update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change name of system folder"
        )
    
    # Apply updates
    for field, value in update_data.items():
        setattr(folder, field, value)
    
    try:
        db.commit()
        db.refresh(folder)
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Folder {folder.id} updated by user {current_user.id}")
    
    return format_folder_response(folder)


@router.delete("/folders/{folder_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(authorized())])
def delete_folder(
    folder_id: UUID,
    db: Session = Depends(get_db),
    permanent: bool = Query(False, description="Permanently delete instead of soft delete"),
) -> None:
    """Delete a folder (custom folders only).
    
    Args:
        permanent: If True, permanently removes from database. If False (default), soft deletes.
    
    Permissions:
    - Users can only delete their own custom folders
    - System folders cannot be deleted
    """
    current_user = auth.user
    
    folder = db.query(Folder).filter(
        Folder.id == folder_id,
        Folder.owner_id == current_user.id,
        Folder.is_deleted == False
    ).first()
    
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Folder {folder_id} not found"
        )
    
    if folder.is_system:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete system folder"
        )
    
    # Move emails in this folder to inbox
    inbox = db.query(Folder).filter(
        Folder.owner_id == current_user.id,
        Folder.folder_type == FolderType.INBOX.value,
        Folder.is_deleted == False
    ).first()
    
    if inbox:
        db.query(Email).filter(
            Email.folder_id == folder_id,
            Email.is_deleted == False
        ).update({"folder_id": inbox.id})
    
    if permanent:
        # Permanently delete from database
        db.delete(folder)
    else:
        # Soft delete
        folder.is_deleted = True
    
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    
    logger.info(f"Folder {folder_id} {'permanently ' if permanent else ''}deleted by user {current_user.id}")


@router.get("/folders/{folder_id}/emails", response_model=PaginatedListResponse[EmailListResponse], dependencies=[Depends(authorized())])
def list_folder_emails(
    folder_id: UUID,
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    is_read: Optional[bool] = Query(None, description="Filter by read status"),
    is_starred: Optional[bool] = Query(None, description="Filter by starred"),
) -> dict:
    """List emails in a specific folder.
    
    Permissions:
    - Users can only access their own folders
    """
    from app.api.v1.endpoints.emails import format_email_list_response
    from sqlalchemy.orm import selectinload
    
    current_user = auth.user
    
    # Verify folder ownership
    folder = db.query(Folder).filter(
        Folder.id == folder_id,
        Folder.owner_id == current_user.id,
        Folder.is_deleted == False
    ).first()
    
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Folder {folder_id} not found"
        )
    
    # Base query
    query = db.query(Email).options(
        joinedload(Email.sender),
        joinedload(Email.folder),
        selectinload(Email.attachments),
        selectinload(Email.labels),
    ).filter(
        Email.folder_id == folder_id,
        Email.is_deleted == False
    )
    
    # Apply filters
    if is_read is not None:
        query = query.filter(Email.is_read == is_read)
    
    if is_starred is not None:
        query = query.filter(Email.is_starred == is_starred)
    
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
