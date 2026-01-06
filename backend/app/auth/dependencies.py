"""FastAPI dependencies for token-based authentication.

These are the canonical helpers used by route dependencies throughout the app.
They:
- extract a token from headers
- validate JWTs
- resolve the current user from the database
and cache results on `request.state` for reuse within the same request.
"""

from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session

from app.auth.context import auth, set_current_user
from app.auth.token_dependency import require_token_data
from app.db.session import get_db
from app.models.user import User

# Security scheme for OpenAPI docs (not strictly required for our dependencies).
security = HTTPBearer(auto_error=False)


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    """Dependency: resolve current authenticated user (required)."""
    # Request-scope cache (many endpoints call multiple dependencies).
    cached_user = getattr(request.state, "current_user", None)
    if cached_user is not None:
        set_current_user(cached_user)
        return cached_user

    token_data = require_token_data(request)

    # Convert string user_id to UUID for database query
    try:
        user_id = UUID(token_data.user_id) if isinstance(token_data.user_id, str) else token_data.user_id
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with token not found. Please login again.",
        )

    if user.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account has been deleted",
        )

    if not user.active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive",
        )

    # Token role is derived from DB role at login time; keep for RBAC checks.
    user._token_role = token_data.role

    request.state.current_user = user
    set_current_user(user)
    return user


def get_current_user_optional(request: Request, db: Session = Depends(get_db)) -> Optional[User]:
    """Dependency: resolve current user if token is present, else None."""
    try:
        return get_current_user(request, db=db)
    except HTTPException:
        set_current_user(None)
        return None


__all__ = [
    "security",
    "auth",
    "get_current_user",
    "get_current_user_optional",
]
