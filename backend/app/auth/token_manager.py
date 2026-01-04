"""Token management for role-aware authentication.

This project previously used an in-memory token cache, which breaks when:
- the backend runs multiple Gunicorn workers (each worker has its own memory)
- the container/process restarts (memory is wiped)

We now use signed JWT access tokens (stateless) so validation works across
workers and survives restarts.
"""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Set
from dataclasses import dataclass

import jwt
from jwt import InvalidTokenError

from app.core.config import (
    JWT_ACCESS_TOKEN_TTL_SECONDS,
    JWT_ALGORITHM,
    JWT_ISSUER,
    JWT_SECRET_KEY,
)


@dataclass
class TokenData:
    """Token metadata stored in cache."""
    user_id: str  # UUID as string
    role: str
    email: str
    expires_at: datetime
    run_id: str
    
    def is_expired(self) -> bool:
        """Check if token has expired.
        
        Returns:
            True if token is expired, False otherwise.
        """
        return datetime.now(timezone.utc) > self.expires_at


class TokenManager:
    """Manages token generation, storage, and validation.
    
    Uses JWT (stateless) for authentication.
    Keeps only a small in-process revocation list + run_id "recent activity"
    for best-effort cleanup heuristics.
    """
    
    def __init__(
        self,
        token_ttl_seconds: int = JWT_ACCESS_TOKEN_TTL_SECONDS,
        secret_key: str = JWT_SECRET_KEY,
        algorithm: str = JWT_ALGORITHM,
        issuer: str = JWT_ISSUER,
    ):
        """Initialize token manager.
        
        Args:
            token_ttl_seconds: Token expiration time in seconds (default: 1 hour).
            secret_key: JWT secret key for signing tokens.
            algorithm: JWT algorithm (default: HS256).
            issuer: JWT issuer (default: deskzen).
        """
        self._token_ttl = timedelta(seconds=token_ttl_seconds)
        self._secret_key = secret_key
        self._algorithm = algorithm
        self._issuer = issuer

        # Best-effort "revoked" JTIs and last-seen run_ids.
        # NOTE: This is per-process only. JWT revocation needs shared storage to be strong.
        self._revoked_jtis: Dict[str, datetime] = {}
        self._active_run_ids: Dict[str, datetime] = {}
    
    def create_token(self, user_id: str, role: str, email: str, run_id: str = "default") -> str:
        """Generate a new JWT access token.
        
        Args:
            user_id: User ID associated with token (UUID as string).
            role: User role (admin, user).
            email: User email address.
            run_id: Run ID associated with the session.
            
        Returns:
            Signed JWT string.
            
        Raises:
            ValueError: If user_id is empty or invalid.
        """
        # Validate user_id (must be a non-empty string, typically a UUID)
        if not user_id or not str(user_id).strip():
            raise ValueError("user_id must be a non-empty string")
        
        # IMPORTANT: use timezone-aware UTC datetimes.
        # On Windows, `datetime.utcnow()` returns a naive datetime and `.timestamp()`
        # interprets it as *local* time, causing exp/iat to be shifted (often into the past).
        now = datetime.now(timezone.utc)
        expires_at = now + self._token_ttl

        jti = secrets.token_urlsafe(16)
        payload = {
            "sub": str(user_id),
            "email": email,
            "role": role,
            "run_id": run_id,
            "iss": self._issuer,
            "iat": int(now.timestamp()),
            "exp": int(expires_at.timestamp()),
            "jti": jti,
        }

        token = jwt.encode(payload, self._secret_key, algorithm=self._algorithm)
        # PyJWT may return bytes in some older versions; normalize.
        if isinstance(token, bytes):
            token = token.decode("utf-8")
        return token
    
    def validate_token(self, token: str) -> Optional[TokenData]:
        """Validate token and return associated data.
        
        Args:
            token: Token string to validate.
            
        Returns:
            TokenData if valid and not expired, None otherwise.
        """
        # Handle None, empty string, or whitespace-only tokens
        if not token or not token.strip():
            return None

        # Best-effort constant work up front to reduce timing differences between
        # valid and invalid tokens (heuristic defense; see tests/test_auth_security.py).
        token_bytes = token.strip().encode("utf-8", errors="ignore")
        _ = hashlib.sha256(token_bytes).digest()

        try:
            # JWT library validates expiry automatically
            # Uses constant-time comparison internally for signature validation
            payload = jwt.decode(
                token,
                self._secret_key,
                algorithms=[self._algorithm],
                issuer=self._issuer,
                options={"require": ["exp", "iat", "sub"]},
            )
        except InvalidTokenError:
            # Do a best-effort unverified decode so invalid tokens still pay
            # (roughly) the same parsing cost as valid ones. Never trust/use the
            # unverified payload for authorization decisions.
            try:
                unverified = jwt.decode(
                    token,
                    options={
                        "verify_signature": False,
                        "verify_exp": False,
                        "verify_iss": False,
                    },
                )
                # Touch a few expected fields to mirror the "success" code path.
                _ = unverified.get("jti")
                _ = unverified.get("sub")  # UUID string, no int conversion needed
                _ = unverified.get("role")
                _ = unverified.get("email")
                _ = unverified.get("exp")
            except Exception:
                pass
            return None

        # Best-effort: reject revoked tokens (per-process only).
        jti = payload.get("jti")
        if isinstance(jti, str):
            if jti in self._revoked_jtis:
                return None

        # Get user_id from sub claim (UUID as string)
        user_id = payload.get("sub")
        if not user_id or not isinstance(user_id, str) or not user_id.strip():
            return None

        role = payload.get("role")
        email = payload.get("email")
        run_id = payload.get("run_id")
        exp = payload.get("exp")
        if not isinstance(role, str) or not isinstance(email, str) or not isinstance(exp, int):
            return None

        expires_at = datetime.fromtimestamp(exp, tz=timezone.utc)

        # Track active run_ids for cleanup heuristics (best-effort).
        if isinstance(run_id, str) and run_id:
            self._active_run_ids[run_id] = expires_at

        return TokenData(
            user_id=user_id,
            role=role,
            email=email,
            expires_at=expires_at,
            run_id=str(run_id),
        )
    
    def revoke_token(self, token: str) -> bool:
        """Revoke a token (remove from cache).
        
        Args:
            token: Token to revoke.
            
        Returns:
            True if token was found and revoked, False otherwise.
        """
        if not token:
            return False
        try:
            # Decode without exp verification so we can revoke expired tokens too.
            payload = jwt.decode(
                token,
                self._secret_key,
                algorithms=[self._algorithm],
                issuer=self._issuer,
                options={"verify_exp": False},
            )
        except InvalidTokenError:
            return False

        jti = payload.get("jti")
        exp = payload.get("exp")
        if not isinstance(jti, str):
            return False
        expires_at = (
            datetime.fromtimestamp(exp, tz=timezone.utc)
            if isinstance(exp, int)
            else datetime.now(timezone.utc) + self._token_ttl
        )

        self._revoked_jtis[jti] = expires_at
        return True
    
    def cleanup_expired(self):
        """Remove expired tokens from cache."""
        now = datetime.now(timezone.utc)

        revoked_expired = [jti for jti, exp in self._revoked_jtis.items() if now > exp]
        for jti in revoked_expired:
            del self._revoked_jtis[jti]

        active_expired = [run_id for run_id, exp in self._active_run_ids.items() if now > exp]
        for run_id in active_expired:
            del self._active_run_ids[run_id]
    
    def get_active_run_ids(self):
        """Get set of run_ids that have active tokens.
        
        Returns:
            Set of run_id strings with non-expired tokens.
        """
        # Clean up expired records first (best-effort).
        self.cleanup_expired()
        return set(self._active_run_ids.keys())


# Global token manager instance
_token_manager = TokenManager()


def get_token_manager() -> TokenManager:
    """Get the global token manager instance."""
    return _token_manager
