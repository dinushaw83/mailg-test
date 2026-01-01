"""Application configuration constants for database and API settings."""

import os
from pathlib import Path

# Base directory for the backend application (parent of app directory).
BASE_DIR = Path(__file__).resolve().parent.parent

# Database connection URL.
#
# - Postgres example:   postgresql+psycopg2://user:pass@localhost:5432/postgres
#
# For Postgres, this URL is treated as the "server/admin" URL; the backend will
# dynamically switch the database name per run_id.
#
# Default to Postgres for local development (Docker Postgres is mapped to 5434
# in `docker-compose.yaml` to avoid conflicts with other services).
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://mailg:mailg@127.0.0.1:5434/postgres",
)

# Postgres template cloning settings
POSTGRES_ADMIN_DB = os.getenv("POSTGRES_ADMIN_DB", "postgres")
POSTGRES_TEMPLATE_DB = os.getenv("POSTGRES_TEMPLATE_DB", "mailg_seed")
POSTGRES_RUN_DB_PREFIX = os.getenv("POSTGRES_RUN_DB_PREFIX", "mailg_")

# API version prefix for all v1 endpoints.
API_V1_PREFIX = "/api/v1"

# Development mode: allows role override for localhost testing
# Set to "true" explicitly in development environments
# Defaults to False for production safety
# Even if set to True, role override only works when request is from localhost
DEVELOPMENT_MODE = os.getenv("DEVELOPMENT_MODE", "false").lower() == "true"

# -----------------------------------------------------------------------------
# Auth / JWT
# -----------------------------------------------------------------------------
#
# Tokens used by the API are JWTs (stateless) so they work across multiple
# Gunicorn workers and survive container restarts.
#
# IMPORTANT: override JWT_SECRET_KEY in any real environment.
def _get_jwt_secret() -> str:
    secret = os.getenv("JWT_SECRET_KEY")
    if secret:
        return secret
    if DEVELOPMENT_MODE:
        return "dev-only-secret-not-for-production"
    raise ValueError(
        "JWT_SECRET_KEY environment variable must be set in production. "
        "Set DEVELOPMENT_MODE=true for local development."
    )

JWT_SECRET_KEY = _get_jwt_secret()
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_ISSUER = os.getenv("JWT_ISSUER", "mailg")
JWT_ACCESS_TOKEN_TTL_SECONDS = int(os.getenv("JWT_ACCESS_TOKEN_TTL_SECONDS", "3600"))

# Known weak/common JWT secrets that should never be used in production
_WEAK_JWT_SECRETS = frozenset({
    "mailg-local-dev-secret",
    "secret",
    "secret-key",
    "jwt-secret",
    "your-secret-key",
    "change-me",
    "changeme",
    "password",
    "12345678901234567890123456789012",
})

# Minimum key length for HS256 (256 bits = 32 bytes)
_MIN_HS256_KEY_LENGTH = 32


def validate_jwt_secret() -> tuple[bool, list[str]]:
    """Validate JWT_SECRET_KEY for security issues.

    Returns:
        Tuple of (is_valid, list_of_warnings).
        is_valid is False if the key has critical security issues.
    """
    warnings = []
    is_valid = True

    # Check if using a known weak secret
    if JWT_SECRET_KEY.lower() in _WEAK_JWT_SECRETS or JWT_SECRET_KEY in _WEAK_JWT_SECRETS:
        warnings.append(
            f"JWT_SECRET_KEY is set to a known weak value. "
            f"Tokens signed with this key are vulnerable to forgery. "
            f"Set a strong, random secret in production."
        )
        is_valid = False

    # Check minimum length for HS256
    if JWT_ALGORITHM == "HS256" and len(JWT_SECRET_KEY) < _MIN_HS256_KEY_LENGTH:
        warnings.append(
            f"JWT_SECRET_KEY is only {len(JWT_SECRET_KEY)} bytes, but HS256 requires "
            f"at least {_MIN_HS256_KEY_LENGTH} bytes (256 bits) for security. "
            f"Use a longer secret key."
        )
        is_valid = False

    return is_valid, warnings


def get_jwt_secret_warnings() -> list[str]:
    """Get any security warnings about the JWT secret configuration.

    Returns:
        List of warning messages (empty if configuration is secure).
    """
    _, warnings = validate_jwt_secret()
    return warnings
