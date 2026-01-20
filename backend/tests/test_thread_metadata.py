"""Tests for Thread User Metadata (is_important) functionality."""

import pytest

from app.models.label import Label
from app.models.email import Email
from app.models.thread import Thread
from app.models.thread_label import ThreadLabel
from app.models.thread_user_metadata import ThreadUserMetadata
from app.models.user import User
from app.models.email_recipient import EmailRecipient
from app.core.constants import FolderType, SystemLabel, EmailStatus
from app.utils.thread_metadata_utils import (
    mark_thread_important,
    get_thread_is_important,
    get_user_important_thread_ids,
)
from tests.conftest import create_received_email_for_user, create_sent_email_for_user


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

        # Create a thread and email (perspective-aware)
        thread = Thread(
            subject="Test Thread",
            owner_id=user.id,
        )
        db_session.add(thread)
        db_session.commit()

        email = create_received_email_for_user(
            db_session, user,
            subject="Test Email",
            body="Test body",
            thread=thread
        )
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

        # Create a thread and email (perspective-aware)
        thread = Thread(
            subject="Test Thread",
            owner_id=user.id,
        )
        db_session.add(thread)
        db_session.commit()

        email = create_received_email_for_user(
            db_session, user,
            subject="Test Email",
            body="Test body",
            thread=thread
        )
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

        # Create emails in both threads (perspective-aware)
        email1 = create_received_email_for_user(
            db_session, user,
            subject="Email 1",
            body="Body 1",
            thread=thread1
        )
        email2 = create_received_email_for_user(
            db_session, user,
            subject="Email 2",
            body="Body 2",
            thread=thread2
        )
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

        # Create emails in both threads (perspective-aware)
        email1 = create_received_email_for_user(
            db_session, user,
            subject="Email 1",
            body="Body 1",
            thread=thread1
        )
        email2 = create_received_email_for_user(
            db_session, user,
            subject="Email 2",
            body="Body 2",
            thread=thread2
        )
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


