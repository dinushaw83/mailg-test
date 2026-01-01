"""Authentication endpoints for email-based login with RBAC.

This module provides token generation for authenticated access.
Role is always derived from the database (user.role), ensuring
permissions are verified by the backend, not provided by the client.
"""

from app.auth.rbac import authorized
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, sessionmaker
from pydantic import BaseModel, Field
from typing import Optional
from app.db.session import get_db
from app.models.user import User
from app.auth.token_manager import get_token_manager
from app.auth.dependencies import get_current_user, auth
from app.api.v1.endpoints.users import format_user_response
from app.schemas.user import UserResponse
from app.db.run_router import ensure_run_database, get_engine
from app.db.registry import touch_run
from app.core.config import JWT_ACCESS_TOKEN_TTL_SECONDS
import app.db.session as database
import uuid

router = APIRouter()


class TokenRequest(BaseModel):
    """Request schema for token generation.
    
    User identification is required via email.
    Role is ALWAYS derived from the database (user.role), ensuring
    the backend is the source of truth for permissions.
    """
    email: str = Field(..., description="User email for authentication")


class TokenResponse(BaseModel):
    """Response schema for token generation."""
    access_token: str
    user: dict
    role: str
    run_id: str
    expires_in: int


@router.post("/auth/token", response_model=TokenResponse)
def create_token(
    token_request: TokenRequest,
    request: Request,
) -> TokenResponse:
    """Generate an access token for a user based on email-based login.
    
    This endpoint authenticates users by looking them up in the database.
    The role is ALWAYS derived from the database (user.role), ensuring
    the backend is the source of truth for permissions.
    
    Login Flow:
    1. User provides email
    2. Backend looks up/validates user in the seed/template database
       (to avoid provisioning a new run DB for invalid login attempts)
    3. Backend derives role from the database (user.role)
    4. Backend creates a fresh run_id and provisions the isolated run DB for that login
    5. Backend generates token with user_id, role, email, run_id
    6. All subsequent requests use this token and the run_id-scoped database
    7. Backend validates token and applies RBAC permissions
    
    Args:
        token_request: Token request with user email.
        request: FastAPI request object.
        
    Returns:
        TokenResponse with access_token, user info, role (from DB), and expiration.
        
    Raises:
        HTTPException: 400 if user not found.
                      401 if user is deleted or inactive.
    """
    # IMPORTANT: Avoid provisioning a new run DB for invalid login attempts.
    # We first validate the user against the seed/template database (clone source).
    lookup_engine = database.engine
    LookupSessionLocal = sessionmaker(bind=lookup_engine)
    lookup_db = LookupSessionLocal()
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    token_role: Optional[str] = None
    
    try:
        # ---- Step 1: validate user against seed/template DB ----
        # Normalize email for case-insensitive login
        normalized_email = token_request.email.lower().strip()
        user = lookup_db.query(User).filter(User.email == normalized_email).first()

        if not user:
            raise HTTPException(
                status_code=400,
                detail=f"User not found with email={normalized_email}. Please check the email and try again.",
            )

        if user.is_deleted:
            raise HTTPException(
                status_code=401,
                detail="Cannot login: user account has been deleted",
            )

        if not user.active:
            raise HTTPException(
                status_code=401,
                detail="Cannot login: user account is inactive",
            )

        # ALWAYS use role from database - backend is source of truth for permissions
        user_id = user.id
        user_email = user.email
        token_role = user.role
        valid_roles = ["admin", "user"]
        if token_role not in valid_roles:
            raise HTTPException(
                status_code=500,
                detail=f"User has invalid role '{token_role}' in database. Contact administrator.",
            )
    finally:
        # IMPORTANT: cloning per-run DB terminates active connections to the template DB;
        # ensure we are not holding one open before provisioning a run database.
        try:
            lookup_db.close()
        except Exception:
            pass

    if user_id is None or user_email is None or token_role is None:
        raise HTTPException(status_code=500, detail="Failed to resolve user identity from seed database.")

    # ---- Step 2: provision per-run DB only after successful validation ----
    run_id = str(uuid.uuid4())
    request.state.run_id = run_id
    try:
        ensure_run_database(run_id)
        # Best-effort: record created/last-used in the admin registry for cleanup heuristics.
        touch_run(run_id)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to initialize database for run_id={run_id}: {str(e)}",
        )

    engine = get_engine(run_id)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    try:
        # Re-fetch the user inside the run DB session so downstream helpers are consistent.
        run_user = db.query(User).filter(User.id == user_id).first()
        if not run_user:
            raise HTTPException(
                status_code=500,
                detail="User lookup succeeded but user was not found in the run database.",
            )

        token_manager = get_token_manager()
        token = token_manager.create_token(
            user_id=run_user.id,
            role=token_role,
            email=run_user.email,
            run_id=run_id,
        )

        user_response = format_user_response(run_user, db)

        return TokenResponse(
            access_token=token,
            user=user_response,
            role=token_role,
            run_id=run_id,
            expires_in=JWT_ACCESS_TOKEN_TTL_SECONDS,
        )
    finally:
        db.close()


@router.get("/auth/me", response_model=UserResponse, dependencies=[Depends(authorized())])
def get_current_user_info(
    db: Session = Depends(get_db)
) -> dict:
    """Get current authenticated user information.
    
    Uses the access token from request headers to identify the user.
    
    Args:
        current_user: Current authenticated user (from dependency).
        request: FastAPI request object.
        db: Database session.
        
    Returns:
        User information with role.
    """
    return format_user_response(auth.user, db)
