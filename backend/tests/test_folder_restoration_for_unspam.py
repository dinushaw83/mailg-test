"""Test unspam operations restore emails to correct folders based on status."""

import pytest
from uuid import uuid4

from app.models.email import Email
from app.models.thread import Thread
from app.models.email_recipient import EmailRecipient
from app.models.label import Label
from app.core.constants import FolderType, SystemLabel, EmailStatus


class TestUnspamFolderRestoration:
    """Test that unmarking spam restores emails to appropriate folders."""

    def test_unspam_draft_email_restores_to_drafts(self, client_with_auth, db_session):
        """Test that unmarking spam on a draft email restores it to drafts folder."""
        client, token, user = client_with_auth

        # Create thread
        thread = Thread(subject="Draft Email", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.commit()

        # Create draft email marked as spam
        email = Email(
            subject="Draft Email",
            body="Draft content",
            status=EmailStatus.DRAFT.value,
            folder=FolderType.SPAM.value,
            sender_id=user.id,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()

        # Unspam the email
        response = client.post(
            f"/api/v1/emails/{email.id}/unspam",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["folder"] == FolderType.DRAFTS.value

        # Verify in database
        db_session.refresh(email)
        assert email.folder == FolderType.DRAFTS.value

    def test_unspam_sent_email_restores_to_sent(self, client_with_auth, db_session):
        """Test that unmarking spam on a sent email restores it to sent folder."""
        client, token, user = client_with_auth

        # Create thread
        thread = Thread(subject="Sent Email", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.commit()

        # Create sent email marked as spam
        email = Email(
            subject="Sent Email",
            body="Sent content",
            status=EmailStatus.SENT.value,
            folder=FolderType.SPAM.value,
            sender_id=user.id,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()

        # Unspam the email
        response = client.post(
            f"/api/v1/emails/{email.id}/unspam",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["folder"] == FolderType.SENT.value

        # Verify in database
        db_session.refresh(email)
        assert email.folder == FolderType.SENT.value

    def test_unspam_scheduled_email_restores_to_scheduled(self, client_with_auth, db_session):
        """Test that unmarking spam on a scheduled email restores it to scheduled folder."""
        from datetime import timedelta, UTC, datetime

        client, token, user = client_with_auth

        # Create thread
        thread = Thread(subject="Scheduled Email", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.commit()

        # Create scheduled email marked as spam (with scheduled_send_at to avoid validation error)
        email = Email(
            subject="Scheduled Email",
            body="Scheduled content",
            status=EmailStatus.QUEUED.value,
            folder=FolderType.SPAM.value,
            sender_id=user.id,
            thread_id=thread.id,
            scheduled_send_at=datetime.now(UTC) + timedelta(hours=1)
        )
        db_session.add(email)
        db_session.commit()

        # Unspam the email
        response = client.post(
            f"/api/v1/emails/{email.id}/unspam",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["folder"] == FolderType.SCHEDULED.value

        # Verify in database
        db_session.refresh(email)
        assert email.folder == FolderType.SCHEDULED.value

    def test_unspam_received_email_restores_to_inbox(self, client_with_auth, db_session):
        """Test that unmarking spam on a received email restores it to inbox folder."""
        client, token, user = client_with_auth

        # Create thread
        thread = Thread(subject="Received Email", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.commit()

        # Create received email marked as spam
        email = Email(
            subject="Received Email",
            body="Received content",
            status=EmailStatus.RECEIVED.value,
            folder=FolderType.SPAM.value,
            sender_id=user.id,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()

        # Unspam the email
        response = client.post(
            f"/api/v1/emails/{email.id}/unspam",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["folder"] == FolderType.INBOX.value

        # Verify in database
        db_session.refresh(email)
        assert email.folder == FolderType.INBOX.value

    def test_bulk_unspam_mixed_statuses_restores_correctly(self, client_with_auth, db_session):
        """Test bulk unspam with emails of different statuses."""
        from datetime import timedelta, UTC, datetime

        client, token, user = client_with_auth

        # Create threads for different email types
        emails = []

        # Draft email
        thread1 = Thread(subject="Draft", owner_id=user.id, email_count=1)
        db_session.add(thread1)
        db_session.flush()
        draft_email = Email(
            subject="Draft",
            body="Draft",
            status=EmailStatus.DRAFT.value,
            folder=FolderType.SPAM.value,
            sender_id=user.id,
            thread_id=thread1.id
        )
        db_session.add(draft_email)
        emails.append(draft_email)

        # Sent email
        thread2 = Thread(subject="Sent", owner_id=user.id, email_count=1)
        db_session.add(thread2)
        db_session.flush()
        sent_email = Email(
            subject="Sent",
            body="Sent",
            status=EmailStatus.SENT.value,
            folder=FolderType.SPAM.value,
            sender_id=user.id,
            thread_id=thread2.id
        )
        db_session.add(sent_email)
        emails.append(sent_email)

        # Scheduled email (with scheduled_send_at to avoid validation error)
        thread3 = Thread(subject="Scheduled", owner_id=user.id, email_count=1)
        db_session.add(thread3)
        db_session.flush()
        scheduled_email = Email(
            subject="Scheduled",
            body="Scheduled",
            status=EmailStatus.QUEUED.value,
            folder=FolderType.SPAM.value,
            sender_id=user.id,
            thread_id=thread3.id,
            scheduled_send_at=datetime.now(UTC) + timedelta(hours=1)
        )
        db_session.add(scheduled_email)
        emails.append(scheduled_email)

        # Received email
        thread4 = Thread(subject="Received", owner_id=user.id, email_count=1)
        db_session.add(thread4)
        db_session.flush()
        received_email = Email(
            subject="Received",
            body="Received",
            status=EmailStatus.RECEIVED.value,
            folder=FolderType.SPAM.value,
            sender_id=user.id,
            thread_id=thread4.id
        )
        db_session.add(received_email)
        emails.append(received_email)

        db_session.commit()

        # Bulk unspam all emails
        email_ids = [str(e.id) for e in emails]
        response = client.post(
            "/api/v1/bulk/unspam",
            json={"email_ids": email_ids},
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["successful"] == 4

        # Verify each email is in the correct folder
        db_session.refresh(draft_email)
        assert draft_email.folder == FolderType.DRAFTS.value

        db_session.refresh(sent_email)
        assert sent_email.folder == FolderType.SENT.value

        db_session.refresh(scheduled_email)
        assert scheduled_email.folder == FolderType.SCHEDULED.value

        db_session.refresh(received_email)
        assert received_email.folder == FolderType.INBOX.value

    def test_thread_unspam_mixed_statuses(self, client_with_auth, db_session):
        """Test thread unspam with emails of different statuses."""
        client, token, user = client_with_auth

        # Create thread with multiple emails of different statuses
        thread = Thread(subject="Mixed Thread", owner_id=user.id, email_count=3)
        db_session.add(thread)
        db_session.flush()

        # Draft email in spam
        draft_email = Email(
            subject="Mixed Thread",
            body="Draft",
            status=EmailStatus.DRAFT.value,
            folder=FolderType.SPAM.value,
            sender_id=user.id,
            thread_id=thread.id
        )
        db_session.add(draft_email)

        # Sent email in spam
        sent_email = Email(
            subject="Mixed Thread",
            body="Sent",
            status=EmailStatus.SENT.value,
            folder=FolderType.SPAM.value,
            sender_id=user.id,
            thread_id=thread.id
        )
        db_session.add(sent_email)

        # Received email in spam
        received_email = Email(
            subject="Mixed Thread",
            body="Received",
            status=EmailStatus.RECEIVED.value,
            folder=FolderType.SPAM.value,
            sender_id=user.id,
            thread_id=thread.id
        )
        db_session.add(received_email)

        db_session.commit()

        # Unspam the thread
        response = client.patch(
            f"/api/v1/threads/{thread.id}/unspam",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200

        # Verify each email is in the correct folder
        db_session.refresh(draft_email)
        assert draft_email.folder == FolderType.DRAFTS.value

        db_session.refresh(sent_email)
        assert sent_email.folder == FolderType.SENT.value

        db_session.refresh(received_email)
        assert received_email.folder == FolderType.INBOX.value
