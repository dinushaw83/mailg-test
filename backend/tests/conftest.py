"""Shared pytest fixtures for backend tests.

Provides database sessions, authentication fixtures, and test data factories.
"""

import os

# Ensure config can import during tests without requiring external env setup.
# This keeps production behavior strict while making the test suite self-contained.
os.environ.setdefault("DEVELOPMENT_MODE", "true")
# 32+ bytes for HS256. Avoid known-weak defaults.
os.environ.setdefault("JWT_SECRET_KEY", "unit-test-secret-key-please-change-123456")

import pytest
from unittest.mock import Mock
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.models.user import User
from app.models.item import Item
from app.auth.token_manager import get_token_manager


# Use in-memory SQLite for tests
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"


@pytest.fixture(scope="function")
def db_engine():
    """Create a test database engine."""
    engine = create_engine(
        SQLALCHEMY_TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session(db_engine):
    """Create a test database session."""
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)
    session = TestingSessionLocal()
    yield session
    session.close()


@pytest.fixture(scope="function")
def client(db_session):
    """Create a test client with database dependency override."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()


@pytest.fixture
def sample_user(db_session):
    """Create a sample agent user."""
    user = User(
        id=1,
        name="Test Agent",
        email="agent@example.com",
        role="agent",
        verified=True,
        active=True,
        suspended=False,
        is_deleted=False,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def sample_admin(db_session):
    """Create a sample admin user."""
    user = User(
        id=2,
        name="Test Admin",
        email="admin@example.com",
        role="admin",
        verified=True,
        active=True,
        suspended=False,
        is_deleted=False,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def sample_end_user(db_session):
    """Create a sample end user."""
    user = User(
        id=3,
        name="Test End User",
        email="enduser@example.com",
        role="end-user",
        verified=True,
        active=True,
        suspended=False,
        is_deleted=False,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def client_with_auth(client, sample_user, db_session):
    """Create a test client with authentication as agent."""
    token_manager = get_token_manager()
    token = token_manager.create_token(
        user_id=sample_user.id,
        role=sample_user.role,
        email=sample_user.email,
        run_id="test-run-id",
    )
    return client, token, sample_user


@pytest.fixture
def client_with_admin_auth(client, sample_admin, db_session):
    """Create a test client with authentication as admin."""
    token_manager = get_token_manager()
    token = token_manager.create_token(
        user_id=sample_admin.id,
        role=sample_admin.role,
        email=sample_admin.email,
        run_id="test-run-id",
    )
    return client, token, sample_admin


@pytest.fixture
def client_with_end_user_auth(client, sample_end_user, db_session):
    """Create a test client with authentication as end user."""
    token_manager = get_token_manager()
    token = token_manager.create_token(
        user_id=sample_end_user.id,
        role=sample_end_user.role,
        email=sample_end_user.email,
        run_id="test-run-id",
    )
    return client, token, sample_end_user


@pytest.fixture
def client_with_agent_auth(client, sample_user, db_session):
    """Create a test client with authentication as agent."""
    token_manager = get_token_manager()
    token = token_manager.create_token(
        user_id=sample_user.id,
        role=sample_user.role,
        email=sample_user.email,
        run_id="test-run-id",
    )
    return client, token, sample_user


@pytest.fixture
def mock_request():
    """Create a mock FastAPI request object."""
    request = Mock()
    request.method = "GET"
    request.url.path = "/api/v1/test"
    request.headers = {"X-Forwarded-For": "127.0.0.1"}
    request.client = Mock()
    request.client.host = "127.0.0.1"
    request.state = Mock()
    request.state.run_id = "test-run-id"
    request.state.token_data = Mock()
    request.state.current_user = None
    return request
