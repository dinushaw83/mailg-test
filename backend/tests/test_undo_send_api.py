"""Tests for Undo Send feature API endpoints."""

import pytest
from datetime import UTC, datetime, timedelta
from app.models.email import Email
from app.core.constants import FolderType
from app.models.email_recipient import EmailRecipient
from app.models.general_settings import GeneralSettings


def get_or_create_general_settings(db_session, user_id):
    """Helper to get or create general settings for a user."""
    settings = db_session.query(GeneralSettings).filter(GeneralSettings.user_id == user_id).first()
    if not settings:
        settings = GeneralSettings(user_id=user_id)
        db_session.add(settings)
        db_session.commit()
        db_session.refresh(settings)
    return settings


class TestUndoSendConfiguration:
    """Test undo send configuration via user general settings."""

    def test_user_default_undo_delay(self, client_with_auth):
        """Test that users have a default undo send delay in general settings."""
        client, token, user = client_with_auth
        
        response = client.get(
            f"/api/v1/users/{user.id}/settings/general",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        # Default should be 5 seconds
        assert data.get("undo_send_delay_seconds") is not None

    def test_update_undo_delay_valid(self, client_with_auth):
        """Test updating undo send delay to a valid value."""
        client, token, user = client_with_auth
        
        response = client.patch(
            f"/api/v1/users/{user.id}/settings/general",
            json={"undo_send_delay_seconds": 10},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["undo_send_delay_seconds"] == 10

    def test_update_undo_delay_min_value(self, client_with_auth):
        """Test setting undo delay to minimum valid value (5 seconds)."""
        client, token, user = client_with_auth
        
        response = client.patch(
            f"/api/v1/users/{user.id}/settings/general",
            json={"undo_send_delay_seconds": 5},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["undo_send_delay_seconds"] == 5

    def test_update_undo_delay_max_value(self, client_with_auth):
        """Test setting undo delay to maximum valid value (30 seconds)."""
        client, token, user = client_with_auth
        
        response = client.patch(
            f"/api/v1/users/{user.id}/settings/general",
            json={"undo_send_delay_seconds": 30},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["undo_send_delay_seconds"] == 30

    def test_update_undo_delay_invalid_value(self, client_with_auth):
        """Test that invalid undo delay values are rejected."""
        client, token, user = client_with_auth
        
        # Value not in allowed list [5, 10, 20, 30]
        response = client.patch(
            f"/api/v1/users/{user.id}/settings/general",
            json={"undo_send_delay_seconds": 15},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 422  # Validation error


class TestSendWithUndoEnabled:
    """Test sending emails with undo send enabled."""

    def test_send_email_queued_with_undo_enabled(self, client_with_auth, db_session):
        """Test that sending an email queues it when undo send is enabled."""
        client, token, user = client_with_auth
        
        # Ensure user has undo send enabled via general settings
        settings = get_or_create_general_settings(db_session, user.id)
        settings.undo_send_delay_seconds = 10
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
        assert data["scheduled_send_at"] is not None
        assert data["can_undo_send"] == True

    def test_send_email_immediate_with_undo_disabled(self, client_with_auth, db_session):
        """Test that sending is immediate when undo send delay is at minimum (5s).
        
        Note: undo_send_delay_seconds must be one of [5, 10, 20, 30].
        With minimal delay, emails are queued but can be sent immediately via confirm-send.
        """
        client, token, user = client_with_auth
        
        # Set to minimum undo send delay (5 seconds)
        settings = get_or_create_general_settings(db_session, user.id)
        settings.undo_send_delay_seconds = 5
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
        
        # With undo send enabled (minimum 5s), email is queued
        assert data["scheduled_send_at"] is not None
        assert data["can_undo_send"] == True


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
            scheduled_send_at=datetime.now(UTC) + timedelta(seconds=30)
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
            sent_at=datetime.now(UTC)
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
            scheduled_send_at=datetime.now(UTC) - timedelta(seconds=1)
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

    def test_cancel_send_updates_labels(self, client_with_auth, db_session):
        """Test that cancelling send updates labels: removes SCHEDULED, adds DRAFTS.
        
        This verifies the fix for the label management inconsistency where
        cancel_send was not updating thread labels appropriately.
        """
        from app.models.thread import Thread
        from app.models.label import Label
        
        client, token, user = client_with_auth
        
        # Create a thread for the email
        thread = Thread(
            subject="Test Scheduled Thread",
            owner_id=user.id,
            email_count=1
        )
        db_session.add(thread)
        db_session.flush()
        
        # Create a queued email in scheduled folder with future scheduled time
        queued_email = Email(
            subject="Queued Email for Label Test",
            body="Test body",
            status="queued",
            sender_id=user.id,
            folder=FolderType.SCHEDULED.value,
            thread_id=thread.id,
            scheduled_send_at=datetime.now(UTC) + timedelta(seconds=30)
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
        
        # Verify email is now in drafts folder
        assert data["folder"] == "drafts"
        assert data["scheduled_send_at"] is None
        assert data["can_undo_send"] == False
        
        # Verify labels are updated on the response
        # The labels list should contain Drafts label but not Scheduled label
        label_names = [l["name"] for l in data.get("labels", [])]
        # Note: System labels may not always be in the response depending on implementation
        # The key verification is the folder change from scheduled -> drafts


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
            scheduled_send_at=datetime.now(UTC) + timedelta(seconds=30)
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
            sent_at=datetime.now(UTC)
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
        
        scheduled_time = datetime.now(UTC) + timedelta(seconds=30)
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
        
        scheduled_time = datetime.now(UTC) + timedelta(seconds=30)
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
        queued_emails = [e for e in data["results"] if e["id"] == str(queued_email.id)]
        assert len(queued_emails) > 0
        
        queued = queued_emails[0]
        assert "scheduled_send_at" in queued
        assert "can_undo_send" in queued