class TestThreadAPISpam:
    
    def test_mark_thread_spam_via_api(self, client_with_auth, db_session):
        """Test marking a thread as spam via thread endpoint."""
        client, token, user = client_with_auth
        # Create a thread and email
        thread = Thread(
            subject="Spam Thread",
            owner_id=user.id,
        )
        db_session.add(thread)
        db_session.commit()

        # Get existing SPAM label (created by sample_user fixture)
        spam_label = db_session.query(Label).filter(
            Label.owner_id == user.id,
            Label.name == "Spam",
            Label.is_system == True
        ).first()
        assert spam_label is not None, "SPAM label should exist from fixture"

        # Create emails (perspective-aware)
        for i in range(2):
            create_received_email_for_user(
                db_session, user,
                subject=f"Spam Email {i+1}",
                body="Spam body",
                thread=thread
            )
        db_session.commit()
        # Mark as spam via thread endpoint
        response = client.patch(
            f"/api/v1/threads/{thread.id}/spam",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["thread_id"] == str(thread.id)
        assert data["emails_count"] == 2

        # verify emails moved to spam folder
        spam_emails = db_session.query(Email).filter(
            Email.thread_id == thread.id,
            Email.folder == FolderType.SPAM.value
        ).all()
        assert len(spam_emails) == 2

        #verify Spam label added
        spam_label = db_session.query(ThreadLabel).filter(
            ThreadLabel.thread_id == thread.id,
            ThreadLabel.user_id == user.id,
            ThreadLabel.label_id == db_session.query(Label.id).filter(
                Label.owner_id == user.id,
                Label.is_system == True,
                Label.name == SystemLabel.SPAM.value
            ).scalar_subquery()
        ).first()
        assert spam_label is not None

    def test_unmark_thread_spam_via_api(self, client_with_auth, db_session):
        """Test unmarking a thread as spam via thread endpoint."""
        client, token, user = client_with_auth
        # Create a thread and email
        thread = Thread(
            subject="Spam Thread",
            owner_id=user.id,
        )
        db_session.add(thread)
        db_session.commit()

        # Get existing SPAM label (created by sample_user fixture)
        spam_label = db_session.query(Label).filter(
            Label.owner_id == user.id,
            Label.name == "Spam",
            Label.is_system == True
        ).first()
        assert spam_label is not None, "SPAM label should exist from fixture"

        thread_label = ThreadLabel(
            thread_id=thread.id,
            user_id=user.id,
            label_id=spam_label.id
        )
        db_session.add(thread_label)
        db_session.commit()

        # Create emails in spam folder (perspective-aware)
        for i in range(2):
            create_received_email_for_user(
                db_session, user,
                subject=f"Spam Email {i+1}",
                body="Spam body",
                folder=FolderType.SPAM.value,
                thread=thread
            )
        db_session.commit()

        # unmark as spam
        response = client.patch(
            f"/api/v1/threads/{thread.id}/unspam",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["thread_id"] == str(thread.id)
        assert data["emails_count"] == 2

        # verify emails moved back to inbox folder
        inbox_emails = db_session.query(Email).filter(
            Email.thread_id == thread.id,
            Email.folder == FolderType.INBOX.value
        ).all()
        assert len(inbox_emails) == 2

        #verify Spam label removed
        spam_label = db_session.query(ThreadLabel).filter(
            ThreadLabel.thread_id == thread.id,
            ThreadLabel.user_id == user.id,
            ThreadLabel.label_id == db_session.query(Label.id).filter(
                Label.owner_id == user.id,
                Label.is_system == True,
                Label.name == SystemLabel.SPAM.value
            ).scalar_subquery()
        ).first()
        assert spam_label is None


class TestThreadIsStarredInListResponse:
    """Test thread_is_starred functionality in email list endpoint."""

    def test_list_emails_thread_is_starred_false_when_no_emails_starred(self, client_with_auth, db_session):
        """Test that thread_is_starred is false in list response when no emails are starred."""
        from app.utils.label_utils import sync_thread_labels
        
        client, token, user = client_with_auth

        # Create a thread with unstarred emails (perspective-aware)
        thread = Thread(subject="Test Thread", owner_id=user.id)
        db_session.add(thread)
        db_session.commit()

        email1 = create_received_email_for_user(
            db_session, user,
            subject="Email 1",
            body="Body 1",
            is_starred=False,
            thread=thread
        )
        email2 = create_received_email_for_user(
            db_session, user,
            subject="Email 2",
            body="Body 2",
            is_starred=False,
            thread=thread
        )
        db_session.commit()
        
        # Sync thread labels (adds INBOX label based on folder)
        sync_thread_labels(db_session, thread.id, user.id, commit=True)

        response = client.get(
            "/api/v1/emails?folder=inbox",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        data = response.json()["data"]
        # List returns one email per thread (the latest one)
        assert len(data["results"]) >= 1

        # Find our thread's email in results
        thread_email = next((e for e in data["results"] if e["thread_id"] == str(thread.id)), None)
        assert thread_email is not None
        assert thread_email["is_starred"] is False
        assert thread_email["thread_is_starred"] is False

    def test_list_emails_thread_is_starred_true_when_any_email_starred(self, client_with_auth, db_session):
        """Test that thread_is_starred is true in list response when any email in thread is starred."""
        from app.utils.label_utils import sync_thread_labels
        from datetime import datetime, timedelta, UTC
        
        client, token, user = client_with_auth

        # Create a thread where an older email is starred but the latest is not
        thread = Thread(subject="Test Thread", owner_id=user.id)
        db_session.add(thread)
        db_session.commit()

        # Older email (starred) (perspective-aware)
        email1 = create_received_email_for_user(
            db_session, user,
            subject="Older Email - Starred",
            body="Body 1",
            is_starred=True,
            thread=thread
        )
        email1.sent_at = datetime.now(UTC) - timedelta(hours=2)
        
        # Newer email (not starred) - this one will be shown in list
        email2 = create_received_email_for_user(
            db_session, user,
            subject="Newer Email - Not Starred",
            body="Body 2",
            is_starred=False,
            thread=thread
        )
        email2.sent_at = datetime.now(UTC)
        db_session.commit()
        
        # Sync thread labels (adds INBOX label based on folder)
        sync_thread_labels(db_session, thread.id, user.id, commit=True)

        response = client.get(
            "/api/v1/emails?folder=inbox",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        data = response.json()["data"]

        # Find our thread's email in results (should be the latest one)
        thread_email = next((e for e in data["results"] if e["thread_id"] == str(thread.id)), None)
        assert thread_email is not None
        
        # The displayed email is not starred, but thread_is_starred should be true
        # because another email in the thread is starred
        assert thread_email["subject"] == "Newer Email - Not Starred"
        assert thread_email["is_starred"] is False
        assert thread_email["thread_is_starred"] is True

    def test_list_emails_thread_is_starred_matches_individual_when_single_email(self, client_with_auth, db_session):
        """Test that thread_is_starred matches is_starred when thread has single email."""
        from app.utils.label_utils import sync_thread_labels
        
        client, token, user = client_with_auth

        # Create a thread with a single starred email (perspective-aware)
        thread = Thread(subject="Single Email Thread", owner_id=user.id)
        db_session.add(thread)
        db_session.commit()

        email = create_received_email_for_user(
            db_session, user,
            subject="Only Email",
            body="Body",
            is_starred=True,
            thread=thread
        )
        db_session.commit()
        
        # Sync thread labels (adds INBOX label based on folder)
        sync_thread_labels(db_session, thread.id, user.id, commit=True)

        response = client.get(
            "/api/v1/emails?folder=inbox",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        data = response.json()["data"]

        thread_email = next((e for e in data["results"] if e["thread_id"] == str(thread.id)), None)
        assert thread_email is not None
        assert thread_email["is_starred"] is True
        assert thread_email["thread_is_starred"] is True

    def test_search_emails_includes_thread_is_starred(self, client_with_auth, db_session):
        """Test that search endpoint also includes thread_is_starred."""
        from datetime import datetime, timedelta, UTC
        
        client, token, user = client_with_auth

        # Create a thread with mixed starred status (perspective-aware)
        thread = Thread(subject="Search Test Thread", owner_id=user.id)
        db_session.add(thread)
        db_session.commit()

        email1 = create_received_email_for_user(
            db_session, user,
            subject="Search Test Older",
            body="Searchable content",
            is_starred=True,
            thread=thread
        )
        email1.sent_at = datetime.now(UTC) - timedelta(hours=1)
        
        email2 = create_received_email_for_user(
            db_session, user,
            subject="Search Test Newer",
            body="Searchable content",
            is_starred=False,
            thread=thread
        )
        email2.sent_at = datetime.now(UTC)
        db_session.commit()

        response = client.get(
            "/api/v1/search?q=Searchable",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        data = response.json()["data"]

        thread_email = next((e for e in data["results"] if e["thread_id"] == str(thread.id)), None)
        assert thread_email is not None
        # Latest email is not starred, but thread should show as starred
        assert thread_email["is_starred"] is False
        assert thread_email["thread_is_starred"] is True