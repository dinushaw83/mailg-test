"""Shared pytest fixtures for backend tests.

Provides database sessions, authentication fixtures, and test data factories.
"""

import os

# Ensure config can import during tests without requiring external env setup.
# This keeps production behavior strict while making the test suite self-contained.
# These MUST be set BEFORE any app imports to take effect.
os.environ.setdefault("DEVELOPMENT_MODE", "true")
# 32+ bytes for HS256. Avoid known-weak defaults.
os.environ.setdefault("JWT_SECRET_KEY", "unit-test-secret-key-please-change-123456")
# Database URL - matches docker-compose.yaml port mapping (5436 external -> 5432 internal)
os.environ.setdefault("DATABASE_URL", "postgresql+psycopg2://mailg:mailg@127.0.0.1:5436/postgres")

import uuid
import pytest
from unittest.mock import Mock
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.models.user import User
from app.models.label import Label
from app.models.email import Email
from app.models.thread import Thread
from app.models.email_recipient import EmailRecipient
from app.models.attachment import Attachment
from app.models.saved_search import SavedSearch
from app.auth.token_manager import get_token_manager
from app.core.constants import FolderType


# Use in-memory SQLite for tests
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"


# Enable UUID support for SQLite by registering a custom type adapter
def _sqlite_uuid_adapter():
    """Configure SQLite to handle UUID columns as strings."""
    import sqlite3
    
    # Register adapter to store UUIDs as strings
    sqlite3.register_adapter(uuid.UUID, lambda u: str(u))
    # Register converter to parse UUIDs from strings
    sqlite3.register_converter("UUID", lambda b: uuid.UUID(b.decode()))


_sqlite_uuid_adapter()


@pytest.fixture(scope="session")
def db_engine():
    """Create a test database engine (once per test session for speed)."""
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
    """Create a test database session with transaction rollback for isolation.
    
    Uses a nested transaction pattern:
    - Creates a connection and begins a transaction
    - Each test runs in its own savepoint
    - After test, rollback to clean state (much faster than drop/recreate)
    """
    connection = db_engine.connect()
    transaction = connection.begin()
    
    # Create session bound to this connection
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=connection)
    session = TestingSessionLocal()
    
    # Begin a nested savepoint for the test
    nested = connection.begin_nested()
    
    # If the session would commit, restart the savepoint instead
    @event.listens_for(session, "after_transaction_end")
    def restart_savepoint(session, trans):
        nonlocal nested
        if trans.nested and not trans._parent.nested:
            # Restart savepoint after each commit
            nested = connection.begin_nested()
    
    yield session
    
    # Cleanup: close session and rollback transaction
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="session")
def base_client():
    """Create a base test client (once per session for speed)."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="function")
def client(db_session, base_client):
    """Configure the test client with database dependency override for this test."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    yield base_client
    app.dependency_overrides.clear()


@pytest.fixture
def sample_user(db_session):
    """Create a sample regular user."""
    user = User(
        first_name="Test",
        last_name="User",
        email="testuser@example.com",
        role="user",
        active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def sample_admin(db_session):
    """Create a sample admin user."""
    user = User(
        first_name="Test",
        last_name="Admin",
        email="admin@example.com",
        role="admin",
        active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def client_with_auth(client, sample_user, db_session):
    """Create a test client with authentication as regular user."""
    token_manager = get_token_manager()
    token = token_manager.create_token(
        user_id=str(sample_user.id),
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
        user_id=str(sample_admin.id),
        role=sample_admin.role,
        email=sample_admin.email,
        run_id="test-run-id",
    )
    return client, token, sample_admin


@pytest.fixture
def client_with_user_auth(client, sample_user, db_session):
    """Create a test client with authentication as regular user."""
    token_manager = get_token_manager()
    token = token_manager.create_token(
        user_id=str(sample_user.id),
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


# Email-related fixtures

@pytest.fixture
def sample_email(db_session, sample_user):
    """Create a sample email for testing (with a thread for label support)."""
    # Create a thread first since labels are now linked to threads
    thread = Thread(
        subject="Test Email Subject",
        owner_id=sample_user.id,
        email_count=1
    )
    db_session.add(thread)
    db_session.flush()
    
    email = Email(
        subject="Test Email Subject",
        body="Test email body content",
        status="received",
        folder=FolderType.INBOX.value,
        is_read=False,
        is_starred=False,
        sender_id=sample_user.id,
        thread_id=thread.id,
    )
    db_session.add(email)
    db_session.commit()
    db_session.refresh(email)
    return email


@pytest.fixture
def sample_draft_email(db_session, sample_user):
    """Create a sample draft email for testing (with a thread for label support)."""
    # Create a thread first since labels are now linked to threads
    thread = Thread(
        subject="Draft Email",
        owner_id=sample_user.id,
        email_count=1
    )
    db_session.add(thread)
    db_session.flush()
    
    email = Email(
        subject="Draft Email",
        body="Draft content",
        status="draft",
        folder=FolderType.DRAFTS.value,
        sender_id=sample_user.id,
        thread_id=thread.id,
    )
    db_session.add(email)
    db_session.commit()
    db_session.refresh(email)
    
    # Add a recipient
    recipient = EmailRecipient(
        email_id=email.id,
        recipient_email="recipient@example.com",
        recipient_name="Recipient",
        recipient_type="to"
    )
    db_session.add(recipient)
    db_session.commit()
    
    db_session.refresh(email)
    return email


@pytest.fixture
def sample_label(db_session, sample_user):
    """Create a sample label for testing."""
    label = Label(
        name="Test Label",
        color="#ff0000",
        owner_id=sample_user.id
    )
    db_session.add(label)
    db_session.commit()
    db_session.refresh(label)
    return label


@pytest.fixture
def sample_attachment(db_session, sample_email):
    """Create a sample attachment for testing."""
    attachment = Attachment(
        email_id=sample_email.id,
        filename="test_file.pdf",
        content_type="application/pdf",
        size_bytes=1024,
        storage_path="/attachments/test_file.pdf"
    )
    db_session.add(attachment)
    db_session.commit()
    db_session.refresh(attachment)
    return attachment
