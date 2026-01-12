"""Tests for Thread User Metadata (is_important) functionality."""

import pytest
import uuid
from app.models.email import Email
from app.models.thread import Thread
from app.models.thread_user_metadata import ThreadUserMetadata
from app.models.user import User
from app.models.email_recipient import EmailRecipient
from app.core.constants import FolderType
from app.utils.thread_metadata_utils import (
    mark_thread_important,
    get_thread_is_important,
    get_user_important_thread_ids,
)


class TestThreadUserMetadataModel:
    """Test ThreadUserMetadata model operations."""

    def test_create_thread_metadata(self, db_session):
        """Test creating thread user metadata record."""
        # Create a user and thread
        user = User(
            first_name="Test",
            last_name="User",
            email="test@example.com",
            role="user"
        )
        db_session.add(user)
        db_session.commit()  # Commit user first to get ID

        thread = Thread(
            subject="Test Thread",
            owner_id=user.id,
        )
        db_session.add(thread)
        db_session.commit()

        # Create metadata
        metadata = ThreadUserMetadata(
            thread_id=thread.id,
            user_id=user.id,
            is_important=True
        )
        db_session.add(metadata)
        db_session.commit()

        # Verify
        assert metadata.id is not None
        assert metadata.thread_id == thread.id
        assert metadata.user_id == user.id
        assert metadata.is_important is True

    def test_unique_constraint_thread_user(self, db_session):
        """Test that one user can have only one metadata record per thread."""
        user = User(
            first_name="Test",
            last_name="User",
            email="test@example.com",
            role="user"
        )
        db_session.add(user)
        db_session.commit()  # Commit user first to get ID

        thread = Thread(
            subject="Test Thread",
            owner_id=user.id,
        )
        db_session.add(thread)
        db_session.commit()

        # Create first metadata
        metadata1 = ThreadUserMetadata(
            thread_id=thread.id,
            user_id=user.id,
            is_important=True
        )
        db_session.add(metadata1)
        db_session.commit()

        # Try to create duplicate - should fail
        metadata2 = ThreadUserMetadata(
            thread_id=thread.id,
            user_id=user.id,
            is_important=False
        )
        db_session.add(metadata2)

        with pytest.raises(Exception):  # SQLAlchemy will raise IntegrityError
            db_session.commit()


