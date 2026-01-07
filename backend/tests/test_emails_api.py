"""Tests for Emails API endpoints."""

import pytest
import uuid
from datetime import datetime, timedelta
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
        assert data["status"] == "draft"
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
            last_email_at=datetime.utcnow()
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

    def test_delete_email_soft_delete(self, client_with_auth, db_session, sample_email):
        """Test deleting an email (soft delete - moves to trash)."""
        client, token, user = client_with_auth
        email_id = sample_email.id
        
        response = client.delete(
            f"/api/v1/emails/{email_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 204

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

    def test_delete_email_soft_delete_default(self, client_with_auth, db_session):
        """Test default delete moves to trash (not permanent)."""
        client, token, user = client_with_auth
        
        # Create email
        email = Email(
            subject="Test Email",
            body="Content",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value
        )
        db_session.add(email)
        db_session.commit()
        email_id = email.id
        original_folder = email.folder
        
        # Delete without permanent flag
        response = client.delete(
            f"/api/v1/emails/{email_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 204
        
        # Verify email still exists (moved to trash or soft deleted)
        db_session.expire_all()
        email_check = db_session.query(Email).filter(Email.id == email_id).first()
        assert email_check is not None


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
        assert data["status"] == "sent"

    def test_reply_to_email(self, client_with_auth, db_session, sample_email):
        """Test replying to an email."""
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


class TestEmailSnooze:
    """Test email snooze and unsnooze operations."""

    def test_snooze_email_success(self, client_with_auth, db_session, sample_email):
        """Test snoozing an email until a future date."""
        client, token, user = client_with_auth
        
        # Snooze until tomorrow
        snooze_time = (datetime.utcnow() + timedelta(days=1)).isoformat()
        
        response = client.post(
            f"/api/v1/emails/{sample_email.id}/snooze",
            json={"snooze_until": snooze_time},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["snooze_until"] is not None
        assert data["id"] == str(sample_email.id)

    def test_snooze_email_past_time_fails(self, client_with_auth, db_session, sample_email):
        """Test that snoozing to a past time fails."""
        client, token, user = client_with_auth
        
        # Try to snooze to yesterday
        snooze_time = (datetime.utcnow() - timedelta(days=1)).isoformat()
        
        response = client.post(
            f"/api/v1/emails/{sample_email.id}/snooze",
            json={"snooze_until": snooze_time},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400
        response_data = response.json()
        # Error message is in the "message" field of the wrapped response
        error_msg = response_data.get("message", "")
        assert "future" in error_msg.lower()

    def test_snooze_email_not_found(self, client_with_auth):
        """Test snoozing a non-existent email returns 404."""
        client, token, user = client_with_auth
        
        snooze_time = (datetime.utcnow() + timedelta(days=1)).isoformat()
        
        response = client.post(
            f"/api/v1/emails/{NON_EXISTENT_UUID}/snooze",
            json={"snooze_until": snooze_time},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 404

    def test_snooze_email_unauthenticated(self, client, sample_email):
        """Test snoozing without authentication fails."""
        snooze_time = (datetime.utcnow() + timedelta(days=1)).isoformat()
        
        response = client.post(
            f"/api/v1/emails/{sample_email.id}/snooze",
            json={"snooze_until": snooze_time}
        )
        
        assert response.status_code == 401

    def test_unsnooze_email_success(self, client_with_auth, db_session, sample_email):
        """Test unsnoozing a snoozed email."""
        client, token, user = client_with_auth
        
        # First snooze the email
        sample_email.snooze_until = datetime.utcnow() + timedelta(days=1)
        db_session.commit()
        
        response = client.post(
            f"/api/v1/emails/{sample_email.id}/unsnooze",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["snooze_until"] is None

    def test_unsnooze_email_not_snoozed_fails(self, client_with_auth, db_session, sample_email):
        """Test unsnoozing an email that's not snoozed fails."""
        client, token, user = client_with_auth
        
        # Ensure email is not snoozed
        sample_email.snooze_until = None
        db_session.commit()
        
        response = client.post(
            f"/api/v1/emails/{sample_email.id}/unsnooze",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400
        response_data = response.json()
        # Error message is in the "message" field of the wrapped response
        error_msg = response_data.get("message", "")
        assert "not snoozed" in error_msg.lower()

    def test_unsnooze_email_not_found(self, client_with_auth):
        """Test unsnoozing a non-existent email returns 404."""
        client, token, user = client_with_auth
        
        response = client.post(
            f"/api/v1/emails/{NON_EXISTENT_UUID}/unsnooze",
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
            snooze_until=datetime.utcnow() + timedelta(days=1)
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
            snooze_until=datetime.utcnow() + timedelta(days=1)
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


class TestEmailArchive:
    """Test email archive operations."""

    def test_archive_email_success(self, client_with_auth, db_session, sample_email):
        """Test archiving an email."""
        client, token, user = client_with_auth
        
        response = client.post(
            f"/api/v1/emails/{sample_email.id}/archive",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["status"] == "archived"
        assert data["id"] == str(sample_email.id)

    def test_archive_email_not_found(self, client_with_auth):
        """Test archiving a non-existent email returns 404."""
        client, token, user = client_with_auth
        
        response = client.post(
            f"/api/v1/emails/{NON_EXISTENT_UUID}/archive",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 404

    def test_archive_email_unauthenticated(self, client, sample_email):
        """Test archiving without authentication fails."""
        response = client.post(
            f"/api/v1/emails/{sample_email.id}/archive"
        )
        
        assert response.status_code == 401

    def test_archive_email_updates_status_in_db(self, client_with_auth, db_session, sample_email):
        """Test that archiving updates the status in database."""
        client, token, user = client_with_auth
        
        # Verify initial status is not archived
        assert sample_email.status != "archived"
        
        response = client.post(
            f"/api/v1/emails/{sample_email.id}/archive",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        
        # Refresh from database
        db_session.refresh(sample_email)
        assert sample_email.status == "archived"

    def test_archive_email_as_recipient(self, client_with_auth, db_session):
        """Test that a recipient can archive an email they received."""
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
        
        # Create an email from sender to current user
        email = Email(
            subject="Test received email",
            body="Email body",
            sender_id=sender.id,
            folder=FolderType.INBOX.value,
            status="received"
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
            f"/api/v1/emails/{email.id}/archive",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["status"] == "archived"


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

        # Create emails in different folders
        email_inbox = Email(
            subject="Inbox Email",
            body="Content",
            status="received",
            category="primary",
            sender_id=user.id,
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

        # Create various emails
        email1 = Email(
            subject="Email 1",
            body="Content",
            status="received",
            category="primary",
            is_read=False,
            is_starred=True,
            sender_id=user.id,
            folder=FolderType.INBOX.value
        )
        email2 = Email(
            subject="Email 2",
            body="Content",
            status="received",
            category="primary",
            is_read=False,
            is_starred=False,
            sender_id=user.id,
            folder=FolderType.INBOX.value
        )
        email3 = Email(
            subject="Email 3",
            body="Content",
            status="received",
            category="promotions",
            is_read=False,
            is_starred=True,
            sender_id=user.id,
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

    def test_get_category_counts_excludes_deleted_emails(self, client_with_auth, db_session):
        """Test that category counts exclude soft-deleted emails."""
        client, token, user = client_with_auth

        # Create active and deleted emails
        email_active = Email(
            subject="Active Email",
            body="Content",
            status="received",
            category="primary",
            is_deleted=False,
            sender_id=user.id,
            folder=FolderType.INBOX.value
        )
        email_deleted = Email(
            subject="Deleted Email",
            body="Content",
            status="received",
            category="primary",
            is_deleted=True,
            sender_id=user.id,
            folder=FolderType.INBOX.value
        )
        db_session.add_all([email_active, email_deleted])
        db_session.commit()

        response = client.get(
            "/api/v1/emails/stats/category-counts",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        data = response.json()["data"]

        # Only active email
        assert data["primary"] == 1

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