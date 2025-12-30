from __future__ import annotations

from contextvars import ContextVar, Token
from typing import Optional

from fastapi import HTTPException, Request, status

from app.auth.token_manager import TokenData
from app.models.user import User

# Request-scoped auth context (similar to .NET HttpContext.User).
_current_user_ctx: ContextVar[Optional[User]] = ContextVar("current_user", default=None)
_token_data_ctx: ContextVar[Optional[TokenData]] = ContextVar("token_data", default=None)

# We also store the *Request* in a context var so `auth.user` can fall back to
# `request.state.current_user` safely across threadpool boundaries.
_request_ctx: ContextVar[Optional[Request]] = ContextVar("request", default=None)


def set_request_context(request: Request) -> Token:
    return _request_ctx.set(request)


def reset_request_context(token: Token) -> None:
    _request_ctx.reset(token)


def set_current_user(user: Optional[User]) -> Token:
    return _current_user_ctx.set(user)


def reset_current_user(token: Token) -> None:
    _current_user_ctx.reset(token)


def set_token_data(token_data: Optional[TokenData]) -> Token:
    return _token_data_ctx.set(token_data)


def reset_token_data(token: Token) -> None:
    _token_data_ctx.reset(token)


def get_request() -> Optional[Request]:
    return _request_ctx.get()


def get_current_user_ctx() -> Optional[User]:
    return _current_user_ctx.get()


def get_token_data_ctx() -> Optional[TokenData]:
    return _token_data_ctx.get()


class AuthContext:
    """Global accessor for request-scoped auth context."""

    @property
    def user(self) -> User:
        """Current authenticated user (raises 401 if missing)."""
        user = get_current_user_ctx()
        if user is None:
            req = get_request()
            user = getattr(getattr(req, "state", None), "current_user", None) if req else None
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
            )
        return user

    @property
    def optional_user(self) -> Optional[User]:
        """Current user if authenticated, else None."""
        user = get_current_user_ctx()
        if user is not None:
            return user
        req = get_request()
        return getattr(getattr(req, "state", None), "current_user", None) if req else None

    @property
    def token_data(self) -> Optional[TokenData]:
        token_data = get_token_data_ctx()
        if token_data is not None:
            return token_data
        req = get_request()
        return getattr(getattr(req, "state", None), "token_data", None) if req else None


# Import-friendly singleton: `from app.auth.context import auth; auth.user`
auth = AuthContext()


__all__ = [
    "auth",
    "AuthContext",
    "set_request_context",
    "reset_request_context",
    "set_current_user",
    "reset_current_user",
    "set_token_data",
    "reset_token_data",
    "get_request",
    "get_current_user_ctx",
    "get_token_data_ctx",
]
