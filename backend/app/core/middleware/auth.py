"""Authentication middleware.

This middleware parses and validates the auth token once per request and caches
results on `request.state` for reuse by dependencies. It never rejects requests;
route dependencies decide whether auth is required.
"""

from __future__ import annotations

import logging

from fastapi import Request

from app.auth.context import (
    reset_current_user,
    reset_request_context,
    reset_token_data,
    set_current_user,
    set_request_context,
    set_token_data,
)
from app.auth.token_dependency import get_token_data_optional

logger = logging.getLogger(__name__)


async def auth_middleware(request: Request, call_next):
    """Parse/validate auth token once and cache it on request.state.

    This middleware never rejects requests; route dependencies decide whether
    auth is required. It exists to avoid repeated JWT validation in the same request.
    """
    # Ensure we don't leak context between requests.
    token_reset = set_token_data(None)
    user_reset = set_current_user(None)
    request_reset = set_request_context(request)
    try:
        try:
            token_data = get_token_data_optional(request)
            # Mirror request.state into contextvars for safe access across threadpools.
            set_token_data(token_data)
        except Exception as e:
            # Never fail the request due to auth middleware parsing.
            logger.debug(f"auth_middleware failed to parse token: {e}")
        return await call_next(request)
    finally:
        reset_token_data(token_reset)
        reset_current_user(user_reset)
        reset_request_context(request_reset)


__all__ = ["auth_middleware"]
