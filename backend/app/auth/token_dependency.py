"""Token-only authentication dependencies (no DB access).

This module is intentionally DB-free to avoid circular imports between:
- app.database (DB session handling)
- app.auth.dependencies (current-user resolution, which needs DB)

It is safe for app.database to import from here.
"""

from __future__ import annotations

from typing import Optional

from fastapi import HTTPException, Request, status

from app.auth.token_manager import TokenData, get_token_manager


def extract_token_from_header(request: Request) -> Optional[str]:
    """Retrieve access token from Authorization header.

    Expects: Authorization: Bearer <token>
    """
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:]
    return None


def get_token_data_optional(request: Request) -> Optional[TokenData]:
    """Get validated TokenData from request, if present.

    Never raises. Caches results on request.state for reuse within the request.
    """
    # Avoid re-validating on the same request.
    if getattr(request.state, "_token_data_loaded", False):
        token_data = getattr(request.state, "token_data", None)
        return token_data

    token = extract_token_from_header(request)
    request.state.auth_token = token

    if not token:
        request.state.token_data = None
        request.state.token_error = "missing"
        request.state._token_data_loaded = True
        return None

    token_manager = get_token_manager()
    token_data = token_manager.validate_token(token)
    if not token_data:
        request.state.token_data = None
        request.state.token_error = "invalid"
        request.state._token_data_loaded = True
        return None

    request.state.token_data = token_data
    request.state.token_error = None
    request.state._token_data_loaded = True
    request.state.run_id = token_data.run_id
    return token_data


def require_token_data(request: Request) -> TokenData:
    """Require a valid access token and return TokenData (raises 401 otherwise)."""
    token_data = get_token_data_optional(request)
    if token_data:
        return token_data

    token_error = getattr(request.state, "token_error", None)
    if token_error == "missing":
        detail = (
            "Missing access token. Please login first. "
            "Provide Authorization: Bearer <token>"
        )
    else:
        detail = "Invalid or expired access token. Please login again."

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


__all__ = [
    "extract_token_from_header",
    "get_token_data_optional",
    "require_token_data",
]


