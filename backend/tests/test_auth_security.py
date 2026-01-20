"""Tests for JWT Security Hardening (Issues #91, #118, #95, #122, #119, #121)"""

import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch
import jwt
import time

from app.auth.token_manager import TokenManager, TokenData
from app.core.config import JWT_SECRET_KEY, JWT_ALGORITHM, JWT_ISSUER


class TestTokenNoneHandling:
    """Test token validation with None input (#91, #118)"""
    
    def test_validate_token_none_returns_none(self):
        """Test that validate_token(None) returns None gracefully"""
        manager = TokenManager()
        result = manager.validate_token(None)
        assert result is None
    
    def test_validate_token_empty_string_returns_none(self):
        """Test that validate_token('') returns None gracefully"""
        manager = TokenManager()
        result = manager.validate_token('')
        assert result is None
    
    def test_validate_token_whitespace_returns_none(self):
        """Test that validate_token with whitespace returns None"""
        manager = TokenManager()
        result = manager.validate_token('   ')
        assert result is None


class TestUserIdZeroValidation:
    """Test that invalid user_id values are rejected"""
    
    def test_user_id_zero_rejected_in_token_creation(self):
        """Test that creating token with user_id=0 is rejected"""
        manager = TokenManager()
        with pytest.raises(ValueError, match="user_id must be greater than 0"):
            manager.create_token(user_id=0, role="admin", email="test@example.com")
    
    def test_user_id_whitespace_rejected(self):
        """Test that whitespace-only user_id is rejected"""
        manager = TokenManager()
        with pytest.raises(ValueError, match="user_id must be a non-empty string"):
            manager.create_token(user_id="   ", role="admin", email="test@example.com")
    
    def test_user_id_empty_in_token_rejected_on_validation(self):
        """Test that token with empty user_id is rejected during validation"""
        manager = TokenManager()
        
        # Manually create a token with empty user_id
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(hours=1)
        
        payload = {
            "sub": "",  # empty user_id
            "email": "test@example.com",
            "role": "admin",
            "run_id": "test-run",
            "iss": JWT_ISSUER,
            "iat": int(now.timestamp()),
            "exp": int(expires_at.timestamp()),
            "jti": "test-jti",
        }
        
        token = jwt.encode(payload, manager._secret_key, algorithm=manager._algorithm)
        
        # Should return None (invalid)
        result = manager.validate_token(token)
        assert result is None


class TestTokenExpiryCheck:
    """Test token expiry validation (#119)"""
    
    def test_expired_token_rejected(self):
        """Test that expired tokens are rejected"""
        manager = TokenManager()
        
        # Create a token that expired 1 hour ago
        now = datetime.now(timezone.utc)
        expired_at = now - timedelta(hours=1)
        
        payload = {
            "sub": "123",
            "email": "test@example.com",
            "role": "admin",
            "run_id": "test-run",
            "iss": JWT_ISSUER,
            "iat": int((now - timedelta(hours=2)).timestamp()),
            "exp": int(expired_at.timestamp()),
            "jti": "test-jti",
        }
        
        token = jwt.encode(payload, manager._secret_key, algorithm=manager._algorithm)
        
        # JWT library should reject this during decode
        result = manager.validate_token(token)
        assert result is None
    
    def test_token_data_has_is_expired_method(self):
        """Test that TokenData has is_expired() method"""
        now = datetime.now(timezone.utc)
        
        # Non-expired token
        token_data = TokenData(
            user_id="550e8400-e29b-41d4-a716-446655440000",
            role="admin",
            email="test@example.com",
            expires_at=now + timedelta(hours=1),
            run_id="test-run"
        )
        assert token_data.is_expired() is False
        
        # Expired token
        expired_token_data = TokenData(
            user_id="550e8400-e29b-41d4-a716-446655440000",
            role="admin",
            email="test@example.com",
            expires_at=now - timedelta(hours=1),
            run_id="test-run"
        )
        assert expired_token_data.is_expired() is True
    
    def test_token_about_to_expire(self):
        """Test token that's about to expire (edge case)"""
        now = datetime.now(timezone.utc)
        
        # Token expires in 1 second
        token_data = TokenData(
            user_id="550e8400-e29b-41d4-a716-446655440000",
            role="admin",
            email="test@example.com",
            expires_at=now + timedelta(seconds=1),
            run_id="test-run"
        )
        assert token_data.is_expired() is False
        
        # Wait and check again
        time.sleep(1.1)
        assert token_data.is_expired() is True


class TestTimingAttackResistance:
    """Test timing attack resistance (#121)"""
    
    def test_constant_time_token_comparison(self):
        """Test that token validation uses constant-time comparison"""
        manager = TokenManager()
        
        # Create a valid token
        token = manager.create_token(user_id="550e8400-e29b-41d4-a716-446655440000", role="admin", email="test@example.com")
        
        # Time multiple validations
        valid_times = []
        for _ in range(100):
            start = time.perf_counter()
            manager.validate_token(token)
            valid_times.append(time.perf_counter() - start)
        
        # Time invalid token validations
        invalid_token = token[:-5] + "XXXXX"
        invalid_times = []
        for _ in range(100):
            start = time.perf_counter()
            manager.validate_token(invalid_token)
            invalid_times.append(time.perf_counter() - start)
        
        # Calculate average times
        avg_valid = sum(valid_times) / len(valid_times)
        avg_invalid = sum(invalid_times) / len(invalid_times)
        
        # The difference should be minimal (not revealing info through timing)
        # Allow some variance but they should be in the same ballpark
        # This is a heuristic test - timing attacks are subtle
        ratio = max(avg_valid, avg_invalid) / min(avg_valid, avg_invalid)
        assert ratio < 5, f"Timing difference too large: {ratio}x (may indicate timing vulnerability)"


class TestIntegrationJWTSecurity:
    """Integration tests for JWT security"""
    
    def test_full_token_lifecycle_with_validation(self):
        """Test creating, validating, and handling token throughout lifecycle"""
        manager = TokenManager()
        
        # Create token with UUID string
        test_user_id = "550e8400-e29b-41d4-a716-446655440000"
        token = manager.create_token(
            user_id=test_user_id,
            role="admin",
            email="admin@example.com",
            run_id="test-run-123"
        )
        
        # Validate immediately - should work
        token_data = manager.validate_token(token)
        assert token_data is not None
        assert token_data.user_id == test_user_id
        assert token_data.role == "admin"
        assert token_data.email == "admin@example.com"
        assert token_data.is_expired() is False
        
        # Revoke token
        assert manager.revoke_token(token) is True
        
        # Validation after revocation should fail
        token_data_after_revoke = manager.validate_token(token)
        assert token_data_after_revoke is None

