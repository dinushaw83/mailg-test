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
from fastapi import Request
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.models.user import User
from app.models.label import Label
from app.models.email import Email
from app.models.thread import Thread
from app.models.email_recipient import EmailRecipient
from app.models.attachment import Attachment
from app.auth.token_manager import get_token_manager
from app.core.constants import FolderType, SystemLabel, CategoryLabel, EmailStatus
from app.models.thread_label import ThreadLabel


def create_received_email_for_user(db_session, user, subject="Test Email", body="Body", 
                                    is_read=False, is_starred=False, folder=FolderType.INBOX.value, 
                                    sender=None, thread=None):
    """Helper to create a properly perspective-aware received email for a user.
    
    Creates an email with status='received' and an EmailRecipient record
    linking the email to the user as a recipient.
    
    Args:
        db_session: Database session
        user: The User object who will receive the email
        subject: Email subject
        body: Email body
        is_read: Whether email is read
        is_starred: Whether email is starred
        folder: Folder type (default: inbox)
        sender: Optional User object for sender (creates one if not provided)
        thread: Optional Thread object (creates one if not provided)
    
    Returns:
        The created Email object
    """
    import uuid
    
    if sender is None:
        # Create a dummy sender
        sender = User(
            email=f"sender_{uuid.uuid4().hex[:8]}@test.com",
            first_name="Sender",
            last_name="User",
            role="user"
        )
        db_session.add(sender)
        db_session.flush()
    
    if thread is None:
        # Create a thread for the email
        from datetime import datetime, UTC
        thread = Thread(
            subject=subject,
            owner_id=sender.id,
            email_count=1,
            last_email_at=datetime.now(UTC)
        )
        db_session.add(thread)
        db_session.flush()
    
    email = Email(
        subject=subject,
        body=body,
        status=EmailStatus.RECEIVED.value,
        is_read=is_read,
        is_starred=is_starred,
        sender_id=sender.id,
        folder=folder,
        thread_id=thread.id
    )
    db_session.add(email)
    db_session.flush()
    
    # Add recipient record for the user
    recipient = EmailRecipient(
        email_id=email.id,
        recipient_id=user.id,
        recipient_email=user.email,
        recipient_name=f"{user.first_name} {user.last_name}",
        recipient_type="to"
    )
    db_session.add(recipient)
    
    return email


def create_sent_email_for_user(db_session, user, subject="Test Email", body="Body",
                                is_read=True, is_starred=False, folder=FolderType.SENT.value,
                                thread=None):
    """Helper to create a properly perspective-aware sent email for a user.
    
    Creates an email with status='sent' where the user is the sender.
    
    Args:
        db_session: Database session
        user: The User object who sent the email
        subject: Email subject
        body: Email body
        is_read: Whether email is read
        is_starred: Whether email is starred
        folder: Folder type (default: sent)
        thread: Optional Thread object (creates one if not provided)
    
    Returns:
        The created Email object
    """
    if thread is None:
        # Create a thread for the email
        from datetime import datetime, UTC
        thread = Thread(
            subject=subject,
            owner_id=user.id,
            email_count=1,
            last_email_at=datetime.now(UTC)
        )
        db_session.add(thread)
        db_session.flush()
    
    email = Email(
        subject=subject,
        body=body,
        status=EmailStatus.SENT.value,
        is_read=is_read,
        is_starred=is_starred,
        sender_id=user.id,
        folder=folder,
        thread_id=thread.id
    )
    db_session.add(email)
    
    return email


# PostgreSQL configuration for tests
# Each test session gets its own isolated database
TEST_DB_NAME = f"test_mailg_{uuid.uuid4().hex[:8]}"
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://mailg:mailg@127.0.0.1:5436/postgres")
# Build test database URL by replacing database name in connection string
# Note: Don't use make_url().set() as it can cause authentication issues
SQLALCHEMY_TEST_DATABASE_URL = DATABASE_URL.rsplit('/', 1)[0] + '/' + TEST_DB_NAME
print(f"\n=== Using PostgreSQL for tests: {TEST_DB_NAME} ===\n")


def _create_postgres_test_database():
    """Create a dedicated PostgreSQL test database."""
    # Connect to the postgres admin database to create test database
    admin_url = os.getenv("DATABASE_URL", "postgresql+psycopg2://mailg:mailg@127.0.0.1:5436/postgres")
    admin_engine = create_engine(admin_url, isolation_level="AUTOCOMMIT", poolclass=NullPool)

    try:
        # Use raw connection to ensure AUTOCOMMIT mode (CREATE DATABASE cannot run in transaction)
        conn = admin_engine.raw_connection()
        conn.set_isolation_level(0)  # AUTOCOMMIT
        cursor = conn.cursor()

        try:
            # Check if test database already exists
            cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", (TEST_DB_NAME,))
            if not cursor.fetchone():
                # Create test database
                cursor.execute(f'CREATE DATABASE "{TEST_DB_NAME}"')
        finally:
            cursor.close()
            conn.close()
    finally:
        admin_engine.dispose()