class TestThreadMetadataUtils:
    """Test thread metadata utility functions."""

    def test_mark_thread_important(self, db_session):
        """Test marking a thread as important for a user."""
        user = User(
            first_name="Test",
            last_name="User",
            email="test@example.com",
            role="user"
        )
        db_session.add(user)
        db_session.commit()  # Commit user first to get ID

        thread = Thread(
            subject="Test Thread",
            owner_id=user.id,
        )
        db_session.add(thread)
        db_session.commit()

        # Mark as important
        metadata = mark_thread_important(db_session, thread.id, user.id, True)
        db_session.commit()

        assert metadata is not None
        assert metadata.is_important is True

        # Verify it's saved
        is_important = get_thread_is_important(db_session, thread.id, user.id)
        assert is_important is True

    def test_unmark_thread_important(self, db_session):
        """Test unmarking a thread as important."""
        user = User(
            first_name="Test",
            last_name="User",
            email="test@example.com",
            role="user"
        )
        db_session.add(user)
        db_session.commit()  # Commit user first to get ID

        thread = Thread(
            subject="Test Thread",
            owner_id=user.id,
        )
        db_session.add(thread)
        db_session.commit()

        # Mark as important
        mark_thread_important(db_session, thread.id, user.id, True)
        db_session.commit()

        # Unmark
        mark_thread_important(db_session, thread.id, user.id, False)
        db_session.commit()

        # Verify it's unmarked
        is_important = get_thread_is_important(db_session, thread.id, user.id)
        assert is_important is False

    def test_get_thread_is_important_default_false(self, db_session):
        """Test that is_important defaults to False when no metadata exists."""
        user = User(
            first_name="Test",
            last_name="User",
            email="test@example.com",
            role="user"
        )
        db_session.add(user)
        db_session.commit()  # Commit user first to get ID

        thread = Thread(
            subject="Test Thread",
            owner_id=user.id,
        )
        db_session.add(thread)
        db_session.commit()

        # Check without creating metadata
        is_important = get_thread_is_important(db_session, thread.id, user.id)
        assert is_important is False

    def test_get_user_important_thread_ids(self, db_session):
        """Test getting all important thread IDs for a user."""
        user = User(
            first_name="Test",
            last_name="User",
            email="test@example.com",
            role="user"
        )
        db_session.add(user)
        db_session.commit()

        # Create multiple threads
        thread1 = Thread(subject="Thread 1", owner_id=user.id)
        thread2 = Thread(subject="Thread 2", owner_id=user.id)
        thread3 = Thread(subject="Thread 3", owner_id=user.id)
        db_session.add_all([thread1, thread2, thread3])
        db_session.commit()

        # Mark thread1 and thread3 as important
        mark_thread_important(db_session, thread1.id, user.id, True)
        mark_thread_important(db_session, thread3.id, user.id, True)
        db_session.commit()

        # Get important thread IDs
        important_ids = get_user_important_thread_ids(db_session, user.id)

        assert len(important_ids) == 2
        assert thread1.id in important_ids
        assert thread3.id in important_ids
        assert thread2.id not in important_ids

    def test_user_specific_importance(self, db_session):
        """Test that importance is user-specific on shared threads."""
        # Create two users
        user1 = User(
            first_name="User",
            last_name="One",
            email="user1@example.com",
            role="user"
        )
        user2 = User(
            first_name="User",
            last_name="Two",
            email="user2@example.com",
            role="user"
        )
        db_session.add(user1)
        db_session.add(user2)
        db_session.commit()

        # Create a shared thread
        thread = Thread(
            subject="Shared Thread",
            owner_id=user1.id,
        )
        db_session.add(thread)
        db_session.commit()

        # User1 marks as important, user2 doesn't
        mark_thread_important(db_session, thread.id, user1.id, True)
        db_session.commit()

        # Verify user-specific importance
        assert get_thread_is_important(db_session, thread.id, user1.id) is True
        assert get_thread_is_important(db_session, thread.id, user2.id) is False

        # User2 marks as important too
        mark_thread_important(db_session, thread.id, user2.id, True)
        db_session.commit()

        # Both should see it as important
        assert get_thread_is_important(db_session, thread.id, user1.id) is True
        assert get_thread_is_important(db_session, thread.id, user2.id) is True

        # User1 unmarks
        mark_thread_important(db_session, thread.id, user1.id, False)
        db_session.commit()

        # Only user2 should see it as important now
        assert get_thread_is_important(db_session, thread.id, user1.id) is False
        assert get_thread_is_important(db_session, thread.id, user2.id) is True


