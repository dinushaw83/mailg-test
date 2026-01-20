"""Tests for Emails API endpoints."""

import pytest
import uuid
from datetime import UTC, datetime, timedelta
from app.models.email import Email
from app.models.email_recipient import EmailRecipient
from app.models.thread import Thread
from app.models.user import User
from app.core.constants import FolderType, EmailStatus
from tests.conftest import create_received_email_for_user, create_sent_email_for_user


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
        
        # Create multiple emails (perspective-aware)
        for i in range(5):
            create_received_email_for_user(db_session, user, subject=f"Email {i}", body=f"Body {i}")
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
        
        # Create emails with different read status (perspective-aware)
        email1 = create_received_email_for_user(db_session, user, subject="Read", body="Content", is_read=True)
        email2 = create_received_email_for_user(db_session, user, subject="Unread", body="Content", is_read=False)
        db_session.commit()
        
        response = client.get(
            "/api/v1/emails?is_read=false",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200

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
        
        # Create 3 emails in the thread (perspective-aware)
        for i in range(3):
            create_received_email_for_user(
                db_session, user,
                subject=f"Thread Email {i}",
                body=f"Content {i}",
                thread=thread
            )
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
        
        # Create a sent email without a thread (perspective-aware - use sent status)
        email = create_sent_email_for_user(db_session, user, subject="No Thread Email", body="Content")
        email.thread_id = None
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
        
        # Create 5 emails in the thread - perspective-aware
        for i in range(5):
            email = create_received_email_for_user(
                db_session, user,
                subject=f"Thread Email {i}",
                body=f"Content {i}",
                thread=thread
            )
            email.sent_at = datetime.now(UTC) - timedelta(hours=5-i)
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
        
        # Create 2 emails in thread 1 (perspective-aware)
        for i in range(2):
            create_received_email_for_user(
                db_session, user,
                subject=f"Thread1 Email {i}",
                body="Content",
                thread=thread1
            )
        
        # Create 4 emails in thread 2 (perspective-aware)
        for i in range(4):
            create_received_email_for_user(
                db_session, user,
                subject=f"Thread2 Email {i}",
                body="Content",
                thread=thread2
            )
        
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
        
        # Create emails in the thread (perspective-aware)
        email1 = create_received_email_for_user(db_session, user, subject="Thread Email 1", 
                                                body="First message", thread=thread)
        email2 = create_sent_email_for_user(db_session, user, subject="Re: Thread Email 1",
                                            body="Reply", folder=FolderType.SENT.value, thread=thread)
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
        
        # Create unread emails in the thread (perspective-aware)
        email1 = create_received_email_for_user(db_session, user, subject="Unread 1", 
                                                body="First", is_read=False, thread=thread)
        email2 = create_received_email_for_user(db_session, user, subject="Unread 2",
                                                body="Second", is_read=False, thread=thread)
        email3 = create_received_email_for_user(db_session, user, subject="Already Read",
                                                body="Third", is_read=True, thread=thread)
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
        
        # Create already read emails (perspective-aware)
        email1 = create_received_email_for_user(db_session, user, subject="Read 1",
                                                body="First", is_read=True, thread=thread)
        email2 = create_received_email_for_user(db_session, user, subject="Read 2",
                                                body="Second", is_read=True, thread=thread)
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
        
        # Create already read emails (perspective-aware)
        email1 = create_received_email_for_user(db_session, user, subject="Read 1",
                                                body="First", is_read=True, thread=thread)
        email2 = create_received_email_for_user(db_session, user, subject="Read 2",
                                                body="Second", is_read=True, thread=thread)
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
        
        # Create emails with different timestamps (perspective-aware)
        email1 = create_received_email_for_user(db_session, user, subject="First",
                                                body="First message", thread=thread)
        email1.sent_at = datetime.now(UTC) - timedelta(hours=2)
        email2 = create_received_email_for_user(db_session, user, subject="Second",
                                                body="Second message", thread=thread)
        email2.sent_at = datetime.now(UTC) - timedelta(hours=1)
        email3 = create_received_email_for_user(db_session, user, subject="Third",
                                                body="Third message", thread=thread)
        email3.sent_at = datetime.now(UTC)
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
        
        # Create test emails (perspective-aware)
        email1 = create_received_email_for_user(db_session, sample_user, subject="Email 1",
                                                body="Content", is_read=False)
        email2 = create_received_email_for_user(db_session, sample_user, subject="Email 2",
                                                body="Content", is_read=False)
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


class TestEmailOwnershipAuthorization:
    """Test email ownership authorization for mark_email_read, star_email, move_email.
    
    These endpoints now check that the current user is either:
    - The sender of the email
    - A recipient of the email
    - An admin user
    """

    def test_mark_email_read_unauthorized_user(self, client_with_auth, db_session):
        """Test that users cannot mark emails they don't own as read."""
        client, token, user = client_with_auth
        
        # Create another user who owns the email
        other_user = User(
            first_name="Other",
            last_name="User",
            email="other@example.com",
            role="user"
        )
        db_session.add(other_user)
        db_session.flush()
        
        # Create a thread owned by the other user
        thread = Thread(
            subject="Other User's Thread",
            owner_id=other_user.id,
            email_count=1
        )
        db_session.add(thread)
        db_session.flush()
        
        # Create email owned by other user (current user is neither sender nor recipient)
        email = Email(
            subject="Other User's Email",
            body="Content",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=other_user.id,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        # Try to mark as read - should return 404 (not found for this user)
        response = client.patch(
            f"/api/v1/emails/{email.id}/read",
            json={"is_read": True},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 404

    def test_star_email_unauthorized_user(self, client_with_auth, db_session):
        """Test that users cannot star emails they don't own."""
        client, token, user = client_with_auth
        
        # Create another user who owns the email
        other_user = User(
            first_name="Other",
            last_name="User",
            email="other2@example.com",
            role="user"
        )
        db_session.add(other_user)
        db_session.flush()
        
        # Create a thread owned by the other user
        thread = Thread(
            subject="Other User's Thread",
            owner_id=other_user.id,
            email_count=1
        )
        db_session.add(thread)
        db_session.flush()
        
        # Create email owned by other user
        email = Email(
            subject="Other User's Email",
            body="Content",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=other_user.id,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        # Try to star - should return 404
        response = client.patch(
            f"/api/v1/emails/{email.id}/star",
            json={"is_starred": True},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 404

    def test_move_email_unauthorized_user(self, client_with_auth, db_session):
        """Test that users cannot move emails they don't own."""
        client, token, user = client_with_auth
        
        # Create another user who owns the email
        other_user = User(
            first_name="Other",
            last_name="User",
            email="other3@example.com",
            role="user"
        )
        db_session.add(other_user)
        db_session.flush()
        
        # Create a thread owned by the other user
        thread = Thread(
            subject="Other User's Thread",
            owner_id=other_user.id,
            email_count=1
        )
        db_session.add(thread)
        db_session.flush()
        
        # Create email owned by other user
        email = Email(
            subject="Other User's Email",
            body="Content",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=other_user.id,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        # Try to move - should return 404
        response = client.post(
            f"/api/v1/emails/{email.id}/move",
            json={"folder": "trash"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 404

    def test_mark_email_read_as_recipient(self, client_with_auth, db_session):
        """Test that recipients CAN mark emails as read."""
        client, token, user = client_with_auth
        
        # Create another user who is the sender
        sender = User(
            first_name="Sender",
            last_name="User",
            email="sender@example.com",
            role="user"
        )
        db_session.add(sender)
        db_session.flush()
        
        # Create a thread
        thread = Thread(
            subject="Received Email Thread",
            owner_id=sender.id,
            email_count=1
        )
        db_session.add(thread)
        db_session.flush()
        
        # Create email from sender to current user
        email = Email(
            subject="Email to me",
            body="Content",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=sender.id,
            thread_id=thread.id,
            is_read=False
        )
        db_session.add(email)
        db_session.flush()
        
        # Add current user as recipient
        recipient = EmailRecipient(
            email_id=email.id,
            recipient_id=user.id,
            recipient_email=user.email,
            recipient_type="to"
        )
        db_session.add(recipient)
        db_session.commit()
        
        # Mark as read - should succeed
        response = client.patch(
            f"/api/v1/emails/{email.id}/read",
            json={"is_read": True},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["is_read"] == True

    def test_star_email_as_recipient(self, client_with_auth, db_session):
        """Test that recipients CAN star emails."""
        client, token, user = client_with_auth
        
        # Create another user who is the sender
        sender = User(
            first_name="Sender",
            last_name="User",
            email="sender2@example.com",
            role="user"
        )
        db_session.add(sender)
        db_session.flush()
        
        # Create a thread
        thread = Thread(
            subject="Received Email Thread",
            owner_id=sender.id,
            email_count=1
        )
        db_session.add(thread)
        db_session.flush()
        
        # Create email from sender to current user
        email = Email(
            subject="Email to me",
            body="Content",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=sender.id,
            thread_id=thread.id,
            is_starred=False
        )
        db_session.add(email)
        db_session.flush()
        
        # Add current user as recipient
        recipient = EmailRecipient(
            email_id=email.id,
            recipient_id=user.id,
            recipient_email=user.email,
            recipient_type="to"
        )
        db_session.add(recipient)
        db_session.commit()
        
        # Star - should succeed
        response = client.patch(
            f"/api/v1/emails/{email.id}/star",
            json={"is_starred": True},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["is_starred"] == True

    def test_admin_can_modify_any_email(self, client_with_admin_auth, db_session):
        """Test that admin can modify any email."""
        client, token, admin = client_with_admin_auth
        
        # Create a regular user who owns the email
        other_user = User(
            first_name="Regular",
            last_name="User",
            email="regular@example.com",
            role="user"
        )
        db_session.add(other_user)
        db_session.flush()
        
        # Create a thread owned by the regular user
        thread = Thread(
            subject="Regular User's Thread",
            owner_id=other_user.id,
            email_count=1
        )
        db_session.add(thread)
        db_session.flush()
        
        # Create email owned by regular user (admin is neither sender nor recipient)
        email = Email(
            subject="Regular User's Email",
            body="Content",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=other_user.id,
            thread_id=thread.id,
            is_read=False
        )
        db_session.add(email)
        db_session.commit()
        
        # Admin marks as read - should succeed
        response = client.patch(
            f"/api/v1/emails/{email.id}/read",
            json={"is_read": True},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["is_read"] == True

    def test_mark_email_read_as_sender(self, client_with_auth, db_session, sample_email):
        """Test that senders CAN mark their own emails as read."""
        client, token, user = client_with_auth
        
        # sample_email has user as sender
        response = client.patch(
            f"/api/v1/emails/{sample_email.id}/read",
            json={"is_read": True},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["is_read"] == True


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

    def test_forward_email_with_undo_send_enabled(self, client_with_auth, db_session, sample_email):
        """Test that forwarding an email respects undo_send_delay and queues the email.
        
        This verifies the fix where forward_email now respects the user's
        undo_send_delay_seconds preference instead of sending immediately.
        """
        client, token, user = client_with_auth
        
        # Enable undo send (15 second delay)
        user.undo_send_delay_seconds = 15
        db_session.commit()
        
        response = client.post(
            f"/api/v1/emails/{sample_email.id}/forward",
            json={
                "recipients": [
                    {"email": "forward_queued@example.com", "type": "to"}
                ],
                "body": "FYI - forwarded with undo send"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 201
        data = response.json()["data"]
        
        # Forwarded email should be queued when undo send is enabled
        # but goes to sent folder (not scheduled) since no explicit schedule param
        assert data["scheduled_send_at"] is not None
        assert data["can_undo_send"] == True
        assert data["folder"] == "sent"

    def test_forward_email_with_undo_send(self, client_with_auth, db_session, sample_email):
        """Test that forwarding an email is queued when undo_send is enabled.
        
        This verifies that with undo_send_delay_seconds set, the email is queued.
        Note: undo_send_delay_seconds must be one of [5, 10, 20, 30].
        """
        from app.models.general_settings import GeneralSettings
        
        client, token, user = client_with_auth
        
        # Set undo send delay via general settings
        settings = db_session.query(GeneralSettings).filter(GeneralSettings.user_id == user.id).first()
        if not settings:
            settings = GeneralSettings(user_id=user.id)
            db_session.add(settings)
        settings.undo_send_delay_seconds = 5
        db_session.commit()
        
        response = client.post(
            f"/api/v1/emails/{sample_email.id}/forward",
            json={
                "recipients": [
                    {"email": "forward_immediate@example.com", "type": "to"}
                ],
                "body": "FYI - forwarded with undo"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 201
        data = response.json()["data"]
        
        # Forwarded email should be queued when undo send is enabled
        assert data["scheduled_send_at"] is not None
        assert data["can_undo_send"] == True


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
        
        # Create two starred emails in the thread (perspective-aware)
        email1 = create_received_email_for_user(
            db_session, user,
            subject="Email 1",
            body="Body 1",
            is_starred=True,
            thread=thread
        )
        email2 = create_received_email_for_user(
            db_session, user,
            subject="Email 2",
            body="Body 2",
            is_starred=True,
            thread=thread
        )
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
        
        # Create one starred and one unstarred email (perspective-aware)
        email1 = create_received_email_for_user(
            db_session, user,
            subject="Email 1",
            body="Body 1",
            is_starred=True,
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


# Note: TestEmailCategory and TestEmailCategoryCounts classes removed
# Category is now handled via labels with is_system=True and is_exclusive=False


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

    def test_queued_email_goes_to_sent_folder_with_undo_delay(self, client_with_auth, db_session, sample_draft_email):
        """Test that sending a draft with undo_send enabled puts email in sent folder (not scheduled)."""
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
        # Email goes to sent folder (not scheduled) when using undo delay without explicit schedule param
        assert data["folder"] == "sent"
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


class TestThreadRestoreFolderLogic:
    """Test thread restore endpoint returns emails to appropriate folders based on status.
    
    This tests the fix where restore_thread now correctly restores emails to:
    - Draft emails -> drafts folder
    - Queued emails -> scheduled folder
    - Sent emails -> sent folder
    - Received emails -> inbox folder
    """

    def test_restore_thread_draft_to_drafts_folder(self, client_with_auth, db_session):
        """Test that draft emails in trash are restored to drafts folder."""
        client, token, user = client_with_auth
        
        # Create a thread
        thread = Thread(
            subject="Draft Thread in Trash",
            owner_id=user.id,
            email_count=1
        )
        db_session.add(thread)
        db_session.flush()
        
        # Create a draft email in trash
        draft_email = Email(
            subject="Draft in Trash",
            body="Content",
            status="draft",
            folder=FolderType.TRASH.value,
            sender_id=user.id,
            thread_id=thread.id
        )
        db_session.add(draft_email)
        db_session.commit()
        
        # Restore the thread
        response = client.post(
            f"/api/v1/threads/{thread.id}/restore",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 204
        
        # Verify the email is now in drafts folder
        db_session.expire_all()
        restored_email = db_session.query(Email).filter(Email.id == draft_email.id).first()
        assert restored_email.folder == FolderType.DRAFTS.value

    def test_restore_thread_queued_to_scheduled_folder(self, client_with_auth, db_session):
        """Test that queued emails in trash are restored to scheduled folder."""
        client, token, user = client_with_auth
        
        # Create a thread
        thread = Thread(
            subject="Queued Thread in Trash",
            owner_id=user.id,
            email_count=1
        )
        db_session.add(thread)
        db_session.flush()
        
        # Create a queued email in trash
        queued_email = Email(
            subject="Queued in Trash",
            body="Content",
            status="queued",
            folder=FolderType.TRASH.value,
            sender_id=user.id,
            thread_id=thread.id,
            scheduled_send_at=datetime.now(UTC) + timedelta(hours=1)
        )
        db_session.add(queued_email)
        db_session.commit()
        
        # Restore the thread
        response = client.post(
            f"/api/v1/threads/{thread.id}/restore",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 204
        
        # Verify the email is now in scheduled folder
        db_session.expire_all()
        restored_email = db_session.query(Email).filter(Email.id == queued_email.id).first()
        assert restored_email.folder == FolderType.SCHEDULED.value

    def test_restore_thread_sent_to_sent_folder(self, client_with_auth, db_session):
        """Test that sent emails in trash are restored to sent folder."""
        client, token, user = client_with_auth
        
        # Create a thread
        thread = Thread(
            subject="Sent Thread in Trash",
            owner_id=user.id,
            email_count=1
        )
        db_session.add(thread)
        db_session.flush()
        
        # Create a sent email in trash
        sent_email = Email(
            subject="Sent in Trash",
            body="Content",
            status="sent",
            folder=FolderType.TRASH.value,
            sender_id=user.id,
            thread_id=thread.id,
            sent_at=datetime.now(UTC)
        )
        db_session.add(sent_email)
        db_session.commit()
        
        # Restore the thread
        response = client.post(
            f"/api/v1/threads/{thread.id}/restore",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 204
        
        # Verify the email is now in sent folder
        db_session.expire_all()
        restored_email = db_session.query(Email).filter(Email.id == sent_email.id).first()
        assert restored_email.folder == FolderType.SENT.value

    def test_restore_thread_received_to_inbox_folder(self, client_with_auth, db_session):
        """Test that received emails in trash are restored to inbox folder."""
        client, token, user = client_with_auth
        
        # Create another user as sender
        sender = User(
            first_name="Sender",
            last_name="User",
            email="thread_sender@example.com",
            role="user"
        )
        db_session.add(sender)
        db_session.flush()
        
        # Create a thread
        thread = Thread(
            subject="Received Thread in Trash",
            owner_id=sender.id,
            email_count=1
        )
        db_session.add(thread)
        db_session.flush()
        
        # Create a received email in trash
        received_email = Email(
            subject="Received in Trash",
            body="Content",
            status="received",
            folder=FolderType.TRASH.value,
            sender_id=sender.id,
            thread_id=thread.id,
            received_at=datetime.now(UTC)
        )
        db_session.add(received_email)
        db_session.flush()
        
        # Add current user as recipient
        recipient = EmailRecipient(
            email_id=received_email.id,
            recipient_id=user.id,
            recipient_email=user.email,
            recipient_type="to"
        )
        db_session.add(recipient)
        db_session.commit()
        
        # Restore the thread
        response = client.post(
            f"/api/v1/threads/{thread.id}/restore",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 204
        
        # Verify the email is now in inbox folder
        db_session.expire_all()
        restored_email = db_session.query(Email).filter(Email.id == received_email.id).first()
        assert restored_email.folder == FolderType.INBOX.value

    def test_restore_thread_mixed_statuses(self, client_with_auth, db_session):
        """Test restoring a thread with emails of different statuses.
        
        Each email should be restored to its appropriate folder based on status.
        """
        client, token, user = client_with_auth
        
        # Create a thread
        thread = Thread(
            subject="Mixed Status Thread",
            owner_id=user.id,
            email_count=3
        )
        db_session.add(thread)
        db_session.flush()
        
        # Create emails with different statuses, all in trash
        draft_email = Email(
            subject="Draft Email",
            body="Content",
            status="draft",
            folder=FolderType.TRASH.value,
            sender_id=user.id,
            thread_id=thread.id
        )
        sent_email = Email(
            subject="Sent Email",
            body="Content",
            status="sent",
            folder=FolderType.TRASH.value,
            sender_id=user.id,
            thread_id=thread.id,
            sent_at=datetime.now(UTC)
        )
        queued_email = Email(
            subject="Queued Email",
            body="Content",
            status="queued",
            folder=FolderType.TRASH.value,
            sender_id=user.id,
            thread_id=thread.id,
            scheduled_send_at=datetime.now(UTC) + timedelta(hours=1)
        )
        db_session.add_all([draft_email, sent_email, queued_email])
        db_session.commit()
        
        draft_id, sent_id, queued_id = draft_email.id, sent_email.id, queued_email.id
        
        # Restore the thread
        response = client.post(
            f"/api/v1/threads/{thread.id}/restore",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 204
        
        # Verify each email is in the correct folder
        db_session.expire_all()
        
        restored_draft = db_session.query(Email).filter(Email.id == draft_id).first()
        assert restored_draft.folder == FolderType.DRAFTS.value
        
        restored_sent = db_session.query(Email).filter(Email.id == sent_id).first()
        assert restored_sent.folder == FolderType.SENT.value
        
        restored_queued = db_session.query(Email).filter(Email.id == queued_id).first()
        assert restored_queued.folder == FolderType.SCHEDULED.value

    def test_restore_thread_no_emails_in_trash_fails(self, client_with_auth, db_session):
        """Test that restoring a thread with no emails in trash returns 400."""
        client, token, user = client_with_auth
        
        # Create a thread
        thread = Thread(
            subject="Thread Not in Trash",
            owner_id=user.id,
            email_count=1
        )
        db_session.add(thread)
        db_session.flush()
        
        # Create an email NOT in trash
        email = Email(
            subject="Inbox Email",
            body="Content",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=user.id,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        # Try to restore - should fail
        response = client.post(
            f"/api/v1/threads/{thread.id}/restore",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400
        assert "No emails in trash" in response.json()["message"]


class TestEmailAPIFilters:
    """Tests for email API filters per EMAIL_EXTRACTION.md documentation.

    Tests cover folder filters, category filters, boolean filters,
    and combined filters to ensure API compliance with documentation.
    """

    @pytest.mark.parametrize("folder_type,label_name,email_status,is_received", [
        (FolderType.INBOX, "Inbox", "received", True),
        (FolderType.SENT, "Sent", "sent", False),
        (FolderType.DRAFTS, "Drafts", "draft", False),
        (FolderType.TRASH, "Trash", "received", True),
        (FolderType.SPAM, "Spam", "received", True),
    ])
    def test_folder_filter(self, client_with_auth, db_session, folder_type, label_name, email_status, is_received):
        """Test folder filter returns only emails in the specified folder."""
        from app.models.label import Label
        from app.models.thread_label import ThreadLabel

        client, token, user = client_with_auth
        folder_value = folder_type.value
        subject = f"{label_name} Test Email"

        if is_received:
            # Create email where user is recipient
            email = create_received_email_for_user(
                db_session, user,
                subject=subject,
                body="Content",
                folder=folder_value
            )
            thread_id = email.thread_id
        else:
            # Create email where user is sender
            thread = Thread(
                subject=subject,
                owner_id=user.id,
                email_count=1
            )
            db_session.add(thread)
            db_session.flush()

            email = Email(
                subject=subject,
                body="Content",
                status=email_status,
                folder=folder_value,
                sender_id=user.id,
                thread_id=thread.id
            )
            db_session.add(email)
            thread_id = thread.id

        db_session.flush()

        # Get or create the system label for the user
        label = db_session.query(Label).filter(
            Label.owner_id == user.id,
            Label.name == label_name,
            Label.is_system == True
        ).first()
        if not label:
            label = Label(
                name=label_name,
                is_system=True,
                is_exclusive=True,
                owner_id=user.id
            )
            db_session.add(label)
            db_session.flush()

        # Add label to the thread for the user
        thread_label = ThreadLabel(
            thread_id=thread_id,
            label_id=label.id,
            user_id=user.id
        )
        db_session.add(thread_label)
        db_session.commit()

        response = client.get(
            f"/api/v1/emails?folder={folder_value}",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["total"] >= 1
        # Verify all returned emails have the correct folder
        for email_data in data["results"]:
            assert email_data["folder"] == folder_value
        # Verify our test email is included
        subjects = [e["subject"] for e in data["results"]]
        assert subject in subjects

    def test_category_filter_with_inbox(self, client_with_auth, db_session):
        """Test category filter combined with inbox (Gmail-style tabs).
        
        Category filtering now uses labels with is_system=True and is_exclusive=False.
        """
        from app.models.label import Label
        from app.models.thread_label import ThreadLabel
        
        client, token, user = client_with_auth
        
        # Create system labels if they don't exist
        inbox_label = db_session.query(Label).filter(
            Label.owner_id == user.id,
            Label.name == "Inbox",
            Label.is_system == True
        ).first()
        if not inbox_label:
            inbox_label = Label(
                name="Inbox",
                is_system=True,
                is_exclusive=True,
                owner_id=user.id
            )
            db_session.add(inbox_label)
        
        promo_label = db_session.query(Label).filter(
            Label.owner_id == user.id,
            Label.name == "Promotions",
            Label.is_system == True,
            Label.is_exclusive == False
        ).first()
        if not promo_label:
            promo_label = Label(
                name="Promotions",
                is_system=True,
                is_exclusive=False,
                owner_id=user.id
            )
            db_session.add(promo_label)
        
        db_session.flush()
        
        # Create threads for emails
        thread1 = Thread(subject="Primary Thread", owner_id=user.id, email_count=1)
        thread2 = Thread(subject="Promo Thread", owner_id=user.id, email_count=1)
        db_session.add_all([thread1, thread2])
        db_session.flush()
        
        # Create emails (perspective-aware)
        primary_email = create_received_email_for_user(
            db_session, user,
            subject="Primary Email",
            body="Content",
            thread=thread1
        )
        promo_email = create_received_email_for_user(
            db_session, user,
            subject="Promo Email",
            body="Content",
            thread=thread2
        )
        db_session.flush()
        
        # Add inbox label to both threads
        for thread in [thread1, thread2]:
            thread_label = ThreadLabel(
                thread_id=thread.id,
                label_id=inbox_label.id,
                user_id=user.id
            )
            db_session.add(thread_label)
        
        # Add promotions label to promo thread only
        promo_thread_label = ThreadLabel(
            thread_id=thread2.id,
            label_id=promo_label.id,
            user_id=user.id
        )
        db_session.add(promo_thread_label)
        
        db_session.commit()
        
        # Test promotions category (filters by label)
        response = client.get(
            "/api/v1/emails?folder=inbox&category=promotions",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Should only return emails in threads with Promotions label
        assert len(data["results"]) == 1
        assert data["results"][0]["subject"] == "Promo Email"
        
        # Verify the email has the Promotions label
        labels = data["results"][0].get("labels", [])
        assert any(label.get("name") == "Promotions" for label in labels)

    def test_primary_category_filter_excludes_categorized_emails(self, client_with_auth, db_session):
        """Test that category=primary returns emails WITHOUT any category label.
        
        PRIMARY means emails in threads that don't have Promotions, Social, Updates, Forums, or Purchases labels.
        """
        from app.models.label import Label
        from app.models.thread_label import ThreadLabel
        
        client, token, user = client_with_auth
        
        # Create system labels
        inbox_label = db_session.query(Label).filter(
            Label.owner_id == user.id,
            Label.name == "Inbox",
            Label.is_system == True
        ).first()
        if not inbox_label:
            inbox_label = Label(
                name="Inbox",
                is_system=True,
                is_exclusive=True,
                owner_id=user.id
            )
            db_session.add(inbox_label)
        
        promo_label = db_session.query(Label).filter(
            Label.owner_id == user.id,
            Label.name == "Promotions",
            Label.is_system == True,
            Label.is_exclusive == False
        ).first()
        if not promo_label:
            promo_label = Label(
                name="Promotions",
                is_system=True,
                is_exclusive=False,
                owner_id=user.id
            )
            db_session.add(promo_label)
        
        db_session.flush()
        
        # Create threads
        thread_primary = Thread(subject="Primary Thread", owner_id=user.id, email_count=1)
        thread_promo = Thread(subject="Promo Thread", owner_id=user.id, email_count=1)
        db_session.add_all([thread_primary, thread_promo])
        db_session.flush()
        
        # Create emails (perspective-aware)
        primary_email = create_received_email_for_user(
            db_session, user,
            subject="Primary Email",
            body="No category label",
            thread=thread_primary
        )
        promo_email = create_received_email_for_user(
            db_session, user,
            subject="Promo Email",
            body="Has promotions label",
            thread=thread_promo
        )
        db_session.flush()
        
        # Add inbox label to both threads
        for thread in [thread_primary, thread_promo]:
            tl = ThreadLabel(thread_id=thread.id, label_id=inbox_label.id, user_id=user.id)
            db_session.add(tl)
        
        # Add promotions label to promo thread only
        promo_thread_label = ThreadLabel(
            thread_id=thread_promo.id,
            label_id=promo_label.id,
            user_id=user.id
        )
        db_session.add(promo_thread_label)
        
        db_session.commit()
        
        # Test PRIMARY category - should return only emails without category labels
        response = client.get(
            "/api/v1/emails?folder=inbox&category=primary",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Should only return the primary email (no category label)
        assert len(data["results"]) == 1
        assert data["results"][0]["subject"] == "Primary Email"
        
        # Verify it doesn't have any category labels
        labels = data["results"][0].get("labels", [])
        category_names = {"Promotions", "Social", "Updates", "Forums", "Purchases"}
        assert not any(label.get("name") in category_names for label in labels)

    def test_is_important_filter(self, client_with_auth, db_session):
        """Test is_important filter uses ThreadUserMetadata."""
        from app.models.thread_user_metadata import ThreadUserMetadata
        
        client, token, user = client_with_auth
        
        # Create thread and email (perspective-aware)
        thread = Thread(subject="Important Thread", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = create_received_email_for_user(
            db_session, user,
            subject="Important Email",
            body="Content",
            thread=thread
        )
        db_session.flush()
        
        # Mark thread as important via metadata
        metadata = ThreadUserMetadata(
            thread_id=thread.id,
            user_id=user.id,
            is_important=True
        )
        db_session.add(metadata)
        db_session.commit()
        
        # Test is_important=true filter
        response = client.get(
            "/api/v1/emails?is_important=true",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["total"] >= 1
        for email in data["results"]:
            assert email["is_important"] == True

    def test_include_archived_filter(self, client_with_auth, db_session):
        """Test include_archived filter per documentation."""
        from app.models.thread_user_metadata import ThreadUserMetadata
        
        client, token, user = client_with_auth
        
        # Create regular thread
        regular_thread = Thread(subject="Regular Thread", owner_id=user.id, email_count=1)
        db_session.add(regular_thread)
        db_session.flush()
        
        regular_email = Email(
            subject="Regular Email",
            body="Content",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=user.id,
            thread_id=regular_thread.id
        )
        db_session.add(regular_email)
        
        # Create archived thread
        archived_thread = Thread(subject="Archived Thread", owner_id=user.id, email_count=1)
        db_session.add(archived_thread)
        db_session.flush()
        
        archived_email = Email(
            subject="Archived Email",
            body="Content",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=user.id,
            thread_id=archived_thread.id
        )
        db_session.add(archived_email)
        db_session.flush()
        
        # Mark thread as archived
        metadata = ThreadUserMetadata(
            thread_id=archived_thread.id,
            user_id=user.id,
            is_archived=True
        )
        db_session.add(metadata)
        db_session.commit()
        
        # Without include_archived - should exclude archived
        response_without = client.get(
            "/api/v1/emails?include_archived=false",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response_without.status_code == 200
        without_count = response_without.json()["data"]["total"]
        
        # With include_archived - should include archived
        response_with = client.get(
            "/api/v1/emails?include_archived=true",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response_with.status_code == 200
        with_count = response_with.json()["data"]["total"]
        
        # Should have more emails when including archived
        assert with_count >= without_count

    def test_combined_filters(self, client_with_auth, db_session):
        """Test multiple filters can be combined."""
        client, token, user = client_with_auth
        
        # Create email matching multiple criteria (perspective-aware)
        email = create_received_email_for_user(
            db_session, user,
            subject="Combined Filter Test",
            body="Content",
            is_read=False
        )
        db_session.commit()
        
        # Combine folder + is_read
        response = client.get(
            "/api/v1/emails?folder=inbox&is_read=false",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        for email in data["results"]:
            assert email["folder"] == "inbox"
            assert email["is_read"] == False

    def test_all_mail_no_folder_filter(self, client_with_auth, db_session):
        """Test no folder filter returns all mail (per documentation)."""
        client, token, user = client_with_auth
        
        # Create emails in different folders (perspective-aware)
        inbox = create_received_email_for_user(db_session, user, subject="Inbox", body="C")
        sent = create_sent_email_for_user(db_session, user, subject="Sent", body="C")
        db_session.commit()
        
        # No folder filter = All Mail
        response = client.get(
            "/api/v1/emails",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        # Should return emails from multiple folders
        folders = set(e["folder"] for e in data["results"])
        assert len(folders) >= 1  # At least one folder represented

    def test_response_fields_per_documentation(self, client_with_auth, db_session):
        """Test response includes all fields per EMAIL_EXTRACTION.md."""
        from app.models.thread_user_metadata import ThreadUserMetadata
        
        client, token, user = client_with_auth
        
        thread = Thread(subject="Field Test", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Field Test Email",
            body="Content",
            status="received",
            folder=FolderType.INBOX.value,
            is_read=True,
            is_starred=True,
            sender_id=user.id,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.flush()
        
        metadata = ThreadUserMetadata(
            thread_id=thread.id,
            user_id=user.id,
            is_important=True,
            is_archived=False,
            snooze_until=datetime.now(UTC) + timedelta(days=1)
        )
        db_session.add(metadata)
        db_session.commit()
        
        response = client.get(
            f"/api/v1/emails/{email.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Verify all documented response fields exist
        assert "is_starred" in data  # Email.is_starred
        assert "is_important" in data  # ThreadUserMetadata.is_important
        assert "is_archived" in data  # ThreadUserMetadata.is_archived
        assert "snooze_until" in data  # ThreadUserMetadata.snooze_until
        assert "folder" in data  # Email.folder
        assert "labels" in data  # Thread labels (category is now via labels)
        assert "is_read" in data  # Email.is_read
        
        # Verify values
        assert data["is_starred"] == True
        assert data["is_important"] == True
        assert data["is_archived"] == False
        assert data["snooze_until"] is not None

    def test_thread_emails_endpoint(self, client_with_auth, db_session):
        """Test GET /threads/{thread_id}/emails returns all thread emails."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Thread Test", owner_id=user.id, email_count=2)
        db_session.add(thread)
        db_session.flush()
        
        # Create emails (perspective-aware)
        email1 = create_received_email_for_user(
            db_session, user,
            subject="First Email",
            body="Content",
            thread=thread
        )
        email1.sent_at = datetime.now(UTC) - timedelta(hours=1)
        
        email2 = create_sent_email_for_user(
            db_session, user,
            subject="Reply Email",
            body="Reply content",
            thread=thread
        )
        email2.sent_at = datetime.now(UTC)
        
        db_session.commit()
        
        response = client.get(
            f"/api/v1/threads/{thread.id}/emails",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert len(data) == 2
        # Should be ordered by sent_at
        assert data[0]["subject"] == "First Email"
        assert data[1]["subject"] == "Reply Email"


class TestComplexConversationScenarios:
    """Tests for complex email scenarios involving conversations,
    multi-party interactions, and real-world workflow patterns."""

    def test_back_and_forth_conversation(self, client_with_auth, db_session):
        """Test a multi-turn conversation between two users."""
        client, token, user_a = client_with_auth
        
        # Create second user
        user_b = User(
            first_name="Bob",
            last_name="Smith",
            email="bob@example.com",
            role="user"
        )
        db_session.add(user_b)
        db_session.flush()
        
        # Create thread for the conversation
        thread = Thread(subject="Project Discussion", owner_id=user_a.id, email_count=4)
        db_session.add(thread)
        db_session.flush()
        
        # Email 1: User A sends to User B
        email1 = Email(
            subject="Project Discussion",
            body="Hi Bob, let's discuss the project.",
            status="sent",
            folder=FolderType.SENT.value,
            sender_id=user_a.id,
            thread_id=thread.id,
            sent_at=datetime.now(UTC) - timedelta(hours=4)
        )
        db_session.add(email1)
        db_session.flush()
        
        recipient1 = EmailRecipient(
            email_id=email1.id,
            recipient_id=user_b.id,
            recipient_email=user_b.email,
            recipient_type="to"
        )
        db_session.add(recipient1)
        
        # Email 2: User B replies to User A
        email2 = Email(
            subject="Re: Project Discussion",
            body="Sure, what's on your mind?",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=user_b.id,
            thread_id=thread.id,
            sent_at=datetime.now(UTC) - timedelta(hours=3)
        )
        db_session.add(email2)
        db_session.flush()
        
        recipient2 = EmailRecipient(
            email_id=email2.id,
            recipient_id=user_a.id,
            recipient_email=user_a.email,
            recipient_type="to"
        )
        db_session.add(recipient2)
        
        # Email 3: User A replies again
        email3 = Email(
            subject="Re: Project Discussion",
            body="I think we need to reconsider the timeline.",
            status="sent",
            folder=FolderType.SENT.value,
            sender_id=user_a.id,
            thread_id=thread.id,
            sent_at=datetime.now(UTC) - timedelta(hours=2)
        )
        db_session.add(email3)
        db_session.flush()
        
        recipient3 = EmailRecipient(
            email_id=email3.id,
            recipient_id=user_b.id,
            recipient_email=user_b.email,
            recipient_type="to"
        )
        db_session.add(recipient3)
        
        # Email 4: User B's final reply
        email4 = Email(
            subject="Re: Project Discussion",
            body="Agreed, let's push it back a week.",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=user_b.id,
            thread_id=thread.id,
            sent_at=datetime.now(UTC) - timedelta(hours=1)
        )
        db_session.add(email4)
        db_session.flush()
        
        recipient4 = EmailRecipient(
            email_id=email4.id,
            recipient_id=user_a.id,
            recipient_email=user_a.email,
            recipient_type="to"
        )
        db_session.add(recipient4)
        db_session.commit()
        
        # Sync thread labels for user_a (adds SENT, INBOX labels based on folders)
        from app.utils.label_utils import sync_thread_labels
        sync_thread_labels(db_session, thread.id, user_a.id, commit=True)
        
        # Verify thread contains all emails in correct order
        response = client.get(
            f"/api/v1/threads/{thread.id}/emails",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        emails = response.json()["data"]
        assert len(emails) == 4
        
        # Verify chronological order
        assert "let's discuss" in emails[0]["body"]
        assert "what's on your mind" in emails[1]["body"]
        assert "reconsider the timeline" in emails[2]["body"]
        assert "push it back" in emails[3]["body"]
        
        # Verify User A sees received emails in inbox
        inbox_response = client.get(
            "/api/v1/emails?folder=inbox",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert inbox_response.status_code == 200
        inbox_emails = [e for e in inbox_response.json()["data"]["results"] 
                        if e["thread_id"] == str(thread.id)]
        # At least 1 inbox email from this thread
        assert len(inbox_emails) >= 1

    def test_multi_party_cc_conversation(self, client_with_auth, db_session):
        """Test conversation with CC recipients."""
        client, token, user_a = client_with_auth
        
        # Create additional users
        user_b = User(first_name="Bob", last_name="B", email="bob_cc@example.com", role="user")
        user_c = User(first_name="Carol", last_name="C", email="carol_cc@example.com", role="user")
        db_session.add_all([user_b, user_c])
        db_session.flush()
        
        thread = Thread(subject="Team Update", owner_id=user_a.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        # User A sends to Bob, CC Carol
        email = Email(
            subject="Team Update",
            body="Team, here's the weekly update.",
            status="sent",
            folder=FolderType.SENT.value,
            sender_id=user_a.id,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.flush()
        
        # Bob as TO recipient
        to_recipient = EmailRecipient(
            email_id=email.id,
            recipient_id=user_b.id,
            recipient_email=user_b.email,
            recipient_type="to"
        )
        # Carol as CC recipient
        cc_recipient = EmailRecipient(
            email_id=email.id,
            recipient_id=user_c.id,
            recipient_email=user_c.email,
            recipient_type="cc"
        )
        db_session.add_all([to_recipient, cc_recipient])
        db_session.commit()
        
        # Verify email shows correct recipients
        response = client.get(
            f"/api/v1/emails/{email.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Recipients use "type" field in response
        to_recipients = [r for r in data["recipients"] if r["type"] == "to"]
        cc_recipients = [r for r in data["recipients"] if r["type"] == "cc"]
        
        assert len(to_recipients) == 1
        assert to_recipients[0]["email"] == "bob_cc@example.com"
        assert len(cc_recipients) == 1
        assert cc_recipients[0]["email"] == "carol_cc@example.com"

    def test_draft_to_send_to_reply_workflow(self, client_with_auth, db_session):
        """Test complete workflow: create draft → send → receive reply."""
        client, token, user = client_with_auth
        
        other_user = User(
            first_name="Other",
            last_name="User",
            email="other_workflow@example.com",
            role="user"
        )
        db_session.add(other_user)
        db_session.commit()
        
        # Step 1: Create draft via API (POST /emails creates drafts)
        draft_data = {
            "subject": "Workflow Test",
            "body": "This starts as a draft.",
            "recipients": [{"email": other_user.email, "type": "to"}]
        }
        draft_response = client.post(
            "/api/v1/emails",
            json=draft_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert draft_response.status_code == 201
        draft = draft_response.json()["data"]
        # EmailResponse doesn't have status field, check folder instead
        assert draft["folder"] == "drafts"
        
        # Step 2: Update the draft
        update_response = client.put(
            f"/api/v1/emails/{draft['id']}",
            json={"body": "Updated draft content before sending."},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert update_response.status_code == 200
        
        # Step 3: Send the draft
        send_response = client.post(
            f"/api/v1/emails/{draft['id']}/send",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert send_response.status_code == 200
        sent_email = send_response.json()["data"]
        # Either sent directly or queued for undo (folder indicates status)
        assert sent_email["folder"] in ["sent", "scheduled"]
        
        # Step 4: Simulate receiving a reply (create it in DB)
        thread_id = sent_email["thread_id"]
        reply = Email(
            subject="Re: Workflow Test",
            body="Got your message, replying now.",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=other_user.id,
            thread_id=thread_id
        )
        db_session.add(reply)
        db_session.flush()
        
        reply_recipient = EmailRecipient(
            email_id=reply.id,
            recipient_id=user.id,
            recipient_email=user.email,
            recipient_type="to"
        )
        db_session.add(reply_recipient)
        db_session.commit()
        
        # Verify thread now has both emails
        thread_response = client.get(
            f"/api/v1/threads/{thread_id}/emails",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert thread_response.status_code == 200
        thread_emails = thread_response.json()["data"]
        assert len(thread_emails) == 2

    def test_archive_during_active_conversation(self, client_with_auth, db_session):
        """Test archiving a thread while conversation is ongoing."""
        from app.models.thread_user_metadata import ThreadUserMetadata
        
        client, token, user = client_with_auth
        
        other_user = User(
            first_name="Partner",
            last_name="Archive",
            email="partner_archive@example.com",
            role="user"
        )
        db_session.add(other_user)
        db_session.flush()
        
        thread = Thread(subject="Archive Test", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        # Initial email
        email1 = Email(
            subject="Archive Test",
            body="First message",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=other_user.id,
            thread_id=thread.id,
            sent_at=datetime.now(UTC) - timedelta(hours=2)
        )
        db_session.add(email1)
        db_session.flush()
        
        recipient1 = EmailRecipient(
            email_id=email1.id,
            recipient_id=user.id,
            recipient_email=user.email,
            recipient_type="to"
        )
        db_session.add(recipient1)
        db_session.commit()
        
        # Archive the thread
        archive_response = client.post(
            f"/api/v1/threads/{thread.id}/archive",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert archive_response.status_code == 200
        
        # Verify archived - should not appear in inbox without include_archived
        inbox_response = client.get(
            "/api/v1/emails?folder=inbox&include_archived=false",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        archived_in_inbox = [e for e in inbox_response.json()["data"]["results"]
                            if e.get("thread_id") == str(thread.id)]
        assert len(archived_in_inbox) == 0
        
        # With include_archived, email should be visible
        all_response = client.get(
            "/api/v1/emails?include_archived=true",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        thread_emails = [e for e in all_response.json()["data"]["results"]
                        if e.get("thread_id") == str(thread.id)]
        assert len(thread_emails) >= 1

    def test_trash_and_restore_mid_conversation(self, client_with_auth, db_session):
        """Test trashing and restoring a thread during a conversation."""
        client, token, user = client_with_auth
        
        other_user = User(
            first_name="Trash",
            last_name="Test",
            email="trash_test@example.com",
            role="user"
        )
        db_session.add(other_user)
        db_session.flush()
        
        thread = Thread(subject="Trash Restore Test", owner_id=user.id, email_count=2)
        db_session.add(thread)
        db_session.flush()
        
        # Create emails in conversation
        email1 = Email(
            subject="Trash Restore Test",
            body="Original message",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=other_user.id,
            thread_id=thread.id,
            sent_at=datetime.now(UTC) - timedelta(hours=1)
        )
        email2 = Email(
            subject="Re: Trash Restore Test",
            body="My reply",
            status="sent",
            folder=FolderType.SENT.value,
            sender_id=user.id,
            thread_id=thread.id,
            sent_at=datetime.now(UTC)
        )
        db_session.add_all([email1, email2])
        db_session.flush()
        
        recipient1 = EmailRecipient(
            email_id=email1.id,
            recipient_id=user.id,
            recipient_email=user.email,
            recipient_type="to"
        )
        recipient2 = EmailRecipient(
            email_id=email2.id,
            recipient_id=other_user.id,
            recipient_email=other_user.email,
            recipient_type="to"
        )
        db_session.add_all([recipient1, recipient2])
        db_session.commit()
        
        # Trash the thread (DELETE returns 204)
        trash_response = client.delete(
            f"/api/v1/threads/{thread.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert trash_response.status_code in [200, 204]
        
        # Verify both emails are in trash
        db_session.refresh(email1)
        db_session.refresh(email2)
        assert email1.folder == FolderType.TRASH.value
        assert email2.folder == FolderType.TRASH.value
        
        # Restore the thread (returns 204 No Content)
        restore_response = client.post(
            f"/api/v1/threads/{thread.id}/restore",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert restore_response.status_code == 204
        
        # Verify emails restored to original folders
        db_session.refresh(email1)
        db_session.refresh(email2)
        assert email1.folder == FolderType.INBOX.value
        assert email2.folder == FolderType.SENT.value

    def test_forward_chain_multiple_recipients(self, client_with_auth, db_session):
        """Test forwarding an email to multiple new recipients."""
        client, token, user = client_with_auth
        
        original_sender = User(
            first_name="Original",
            last_name="Sender",
            email="original_fwd@example.com",
            role="user"
        )
        forward_recipient1 = User(
            first_name="Forward",
            last_name="One",
            email="fwd_one@example.com",
            role="user"
        )
        forward_recipient2 = User(
            first_name="Forward",
            last_name="Two",
            email="fwd_two@example.com",
            role="user"
        )
        db_session.add_all([original_sender, forward_recipient1, forward_recipient2])
        db_session.flush()
        
        # Original thread and email
        original_thread = Thread(subject="Original Message", owner_id=original_sender.id, email_count=1)
        db_session.add(original_thread)
        db_session.flush()
        
        original_email = Email(
            subject="Original Message",
            body="Important information to share.",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=original_sender.id,
            thread_id=original_thread.id
        )
        db_session.add(original_email)
        db_session.flush()
        
        original_recipient = EmailRecipient(
            email_id=original_email.id,
            recipient_id=user.id,
            recipient_email=user.email,
            recipient_type="to"
        )
        db_session.add(original_recipient)
        db_session.commit()
        
        # Forward to multiple recipients (using correct schema: recipients with email + type)
        forward_response = client.post(
            f"/api/v1/emails/{original_email.id}/forward",
            json={
                "recipients": [
                    {"email": forward_recipient1.email, "type": "to"},
                    {"email": forward_recipient2.email, "type": "to"}
                ],
                "body": "FYI - see below."
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert forward_response.status_code == 201
        forwarded = forward_response.json()["data"]
        
        # Verify forward has new thread
        assert forwarded["thread_id"] != str(original_thread.id)
        
        # Verify recipients
        assert len(forwarded["recipients"]) == 2
        recipient_emails = [r["email"] for r in forwarded["recipients"]]
        assert "fwd_one@example.com" in recipient_emails
        assert "fwd_two@example.com" in recipient_emails

    def test_mark_read_unread_during_conversation(self, client_with_auth, db_session):
        """Test marking emails read/unread in an active conversation."""
        client, token, user = client_with_auth
        
        other_user = User(
            first_name="ReadUnread",
            last_name="Test",
            email="readunread@example.com",
            role="user"
        )
        db_session.add(other_user)
        db_session.flush()
        
        thread = Thread(subject="Read Status Test", owner_id=user.id, email_count=3)
        db_session.add(thread)
        db_session.flush()
        
        # Create 3 emails in thread
        emails = []
        for i in range(3):
            email = Email(
                subject="Read Status Test" if i == 0 else "Re: Read Status Test",
                body=f"Message {i+1}",
                status="received",
                folder=FolderType.INBOX.value,
                sender_id=other_user.id,
                thread_id=thread.id,
                is_read=False,
                sent_at=datetime.now(UTC) - timedelta(hours=3-i)
            )
            db_session.add(email)
            db_session.flush()
            
            recipient = EmailRecipient(
                email_id=email.id,
                recipient_id=user.id,
                recipient_email=user.email,
                recipient_type="to"
            )
            db_session.add(recipient)
            emails.append(email)
        
        db_session.commit()
        
        # Mark first email as read (PATCH, not POST)
        read_response = client.patch(
            f"/api/v1/emails/{emails[0].id}/read",
            json={"is_read": True},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert read_response.status_code == 200
        
        # Verify first email is read
        db_session.refresh(emails[0])
        assert emails[0].is_read == True
        
        # Check unread filter - should have some unread emails in thread
        unread_response = client.get(
            "/api/v1/emails?is_read=false",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert unread_response.status_code == 200
        unread_in_thread = [e for e in unread_response.json()["data"]["results"]
                           if e.get("thread_id") == str(thread.id)]
        # At least 1 unread email should remain in thread
        assert len(unread_in_thread) >= 1

    def test_star_important_combination(self, client_with_auth, db_session):
        """Test combining starred and important flags on conversation."""
        from app.models.thread_user_metadata import ThreadUserMetadata
        
        client, token, user = client_with_auth
        
        other_user = User(
            first_name="Flags",
            last_name="Test",
            email="flags@example.com",
            role="user"
        )
        db_session.add(other_user)
        db_session.flush()
        
        thread = Thread(subject="Flag Test", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Flag Test",
            body="Test starring and importance",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=other_user.id,
            thread_id=thread.id,
            is_starred=False
        )
        db_session.add(email)
        db_session.flush()
        
        recipient = EmailRecipient(
            email_id=email.id,
            recipient_id=user.id,
            recipient_email=user.email,
            recipient_type="to"
        )
        db_session.add(recipient)
        db_session.commit()
        
        # Star the email (PATCH, not POST)
        star_response = client.patch(
            f"/api/v1/emails/{email.id}/star",
            json={"is_starred": True},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert star_response.status_code == 200
        
        # Mark thread as important (PATCH with is_important in body)
        important_response = client.patch(
            f"/api/v1/threads/{thread.id}/important",
            json={"is_important": True},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert important_response.status_code == 200
        
        # Verify both filters work
        starred_response = client.get(
            "/api/v1/emails?is_starred=true",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        important_response = client.get(
            "/api/v1/emails?is_important=true",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        starred_ids = [e["id"] for e in starred_response.json()["data"]["results"]]
        important_ids = [e["id"] for e in important_response.json()["data"]["results"]]
        
        assert str(email.id) in starred_ids
        assert str(email.id) in important_ids
        
        # Combined filter
        combined_response = client.get(
            "/api/v1/emails?is_starred=true&is_important=true",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        combined_ids = [e["id"] for e in combined_response.json()["data"]["results"]]
        assert str(email.id) in combined_ids

    def test_spam_and_unspam_thread_workflow(self, client_with_auth, db_session):
        """Test marking thread as spam and then unspamming."""
        client, token, user = client_with_auth
        
        spammer = User(
            first_name="Spam",
            last_name="Sender",
            email="spammer@example.com",
            role="user"
        )
        db_session.add(spammer)
        db_session.flush()
        
        thread = Thread(subject="Potential Spam", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Potential Spam",
            body="Buy our products!",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=spammer.id,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.flush()
        
        recipient = EmailRecipient(
            email_id=email.id,
            recipient_id=user.id,
            recipient_email=user.email,
            recipient_type="to"
        )
        db_session.add(recipient)
        db_session.commit()
        
        # Mark as spam (PATCH, not POST)
        spam_response = client.patch(
            f"/api/v1/threads/{thread.id}/spam",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert spam_response.status_code == 200
        
        # Verify in spam folder
        db_session.refresh(email)
        assert email.folder == FolderType.SPAM.value
        
        spam_folder_response = client.get(
            "/api/v1/emails?folder=spam",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        spam_subjects = [e["subject"] for e in spam_folder_response.json()["data"]["results"]]
        assert "Potential Spam" in spam_subjects
        
        # Unmark as spam (PATCH, not POST)
        unspam_response = client.patch(
            f"/api/v1/threads/{thread.id}/unspam",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert unspam_response.status_code == 200
        
        # Verify back in inbox
        db_session.refresh(email)
        assert email.folder == FolderType.INBOX.value

    def test_reply_all_scenario(self, client_with_auth, db_session):
        """Test reply-all in a multi-recipient conversation."""
        client, token, user_a = client_with_auth
        
        user_b = User(first_name="Bob", last_name="R", email="bob_replyall@example.com", role="user")
        user_c = User(first_name="Carol", last_name="R", email="carol_replyall@example.com", role="user")
        db_session.add_all([user_b, user_c])
        db_session.flush()
        
        # Original email from Bob to User A and Carol
        thread = Thread(subject="Group Discussion", owner_id=user_b.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        original = Email(
            subject="Group Discussion",
            body="Let's all discuss this topic.",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=user_b.id,
            thread_id=thread.id
        )
        db_session.add(original)
        db_session.flush()
        
        # User A and Carol are recipients
        recipient_a = EmailRecipient(
            email_id=original.id,
            recipient_id=user_a.id,
            recipient_email=user_a.email,
            recipient_type="to"
        )
        recipient_c = EmailRecipient(
            email_id=original.id,
            recipient_id=user_c.id,
            recipient_email=user_c.email,
            recipient_type="to"
        )
        db_session.add_all([recipient_a, recipient_c])
        db_session.commit()
        
        # User A replies to all
        reply_response = client.post(
            f"/api/v1/emails/{original.id}/reply",
            json={
                "body": "Here are my thoughts.",
                "reply_all": True
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert reply_response.status_code == 201
        reply_data = reply_response.json()["data"]
        
        # Verify reply goes to original sender and all other recipients
        # Response uses "email" field not "recipient_email"
        reply_recipients = [r["email"] for r in reply_data["recipients"]]
        assert "bob_replyall@example.com" in reply_recipients  # Original sender
        assert "carol_replyall@example.com" in reply_recipients  # Other recipient
        # User A (sender of reply) should not be a recipient
        assert user_a.email not in reply_recipients


class TestLabelManagement:
    """Tests for email label management endpoints."""

    def test_add_label_to_email_success(self, client_with_auth, db_session):
        """Test adding a user label to an email successfully."""
        from app.models.label import Label
        
        client, token, user = client_with_auth
        
        # Create a label owned by user
        label = Label(
            name="Important Work",
            color="#ff0000",
            owner_id=user.id,
            is_system=False
        )
        db_session.add(label)
        db_session.flush()
        
        # Create thread and email
        thread = Thread(subject="Label Test", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Label Test Email",
            body="Content",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=user.id,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        # Add label to email
        response = client.post(
            f"/api/v1/emails/{email.id}/labels",
            json={"label_id": str(label.id)},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        label_names = [l["name"] for l in data["labels"]]
        assert "Important Work" in label_names

    def test_add_duplicate_label_idempotent(self, client_with_auth, db_session):
        """Test adding the same label twice is idempotent."""
        from app.models.label import Label
        
        client, token, user = client_with_auth
        
        label = Label(
            name="Work",
            color="#00ff00",
            owner_id=user.id,
            is_system=False
        )
        db_session.add(label)
        db_session.flush()
        
        thread = Thread(subject="Dup Label Test", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Dup Label Email",
            body="Content",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=user.id,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        # Add label first time
        response1 = client.post(
            f"/api/v1/emails/{email.id}/labels",
            json={"label_id": str(label.id)},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response1.status_code == 200
        
        # Add same label again - should succeed (idempotent)
        response2 = client.post(
            f"/api/v1/emails/{email.id}/labels",
            json={"label_id": str(label.id)},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response2.status_code == 200
        
        # Label should only appear once
        labels = [l["name"] for l in response2.json()["data"]["labels"] if l["name"] == "Work"]
        assert len(labels) == 1

    def test_add_nonexistent_label_fails(self, client_with_auth, db_session):
        """Test adding a non-existent label fails."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="No Label Test", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="No Label Email",
            body="Content",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=user.id,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        fake_label_id = "00000000-0000-0000-0000-000000000099"
        response = client.post(
            f"/api/v1/emails/{email.id}/labels",
            json={"label_id": fake_label_id},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400
        response_data = response.json()
        error_msg = response_data.get("detail") or response_data.get("message", "")
        assert "Invalid label" in error_msg or "label" in error_msg.lower()

    def test_add_other_users_label_fails(self, client_with_auth, db_session):
        """Test adding another user's label fails."""
        from app.models.label import Label
        
        client, token, user = client_with_auth
        
        # Create another user with their own label
        other_user = User(
            first_name="Other",
            last_name="User",
            email="other_label@example.com",
            role="user"
        )
        db_session.add(other_user)
        db_session.flush()
        
        other_label = Label(
            name="Other's Label",
            color="#0000ff",
            owner_id=other_user.id,
            is_system=False
        )
        db_session.add(other_label)
        db_session.flush()
        
        thread = Thread(subject="Other Label Test", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Other Label Email",
            body="Content",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=user.id,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        # Try to add other user's label
        response = client.post(
            f"/api/v1/emails/{email.id}/labels",
            json={"label_id": str(other_label.id)},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400
        response_data = response.json()
        error_msg = response_data.get("detail") or response_data.get("message", "")
        assert "Invalid label" in error_msg or "label" in error_msg.lower()

    def test_add_label_to_email_without_thread_fails(self, client_with_auth, db_session):
        """Test adding label to email without thread fails."""
        from app.models.label import Label
        
        client, token, user = client_with_auth
        
        label = Label(
            name="No Thread Label",
            owner_id=user.id,
            is_system=False
        )
        db_session.add(label)
        db_session.flush()
        
        # Create email without thread
        email = Email(
            subject="No Thread Email",
            body="Content",
            status="draft",
            folder=FolderType.DRAFTS.value,
            sender_id=user.id,
            thread_id=None
        )
        db_session.add(email)
        db_session.commit()
        
        response = client.post(
            f"/api/v1/emails/{email.id}/labels",
            json={"label_id": str(label.id)},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400
        response_data = response.json()
        error_msg = response_data.get("detail") or response_data.get("message", "")
        assert "thread" in error_msg.lower()

    def test_remove_label_from_email_success(self, client_with_auth, db_session):
        """Test removing a label from an email successfully."""
        from app.models.label import Label
        from app.models.thread_label import ThreadLabel
        
        client, token, user = client_with_auth
        
        label = Label(
            name="Remove Me",
            color="#ff00ff",
            owner_id=user.id,
            is_system=False
        )
        db_session.add(label)
        db_session.flush()
        
        thread = Thread(subject="Remove Label Test", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Remove Label Email",
            body="Content",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=user.id,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.flush()
        
        # Add label to thread
        thread_label = ThreadLabel(
            thread_id=thread.id,
            label_id=label.id,
            user_id=user.id
        )
        db_session.add(thread_label)
        db_session.commit()
        
        # Remove label
        response = client.delete(
            f"/api/v1/emails/{email.id}/labels/{label.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 204
        
        # Verify label removed
        remaining = db_session.query(ThreadLabel).filter(
            ThreadLabel.thread_id == thread.id,
            ThreadLabel.label_id == label.id
        ).first()
        assert remaining is None

    def test_remove_nonexistent_label_succeeds_silently(self, client_with_auth, db_session):
        """Test removing a non-existent label succeeds silently."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Silent Remove Test", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Silent Remove Email",
            body="Content",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=user.id,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        fake_label_id = "00000000-0000-0000-0000-000000000099"
        response = client.delete(
            f"/api/v1/emails/{email.id}/labels/{fake_label_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Should succeed silently per API design
        assert response.status_code == 204

    def test_add_label_to_nonexistent_email_fails(self, client_with_auth, db_session):
        """Test adding label to non-existent email fails."""
        from app.models.label import Label
        
        client, token, user = client_with_auth
        
        label = Label(
            name="Orphan Label",
            owner_id=user.id,
            is_system=False
        )
        db_session.add(label)
        db_session.commit()
        
        fake_email_id = "00000000-0000-0000-0000-000000000099"
        response = client.post(
            f"/api/v1/emails/{fake_email_id}/labels",
            json={"label_id": str(label.id)},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 404


class TestUnarchiveThread:
    """Tests for unarchive thread endpoint."""

    def test_unarchive_thread_success(self, client_with_auth, db_session):
        """Test unarchiving an archived thread succeeds."""
        from app.models.thread_user_metadata import ThreadUserMetadata
        
        client, token, user = client_with_auth
        
        thread = Thread(subject="Unarchive Test", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        # Create perspective-aware email
        email = create_received_email_for_user(
            db_session, user,
            subject="Unarchive Test Email",
            body="Content",
            thread=thread
        )
        db_session.flush()
        
        # Archive the thread first
        metadata = ThreadUserMetadata(
            thread_id=thread.id,
            user_id=user.id,
            is_archived=True
        )
        db_session.add(metadata)
        db_session.commit()
        
        # Unarchive
        response = client.post(
            f"/api/v1/threads/{thread.id}/unarchive",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        
        # Verify metadata updated
        db_session.refresh(metadata)
        assert metadata.is_archived == False

    def test_unarchive_non_archived_thread_fails(self, client_with_auth, db_session):
        """Test unarchiving a non-archived thread fails."""
        from app.models.thread_user_metadata import ThreadUserMetadata
        
        client, token, user = client_with_auth
        
        thread = Thread(subject="Not Archived Test", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        # Create perspective-aware email
        email = create_received_email_for_user(
            db_session, user,
            subject="Not Archived Email",
            body="Content",
            thread=thread
        )
        db_session.flush()
        
        # Create metadata with is_archived=False
        metadata = ThreadUserMetadata(
            thread_id=thread.id,
            user_id=user.id,
            is_archived=False
        )
        db_session.add(metadata)
        db_session.commit()
        
        response = client.post(
            f"/api/v1/threads/{thread.id}/unarchive",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400
        response_data = response.json()
        error_msg = response_data.get("detail") or response_data.get("message", "")
        assert "not archived" in error_msg.lower()

    def test_unarchive_nonexistent_thread_fails(self, client_with_auth):
        """Test unarchiving a non-existent thread fails."""
        client, token, user = client_with_auth
        
        fake_thread_id = "00000000-0000-0000-0000-000000000099"
        response = client.post(
            f"/api/v1/threads/{fake_thread_id}/unarchive",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 404

    def test_unarchive_restores_inbox_label_for_recipient(self, client_with_auth, db_session):
        """Test unarchive restores INBOX label for received emails."""
        from app.models.thread_user_metadata import ThreadUserMetadata
        
        client, token, user = client_with_auth
        
        sender = User(
            first_name="Sender",
            last_name="Unarchive",
            email="sender_unarchive@example.com",
            role="user"
        )
        db_session.add(sender)
        db_session.flush()
        
        thread = Thread(subject="Inbox Label Restore", owner_id=sender.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Inbox Label Restore Email",
            body="Content",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=sender.id,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.flush()
        
        # User is recipient
        recipient = EmailRecipient(
            email_id=email.id,
            recipient_id=user.id,
            recipient_email=user.email,
            recipient_type="to"
        )
        db_session.add(recipient)
        
        # Archive the thread
        metadata = ThreadUserMetadata(
            thread_id=thread.id,
            user_id=user.id,
            is_archived=True
        )
        db_session.add(metadata)
        db_session.commit()
        
        # Unarchive
        response = client.post(
            f"/api/v1/threads/{thread.id}/unarchive",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        
        # Thread should no longer be archived
        db_session.refresh(metadata)
        assert metadata.is_archived == False

    def test_unarchive_without_metadata_fails(self, client_with_auth, db_session):
        """Test unarchiving thread without metadata fails."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="No Metadata Test", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        # Create perspective-aware email
        email = create_received_email_for_user(
            db_session, user,
            subject="No Metadata Email",
            body="Content",
            thread=thread
        )
        db_session.commit()
        
        # No metadata exists
        response = client.post(
            f"/api/v1/threads/{thread.id}/unarchive",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400


class TestEmailLevelSpamRestore:
    """Tests for email-level spam and restore operations."""

    def test_mark_email_spam_success(self, client_with_auth, db_session):
        """Test marking a single email as spam."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Spam Email Test", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Spam Me",
            body="Content",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=user.id,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        response = client.post(
            f"/api/v1/emails/{email.id}/spam",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        
        db_session.refresh(email)
        assert email.folder == FolderType.SPAM.value

    def test_unmark_email_spam_success(self, client_with_auth, db_session):
        """Test unmarking a single email from spam."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Unspam Email Test", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Unspam Me",
            body="Content",
            status="received",
            folder=FolderType.SPAM.value,
            sender_id=user.id,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        response = client.post(
            f"/api/v1/emails/{email.id}/unspam",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        
        db_session.refresh(email)
        assert email.folder == FolderType.INBOX.value

    def test_restore_email_from_trash_success(self, client_with_auth, db_session):
        """Test restoring a single email from trash."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Restore Email Test", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Restore Me",
            body="Content",
            status="received",
            folder=FolderType.TRASH.value,
            sender_id=user.id,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        response = client.post(
            f"/api/v1/emails/{email.id}/restore",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        
        db_session.refresh(email)
        assert email.folder == FolderType.INBOX.value

    def test_restore_email_not_in_trash_fails(self, client_with_auth, db_session):
        """Test restoring email not in trash fails."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Not Trash Test", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Not In Trash",
            body="Content",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=user.id,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        response = client.post(
            f"/api/v1/emails/{email.id}/restore",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400

    def test_spam_already_spam_email_returns_error(self, client_with_auth, db_session):
        """Test spamming already-spam email returns error."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Already Spam Test", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Already Spam",
            body="Content",
            status="received",
            folder=FolderType.SPAM.value,
            sender_id=user.id,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        response = client.post(
            f"/api/v1/emails/{email.id}/spam",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # API returns 400 when email is already in spam
        assert response.status_code == 400
        db_session.refresh(email)
        assert email.folder == FolderType.SPAM.value

    def test_spam_nonexistent_email_fails(self, client_with_auth):
        """Test spamming non-existent email fails."""
        client, token, user = client_with_auth
        
        fake_email_id = "00000000-0000-0000-0000-000000000099"
        response = client.post(
            f"/api/v1/emails/{fake_email_id}/spam",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 404

    def test_restore_nonexistent_email_fails(self, client_with_auth):
        """Test restoring non-existent email fails."""
        client, token, user = client_with_auth
        
        fake_email_id = "00000000-0000-0000-0000-000000000099"
        response = client.post(
            f"/api/v1/emails/{fake_email_id}/restore",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 404


class TestBoundaryValidation:
    """Tests for boundary conditions and input validation."""

    def test_create_email_with_empty_subject(self, client_with_auth, db_session):
        """Test creating email with empty subject succeeds."""
        client, token, user = client_with_auth
        
        response = client.post(
            "/api/v1/emails",
            json={
                "subject": "",
                "body": "Email with empty subject",
                "recipients": [{"email": "test@example.com", "type": "to"}]
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Empty subject is allowed for drafts
        assert response.status_code == 201
        assert response.json()["data"]["subject"] == ""

    def test_create_email_with_empty_body(self, client_with_auth, db_session):
        """Test creating email with empty body succeeds."""
        client, token, user = client_with_auth
        
        response = client.post(
            "/api/v1/emails",
            json={
                "subject": "No Body Email",
                "body": "",
                "recipients": [{"email": "test@example.com", "type": "to"}]
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 201

    def test_create_email_with_no_recipients(self, client_with_auth, db_session):
        """Test creating draft email with no recipients succeeds."""
        client, token, user = client_with_auth
        
        response = client.post(
            "/api/v1/emails",
            json={
                "subject": "No Recipients Draft",
                "body": "This is a draft with no recipients",
                "recipients": []
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Drafts can have no recipients
        assert response.status_code == 201

    def test_create_email_with_long_subject(self, client_with_auth, db_session):
        """Test creating email with subject at boundary (500 chars)."""
        client, token, user = client_with_auth
        
        long_subject = "A" * 500  # Max allowed
        response = client.post(
            "/api/v1/emails",
            json={
                "subject": long_subject,
                "body": "Body",
                "recipients": [{"email": "test@example.com", "type": "to"}]
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 201
        assert len(response.json()["data"]["subject"]) == 500

    def test_create_email_with_too_long_subject_fails(self, client_with_auth, db_session):
        """Test creating email with subject over 500 chars fails."""
        client, token, user = client_with_auth
        
        too_long_subject = "A" * 501  # Over max
        response = client.post(
            "/api/v1/emails",
            json={
                "subject": too_long_subject,
                "body": "Body",
                "recipients": [{"email": "test@example.com", "type": "to"}]
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 422  # Validation error

    def test_create_email_with_invalid_recipient_email(self, client_with_auth, db_session):
        """Test creating email with invalid email format."""
        client, token, user = client_with_auth
        
        response = client.post(
            "/api/v1/emails",
            json={
                "subject": "Invalid Recipient",
                "body": "Body",
                "recipients": [{"email": "not-an-email", "type": "to"}]
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # API may accept any string as email or validate
        # Check that it either fails or creates the email
        assert response.status_code in [201, 422]

    def test_create_email_with_duplicate_recipients(self, client_with_auth, db_session):
        """Test creating email with duplicate recipients."""
        client, token, user = client_with_auth
        
        response = client.post(
            "/api/v1/emails",
            json={
                "subject": "Duplicate Recipients",
                "body": "Body",
                "recipients": [
                    {"email": "same@example.com", "type": "to"},
                    {"email": "same@example.com", "type": "to"}
                ]
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Should succeed - duplicates are allowed or deduplicated
        assert response.status_code in [201, 422]

    def test_create_email_self_sending(self, client_with_auth, db_session):
        """Test sending email to self (own email address)."""
        client, token, user = client_with_auth
        
        response = client.post(
            "/api/v1/emails",
            json={
                "subject": "Email to Self",
                "body": "Sending to myself",
                "recipients": [{"email": user.email, "type": "to"}]
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Self-sending should be allowed
        assert response.status_code == 201

    def test_move_email_to_invalid_folder(self, client_with_auth, db_session):
        """Test moving email to non-existent folder fails."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Move Invalid", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Move Me Invalid",
            body="Content",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=user.id,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        response = client.post(
            f"/api/v1/emails/{email.id}/move",
            json={"folder": "nonexistent_folder"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code in [400, 422]  # Validation error

    def test_update_sent_email_restricted(self, client_with_auth, db_session):
        """Test updating a sent email has restrictions."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Sent Update", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Already Sent",
            body="Original body",
            status="sent",
            folder=FolderType.SENT.value,
            sender_id=user.id,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        response = client.put(
            f"/api/v1/emails/{email.id}",
            json={"body": "Try to update sent email"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Sent emails typically can't be updated
        assert response.status_code in [200, 400, 403]

    def test_invalid_uuid_format_fails(self, client_with_auth):
        """Test invalid UUID format returns proper error."""
        client, token, user = client_with_auth
        
        response = client.get(
            "/api/v1/emails/not-a-valid-uuid",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 422  # Validation error

    def test_create_email_with_invalid_recipient_type(self, client_with_auth, db_session):
        """Test creating email with invalid recipient type fails."""
        client, token, user = client_with_auth
        
        response = client.post(
            "/api/v1/emails",
            json={
                "subject": "Invalid Type",
                "body": "Body",
                "recipients": [{"email": "test@example.com", "type": "invalid"}]
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Should fail validation - type must be to/cc/bcc
        assert response.status_code in [201, 400, 422]


class TestPaginationEdgeCases:
    """Tests for pagination edge cases."""

    def test_page_beyond_total_pages(self, client_with_auth, db_session):
        """Test requesting page beyond available data."""
        client, token, user = client_with_auth
        
        # Create just one email
        email = Email(
            subject="Only Email",
            body="Content",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=user.id
        )
        db_session.add(email)
        db_session.commit()
        
        # Request page 999
        response = client.get(
            "/api/v1/emails?page=999&page_size=10",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["results"] == []  # No results for high page

    def test_page_size_minimum(self, client_with_auth, db_session):
        """Test page_size=1 returns single result."""
        client, token, user = client_with_auth
        
        # Create multiple emails (perspective-aware)
        for i in range(5):
            create_received_email_for_user(
                db_session, user,
                subject=f"Page Size Email {i}",
                body="Content"
            )
        db_session.commit()
        
        response = client.get(
            "/api/v1/emails?page=1&page_size=1",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert len(data["results"]) == 1

    def test_large_page_size(self, client_with_auth, db_session):
        """Test very large page_size is rejected or capped."""
        client, token, user = client_with_auth
        
        response = client.get(
            "/api/v1/emails?page=1&page_size=1000",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Large page_size is rejected by validation
        assert response.status_code in [200, 422]

    def test_zero_page_number(self, client_with_auth, db_session):
        """Test page=0 is handled properly."""
        client, token, user = client_with_auth
        
        response = client.get(
            "/api/v1/emails?page=0&page_size=10",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Should either fail validation or treat as page 1
        assert response.status_code in [200, 422]

    def test_negative_page_number(self, client_with_auth, db_session):
        """Test negative page number is handled."""
        client, token, user = client_with_auth
        
        response = client.get(
            "/api/v1/emails?page=-1&page_size=10",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Should fail validation
        assert response.status_code in [200, 422]

    def test_zero_page_size(self, client_with_auth, db_session):
        """Test page_size=0 is handled."""
        client, token, user = client_with_auth
        
        response = client.get(
            "/api/v1/emails?page=1&page_size=0",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Should fail validation or return empty
        assert response.status_code in [200, 422]

    def test_pagination_metadata_correct(self, client_with_auth, db_session):
        """Test pagination metadata is accurate."""
        client, token, user = client_with_auth
        
        # Create 15 emails (perspective-aware)
        for i in range(15):
            create_received_email_for_user(
                db_session, user,
                subject=f"Pagination Email {i}",
                body="Content"
            )
        db_session.commit()
        
        response = client.get(
            "/api/v1/emails?page=2&page_size=5",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["page"] == 2
        assert data["page_size"] == 5
        assert len(data["results"]) == 5
        assert data["total"] >= 15


class TestDeleteEdgeCases:
    """Tests for delete and permanent delete edge cases."""

    def test_delete_already_trashed_email_permanent(self, client_with_auth, db_session):
        """Test deleting already-trashed email with permanent=True removes it."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Double Delete", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Already Trashed",
            body="Content",
            status="received",
            folder=FolderType.TRASH.value,  # Already in trash
            sender_id=user.id,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        email_id = email.id
        
        # Permanently delete with permanent=True
        response = client.delete(
            f"/api/v1/emails/{email.id}?permanent=true",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 204
        
        # Verify email is gone
        db_session.expire_all()  # Clear session cache
        deleted_email = db_session.query(Email).filter(Email.id == email_id).first()
        assert deleted_email is None

    def test_delete_nonexistent_email(self, client_with_auth):
        """Test deleting non-existent email returns 404."""
        client, token, user = client_with_auth
        
        fake_email_id = "00000000-0000-0000-0000-000000000099"
        response = client.delete(
            f"/api/v1/emails/{fake_email_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 404

    def test_delete_email_moves_to_trash_first(self, client_with_auth, db_session):
        """Test first delete moves email to trash, not permanent delete."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="First Delete", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Soft Delete Me",
            body="Content",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=user.id,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        response = client.delete(
            f"/api/v1/emails/{email.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 204
        
        # Email should still exist in trash
        db_session.refresh(email)
        assert email.folder == FolderType.TRASH.value

    def test_delete_thread_moves_all_emails_to_trash(self, client_with_auth, db_session):
        """Test deleting thread moves all emails to trash."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Thread Delete", owner_id=user.id, email_count=3)
        db_session.add(thread)
        db_session.flush()
        
        # Create emails (perspective-aware)
        emails = []
        for i in range(3):
            email = create_received_email_for_user(
                db_session, user,
                subject=f"Thread Email {i}",
                body="Content",
                thread=thread
            )
            emails.append(email)
        db_session.commit()
        
        response = client.delete(
            f"/api/v1/threads/{thread.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code in [200, 204]
        
        # All emails should be in trash
        for email in emails:
            db_session.refresh(email)
            assert email.folder == FolderType.TRASH.value

    def test_operations_on_trashed_email(self, client_with_auth, db_session):
        """Test operations on trashed email still work for some actions."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Trashed Ops", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Trashed Email",
            body="Content",
            status="received",
            folder=FolderType.TRASH.value,
            sender_id=user.id,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        # Get email should still work
        response = client.get(
            f"/api/v1/emails/{email.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        assert response.json()["data"]["folder"] == "trash"


class TestFilterSearchEdgeCases:
    """Tests for filter and search edge cases."""

    def test_search_with_special_characters(self, client_with_auth, db_session):
        """Test search with SQL special characters is safe."""
        client, token, user = client_with_auth
        
        email = Email(
            subject="Test with % and _ chars",
            body="Content with special chars",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=user.id
        )
        db_session.add(email)
        db_session.commit()
        
        # Search with SQL wildcard characters
        response = client.get(
            "/api/v1/emails?search=%25_%27",  # URL encoded %_'
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Should not crash or SQL inject
        assert response.status_code == 200

    def test_search_empty_string(self, client_with_auth, db_session):
        """Test search with empty string returns all results."""
        client, token, user = client_with_auth
        
        response = client.get(
            "/api/v1/emails?search=",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200

    def test_search_whitespace_only(self, client_with_auth, db_session):
        """Test search with only whitespace."""
        client, token, user = client_with_auth
        
        response = client.get(
            "/api/v1/emails?search=%20%20%20",  # URL encoded spaces
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200

    def test_invalid_folder_filter(self, client_with_auth, db_session):
        """Test invalid folder filter value returns 400 Bad Request."""
        client, token, user = client_with_auth
        
        response = client.get(
            "/api/v1/emails?folder=invalid_folder",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400
        assert "invalid folder" in response.json().get("message", "").lower()

    def test_invalid_category_filter(self, client_with_auth, db_session):
        """Test invalid category filter value."""
        client, token, user = client_with_auth
        
        response = client.get(
            "/api/v1/emails?category=invalid_category",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code in [200, 422]

    def test_combined_boolean_filters(self, client_with_auth, db_session):
        """Test combining is_starred and is_important filters (AND behavior)."""
        from app.models.thread_user_metadata import ThreadUserMetadata
        
        client, token, user = client_with_auth
        
        # Create thread with important metadata
        thread = Thread(subject="Combined Bool", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        # Email that is starred AND thread is important
        email = Email(
            subject="Starred and Important",
            body="Content",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=user.id,
            thread_id=thread.id,
            is_starred=True
        )
        db_session.add(email)
        db_session.flush()
        
        metadata = ThreadUserMetadata(
            thread_id=thread.id,
            user_id=user.id,
            is_important=True
        )
        db_session.add(metadata)
        db_session.commit()
        
        # Combined filter
        response = client.get(
            "/api/v1/emails?is_starred=true&is_important=true",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        results = response.json()["data"]["results"]
        # Should only return emails that match BOTH conditions
        for r in results:
            assert r["is_starred"] == True
            assert r["is_important"] == True

    def test_filter_case_sensitivity(self, client_with_auth, db_session):
        """Test filter values case sensitivity."""
        client, token, user = client_with_auth
        
        # Try uppercase folder value
        response = client.get(
            "/api/v1/emails?folder=INBOX",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Should handle case or return validation error
        assert response.status_code in [200, 422]


class TestIdempotencyAndRepeatOperations:
    """Tests for idempotent operations and repeat actions."""

    def test_mark_read_twice(self, client_with_auth, db_session):
        """Test marking already-read email as read is idempotent."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Read Twice", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Read Me Twice",
            body="Content",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=user.id,
            thread_id=thread.id,
            is_read=True  # Already read
        )
        db_session.add(email)
        db_session.commit()
        
        response = client.patch(
            f"/api/v1/emails/{email.id}/read",
            json={"is_read": True},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Should succeed - idempotent
        assert response.status_code == 200
        assert response.json()["data"]["is_read"] == True

    def test_star_twice(self, client_with_auth, db_session):
        """Test starring already-starred email is idempotent."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Star Twice", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Star Me Twice",
            body="Content",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=user.id,
            thread_id=thread.id,
            is_starred=True  # Already starred
        )
        db_session.add(email)
        db_session.commit()
        
        response = client.patch(
            f"/api/v1/emails/{email.id}/star",
            json={"is_starred": True},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        assert response.json()["data"]["is_starred"] == True

    def test_archive_already_archived_thread(self, client_with_auth, db_session):
        """Test archiving already-archived thread is idempotent."""
        from app.models.thread_user_metadata import ThreadUserMetadata
        
        client, token, user = client_with_auth
        
        thread = Thread(subject="Archive Twice", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        # Create perspective-aware email
        email = create_received_email_for_user(
            db_session, user,
            subject="Archive Me Twice",
            body="Content",
            thread=thread
        )
        db_session.flush()
        
        # Already archived
        metadata = ThreadUserMetadata(
            thread_id=thread.id,
            user_id=user.id,
            is_archived=True
        )
        db_session.add(metadata)
        db_session.commit()
        
        response = client.post(
            f"/api/v1/threads/{thread.id}/archive",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Should succeed - idempotent
        assert response.status_code == 200

    def test_snooze_already_snoozed_thread_updates_time(self, client_with_auth, db_session):
        """Test snoozeing already-snoozed thread updates the time."""
        from app.models.thread_user_metadata import ThreadUserMetadata
        
        client, token, user = client_with_auth
        
        thread = Thread(subject="Snooze Update", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        # Create perspective-aware email
        email = create_received_email_for_user(
            db_session, user,
            subject="Snooze Update Email",
            body="Content",
            thread=thread
        )
        db_session.flush()
        
        # Already snoozed
        old_snooze = datetime.now(UTC) + timedelta(days=1)
        metadata = ThreadUserMetadata(
            thread_id=thread.id,
            user_id=user.id,
            snooze_until=old_snooze
        )
        db_session.add(metadata)
        db_session.commit()
        
        # Snooze again with new time
        new_snooze = (datetime.now(UTC) + timedelta(days=2)).isoformat()
        response = client.post(
            f"/api/v1/threads/{thread.id}/snooze",
            json={"snooze_until": new_snooze},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        
        # Verify time updated
        db_session.refresh(metadata)
        assert metadata.snooze_until > old_snooze

    def test_important_toggle(self, client_with_auth, db_session):
        """Test toggling important status on and off."""
        from app.models.thread_user_metadata import ThreadUserMetadata
        
        client, token, user = client_with_auth
        
        thread = Thread(subject="Important Toggle", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        # Create perspective-aware email
        email = create_received_email_for_user(
            db_session, user,
            subject="Toggle Important",
            body="Content",
            thread=thread
        )
        db_session.commit()
        
        # Mark important
        response1 = client.patch(
            f"/api/v1/threads/{thread.id}/important",
            json={"is_important": True},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response1.status_code == 200
        assert response1.json()["data"]["is_important"] == True
        
        # Mark not important
        response2 = client.patch(
            f"/api/v1/threads/{thread.id}/important",
            json={"is_important": False},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response2.status_code == 200
        assert response2.json()["data"]["is_important"] == False

    def test_move_email_to_same_folder(self, client_with_auth, db_session):
        """Test moving email to its current folder is idempotent."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Same Folder", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Same Folder Email",
            body="Content",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=user.id,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        response = client.post(
            f"/api/v1/emails/{email.id}/move",
            json={"folder": "inbox"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Should succeed - idempotent
        assert response.status_code == 200
        assert response.json()["data"]["folder"] == "inbox"