def _drop_postgres_test_database():
    """Drop the PostgreSQL test database."""
    admin_url = os.getenv("DATABASE_URL", "postgresql+psycopg2://mailg:mailg@127.0.0.1:5436/postgres")
    admin_engine = create_engine(admin_url, isolation_level="AUTOCOMMIT", poolclass=NullPool)

    try:
        # Use raw connection to ensure AUTOCOMMIT mode (DROP DATABASE cannot run in transaction)
        conn = admin_engine.raw_connection()
        conn.set_isolation_level(0)  # AUTOCOMMIT
        cursor = conn.cursor()

        try:
            # Terminate all connections to the test database
            cursor.execute("""
                SELECT pg_terminate_backend(pid)
                FROM pg_stat_activity
                WHERE datname = %s AND pid <> pg_backend_pid()
            """, (TEST_DB_NAME,))

            # Drop test database
            cursor.execute(f'DROP DATABASE IF EXISTS "{TEST_DB_NAME}"')
        finally:
            cursor.close()
            conn.close()
    finally:
        admin_engine.dispose()


@pytest.fixture(scope="session")
def db_engine():
    """Create a test database engine (once per test session for speed)."""
    # Create PostgreSQL test database
    _create_postgres_test_database()

    # Create engine for test database
    engine = create_engine(
        SQLALCHEMY_TEST_DATABASE_URL,
        pool_pre_ping=True,
        poolclass=NullPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine

    # Cleanup
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    _drop_postgres_test_database()


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
    def override_get_db(request: Request = None):
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    yield base_client
    app.dependency_overrides.clear()


def create_system_labels_for_user(db_session, user_id):
    """Create all system labels for a user - helper for tests.
    
    Idempotent - skips labels that already exist for the user.
    """
    # Check which labels already exist for this user
    existing_labels = db_session.query(Label.name).filter(
        Label.owner_id == user_id,
        Label.is_system == True
    ).all()
    existing_names = {name for (name,) in existing_labels}
    
    # System labels to create (if not already existing)
    all_labels = [
        (SystemLabel.INBOX.value, True),
        (SystemLabel.STARRED.value, True),
        (SystemLabel.SNOOZED.value, True),
        (SystemLabel.IMPORTANT.value, True),
        (SystemLabel.SENT.value, True),
        (SystemLabel.SCHEDULED.value, True),
        (SystemLabel.DRAFTS.value, True),
        (SystemLabel.ALL_MAIL.value, True),
        (SystemLabel.SPAM.value, True),
        (SystemLabel.TRASH.value, True),
        (CategoryLabel.PURCHASES.value, False),
        (CategoryLabel.SOCIAL.value, False),
        (CategoryLabel.UPDATES.value, False),
        (CategoryLabel.FORUMS.value, False),
        (CategoryLabel.PROMOTIONS.value, False),
    ]
    
    for name, is_exclusive in all_labels:
        if name not in existing_names:
            label = Label(
                name=name,
                is_system=True,
                is_exclusive=is_exclusive,
                owner_id=user_id
            )
            db_session.add(label)
    
    db_session.commit()


@pytest.fixture
def sample_user(db_session):
    """Create a sample regular user with system labels."""
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
    
    # Create system labels for the user (required for thread label syncing)
    create_system_labels_for_user(db_session, user.id)
    
    return user


@pytest.fixture
def sample_admin(db_session):
    """Create a sample admin user with system labels."""
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
    
    # Create system labels for the user (required for thread label syncing)
    create_system_labels_for_user(db_session, user.id)
    
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

def sync_thread_labels_for_test(db_session, thread_id, user_id):
    """Sync thread labels based on email folders - helper for tests.
    
    This ensures threads have the appropriate system labels based on the 
    actual folder values of emails in the thread.
    """
    from app.utils.label_utils import sync_thread_labels
    sync_thread_labels(db_session, thread_id, user_id, commit=True)


def get_system_label_for_user(db_session, user_id, label_name):
    """Get a system label for a user - helper for tests.
    
    Returns the existing system label, or None if not found.
    Use this instead of creating labels directly in tests.
    """
    return db_session.query(Label).filter(
        Label.owner_id == user_id,
        Label.name == label_name,
        Label.is_system == True
    ).first()


@pytest.fixture
def sample_email(db_session, sample_user):
    """Create a sample email for testing (with a thread for label support).
    
    Uses perspective-aware creation - creates a received email with proper
    sender and recipient records so the user can access it.
    """
    # Create a thread first since labels are now linked to threads
    thread = Thread(
        subject="Test Email Subject",
        owner_id=sample_user.id,
        email_count=1
    )
    db_session.add(thread)
    db_session.flush()
    
    # Create a proper received email (perspective-aware)
    email = create_received_email_for_user(
        db_session, sample_user,
        subject="Test Email Subject",
        body="Test email body content",
        is_read=False,
        is_starred=False,
        thread=thread
    )
    db_session.commit()
    db_session.refresh(email)
    
    # Sync thread labels to reflect the folder
    sync_thread_labels_for_test(db_session, thread.id, sample_user.id)
    
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
    
    # Sync thread labels to reflect the folder
    sync_thread_labels_for_test(db_session, thread.id, sample_user.id)
    
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
