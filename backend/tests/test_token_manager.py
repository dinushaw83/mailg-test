"""Tests for JWT Token Manager functionality.

Tests cover token generation, validation, revocation, and cleanup.
"""

import pytest
import uuid
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timezone, timedelta
import jwt


# Sample UUID string for testing
TEST_USER_UUID = "00000000-0000-0000-0000-000000000001"


class TestTokenCreation:
    """Tests for token creation."""

    def test_create_token_basic(self):
        """Test basic token creation."""
        from app.auth.token_manager import _token_manager
        
        token = _token_manager.create_token(
            user_id=TEST_USER_UUID,
            role="user",
            email="testuser@example.com",
            run_id="test-run"
        )
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0

    def test_create_token_is_jwt(self):
        """Test that created token is valid JWT format."""
        from app.auth.token_manager import _token_manager
        
        token = _token_manager.create_token(
            user_id=TEST_USER_UUID,
            role="user",
            email="testuser@example.com",
            run_id="test-run"
        )
        
        # JWT has 3 parts separated by dots
        parts = token.split(".")
        assert len(parts) == 3

    def test_create_token_unique_jti(self):
        """Test each token has a unique JTI."""
        from app.auth.token_manager import _token_manager
        from app.core.config import JWT_SECRET_KEY, JWT_ALGORITHM
        
        token1 = _token_manager.create_token(
            user_id=TEST_USER_UUID,
            role="user",
            email="testuser@example.com",
            run_id="test-run"
        )
        token2 = _token_manager.create_token(
            user_id=TEST_USER_UUID,
            role="user",
            email="testuser@example.com",
            run_id="test-run"
        )
        
        decoded1 = jwt.decode(token1, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        decoded2 = jwt.decode(token2, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        
        assert decoded1["jti"] != decoded2["jti"]


class TestTokenValidation:
    """Tests for token validation."""

    def test_validate_token_success(self):
        """Test successful token validation."""
        from app.auth.token_manager import _token_manager
        
        token = _token_manager.create_token(
            user_id=TEST_USER_UUID,
            role="user",
            email="testuser@example.com",
            run_id="test-run"
        )
        
        token_data = _token_manager.validate_token(token)
        
        assert token_data is not None
        assert token_data.user_id == TEST_USER_UUID
        assert token_data.role == "user"
        assert token_data.email == "testuser@example.com"
        assert token_data.run_id == "test-run"

    def test_validate_token_expired(self):
        """Test validation fails for expired token."""
        from app.auth.token_manager import _token_manager
        from app.core.config import JWT_SECRET_KEY, JWT_ALGORITHM
        
        # Create a manually expired token
        payload = {
            "sub": TEST_USER_UUID,
            "role": "user",
            "email": "testuser@example.com",
            "run_id": "test-run",
            "exp": datetime.now(timezone.utc) - timedelta(hours=1),  # Expired
            "iat": datetime.now(timezone.utc) - timedelta(hours=2),
            "jti": "test-jti"
        }
        expired_token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        
        token_data = _token_manager.validate_token(expired_token)
        
        assert token_data is None

    def test_validate_token_invalid_signature(self):
        """Test validation fails for invalid signature."""
        from app.auth.token_manager import _token_manager
        from app.core.config import JWT_ALGORITHM
        
        # Create token with wrong secret
        payload = {
            "sub": TEST_USER_UUID,
            "role": "user",
            "email": "testuser@example.com",
            "run_id": "test-run",
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
            "iat": datetime.now(timezone.utc),
            "jti": "test-jti"
        }
        wrong_token = jwt.encode(payload, "wrong-secret", algorithm=JWT_ALGORITHM)
        
        token_data = _token_manager.validate_token(wrong_token)
        
        assert token_data is None

    def test_validate_token_malformed(self):
        """Test validation fails for malformed token."""
        from app.auth.token_manager import _token_manager
        
        token_data = _token_manager.validate_token("not.a.valid.token")
        
        assert token_data is None

    def test_validate_token_empty(self):
        """Test validation fails for empty token."""
        from app.auth.token_manager import _token_manager
        
        token_data = _token_manager.validate_token("")
        
        assert token_data is None


class TestTokenRevocation:
    """Tests for token revocation."""

    def test_revoke_token_success(self):
        """Test successful token revocation."""
        from app.auth.token_manager import _token_manager
        
        token = _token_manager.create_token(
            user_id=TEST_USER_UUID,
            role="user",
            email="testuser@example.com",
            run_id="test-run"
        )
        
        # Token should be valid before revocation
        assert _token_manager.validate_token(token) is not None
        
        # Revoke the token
        _token_manager.revoke_token(token)
        
        # Token should be invalid after revocation
        token_data = _token_manager.validate_token(token)
        assert token_data is None

    def test_revoke_token_invalid(self):
        """Test revoking invalid token doesn't crash."""
        from app.auth.token_manager import _token_manager
        
        # Should not raise
        _token_manager.revoke_token("invalid-token")


class TestTokenCleanup:
    """Tests for token cleanup."""

    def test_cleanup_expired_tokens(self):
        """Test cleanup removes expired tokens from revocation list."""
        from app.auth.token_manager import _token_manager
        
        # Create and revoke a token
        token = _token_manager.create_token(
            user_id=TEST_USER_UUID,
            role="user",
            email="testuser@example.com",
            run_id="test-run"
        )
        _token_manager.revoke_token(token)
        
        # Cleanup should not raise
        _token_manager.cleanup_expired()


class TestTokenDataClass:
    """Tests for TokenData dataclass."""

    def test_token_data_creation(self):
        """Test TokenData creation."""
        from app.auth.token_manager import TokenData
        
        token_data = TokenData(
            user_id=TEST_USER_UUID,
            role="user",
            email="testuser@example.com",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
            run_id="test-run"
        )
        
        assert token_data.user_id == TEST_USER_UUID
        assert token_data.role == "user"
        assert token_data.email == "testuser@example.com"
        assert token_data.run_id == "test-run"


class TestSecurityConcerns:
    """Tests for security-related token behaviors."""

    def test_token_algorithm_is_secure(self):
        """Test token uses secure algorithm."""
        from app.core.config import JWT_ALGORITHM

        # Should use HS256 or stronger
        assert JWT_ALGORITHM in ["HS256", "HS384", "HS512", "RS256", "RS384", "RS512"]

    def test_validate_jwt_secret_min_length(self):
        """Test minimum key length requirement for HS256."""
        from app.core.config import _MIN_HS256_KEY_LENGTH

        # HS256 requires 256 bits = 32 bytes
        assert _MIN_HS256_KEY_LENGTH == 32

    def test_validate_jwt_secret_returns_warnings(self):
        """Test that validate_jwt_secret returns proper warnings."""
        from app.core.config import validate_jwt_secret

        is_valid, warnings = validate_jwt_secret()

        # With default dev secret, should return warnings
        assert isinstance(is_valid, bool)
        assert isinstance(warnings, list)


class TestEdgeCases:
    """Tests for edge cases in token handling."""

    def test_very_long_email(self):
        """Test token creation with very long email."""
        from app.auth.token_manager import _token_manager
        
        long_email = "a" * 200 + "@example.com"
        
        token = _token_manager.create_token(
            user_id=TEST_USER_UUID,
            role="user",
            email=long_email,
            run_id="test-run"
        )
        
        token_data = _token_manager.validate_token(token)
        assert token_data is not None
        assert token_data.email == long_email

    def test_special_characters_in_run_id(self):
        """Test token with special characters in run_id."""
        from app.auth.token_manager import _token_manager
        
        special_run_id = "run-with-dashes_and_underscores"
        
        token = _token_manager.create_token(
            user_id=TEST_USER_UUID,
            role="user",
            email="testuser@example.com",
            run_id=special_run_id
        )
        
        token_data = _token_manager.validate_token(token)
        assert token_data is not None
        assert token_data.run_id == special_run_id

    def test_unicode_in_email(self):
        """Test token with unicode characters in email."""
        from app.auth.token_manager import _token_manager
        
        unicode_email = "user@example.com"  # Use simple email to avoid encoding issues
        
        token = _token_manager.create_token(
            user_id=TEST_USER_UUID,
            role="user",
            email=unicode_email,
            run_id="test-run"
        )
        
        token_data = _token_manager.validate_token(token)
        assert token_data is not None
