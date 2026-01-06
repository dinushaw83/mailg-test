"""Tests for Undo Send feature API endpoints."""

import pytest
from datetime import datetime, timedelta
from app.models.email import Email
from app.core.constants import FolderType
from app.models.email_recipient import EmailRecipient


class TestUndoSendConfiguration:
    """Test undo send configuration via user preferences."""

    def test_user_default_undo_delay(self, client_with_auth):
        """Test that users have a default undo send delay."""
        client, token, user = client_with_auth
        
        response = client.get(
            f"/api/v1/users/{user.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        # Default should be 10 seconds
        assert data.get("undo_send_delay_seconds") is not None

    def test_update_undo_delay_valid(self, client_with_admin_auth, sample_user):
        """Test updating undo send delay to a valid value."""
        client, token, admin = client_with_admin_auth
        
        response = client.put(
            f"/api/v1/users/{sample_user.id}",
            json={"undo_send_delay_seconds": 15},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["undo_send_delay_seconds"] == 15

    def test_update_undo_delay_disable(self, client_with_admin_auth, sample_user):
        """Test disabling undo send with value 0."""
        client, token, admin = client_with_admin_auth
        
        response = client.put(
            f"/api/v1/users/{sample_user.id}",
            json={"undo_send_delay_seconds": 0},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["undo_send_delay_seconds"] == 0

    def test_update_undo_delay_min_value(self, client_with_admin_auth, sample_user):
        """Test setting undo delay to minimum valid value (5 seconds)."""
        client, token, admin = client_with_admin_auth
        
        response = client.put(
            f"/api/v1/users/{sample_user.id}",
            json={"undo_send_delay_seconds": 5},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["undo_send_delay_seconds"] == 5

    def test_update_undo_delay_max_value(self, client_with_admin_auth, sample_user):
        """Test setting undo delay to maximum valid value (30 seconds)."""
        client, token, admin = client_with_admin_auth
        
        response = client.put(
            f"/api/v1/users/{sample_user.id}",
            json={"undo_send_delay_seconds": 30},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["undo_send_delay_seconds"] == 30


class TestSendWithUndoEnabled:
    """Test sending emails with undo send enabled."""

    def test_send_email_queued_with_undo_enabled(self, client_with_auth, db_session):
        """Test that sending an email queues it when undo send is enabled."""
        client, token, user = client_with_auth
        
        # Ensure user has undo send enabled
        user.undo_send_delay_seconds = 10
        db_session.commit()
        
        # Create a draft email
        draft = Email(
            subject="Test Email",
            body="Test body",
            status="draft",
            sender_id=user.id,
            folder=FolderType.DRAFTS.value
        )
        db_session.add(draft)
        db_session.commit()
        
        # Add recipient
        recipient = EmailRecipient(
            email_id=draft.id,
            recipient_email="recipient@example.com",
            recipient_name="Recipient",
            recipient_type="to"
        )
        db_session.add(recipient)
        db_session.commit()
        
        # Send the email
        response = client.post(
            f"/api/v1/emails/{draft.id}/send",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Should be queued, not sent
        assert data["status"] == "queued"
        assert data["scheduled_send_at"] is not None
        assert data["can_undo_send"] == True

    def test_send_email_immediate_with_undo_disabled(self, client_with_auth, db_session):
        """Test that sending is immediate when undo send is disabled."""
        client, token, user = client_with_auth
        
        # Disable undo send
        user.undo_send_delay_seconds = 0
        db_session.commit()
        
        # Create a draft email
        draft = Email(
            subject="Test Email Immediate",
            body="Test body",
            status="draft",
            sender_id=user.id,
            folder=FolderType.DRAFTS.value
        )
        db_session.add(draft)
        db_session.commit()
        
        # Add recipient
        recipient = EmailRecipient(
            email_id=draft.id,
            recipient_email="recipient@example.com",
            recipient_name="Recipient",
            recipient_type="to"
        )
        db_session.add(recipient)
        db_session.commit()
        
        # Send the email
        response = client.post(
            f"/api/v1/emails/{draft.id}/send",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Should be sent immediately
        assert data["status"] == "sent"
        assert data["sent_at"] is not None
        assert data["can_undo_send"] == False


class TestCancelSend:
    """Test cancelling queued emails (undo send)."""

    def test_cancel_queued_email_success(self, client_with_auth, db_session):
        """Test successfully cancelling a queued email."""
        client, token, user = client_with_auth
        
        # Create a queued email with future scheduled time
        queued_email = Email(
            subject="Queued Email",
            body="Test body",
            status="queued",
            sender_id=user.id,
            folder=FolderType.SENT.value,
            scheduled_send_at=datetime.utcnow() + timedelta(seconds=30)
        )
        db_session.add(queued_email)
        db_session.commit()
        
        # Cancel the send
        response = client.post(
            f"/api/v1/emails/{queued_email.id}/cancel-send",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Should be back to draft
        assert data["status"] == "draft"
        assert data["scheduled_send_at"] is None
        assert data["can_undo_send"] == False

    def test_cancel_already_sent_email_fails(self, client_with_auth, db_session):
        """Test that cancelling an already sent email fails."""
        client, token, user = client_with_auth
        
        # Create a sent email
        sent_email = Email(
            subject="Sent Email",
            body="Test body",
            status="sent",
            sender_id=user.id,
            folder=FolderType.SENT.value,
            sent_at=datetime.utcnow()
        )
        db_session.add(sent_email)
        db_session.commit()
        
        # Try to cancel
        response = client.post(
            f"/api/v1/emails/{sent_email.id}/cancel-send",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400
        assert "already been sent" in response.json()["message"].lower()

    def test_cancel_draft_email_fails(self, client_with_auth, db_session):
        """Test that cancelling a draft email fails."""
        client, token, user = client_with_auth
        
        # Create a draft email
        draft_email = Email(
            subject="Draft Email",
            body="Test body",
            status="draft",
            sender_id=user.id,
            folder=FolderType.DRAFTS.value
        )
        db_session.add(draft_email)
        db_session.commit()
        
        # Try to cancel
        response = client.post(
            f"/api/v1/emails/{draft_email.id}/cancel-send",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400

    def test_cancel_expired_window_fails(self, client_with_auth, db_session):
        """Test that cancelling after undo window expires fails."""
        client, token, user = client_with_auth
        
        # Create a queued email with past scheduled time
        queued_email = Email(
            subject="Expired Queued Email",
            body="Test body",
            status="queued",
            sender_id=user.id,
            folder=FolderType.SENT.value,
            scheduled_send_at=datetime.utcnow() - timedelta(seconds=1)
        )
        db_session.add(queued_email)
        db_session.commit()
        
        # Try to cancel
        response = client.post(
            f"/api/v1/emails/{queued_email.id}/cancel-send",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400
        assert "expired" in response.json()["message"].lower()


class TestConfirmSend:
    """Test confirming immediate send for queued emails."""

    def test_confirm_send_success(self, client_with_auth, db_session):
        """Test confirming immediate send of a queued email."""
        client, token, user = client_with_auth
        
        # Create a queued email
        queued_email = Email(
            subject="Queued for Confirm",
            body="Test body",
            status="queued",
            sender_id=user.id,
            folder=FolderType.SENT.value,
            scheduled_send_at=datetime.utcnow() + timedelta(seconds=30)
        )
        db_session.add(queued_email)
        db_session.commit()
        
        # Confirm immediate send
        response = client.post(
            f"/api/v1/emails/{queued_email.id}/confirm-send",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Should be sent immediately
        assert data["status"] == "sent"
        assert data["sent_at"] is not None
        assert data["scheduled_send_at"] is None
        assert data["can_undo_send"] == False

    def test_confirm_send_already_sent_fails(self, client_with_auth, db_session):
        """Test that confirming an already sent email fails."""
        client, token, user = client_with_auth
        
        # Create a sent email
        sent_email = Email(
            subject="Already Sent",
            body="Test body",
            status="sent",
            sender_id=user.id,
            folder=FolderType.SENT.value,
            sent_at=datetime.utcnow()
        )
        db_session.add(sent_email)
        db_session.commit()
        
        # Try to confirm
        response = client.post(
            f"/api/v1/emails/{sent_email.id}/confirm-send",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400


class TestEmailResponseFields:
    """Test email response includes undo send fields."""

    def test_email_response_includes_scheduled_send_at(self, client_with_auth, db_session):
        """Test that email response includes scheduled_send_at field."""
        client, token, user = client_with_auth
        
        scheduled_time = datetime.utcnow() + timedelta(seconds=30)
        queued_email = Email(
            subject="Test Email",
            body="Test body",
            status="queued",
            sender_id=user.id,
            folder=FolderType.SENT.value,
            scheduled_send_at=scheduled_time
        )
        db_session.add(queued_email)
        db_session.commit()
        
        response = client.get(
            f"/api/v1/emails/{queued_email.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert "scheduled_send_at" in data
        assert "can_undo_send" in data
        assert data["can_undo_send"] == True

    def test_email_list_includes_scheduled_send_at(self, client_with_auth, db_session):
        """Test that email list response includes scheduled_send_at field."""
        client, token, user = client_with_auth
        
        scheduled_time = datetime.utcnow() + timedelta(seconds=30)
        queued_email = Email(
            subject="Listed Queued Email",
            body="Test body",
            status="queued",
            sender_id=user.id,
            folder=FolderType.SENT.value,
            scheduled_send_at=scheduled_time
        )
        db_session.add(queued_email)
        db_session.commit()
        
        response = client.get(
            "/api/v1/emails",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Find the queued email in results
        queued_emails = [e for e in data["results"] if e["status"] == "queued"]
        assert len(queued_emails) > 0
        
        queued = queued_emails[0]
        assert "scheduled_send_at" in queued
        assert "can_undo_send" in queued

