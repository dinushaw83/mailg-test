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
from app.schemas.user_settings import UserSettingsResponse, UserWithSettingsResponse
from app.api.v1.endpoints.user_settings import get_all_settings
from app.db.run_router import ensure_run_database
from app.db.session import get_db_session
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
    settings: UserSettingsResponse
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
    # We validate the user against the seed/template database (clone source).
    # Since the run DB is a clone of the seed DB, no need to re-fetch the user.
    lookup_engine = database.engine
    LookupSessionLocal = sessionmaker(bind=lookup_engine)
    lookup_db = LookupSessionLocal()
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    token_role: Optional[str] = None
    user_response: Optional[dict] = None
    
    try:
        # Normalize email for case-insensitive login
        normalized_email = token_request.email.lower().strip()
        user = lookup_db.query(User).filter(User.email == normalized_email).first()

        if not user:
            raise HTTPException(
                status_code=400,
                detail=f"User not found with email={normalized_email}. Please check the email and try again.",
            )

        if not user.active:
            raise HTTPException(
                status_code=401,
                detail="Cannot login: user account is inactive",
            )

        # ALWAYS use role from database - backend is source of truth for permissions
        user_id = str(user.id)
        user_email = user.email
        token_role = user.role
        valid_roles = ["admin", "user"]
        if token_role not in valid_roles:
            raise HTTPException(
                status_code=500,
                detail=f"User has invalid role '{token_role}' in database. Contact administrator.",
            )
        
        # Format user response while session is still open
        user_response = format_user_response(user, lookup_db)
    finally:
    # IMPORTANT: cloning per-run DB terminates active connections to the template DB;
    # ensure we are not holding one open before provisioning a run database.
        lookup_db.rollback()
        lookup_db.close()

    if user_id is None or user_email is None or token_role is None or user_response is None:
        raise HTTPException(status_code=500, detail="Failed to resolve user identity from seed database.")

    # Provision per-run DB only after successful validation
    run_id = str(uuid.uuid4())
    request.state.run_id = run_id
    try:
        ensure_run_database(run_id)
        touch_run(run_id)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to initialize database for run_id={run_id}: {str(e)}",
        )

    token_manager = get_token_manager()
    token = token_manager.create_token(
        user_id=user_id,
        role=token_role,
        email=user_email,
        run_id=run_id,
    )

    # Fetch or create user settings from the run database
    run_db = get_db_session(run_id)
    try:
        settings = get_all_settings(uuid.UUID(user_id), run_db)
        settings_response = UserSettingsResponse(
            general=settings["general"],
            advanced=settings["advanced"],
            labels=settings["labels"],
        )
    finally:
        run_db.rollback()
        run_db.close()

    return TokenResponse(
        access_token=token,
        user=user_response,
        settings=settings_response,
        role=token_role,
        run_id=run_id,
        expires_in=JWT_ACCESS_TOKEN_TTL_SECONDS,
    )


@router.get("/auth/me", response_model=UserWithSettingsResponse, dependencies=[Depends(authorized())])
def get_current_user_info(
    db: Session = Depends(get_db)
) -> dict:
    """Get current authenticated user information with settings.
    
    Uses the access token from request headers to identify the user.
    
    Args:
        db: Database session.
        
    Returns:
        User information with all settings.
    """
    user = auth.user
    user_data = format_user_response(user, db)
    
    # Get or create settings for the user
    settings = get_all_settings(user.id, db)
    settings_response = UserSettingsResponse(
        general=settings["general"],
        advanced=settings["advanced"],
        labels=settings["labels"],
    )
    
    return {
        **user_data,
        "settings": settings_response,
    }
