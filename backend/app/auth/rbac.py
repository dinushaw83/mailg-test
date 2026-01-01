"""Role-based access control (RBAC) utilities.

These are the canonical helpers used by route dependencies throughout the app.
"""

from __future__ import annotations
from typing import List, Optional
from fastapi import Depends, HTTPException, status
from app.auth.dependencies import get_current_user
from app.models.user import User


def authorized(allowed_roles: Optional[List[str]] = None):
    """FastAPI-style authorization dependency for endpoints.
    
    Args:
        allowed_roles: Optional list of allowed role names (case-insensitive).
                      None or empty list allows any authenticated user.

    Usage:
        
        @router.get(
            "/secure",
            dependencies=[Depends(authorized())],
        )
        def secure_route():
            ...

        @router.put(
            "/resource/{resource_id}",
            dependencies=[Depends(authorized(["admin"]))],
        )
        def update_resource(resource_id: str):
            ...

        # If you need the authenticated user object in the handler, you can
        # also depend on this directly (it returns a User):
        @router.get("/me")
        def me(current_user: User = Depends(authorized())):
            ...
    """

    def dependency(current_user: User = Depends(get_current_user)) -> User:
        # None or empty list means any authenticated user can access
        if allowed_roles is not None and allowed_roles:
            # Get role from token (preferred) or DB
            user_role = getattr(current_user, "_token_role", None) or current_user.role
            
            # Normalize roles to lowercase for case-insensitive comparison
            user_role_lower = user_role.lower() if user_role else ""
            allowed_roles_lower = [role.lower() for role in allowed_roles]
            
            if user_role_lower not in allowed_roles_lower:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail= "You don't have permission to perform this action."
                )
        return current_user

    return dependency


def is_admin(user: User) -> bool:
    """Check if user is an admin (case-insensitive).
    
    Args:
        user: User model instance.
        
    Returns:
        True if user role is 'admin'.
    """
    role = getattr(user, '_token_role', None) or user.role
    return role.lower() == "admin" if role else False


def is_user(user: User) -> bool:
    """Check if user is a regular user (case-insensitive).
    
    Args:
        user: User model instance.
        
    Returns:
        True if user role is 'user'.
    """
    role = getattr(user, '_token_role', None) or user.role
    return role.lower() == "user" if role else False


__all__ = [
    "authorized",
    "is_admin",
    "is_user",
]
