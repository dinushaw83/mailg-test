"""Tests for Emails API endpoints."""

import pytest
import uuid
from datetime import UTC, datetime, timedelta
from app.models.email import Email
from app.models.email_recipient import EmailRecipient
from app.models.thread import Thread
from app.models.user import User
from app.core.constants import FolderType


# Helper to generate a non-existent UUID for 404 tests
NON_EXISTENT_UUID = "00000000-0000-0000-0000-000000099999"


class TestEmailCreate:
    """Test email creation endpoints."""

    def test_create_email_draft_authenticated(self, client_with_auth, db_session):
        """Test creating a draft email with authentication."""
        client, token, user = client_with_auth
        
        response = client.post(
            "/api/v1/emails",
            json={
                "subject": "Test Email",
                "body": "This is a test email body",
                "recipients": [
                    {"email": "recipient@example.com", "name": "Recipient", "type": "to"}
                ],
                "is_draft": True
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 201
        data = response.json()["data"]
        assert data["subject"] == "Test Email"
        assert data["sender_id"] == str(user.id)

    def test_create_email_unauthenticated(self, client):
        """Test creating an email without authentication fails."""
        response = client.post(
            "/api/v1/emails",
            json={
                "subject": "Test Email",
                "body": "Test body",
                "recipients": [{"email": "test@example.com", "type": "to"}]
            }
        )
        
        assert response.status_code == 401

    def test_create_email_with_cc_bcc(self, client_with_auth, db_session):
        """Test creating an email with CC and BCC recipients."""
        client, token, user = client_with_auth
        
        response = client.post(
            "/api/v1/emails",
            json={
                "subject": "Multi-recipient Email",
                "body": "Test body",
                "recipients": [
                    {"email": "to@example.com", "type": "to"},
                    {"email": "cc@example.com", "type": "cc"},
                    {"email": "bcc@example.com", "type": "bcc"}
                ],
                "is_draft": True
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 201


class TestEmailList:
    """Test email listing endpoints."""

    def test_list_emails_pagination(self, client_with_auth, db_session):
        """Test listing emails with pagination."""
        client, token, user = client_with_auth
        
        # Create multiple emails
        for i in range(5):
            email = Email(
                subject=f"Email {i}",
                body=f"Body {i}",
                status="received",
                folder=FolderType.INBOX.value,
                sender_id=user.id,
            )
            db_session.add(email)
        db_session.commit()
        
        response = client.get(
            "/api/v1/emails?page=1&page_size=3",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert len(data["results"]) <= 3
        assert "total" in data
        assert "page" in data

    def test_list_emails_filter_by_folder(self, client_with_auth, db_session):
        """Test filtering emails by folder."""
        client, token, user = client_with_auth
        
        response = client.get(
            "/api/v1/emails?folder=inbox",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200

    def test_list_emails_filter_unread(self, client_with_auth, db_session):
        """Test filtering unread emails."""
        client, token, user = client_with_auth
        
        # Create emails with different read status
        email1 = Email(subject="Read", body="Content", status="received", folder=FolderType.INBOX.value,
                       is_read=True, sender_id=user.id)
        email2 = Email(subject="Unread", body="Content", status="received", folder=FolderType.INBOX.value,
                       is_read=False, sender_id=user.id)
        db_session.add_all([email1, email2])
        db_session.commit()
        
        response = client.get(
            "/api/v1/emails?is_read=false",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200

    def test_list_emails_filter_by_thread_id(self, client_with_auth, db_session):
        """Test filtering emails by thread ID to get all messages in a conversation."""
        client, token, user = client_with_auth
        
        # Create a thread
        thread = Thread(
            subject="Test Conversation",
            owner_id=user.id,
            participant_count=2,
            email_count=3,
            last_email_at=datetime.now(UTC)
        )
        db_session.add(thread)
        db_session.commit()
        db_session.refresh(thread)
        
        # Create emails in the thread
        email1 = Email(subject="Thread Email 1", body="First message", status="received",
                       sender_id=user.id, folder=FolderType.INBOX.value, thread_id=thread.id)
        email2 = Email(subject="Re: Thread Email 1", body="Reply message", status="sent",
                       sender_id=user.id, folder=FolderType.INBOX.value, thread_id=thread.id)
        email3 = Email(subject="Re: Thread Email 1", body="Another reply", status="received",
                       sender_id=user.id, folder=FolderType.INBOX.value, thread_id=thread.id)
        
        # Create an email NOT in the thread
        email_other = Email(subject="Other Email", body="Not in thread", status="received",
                            sender_id=user.id, folder=FolderType.INBOX.value, thread_id=None)
        
        db_session.add_all([email1, email2, email3, email_other])
        db_session.commit()
        
        # Filter by thread_id
        response = client.get(
            f"/api/v1/emails?thread_id={thread.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["total"] == 3
        # All returned emails should belong to the thread
        for email in data["results"]:
            assert email["thread_id"] == str(thread.id)


class TestThreadEmailCount:
    """Test thread email count in list responses."""

    def test_list_emails_includes_thread_email_count(self, client_with_auth, db_session):
        """Test that list emails response includes thread_email_count field."""
        client, token, user = client_with_auth
        
        # Create a thread with multiple emails
        thread = Thread(
            subject="Test Thread",
            owner_id=user.id,
            participant_count=1,
            email_count=3,
            last_email_at=datetime.now(UTC)
        )
        db_session.add(thread)
        db_session.commit()
        db_session.refresh(thread)
        
        # Create 3 emails in the thread
        for i in range(3):
            email = Email(
                subject=f"Thread Email {i}",
                body=f"Content {i}",
                status="received",
                folder=FolderType.INBOX.value,
                sender_id=user.id,
                thread_id=thread.id
            )
            db_session.add(email)
        db_session.commit()
        
        response = client.get(
            "/api/v1/emails",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # All emails in the thread should have thread_email_count = 3
        for email in data["results"]:
            if email["thread_id"] == str(thread.id):
                assert email["thread_email_count"] == 3

    def test_list_emails_thread_count_null_for_no_thread(self, client_with_auth, db_session):
        """Test that emails without a thread have null thread_email_count."""
        client, token, user = client_with_auth
        
        # Create an email without a thread
        email = Email(
            subject="No Thread Email",
            body="Content",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=user.id,
            thread_id=None
        )
        db_session.add(email)
        db_session.commit()
        
        response = client.get(
            "/api/v1/emails",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Find our email and check thread_email_count is null
        for result in data["results"]:
            if result["subject"] == "No Thread Email":
                assert result["thread_email_count"] is None

    def test_list_emails_threaded_mode_includes_count(self, client_with_auth, db_session):
        """Test that threaded mode includes correct thread_email_count."""
        client, token, user = client_with_auth
        
        # Create a thread with 5 emails
        thread = Thread(
            subject="Big Thread",
            owner_id=user.id,
            participant_count=1,
            email_count=5,
            last_email_at=datetime.now(UTC)
        )
        db_session.add(thread)
        db_session.commit()
        db_session.refresh(thread)
        
        # Create 5 emails in the thread
        for i in range(5):
            email = Email(
                subject=f"Thread Email {i}",
                body=f"Content {i}",
                status="received",
                folder=FolderType.INBOX.value,
                sender_id=user.id,
                thread_id=thread.id,
                sent_at=datetime.now(UTC) - timedelta(hours=5-i)
            )
            db_session.add(email)
        db_session.commit()
        
        # Use threaded mode to get only latest email per thread
        response = client.get(
            "/api/v1/emails?threaded=true",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Should return 1 email (latest from the thread)
        thread_emails = [e for e in data["results"] if e["thread_id"] == str(thread.id)]
        assert len(thread_emails) == 1
        # The thread_email_count should be 5
        assert thread_emails[0]["thread_email_count"] == 5

    def test_list_emails_thread_count_only_accessible_emails(self, client_with_auth, db_session):
        """Test that thread_email_count only counts emails accessible to the user."""
        client, token, user = client_with_auth
        
        # Create another user
        other_user = User(
            first_name="Other",
            last_name="User",
            email="other@example.com",
            role="user"
        )
        db_session.add(other_user)
        db_session.commit()
        
        # Create a thread
        thread = Thread(
            subject="Shared Thread",
            owner_id=user.id,
            participant_count=2,
            email_count=4,
            last_email_at=datetime.now(UTC)
        )
        db_session.add(thread)
        db_session.commit()
        db_session.refresh(thread)
        
        # Create 2 emails by current user
        email1 = Email(
            subject="User Email 1",
            body="Content",
            status="sent",
            folder=FolderType.SENT.value,
            sender_id=user.id,
            thread_id=thread.id
        )
        email2 = Email(
            subject="User Email 2",
            body="Content",
            status="sent",
            folder=FolderType.SENT.value,
            sender_id=user.id,
            thread_id=thread.id
        )
        
        # Create 2 emails by other user (not accessible to current user)
        email3 = Email(
            subject="Other User Email 1",
            body="Content",
            status="sent",
            folder=FolderType.SENT.value,
            sender_id=other_user.id,
            thread_id=thread.id
        )
        email4 = Email(
            subject="Other User Email 2",
            body="Content",
            status="sent",
            folder=FolderType.SENT.value,
            sender_id=other_user.id,
            thread_id=thread.id
        )
        
        db_session.add_all([email1, email2, email3, email4])
        db_session.commit()
        
        response = client.get(
            "/api/v1/emails",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # thread_email_count should be 2 (only user's emails, not other user's)
        for email in data["results"]:
            if email["thread_id"] == str(thread.id):
                assert email["thread_email_count"] == 2

    def test_list_emails_multiple_threads_different_counts(self, client_with_auth, db_session):
        """Test that different threads show correct individual counts."""
        client, token, user = client_with_auth
        
        # Create thread 1 with 2 emails
        thread1 = Thread(
            subject="Thread 1",
            owner_id=user.id,
            participant_count=1,
            email_count=2,
            last_email_at=datetime.now(UTC)
        )
        # Create thread 2 with 4 emails
        thread2 = Thread(
            subject="Thread 2",
            owner_id=user.id,
            participant_count=1,
            email_count=4,
            last_email_at=datetime.now(UTC)
        )
        db_session.add_all([thread1, thread2])
        db_session.commit()
        db_session.refresh(thread1)
        db_session.refresh(thread2)
        
        # Create 2 emails in thread 1
        for i in range(2):
            email = Email(
                subject=f"Thread1 Email {i}",
                body="Content",
                status="received",
                folder=FolderType.INBOX.value,
                sender_id=user.id,
                thread_id=thread1.id
            )
            db_session.add(email)
        
        # Create 4 emails in thread 2
        for i in range(4):
            email = Email(
                subject=f"Thread2 Email {i}",
                body="Content",
                status="received",
                folder=FolderType.INBOX.value,
                sender_id=user.id,
                thread_id=thread2.id
            )
            db_session.add(email)
        
        db_session.commit()
        
        response = client.get(
            "/api/v1/emails",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Check each email has correct thread count
        for email in data["results"]:
            if email["thread_id"] == str(thread1.id):
                assert email["thread_email_count"] == 2
            elif email["thread_id"] == str(thread2.id):
                assert email["thread_email_count"] == 4


class TestGetEmailsByThread:
    """Test get emails by thread endpoint with background read marking."""

    def test_get_emails_by_thread_success(self, client_with_auth, db_session):
        """Test fetching all emails in a thread."""
        client, token, user = client_with_auth
        
        # Create a thread
        thread = Thread(
            subject="Test Thread",
            owner_id=user.id,
            participant_count=2,
            email_count=3,
            last_email_at=datetime.now(UTC)
        )
        db_session.add(thread)
        db_session.commit()
        db_session.refresh(thread)
        
        # Create emails in the thread
        email1 = Email(subject="Thread Email 1", body="First message", status="received",
                       sender_id=user.id, folder=FolderType.INBOX.value, thread_id=thread.id)
        email2 = Email(subject="Re: Thread Email 1", body="Reply", status="sent",
                       sender_id=user.id, folder=FolderType.SENT.value, thread_id=thread.id)
        db_session.add_all([email1, email2])
        db_session.commit()
        
        response = client.get(
            f"/api/v1/threads/{thread.id}/emails",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert len(data) == 2

    def test_get_emails_by_thread_marks_as_read(self, client_with_auth, db_session):
        """Test that fetching a thread schedules background task to mark unread emails as read."""
        from unittest.mock import patch, MagicMock
        
        client, token, user = client_with_auth
        
        # Create a thread
        thread = Thread(
            subject="Test Thread",
            owner_id=user.id,
            participant_count=1,
            email_count=3,
            last_email_at=datetime.now(UTC)
        )
        db_session.add(thread)
        db_session.commit()
        db_session.refresh(thread)
        
        # Create unread emails in the thread
        email1 = Email(subject="Unread 1", body="First", status="received", is_read=False,
                       sender_id=user.id, folder=FolderType.INBOX.value, thread_id=thread.id)
        email2 = Email(subject="Unread 2", body="Second", status="received", is_read=False,
                       sender_id=user.id, folder=FolderType.INBOX.value, thread_id=thread.id)
        email3 = Email(subject="Already Read", body="Third", status="received", is_read=True,
                       sender_id=user.id, folder=FolderType.INBOX.value, thread_id=thread.id)
        db_session.add_all([email1, email2, email3])
        db_session.commit()
        
        email1_id, email2_id = email1.id, email2.id
        
        # Mock the background task function to verify it's called with correct args
        with patch('app.api.v1.endpoints.threads.mark_emails_as_read_background') as mock_mark_read:
            response = client.get(
                f"/api/v1/threads/{thread.id}/emails",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            assert response.status_code == 200
            data = response.json()["data"]
            assert len(data) == 3
            
            # Verify background task was called with unread email IDs
            mock_mark_read.assert_called_once()
            call_args = mock_mark_read.call_args
            called_email_ids = call_args[0][0]
            called_user_id = call_args[0][1]
            
            # Should contain only the unread emails
            assert len(called_email_ids) == 2
            assert email1_id in called_email_ids
            assert email2_id in called_email_ids
            assert called_user_id == user.id

    def test_get_emails_by_thread_no_background_task_when_all_read(self, client_with_auth, db_session):
        """Test that no background task is scheduled when all emails are already read."""
        from unittest.mock import patch
        
        client, token, user = client_with_auth
        
        # Create a thread
        thread = Thread(
            subject="Test Thread",
            owner_id=user.id,
            participant_count=1,
            email_count=2,
            last_email_at=datetime.now(UTC)
        )
        db_session.add(thread)
        db_session.commit()
        db_session.refresh(thread)
        
        # Create already read emails
        email1 = Email(subject="Read 1", body="First", status="received", is_read=True,
                       sender_id=user.id, folder=FolderType.INBOX.value, thread_id=thread.id)
        email2 = Email(subject="Read 2", body="Second", status="received", is_read=True,
                       sender_id=user.id, folder=FolderType.INBOX.value, thread_id=thread.id)
        db_session.add_all([email1, email2])
        db_session.commit()
        
        with patch('app.api.v1.endpoints.threads.mark_emails_as_read_background') as mock_mark_read:
            response = client.get(
                f"/api/v1/threads/{thread.id}/emails",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            assert response.status_code == 200
            data = response.json()["data"]
            assert len(data) == 2
            
            # Background task should NOT be called since all emails are already read
            mock_mark_read.assert_not_called()

    def test_get_emails_by_thread_all_already_read(self, client_with_auth, db_session):
        """Test fetching a thread where all emails are already read."""
        client, token, user = client_with_auth
        
        # Create a thread
        thread = Thread(
            subject="Test Thread",
            owner_id=user.id,
            participant_count=1,
            email_count=2,
            last_email_at=datetime.now(UTC)
        )
        db_session.add(thread)
        db_session.commit()
        db_session.refresh(thread)
        
        # Create already read emails
        email1 = Email(subject="Read 1", body="First", status="received", is_read=True,
                       sender_id=user.id, folder=FolderType.INBOX.value, thread_id=thread.id)
        email2 = Email(subject="Read 2", body="Second", status="received", is_read=True,
                       sender_id=user.id, folder=FolderType.INBOX.value, thread_id=thread.id)
        db_session.add_all([email1, email2])
        db_session.commit()
        
        response = client.get(
            f"/api/v1/threads/{thread.id}/emails",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert len(data) == 2

    def test_get_emails_by_thread_not_found(self, client_with_auth):
        """Test fetching a non-existent thread returns 404."""
        client, token, user = client_with_auth
        
        response = client.get(
            f"/api/v1/threads/{NON_EXISTENT_UUID}/emails",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 404

    def test_get_emails_by_thread_unauthenticated(self, client, db_session, sample_user):
        """Test fetching thread without authentication fails."""
        # Create a thread
        thread = Thread(
            subject="Test Thread",
            owner_id=sample_user.id,
            participant_count=1,
            email_count=1,
            last_email_at=datetime.now(UTC)
        )
        db_session.add(thread)
        db_session.commit()
        
        response = client.get(f"/api/v1/threads/{thread.id}/emails")
        
        assert response.status_code == 401

    def test_get_emails_by_thread_only_accessible_emails(self, client_with_auth, db_session):
        """Test that users can only see emails they have access to in a thread."""
        client, token, user = client_with_auth
        
        # Create another user
        other_user = User(
            first_name="Other",
            last_name="User",
            email="other@example.com",
            role="user"
        )
        db_session.add(other_user)
        db_session.commit()
        
        # Create a thread
        thread = Thread(
            subject="Test Thread",
            owner_id=user.id,
            participant_count=2,
            email_count=2,
            last_email_at=datetime.now(UTC)
        )
        db_session.add(thread)
        db_session.commit()
        db_session.refresh(thread)
        
        # Email sent by current user (accessible)
        email1 = Email(subject="My Email", body="Sent by me", status="sent",
                       sender_id=user.id, folder=FolderType.SENT.value, thread_id=thread.id)
        # Email sent by other user to current user (accessible via recipient)
        email2 = Email(subject="Their Email", body="Sent to me", status="received",
                       sender_id=other_user.id, folder=FolderType.INBOX.value, thread_id=thread.id)
        db_session.add_all([email1, email2])
        db_session.commit()
        
        # Add current user as recipient of email2
        recipient = EmailRecipient(
            email_id=email2.id,
            recipient_id=user.id,
            recipient_email=user.email,
            recipient_type="to"
        )
        db_session.add(recipient)
        db_session.commit()
        
        response = client.get(
            f"/api/v1/threads/{thread.id}/emails",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        # User should see both emails (one as sender, one as recipient)
        assert len(data) == 2

    def test_get_emails_by_thread_returns_ordered_by_date(self, client_with_auth, db_session):
        """Test that emails in thread are returned ordered by sent_at/created_at."""
        client, token, user = client_with_auth
        
        # Create a thread
        thread = Thread(
            subject="Test Thread",
            owner_id=user.id,
            participant_count=1,
            email_count=3,
            last_email_at=datetime.now(UTC)
        )
        db_session.add(thread)
        db_session.commit()
        db_session.refresh(thread)
        
        # Create emails with different timestamps
        email1 = Email(subject="First", body="First message", status="received",
                       sender_id=user.id, folder=FolderType.INBOX.value, thread_id=thread.id,
                       sent_at=datetime.now(UTC) - timedelta(hours=2))
        email2 = Email(subject="Second", body="Second message", status="received",
                       sender_id=user.id, folder=FolderType.INBOX.value, thread_id=thread.id,
                       sent_at=datetime.now(UTC) - timedelta(hours=1))
        email3 = Email(subject="Third", body="Third message", status="received",
                       sender_id=user.id, folder=FolderType.INBOX.value, thread_id=thread.id,
                       sent_at=datetime.now(UTC))
        db_session.add_all([email3, email1, email2])  # Add in wrong order
        db_session.commit()
        
        response = client.get(
            f"/api/v1/threads/{thread.id}/emails",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Should be ordered by sent_at ascending
        assert data[0]["subject"] == "First"
        assert data[1]["subject"] == "Second"
        assert data[2]["subject"] == "Third"

    def test_mark_emails_as_read_background_function(self, db_session, sample_user):
        """Test the background function that marks emails as read."""
        from unittest.mock import patch, MagicMock
        from app.utils.email_utils import mark_emails_as_read_background
        
        # Create test emails
        email1 = Email(subject="Email 1", body="Content", status="received", is_read=False,
                       sender_id=sample_user.id, folder=FolderType.INBOX.value)
        email2 = Email(subject="Email 2", body="Content", status="received", is_read=False,
                       sender_id=sample_user.id, folder=FolderType.INBOX.value)
        db_session.add_all([email1, email2])
        db_session.commit()
        
        email_ids = [email1.id, email2.id]
        
        # Mock get_db_session to return our test session
        mock_session = MagicMock()
        mock_query = MagicMock()
        mock_filter = MagicMock()
        mock_session.query.return_value = mock_query
        mock_query.filter.return_value = mock_filter
        mock_filter.update.return_value = 2
        
        # The function imports get_db_session inside, so we patch where it's used
        with patch('app.db.session.get_db_session', return_value=mock_session):
            mark_emails_as_read_background(email_ids, sample_user.id, "test-run-id")
            
            # Verify the session was used correctly
            mock_session.query.assert_called_once()
            mock_session.commit.assert_called_once()
            mock_session.close.assert_called_once()


class TestEmailOperations:
    """Test email operations (read, star, move, delete)."""

    def test_get_email_by_id(self, client_with_auth, db_session, sample_email):
        """Test getting a specific email by ID."""
        client, token, user = client_with_auth
        
        response = client.get(
            f"/api/v1/emails/{sample_email.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["id"] == str(sample_email.id)

    def test_get_email_not_found(self, client_with_auth):
        """Test getting a non-existent email returns 404."""
        client, token, user = client_with_auth
        
        response = client.get(
            f"/api/v1/emails/{NON_EXISTENT_UUID}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 404

    def test_mark_email_as_read(self, client_with_auth, db_session, sample_email):
        """Test marking an email as read."""
        client, token, user = client_with_auth
        
        response = client.patch(
            f"/api/v1/emails/{sample_email.id}/read",
            json={"is_read": True},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["is_read"] == True

    def test_star_email(self, client_with_auth, db_session, sample_email):
        """Test starring an email."""
        client, token, user = client_with_auth
        
        response = client.patch(
            f"/api/v1/emails/{sample_email.id}/star",
            json={"is_starred": True},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["is_starred"] == True

    def test_move_email_to_folder(self, client_with_auth, db_session, sample_email):
        """Test moving an email to a different folder."""
        client, token, user = client_with_auth
        
        response = client.post(
            f"/api/v1/emails/{sample_email.id}/move",
            json={"folder": "trash"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200

    def test_delete_email_moves_to_trash(self, client_with_auth, db_session, sample_email):
        """Test deleting an email moves it to trash folder."""
        client, token, user = client_with_auth
        email_id = sample_email.id

        response = client.delete(
            f"/api/v1/emails/{email_id}",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 204

        # Verify email was moved to trash
        db_session.expire_all()
        email_check = db_session.query(Email).filter(Email.id == email_id).first()
        assert email_check is not None
        assert email_check.folder == FolderType.TRASH.value

    def test_delete_email_permanent(self, client_with_auth, db_session, sample_email):
        """Test permanently deleting an email removes it from database."""
        client, token, user = client_with_auth
        email_id = sample_email.id
        
        response = client.delete(
            f"/api/v1/emails/{email_id}?permanent=true",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 204
        
        # Verify email is completely gone (not just soft deleted)
        db_session.expire_all()
        email_check = db_session.query(Email).filter(Email.id == email_id).first()
        assert email_check is None


class TestEmailSendReplyForward:
    """Test email send, reply, and forward operations."""

    def test_send_draft_email(self, client_with_auth, db_session, sample_draft_email):
        """Test sending a draft email."""
        client, token, user = client_with_auth
        
        # Disable undo send for this test (default is 10 seconds which would queue the email)
        user.undo_send_delay_seconds = 0
        db_session.commit()
        
        response = client.post(
            f"/api/v1/emails/{sample_draft_email.id}/send",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]

    def test_reply_to_email(self, client_with_auth, db_session, sample_email):
        """Test replying to an email creates a draft."""
        client, token, user = client_with_auth

        response = client.post(
            f"/api/v1/emails/{sample_email.id}/reply",
            json={
                "body": "This is my reply",
                "reply_all": False
            },
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 201
        data = response.json()["data"]
        assert data["parent_email_id"] == str(sample_email.id)
        # Verify reply is created as a draft
        assert data["folder"] == "drafts"
        assert data["sent_at"] is None
        # To send this draft, user would call POST /emails/{id}/send

    def test_reply_to_draft_email_fails(self, client_with_auth, db_session, sample_draft_email):
        """Test that replying to a draft email fails with 400."""
        client, token, user = client_with_auth

        response = client.post(
            f"/api/v1/emails/{sample_draft_email.id}/reply",
            json={
                "body": "This is my reply",
                "reply_all": False
            },
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 400
        assert "Cannot reply to a draft email" in response.json()["message"]

    def test_reply_to_email_without_thread_fails(self, client_with_auth, db_session):
        """Test that replying to an email without thread fails with 400."""
        from app.models.email import Email
        from app.core.constants import EmailStatus, FolderType

        client, token, user = client_with_auth

        # Create an email without a thread_id
        email_no_thread = Email(
            subject="Email without thread",
            body="Test body",
            status=EmailStatus.SENT.value,
            folder=FolderType.INBOX.value,
            sender_id=user.id,
            thread_id=None,  # No thread
            is_read=False,
        )
        db_session.add(email_no_thread)
        db_session.commit()

        response = client.post(
            f"/api/v1/emails/{email_no_thread.id}/reply",
            json={
                "body": "This is my reply",
                "reply_all": False
            },
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 400
        assert "Cannot reply to an email without a thread" in response.json()["message"]

    def test_forward_email(self, client_with_auth, db_session, sample_email):
        """Test forwarding an email."""
        client, token, user = client_with_auth
        
        response = client.post(
            f"/api/v1/emails/{sample_email.id}/forward",
            json={
                "recipients": [
                    {"email": "forward@example.com", "type": "to"}
                ],
                "body": "FYI - see below"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 201


class TestThreadSnooze:
    """Test thread snooze and unsnooze operations."""

    def test_snooze_thread_success(self, client_with_auth, db_session, sample_email):
        """Test snoozing a thread until a future date."""
        client, token, user = client_with_auth
        
        # Snooze until tomorrow
        snooze_time = (datetime.now(UTC) + timedelta(days=1)).isoformat()
        
        response = client.post(
            f"/api/v1/threads/{sample_email.thread_id}/snooze",
            json={"snooze_until": snooze_time},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["snooze_until"] is not None

    def test_snooze_thread_past_time_fails(self, client_with_auth, db_session, sample_email):
        """Test that snoozing to a past time fails."""
        client, token, user = client_with_auth
        
        # Try to snooze to yesterday
        snooze_time = (datetime.now(UTC) - timedelta(days=1)).isoformat()
        
        response = client.post(
            f"/api/v1/threads/{sample_email.thread_id}/snooze",
            json={"snooze_until": snooze_time},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400
        response_data = response.json()
        # Error message is in the "message" field of the wrapped response
        error_msg = response_data.get("message", "")
        assert "future" in error_msg.lower()

    def test_snooze_thread_not_found(self, client_with_auth):
        """Test snoozing a non-existent thread returns 404."""
        client, token, user = client_with_auth
        
        snooze_time = (datetime.now(UTC) + timedelta(days=1)).isoformat()
        
        response = client.post(
            f"/api/v1/threads/{NON_EXISTENT_UUID}/snooze",
            json={"snooze_until": snooze_time},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 404

    def test_snooze_thread_unauthenticated(self, client, sample_email):
        """Test snoozing without authentication fails."""
        snooze_time = (datetime.now(UTC) + timedelta(days=1)).isoformat()
        
        response = client.post(
            f"/api/v1/threads/{sample_email.thread_id}/snooze",
            json={"snooze_until": snooze_time}
        )
        
        assert response.status_code == 401

    def test_unsnooze_thread_success(self, client_with_auth, db_session, sample_email):
        """Test unsnoozing a snoozed thread."""
        from app.models.thread_user_metadata import ThreadUserMetadata
        
        client, token, user = client_with_auth
        
        # First snooze the thread via ThreadUserMetadata
        metadata = ThreadUserMetadata(
            thread_id=sample_email.thread_id,
            user_id=user.id,
            snooze_until=datetime.now(UTC) + timedelta(days=1)
        )
        db_session.add(metadata)
        db_session.commit()
        
        response = client.post(
            f"/api/v1/threads/{sample_email.thread_id}/unsnooze",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["snooze_until"] is None

    def test_unsnooze_thread_not_snoozed_fails(self, client_with_auth, db_session, sample_email):
        """Test unsnoozing a thread that's not snoozed fails."""
        client, token, user = client_with_auth
        
        # No snooze metadata exists for this thread
        
        response = client.post(
            f"/api/v1/threads/{sample_email.thread_id}/unsnooze",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400
        response_data = response.json()
        # Error message is in the "message" field of the wrapped response
        error_msg = response_data.get("message", "")
        assert "not snoozed" in error_msg.lower()

    def test_unsnooze_thread_not_found(self, client_with_auth):
        """Test unsnoozing a non-existent thread returns 404."""
        client, token, user = client_with_auth
        
        response = client.post(
            f"/api/v1/threads/{NON_EXISTENT_UUID}/unsnooze",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 404

    def test_list_snoozed_emails_filter(self, client_with_auth, db_session):
        """Test filtering emails by snoozed status."""
        client, token, user = client_with_auth
        
        # Create snoozed and non-snoozed emails
        snoozed_email = Email(
            subject="Snoozed Email",
            body="Content",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            snooze_until=datetime.now(UTC) + timedelta(days=1)
        )
        normal_email = Email(
            subject="Normal Email",
            body="Content",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            snooze_until=None
        )
        db_session.add_all([snoozed_email, normal_email])
        db_session.commit()
        
        # Test is_snoozed=true filter
        response = client.get(
            "/api/v1/emails?is_snoozed=true",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        # All returned emails should be snoozed
        for email in data["results"]:
            assert email["snooze_until"] is not None

    def test_list_non_snoozed_emails_filter(self, client_with_auth, db_session):
        """Test filtering non-snoozed emails."""
        client, token, user = client_with_auth
        
        # Create snoozed and non-snoozed emails
        snoozed_email = Email(
            subject="Snoozed Email",
            body="Content",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            snooze_until=datetime.now(UTC) + timedelta(days=1)
        )
        normal_email = Email(
            subject="Normal Email",
            body="Content",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            snooze_until=None
        )
        db_session.add_all([snoozed_email, normal_email])
        db_session.commit()
        
        # Test is_snoozed=false filter
        response = client.get(
            "/api/v1/emails?is_snoozed=false",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        # All returned emails should NOT be snoozed
        for email in data["results"]:
            assert email["snooze_until"] is None

    def test_snooze_response_includes_snooze_until(self, client_with_auth, db_session, sample_email):
        """Test that email response includes snooze_until field."""
        client, token, user = client_with_auth
        
        response = client.get(
            f"/api/v1/emails/{sample_email.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        # Field should exist even if null
        assert "snooze_until" in data


class TestThreadArchive:
    """Test thread archive operations."""

    def test_archive_thread_success(self, client_with_auth, db_session, sample_email):
        """Test archiving a thread."""
        client, token, user = client_with_auth
        
        response = client.post(
            f"/api/v1/threads/{sample_email.thread_id}/archive",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["is_archived"] == True

    def test_archive_thread_not_found(self, client_with_auth):
        """Test archiving a non-existent thread returns 404."""
        client, token, user = client_with_auth
        
        response = client.post(
            f"/api/v1/threads/{NON_EXISTENT_UUID}/archive",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 404

    def test_archive_thread_unauthenticated(self, client, sample_email):
        """Test archiving without authentication fails."""
        response = client.post(
            f"/api/v1/threads/{sample_email.thread_id}/archive"
        )
        
        assert response.status_code == 401

    def test_archive_thread_updates_metadata(self, client_with_auth, db_session, sample_email):
        """Test that archiving updates ThreadUserMetadata.is_archived."""
        from app.models.thread_user_metadata import ThreadUserMetadata
        
        client, token, user = client_with_auth
        
        response = client.post(
            f"/api/v1/threads/{sample_email.thread_id}/archive",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["is_archived"] == True
        
        # Verify ThreadUserMetadata was created/updated
        metadata = db_session.query(ThreadUserMetadata).filter(
            ThreadUserMetadata.thread_id == sample_email.thread_id,
            ThreadUserMetadata.user_id == user.id
        ).first()
        assert metadata is not None
        assert metadata.is_archived == True

    def test_archive_thread_as_recipient(self, client_with_auth, db_session):
        """Test that a recipient can archive a thread they received."""
        client, token, user = client_with_auth
        
        # Create another user as sender
        sender = User(
            first_name="Sender",
            last_name="User",
            email="sender@example.com",
            role="user"
        )
        db_session.add(sender)
        db_session.commit()
        
        # Create a thread for the email
        thread = Thread(
            subject="Test received email",
            owner_id=sender.id,
            email_count=1
        )
        db_session.add(thread)
        db_session.commit()
        
        # Create an email from sender to current user
        email = Email(
            subject="Test received email",
            body="Email body",
            sender_id=sender.id,
            folder=FolderType.INBOX.value,
            status="received",
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        # Add current user as recipient
        recipient = EmailRecipient(
            email_id=email.id,
            recipient_id=user.id,
            recipient_email=user.email,
            recipient_type="to"
        )
        db_session.add(recipient)
        db_session.commit()
        
        # Archive as recipient
        response = client.post(
            f"/api/v1/threads/{thread.id}/archive",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["is_archived"] == True


class TestThreadUnstar:
    """Test thread unstar operations."""

    def test_unstar_thread_success(self, client_with_auth, db_session):
        """Test unstarring all emails in a thread."""
        client, token, user = client_with_auth
        
        # Create a thread
        thread = Thread(
            subject="Test thread",
            owner_id=user.id,
            email_count=2
        )
        db_session.add(thread)
        db_session.commit()
        
        # Create two starred emails in the thread
        email1 = Email(
            subject="Email 1",
            body="Body 1",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            status="received",
            thread_id=thread.id,
            is_starred=True
        )
        email2 = Email(
            subject="Email 2",
            body="Body 2",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            status="received",
            thread_id=thread.id,
            is_starred=True
        )
        db_session.add_all([email1, email2])
        db_session.commit()
        
        # Unstar all emails in the thread
        response = client.post(
            f"/api/v1/threads/{thread.id}/unstar",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["unstarred_count"] == 2
        
        # Verify emails are unstarred
        db_session.refresh(email1)
        db_session.refresh(email2)
        assert email1.is_starred == False
        assert email2.is_starred == False

    def test_unstar_thread_partial(self, client_with_auth, db_session):
        """Test unstarring when some emails are already unstarred."""
        client, token, user = client_with_auth
        
        # Create a thread
        thread = Thread(
            subject="Test thread",
            owner_id=user.id,
            email_count=2
        )
        db_session.add(thread)
        db_session.commit()
        
        # Create one starred and one unstarred email
        email1 = Email(
            subject="Email 1",
            body="Body 1",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            status="received",
            thread_id=thread.id,
            is_starred=True
        )
        email2 = Email(
            subject="Email 2",
            body="Body 2",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            status="received",
            thread_id=thread.id,
            is_starred=False
        )
        db_session.add_all([email1, email2])
        db_session.commit()
        
        # Unstar all emails in the thread
        response = client.post(
            f"/api/v1/threads/{thread.id}/unstar",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["unstarred_count"] == 1  # Only 1 was starred

    def test_unstar_thread_not_found(self, client_with_auth):
        """Test unstarring a non-existent thread returns 404."""
        client, token, user = client_with_auth
        
        response = client.post(
            f"/api/v1/threads/{NON_EXISTENT_UUID}/unstar",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 404

    def test_unstar_thread_unauthenticated(self, client, db_session):
        """Test unstarring without authentication fails."""
        import uuid
        response = client.post(
            f"/api/v1/threads/{uuid.uuid4()}/unstar"
        )
        
        assert response.status_code == 401

    def test_unstar_single_email_still_works(self, client_with_auth, db_session, sample_email):
        """Test that individual email unstar still works via email endpoint."""
        client, token, user = client_with_auth
        
        # Star the email first
        sample_email.is_starred = True
        db_session.commit()
        
        # Unstar via email endpoint
        response = client.patch(
            f"/api/v1/emails/{sample_email.id}/star",
            json={"is_starred": False},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["is_starred"] == False


class TestEmailCategory:
    """Test email category (Gmail-style tabs) operations."""

    def test_update_email_category_success(self, client_with_auth, db_session, sample_email):
        """Test updating an email's category."""
        client, token, user = client_with_auth
        
        response = client.patch(
            f"/api/v1/emails/{sample_email.id}/category",
            json={"category": "promotions"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["category"] == "promotions"

    def test_update_email_category_all_types(self, client_with_auth, db_session, sample_email):
        """Test all valid category types."""
        client, token, user = client_with_auth
        
        categories = ["primary", "promotions", "social", "updates", "forums"]
        for category in categories:
            response = client.patch(
                f"/api/v1/emails/{sample_email.id}/category",
                json={"category": category},
                headers={"Authorization": f"Bearer {token}"}
            )
            
            assert response.status_code == 200
            data = response.json()["data"]
            assert data["category"] == category

    def test_update_email_category_invalid(self, client_with_auth, db_session, sample_email):
        """Test updating with invalid category fails."""
        client, token, user = client_with_auth
        
        response = client.patch(
            f"/api/v1/emails/{sample_email.id}/category",
            json={"category": "invalid_category"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400

    def test_update_email_category_not_found(self, client_with_auth):
        """Test updating category of non-existent email returns 404."""
        client, token, user = client_with_auth
        
        response = client.patch(
            f"/api/v1/emails/{NON_EXISTENT_UUID}/category",
            json={"category": "promotions"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 404

    def test_update_email_category_unauthenticated(self, client, sample_email):
        """Test updating category without authentication fails."""
        response = client.patch(
            f"/api/v1/emails/{sample_email.id}/category",
            json={"category": "promotions"}
        )
        
        assert response.status_code == 401

    def test_list_emails_filter_by_category(self, client_with_auth, db_session):
        """Test filtering emails by category."""
        client, token, user = client_with_auth
        
        # Create emails with different categories
        email_primary = Email(
            subject="Primary Email",
            body="Content",
            status="received",
            category="primary",
            sender_id=user.id,
            folder=FolderType.INBOX.value
        )
        email_promo = Email(
            subject="Promo Email",
            body="Content",
            status="received",
            category="promotions",
            sender_id=user.id,
            folder=FolderType.INBOX.value
        )
        email_social = Email(
            subject="Social Email",
            body="Content",
            status="received",
            category="social",
            sender_id=user.id,
            folder=FolderType.INBOX.value
        )
        db_session.add_all([email_primary, email_promo, email_social])
        db_session.commit()
        
        # Filter by category
        response = client.get(
            "/api/v1/emails?category=promotions",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        # All returned emails should have promotions category
        for email in data["results"]:
            assert email["category"] == "promotions"

    def test_email_response_includes_category(self, client_with_auth, db_session, sample_email):
        """Test that email response includes category field."""
        client, token, user = client_with_auth
        
        response = client.get(
            f"/api/v1/emails/{sample_email.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert "category" in data

    def test_email_default_category_is_primary(self, client_with_auth, db_session):
        """Test that new emails default to 'primary' category."""
        client, token, user = client_with_auth
        
        response = client.post(
            "/api/v1/emails",
            json={
                "subject": "New Email",
                "body": "Test body",
                "recipients": [{"email": "test@example.com", "type": "to"}],
                "is_draft": True
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 201
        data = response.json()["data"]
        assert data["category"] == "primary"


class TestEmailCategoryCounts:
    """Test email category counts statistics endpoint."""

    def test_get_category_counts_success(self, client_with_auth, db_session):
        """Test getting email category counts."""
        client, token, user = client_with_auth

        # Create emails with different categories
        email_primary = Email(
            subject="Primary Email",
            body="Content",
            status="received",
            category="primary",
            sender_id=user.id,
            folder=FolderType.INBOX.value
        )
        email_promo1 = Email(
            subject="Promo Email 1",
            body="Content",
            status="received",
            category="promotions",
            sender_id=user.id,
            folder=FolderType.INBOX.value
        )
        email_promo2 = Email(
            subject="Promo Email 2",
            body="Content",
            status="received",
            category="promotions",
            sender_id=user.id,
            folder=FolderType.INBOX.value
        )
        email_social = Email(
            subject="Social Email",
            body="Content",
            status="received",
            category="social",
            sender_id=user.id,
            folder=FolderType.INBOX.value
        )
        db_session.add_all([email_primary, email_promo1, email_promo2, email_social])
        db_session.commit()

        response = client.get(
            "/api/v1/emails/stats/category-counts",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        data = response.json()["data"]

        # Verify counts - response is now a flat dict
        assert data["primary"] == 1
        assert data["promotions"] == 2
        assert data["social"] == 1
        assert data["updates"] == 0
        assert data["forums"] == 0

    def test_get_category_counts_includes_all_categories(self, client_with_auth, db_session):
        """Test that all categories are included even with 0 count."""
        from app.core.constants import VALID_EMAIL_CATEGORIES

        client, token, user = client_with_auth

        # Create only one email in primary category
        email = Email(
            subject="Primary Email",
            body="Content",
            status="received",
            category="primary",
            sender_id=user.id,
            folder=FolderType.INBOX.value
        )
        db_session.add(email)
        db_session.commit()

        response = client.get(
            "/api/v1/emails/stats/category-counts",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        data = response.json()["data"]

        # All categories from VALID_EMAIL_CATEGORIES should be present
        for category in VALID_EMAIL_CATEGORIES:
            assert category in data
            # All should have count >= 0
            assert data[category] >= 0

        # Verify primary has 1, all others have 0
        assert data["primary"] == 1
        for category in VALID_EMAIL_CATEGORIES:
            if category != "primary":
                assert data[category] == 0

    def test_get_category_counts_empty(self, client_with_auth, db_session):
        """Test getting category counts when no emails exist."""
        from app.core.constants import VALID_EMAIL_CATEGORIES

        client, token, user = client_with_auth

        response = client.get(
            "/api/v1/emails/stats/category-counts",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        data = response.json()["data"]

        # All categories should exist with 0 count
        for category in VALID_EMAIL_CATEGORIES:
            assert category in data
            assert data[category] == 0

    def test_get_category_counts_filter_by_folder(self, client_with_auth, db_session):
        """Test filtering category counts by folder."""
        client, token, user = client_with_auth

        # Create another user as sender
        other_user = User(
            first_name="Other", last_name="User",
            email="other@example.com", role="user", active=True
        )
        db_session.add(other_user)
        db_session.flush()

        # Create emails in different folders
        # Inbox email: user is a recipient (not sender)
        email_inbox = Email(
            subject="Inbox Email",
            body="Content",
            status="received",
            category="primary",
            sender_id=other_user.id,
            folder=FolderType.INBOX.value
        )
        email_sent = Email(
            subject="Sent Email",
            body="Content",
            status="sent",
            category="primary",
            sender_id=user.id,
            folder=FolderType.SENT.value
        )
        db_session.add_all([email_inbox, email_sent])
        db_session.flush()

        # Add user as recipient of inbox email
        recipient = EmailRecipient(
            email_id=email_inbox.id,
            recipient_id=user.id,
            recipient_email=user.email,
            recipient_name=user.first_name,
            recipient_type="to"
        )
        db_session.add(recipient)
        db_session.commit()

        # Filter by inbox
        response = client.get(
            "/api/v1/emails/stats/category-counts?folder=inbox",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        data = response.json()["data"]

        assert data["primary"] == 1

    def test_get_category_counts_filter_by_is_read(self, client_with_auth, db_session):
        """Test filtering category counts by read status."""
        client, token, user = client_with_auth

        # Create read and unread emails
        email_read = Email(
            subject="Read Email",
            body="Content",
            status="received",
            category="primary",
            is_read=True,
            sender_id=user.id,
            folder=FolderType.INBOX.value
        )
        email_unread1 = Email(
            subject="Unread Email 1",
            body="Content",
            status="received",
            category="primary",
            is_read=False,
            sender_id=user.id,
            folder=FolderType.INBOX.value
        )
        email_unread2 = Email(
            subject="Unread Email 2",
            body="Content",
            status="received",
            category="promotions",
            is_read=False,
            sender_id=user.id,
            folder=FolderType.INBOX.value
        )
        db_session.add_all([email_read, email_unread1, email_unread2])
        db_session.commit()

        # Filter by unread
        response = client.get(
            "/api/v1/emails/stats/category-counts?is_read=false",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        data = response.json()["data"]

        assert data["primary"] == 1
        assert data["promotions"] == 1

    def test_get_category_counts_filter_by_starred(self, client_with_auth, db_session):
        """Test filtering category counts by starred status."""
        client, token, user = client_with_auth

        # Create starred and non-starred emails
        email_starred1 = Email(
            subject="Starred Email 1",
            body="Content",
            status="received",
            category="primary",
            is_starred=True,
            sender_id=user.id,
            folder=FolderType.INBOX.value
        )
        email_starred2 = Email(
            subject="Starred Email 2",
            body="Content",
            status="received",
            category="social",
            is_starred=True,
            sender_id=user.id,
            folder=FolderType.INBOX.value
        )
        email_not_starred = Email(
            subject="Not Starred Email",
            body="Content",
            status="received",
            category="primary",
            is_starred=False,
            sender_id=user.id,
            folder=FolderType.INBOX.value
        )
        db_session.add_all([email_starred1, email_starred2, email_not_starred])
        db_session.commit()

        # Filter by starred
        response = client.get(
            "/api/v1/emails/stats/category-counts?is_starred=true",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        data = response.json()["data"]

        assert data["primary"] == 1
        assert data["social"] == 1

    def test_get_category_counts_combined_filters(self, client_with_auth, db_session):
        """Test category counts with multiple filters combined."""
        client, token, user = client_with_auth

        # Create another user as sender for inbox emails
        other_user = User(
            first_name="Other", last_name="User",
            email="other2@example.com", role="user", active=True
        )
        db_session.add(other_user)
        db_session.flush()

        # Create various emails - inbox emails have other_user as sender
        email1 = Email(
            subject="Email 1",
            body="Content",
            status="received",
            category="primary",
            is_read=False,
            is_starred=True,
            sender_id=other_user.id,
            folder=FolderType.INBOX.value
        )
        email2 = Email(
            subject="Email 2",
            body="Content",
            status="received",
            category="primary",
            is_read=False,
            is_starred=False,
            sender_id=other_user.id,
            folder=FolderType.INBOX.value
        )
        email3 = Email(
            subject="Email 3",
            body="Content",
            status="received",
            category="promotions",
            is_read=False,
            is_starred=True,
            sender_id=other_user.id,
            folder=FolderType.INBOX.value
        )
        email4 = Email(
            subject="Email 4",
            body="Content",
            status="sent",
            category="primary",
            is_read=True,
            is_starred=True,
            sender_id=user.id,
            folder=FolderType.SENT.value
        )
        db_session.add_all([email1, email2, email3, email4])
        db_session.flush()

        # Add user as recipient of inbox emails
        for email in [email1, email2, email3]:
            recipient = EmailRecipient(
                email_id=email.id,
                recipient_id=user.id,
                recipient_email=user.email,
                recipient_name=user.first_name,
                recipient_type="to"
            )
            db_session.add(recipient)
        db_session.commit()

        # Filter by inbox + unread + starred
        response = client.get(
            "/api/v1/emails/stats/category-counts?folder=inbox&is_read=false&is_starred=true",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        data = response.json()["data"]

        # email1 and email3
        assert data["primary"] == 1
        assert data["promotions"] == 1

    def test_get_category_counts_unauthenticated(self, client):
        """Test getting category counts without authentication fails."""
        response = client.get("/api/v1/emails/stats/category-counts")

        assert response.status_code == 401

    def test_get_category_counts_only_shows_user_emails(self, client_with_auth, db_session):
        """Test that category counts only include user's own emails."""
        client, token, user = client_with_auth

        # Create another user
        other_user = User(
            first_name="Other",
            last_name="User",
            email="other@example.com",
            role="user"
        )
        db_session.add(other_user)
        db_session.commit()

        # Create email for current user
        email_user = Email(
            subject="User Email",
            body="Content",
            status="received",
            category="primary",
            sender_id=user.id,
            folder=FolderType.INBOX.value
        )

        # Create email for other user (should not be counted)
        email_other = Email(
            subject="Other User Email",
            body="Content",
            status="received",
            category="primary",
            sender_id=other_user.id,
            folder=FolderType.INBOX.value
        )

        db_session.add_all([email_user, email_other])
        db_session.commit()

        # Get counts for current user
        response = client.get(
            "/api/v1/emails/stats/category-counts",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        data = response.json()["data"]

        # Only user's email
        assert data["primary"] == 1

    def test_get_category_counts_includes_received_emails(self, client_with_auth, db_session):
        """Test that category counts include emails received by user."""
        client, token, user = client_with_auth

        # Create another user as sender
        sender = User(
            first_name="Sender",
            last_name="User",
            email="sender@example.com",
            role="user"
        )
        db_session.add(sender)
        db_session.commit()

        # Create email sent from sender to current user
        email = Email(
            subject="Received Email",
            body="Content",
            status="received",
            category="social",
            sender_id=sender.id,
            folder=FolderType.INBOX.value
        )
        db_session.add(email)
        db_session.commit()

        # Add current user as recipient
        recipient = EmailRecipient(
            email_id=email.id,
            recipient_id=user.id,
            recipient_email=user.email,
            recipient_type="to"
        )
        db_session.add(recipient)
        db_session.commit()

        # Get counts - should include received email
        response = client.get(
            "/api/v1/emails/stats/category-counts",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        data = response.json()["data"]

        assert data["social"] == 1

    def test_get_category_counts_all_keys_present(self, client_with_auth, db_session):
        """Test that all category keys are present in response."""
        from app.core.constants import VALID_EMAIL_CATEGORIES

        client, token, user = client_with_auth

        response = client.get(
            "/api/v1/emails/stats/category-counts",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        data = response.json()["data"]

        # Verify all category keys from VALID_EMAIL_CATEGORIES are present
        expected_keys = set(VALID_EMAIL_CATEGORIES)
        assert set(data.keys()) == expected_keys

        # Verify all values are integers
        for key, value in data.items():
            assert isinstance(value, int)
            assert value >= 0  # Counts should be non-negative


class TestScheduledFolder:
    """Test scheduled folder functionality for emails waiting to be sent."""

    def test_list_emails_filter_by_scheduled_folder(self, client_with_auth, db_session):
        """Test filtering emails by scheduled folder."""
        client, token, user = client_with_auth
        
        # Create emails in different folders
        scheduled_email = Email(
            subject="Scheduled Email",
            body="Content",
            status="queued",
            folder=FolderType.SCHEDULED.value,
            sender_id=user.id,
            scheduled_send_at=datetime.now(UTC) + timedelta(seconds=30)
        )
        inbox_email = Email(
            subject="Inbox Email",
            body="Content",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=user.id
        )
        db_session.add_all([scheduled_email, inbox_email])
        db_session.commit()
        
        response = client.get(
            "/api/v1/emails?folder=scheduled",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        # All returned emails should be in scheduled folder
        for email in data["results"]:
            assert email["folder"] == "scheduled"

    def test_queued_email_goes_to_scheduled_folder(self, client_with_auth, db_session, sample_draft_email):
        """Test that sending a draft with undo_send enabled puts email in scheduled folder."""
        client, token, user = client_with_auth
        
        # Enable undo send (10 second delay)
        user.undo_send_delay_seconds = 10
        db_session.commit()
        
        response = client.post(
            f"/api/v1/emails/{sample_draft_email.id}/send",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        # Email should be in scheduled folder when queued
        assert data["folder"] == "scheduled"
        assert data["can_undo_send"] == True
        assert data["scheduled_send_at"] is not None

    def test_confirm_send_moves_from_scheduled_to_sent(self, client_with_auth, db_session):
        """Test that confirming send moves email from scheduled to sent folder."""
        client, token, user = client_with_auth
        
        # Create a queued email in scheduled folder
        email = Email(
            subject="Queued Email",
            body="Content",
            status="queued",
            folder=FolderType.SCHEDULED.value,
            sender_id=user.id,
            scheduled_send_at=datetime.now(UTC) + timedelta(seconds=30)
        )
        db_session.add(email)
        db_session.commit()
        
        # Add a recipient (required for sending)
        recipient = EmailRecipient(
            email_id=email.id,
            recipient_email="test@example.com",
            recipient_type="to"
        )
        db_session.add(recipient)
        db_session.commit()
        
        response = client.post(
            f"/api/v1/emails/{email.id}/confirm-send",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        # Email should now be in sent folder
        assert data["folder"] == "sent"
        assert data["can_undo_send"] == False
        assert data["scheduled_send_at"] is None

    def test_cancel_send_moves_from_scheduled_to_drafts(self, client_with_auth, db_session):
        """Test that cancelling send moves email from scheduled to drafts folder."""
        client, token, user = client_with_auth
        
        # Create a queued email in scheduled folder
        email = Email(
            subject="Queued Email",
            body="Content",
            status="queued",
            folder=FolderType.SCHEDULED.value,
            sender_id=user.id,
            scheduled_send_at=datetime.now(UTC) + timedelta(seconds=30)
        )
        db_session.add(email)
        db_session.commit()
        
        response = client.post(
            f"/api/v1/emails/{email.id}/cancel-send",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        # Email should be back in drafts folder
        assert data["folder"] == "drafts"
        assert data["can_undo_send"] == False

    def test_restore_queued_email_from_trash_to_scheduled(self, client_with_auth, db_session):
        """Test restoring a queued email from trash returns it to scheduled folder."""
        client, token, user = client_with_auth
        
        # Create a queued email that was moved to trash
        email = Email(
            subject="Queued Email in Trash",
            body="Content",
            status="queued",
            folder=FolderType.TRASH.value,
            sender_id=user.id,
            scheduled_send_at=datetime.now(UTC) + timedelta(seconds=30)
        )
        db_session.add(email)
        db_session.commit()
        
        response = client.post(
            f"/api/v1/emails/{email.id}/restore",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        # Email should be restored to scheduled folder
        assert data["folder"] == "scheduled"

    def test_move_email_to_scheduled_folder(self, client_with_auth, db_session, sample_email):
        """Test moving an email to scheduled folder."""
        client, token, user = client_with_auth
        
        response = client.post(
            f"/api/v1/emails/{sample_email.id}/move",
            json={"folder": "scheduled"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200

    def test_scheduled_folder_in_valid_folder_types(self):
        """Test that scheduled is a valid folder type."""
        from app.core.constants import VALID_FOLDER_TYPES
        
        assert "scheduled" in VALID_FOLDER_TYPES

    def test_scheduled_in_prohibited_labels(self):
        """Test that scheduled is a prohibited label name."""
        from app.core.constants import ProhibitedLabels
        
        assert ProhibitedLabels.SCHEDULED.value == "scheduled"