class TestEmailAPIImportant:
    """Test is_important functionality in Email API endpoints."""

    def test_mark_email_important_via_api(self, client_with_auth, db_session):
        """Test marking a thread as important via email endpoint."""
        client, token, user = client_with_auth

        # Create a thread and email
        thread = Thread(
            subject="Test Thread",
            owner_id=user.id,
        )
        db_session.add(thread)
        db_session.commit()

        email = Email(
            subject="Test Email",
            body="Test body",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=user.id,
            thread_id=thread.id,
        )
        db_session.add(email)
        db_session.commit()

        # Mark as important via thread endpoint
        response = client.patch(
            f"/api/v1/threads/{thread.id}/important",
            json={"is_important": True},
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["is_important"] is True

        # Verify in database
        metadata = db_session.query(ThreadUserMetadata).filter(
            ThreadUserMetadata.thread_id == thread.id,
            ThreadUserMetadata.user_id == user.id
        ).first()
        assert metadata is not None
        assert metadata.is_important is True

    def test_unmark_thread_important_via_api(self, client_with_auth, db_session):
        """Test unmarking a thread as important via thread endpoint."""
        client, token, user = client_with_auth

        # Create a thread and email
        thread = Thread(
            subject="Test Thread",
            owner_id=user.id,
        )
        db_session.add(thread)
        db_session.commit()

        email = Email(
            subject="Test Email",
            body="Test body",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=user.id,
            thread_id=thread.id,
        )
        db_session.add(email)
        db_session.commit()

        # First mark as important
        mark_thread_important(db_session, thread.id, user.id, True)
        db_session.commit()

        # Then unmark via API
        response = client.patch(
            f"/api/v1/threads/{thread.id}/important",
            json={"is_important": False},
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["is_important"] is False

    def test_filter_emails_by_important(self, client_with_auth, db_session):
        """Test filtering emails by is_important flag."""
        client, token, user = client_with_auth

        # Create two threads
        thread1 = Thread(subject="Thread 1", owner_id=user.id)
        thread2 = Thread(subject="Thread 2", owner_id=user.id)
        db_session.add_all([thread1, thread2])
        db_session.commit()

        # Create emails in both threads
        email1 = Email(
            subject="Email 1",
            body="Body 1",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=user.id,
            thread_id=thread1.id,
        )
        email2 = Email(
            subject="Email 2",
            body="Body 2",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=user.id,
            thread_id=thread2.id,
        )
        db_session.add_all([email1, email2])
        db_session.commit()

        # Mark only thread1 as important
        mark_thread_important(db_session, thread1.id, user.id, True)
        db_session.commit()

        # Filter for important emails
        response = client.get(
            "/api/v1/emails?is_important=true",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        data = response.json()["data"]

        # Should only get email1
        email_subjects = [e["subject"] for e in data["results"]]
        assert "Email 1" in email_subjects
        assert "Email 2" not in email_subjects

    def test_filter_emails_by_not_important(self, client_with_auth, db_session):
        """Test filtering emails by is_important=false."""
        client, token, user = client_with_auth

        # Create two threads
        thread1 = Thread(subject="Thread 1", owner_id=user.id)
        thread2 = Thread(subject="Thread 2", owner_id=user.id)
        db_session.add_all([thread1, thread2])
        db_session.commit()

        # Create emails in both threads
        email1 = Email(
            subject="Email 1",
            body="Body 1",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=user.id,
            thread_id=thread1.id,
        )
        email2 = Email(
            subject="Email 2",
            body="Body 2",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=user.id,
            thread_id=thread2.id,
        )
        db_session.add_all([email1, email2])
        db_session.commit()

        # Mark only thread1 as important
        mark_thread_important(db_session, thread1.id, user.id, True)
        db_session.commit()

        # Filter for non-important emails
        response = client.get(
            "/api/v1/emails?is_important=false",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        data = response.json()["data"]

        # Should only get email2
        email_subjects = [e["subject"] for e in data["results"]]
        assert "Email 1" not in email_subjects
        assert "Email 2" in email_subjects

    def test_important_status_in_email_response(self, client_with_auth, db_session):
        """Test that is_important is correctly returned in email responses."""
        client, token, user = client_with_auth

        # Create a thread and email
        thread = Thread(subject="Test Thread", owner_id=user.id)
        db_session.add(thread)
        db_session.commit()

        email = Email(
            subject="Test Email",
            body="Test body",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=user.id,
            thread_id=thread.id,
        )
        db_session.add(email)
        db_session.commit()

        # Initially should be false
        response = client.get(
            f"/api/v1/emails/{email.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["is_important"] is False

        # Mark as important
        mark_thread_important(db_session, thread.id, user.id, True)
        db_session.commit()

        # Should now be true
        response = client.get(
            f"/api/v1/emails/{email.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["is_important"] is True

    def test_user_specific_important_in_shared_thread(self, client_with_auth, db_session):
        """Test that importance is user-specific for shared threads."""
        client, token, user1 = client_with_auth

        # Create a second user
        user2 = User(
            first_name="User",
            last_name="Two",
            email="user2@example.com",
            role="user"
        )
        db_session.add(user2)
        db_session.commit()

        # Create a shared thread
        thread = Thread(subject="Shared Thread", owner_id=user1.id)
        db_session.add(thread)
        db_session.commit()

        # Create emails for both users in the same thread
        email1 = Email(
            subject="Email from User1",
            body="Body",
            status="sent",
            folder=FolderType.SENT.value,
            sender_id=user1.id,
            thread_id=thread.id,
        )
        email2 = Email(
            subject="Email from User2",
            body="Body",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=user2.id,
            thread_id=thread.id,
        )
        db_session.add_all([email1, email2])
        db_session.commit()

        # User1 marks thread as important
        mark_thread_important(db_session, thread.id, user1.id, True)
        db_session.commit()

        # User1 should see it as important
        response = client.get(
            f"/api/v1/emails/{email1.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["is_important"] is True

        # Create a token for user2 (simulating user2's session)
        from app.auth.token_manager import get_token_manager
        token_manager = get_token_manager()
        user2_token = token_manager.create_token(
            user_id=str(user2.id),
            role=user2.role,
            email=user2.email
        )

        # User2 should NOT see it as important
        response = client.get(
            f"/api/v1/emails/{email2.id}",
            headers={"Authorization": f"Bearer {user2_token}"}
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["is_important"] is False

    def test_mark_important_nonexistent_thread(self, client_with_auth, db_session):
        """Test that marking important fails for non-existent thread."""
        import uuid
        client, token, user = client_with_auth

        # Try to mark a non-existent thread as important
        fake_thread_id = uuid.uuid4()
        response = client.patch(
            f"/api/v1/threads/{fake_thread_id}/important",
            json={"is_important": True},
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 404
