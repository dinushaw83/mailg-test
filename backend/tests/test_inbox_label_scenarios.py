"""Tests for inbox label and spam/trash label removal scenarios.

Tests cover:
- Inbox filtering by INBOX system label
- Inbox combined with category filtering
- Spam folder behavior similar to trash
- SPAM/TRASH label removal restores emails to inbox
"""

import pytest
from datetime import datetime, timedelta
from app.models.email import Email
from app.models.email_recipient import EmailRecipient
from app.models.thread import Thread
from app.models.thread_label import ThreadLabel
from app.models.label import Label
from app.models.user import User
from app.core.constants import FolderType, SystemLabel


class TestInboxLabelFiltering:
    """Test inbox filtering by INBOX system label."""

    def test_inbox_shows_threads_with_inbox_label(self, client_with_auth, db_session):
        """Test that inbox only shows threads that have the INBOX label."""
        client, token, user = client_with_auth
        
        # Create INBOX system label for user
        inbox_label = Label(
            name=SystemLabel.INBOX.value,
            is_system=True,
            owner_id=user.id
        )
        db_session.add(inbox_label)
        db_session.commit()
        
        # Create two threads
        thread1 = Thread(subject="Thread 1", owner_id=user.id, email_count=1)
        thread2 = Thread(subject="Thread 2", owner_id=user.id, email_count=1)
        db_session.add_all([thread1, thread2])
        db_session.commit()
        
        # Create emails for both threads
        email1 = Email(
            subject="Email in inbox",
            body="Content",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=user.id,
            thread_id=thread1.id
        )
        email2 = Email(
            subject="Email not in inbox",
            body="Content",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=user.id,
            thread_id=thread2.id
        )
        db_session.add_all([email1, email2])
        db_session.commit()
        
        # Add INBOX label only to thread1
        thread_label = ThreadLabel(
            thread_id=thread1.id,
            label_id=inbox_label.id,
            user_id=user.id
        )
        db_session.add(thread_label)
        db_session.commit()
        
        # Query inbox
        response = client.get(
            "/api/v1/emails?folder=inbox",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Should only see email from thread1 (has INBOX label)
        subjects = [e["subject"] for e in data["results"]]
        assert "Email in inbox" in subjects
        assert "Email not in inbox" not in subjects

    def test_removing_inbox_label_hides_from_inbox(self, client_with_auth, db_session):
        """Test that removing INBOX label hides thread from inbox view."""
        client, token, user = client_with_auth
        
        # Create INBOX system label
        inbox_label = Label(
            name=SystemLabel.INBOX.value,
            is_system=True,
            owner_id=user.id
        )
        db_session.add(inbox_label)
        db_session.commit()
        
        # Create thread with email
        thread = Thread(subject="Test Thread", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.commit()
        
        email = Email(
            subject="Test Email",
            body="Content",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=user.id,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        # Add INBOX label
        thread_label = ThreadLabel(
            thread_id=thread.id,
            label_id=inbox_label.id,
            user_id=user.id
        )
        db_session.add(thread_label)
        db_session.commit()
        
        # Verify email appears in inbox
        response = client.get(
            "/api/v1/emails?folder=inbox",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        assert len(response.json()["data"]["results"]) == 1
        
        # Remove INBOX label via API
        response = client.delete(
            f"/api/v1/emails/{email.id}/labels/{inbox_label.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 204
        
        # Verify email no longer appears in inbox
        response = client.get(
            "/api/v1/emails?folder=inbox",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        assert len(response.json()["data"]["results"]) == 0

    def test_thread_still_visible_in_all_mail_after_inbox_label_removal(self, client_with_auth, db_session):
        """Test that thread is still visible in all mail after removing INBOX label."""
        client, token, user = client_with_auth
        
        # Create INBOX system label
        inbox_label = Label(
            name=SystemLabel.INBOX.value,
            is_system=True,
            owner_id=user.id
        )
        db_session.add(inbox_label)
        db_session.commit()
        
        # Create thread with email
        thread = Thread(subject="Test Thread", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.commit()
        
        email = Email(
            subject="All Mail Test",
            body="Content",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=user.id,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        # Add then remove INBOX label
        thread_label = ThreadLabel(
            thread_id=thread.id,
            label_id=inbox_label.id,
            user_id=user.id
        )
        db_session.add(thread_label)
        db_session.commit()
        
        # Remove label
        db_session.delete(thread_label)
        db_session.commit()
        
        # Query all mail (no folder filter)
        response = client.get(
            "/api/v1/emails",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        subjects = [e["subject"] for e in data["results"]]
        assert "All Mail Test" in subjects


class TestInboxWithCategory:
    """Test inbox combined with category filtering."""

    def test_inbox_with_primary_category(self, client_with_auth, db_session):
        """Test filtering inbox by primary category."""
        client, token, user = client_with_auth
        
        # Create INBOX system label
        inbox_label = Label(
            name=SystemLabel.INBOX.value,
            is_system=True,
            owner_id=user.id
        )
        db_session.add(inbox_label)
        db_session.commit()
        
        # Create threads
        thread1 = Thread(subject="Thread 1", owner_id=user.id, email_count=1)
        thread2 = Thread(subject="Thread 2", owner_id=user.id, email_count=1)
        db_session.add_all([thread1, thread2])
        db_session.commit()
        
        # Create emails with different categories
        email_primary = Email(
            subject="Primary Email",
            body="Content",
            status="received",
            folder=FolderType.INBOX.value,
            category="primary",
            sender_id=user.id,
            thread_id=thread1.id
        )
        email_promo = Email(
            subject="Promo Email",
            body="Content",
            status="received",
            folder=FolderType.INBOX.value,
            category="promotions",
            sender_id=user.id,
            thread_id=thread2.id
        )
        db_session.add_all([email_primary, email_promo])
        db_session.commit()
        
        # Add INBOX label to both threads
        for thread in [thread1, thread2]:
            thread_label = ThreadLabel(
                thread_id=thread.id,
                label_id=inbox_label.id,
                user_id=user.id
            )
            db_session.add(thread_label)
        db_session.commit()
        
        # Filter inbox by primary category
        response = client.get(
            "/api/v1/emails?folder=inbox&category=primary",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Should only see primary emails
        assert len(data["results"]) == 1
        assert data["results"][0]["category"] == "primary"

    def test_inbox_with_promotions_category(self, client_with_auth, db_session):
        """Test filtering inbox by promotions category."""
        client, token, user = client_with_auth
        
        # Create INBOX system label
        inbox_label = Label(
            name=SystemLabel.INBOX.value,
            is_system=True,
            owner_id=user.id
        )
        db_session.add(inbox_label)
        db_session.commit()
        
        # Create thread with promo email
        thread = Thread(subject="Promo Thread", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.commit()
        
        email = Email(
            subject="Sale Email",
            body="50% off!",
            status="received",
            folder=FolderType.INBOX.value,
            category="promotions",
            sender_id=user.id,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        # Add INBOX label
        thread_label = ThreadLabel(
            thread_id=thread.id,
            label_id=inbox_label.id,
            user_id=user.id
        )
        db_session.add(thread_label)
        db_session.commit()
        
        # Filter inbox by promotions
        response = client.get(
            "/api/v1/emails?folder=inbox&category=promotions",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert len(data["results"]) == 1
        assert data["results"][0]["category"] == "promotions"


class TestSpamFolder:
    """Test spam folder behavior similar to trash."""

    def test_spam_folder_shows_spam_emails(self, client_with_auth, db_session):
        """Test that spam folder shows emails in spam folder."""
        client, token, user = client_with_auth
        
        # Create thread with spam email
        thread = Thread(subject="Spam Thread", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.commit()
        
        spam_email = Email(
            subject="You won a prize!",
            body="Click here",
            status="received",
            folder=FolderType.SPAM.value,
            sender_id=user.id,
            thread_id=thread.id
        )
        db_session.add(spam_email)
        db_session.commit()
        
        response = client.get(
            "/api/v1/emails?folder=spam",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert len(data["results"]) == 1
        assert data["results"][0]["folder"] == "spam"

    def test_mark_email_as_spam(self, client_with_auth, db_session, sample_email):
        """Test marking an email as spam moves it to spam folder."""
        client, token, user = client_with_auth
        
        response = client.post(
            f"/api/v1/emails/{sample_email.id}/spam",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["folder"] == "spam"

    def test_unmark_spam_moves_to_inbox(self, client_with_auth, db_session):
        """Test unmarking spam moves email back to inbox."""
        client, token, user = client_with_auth
        
        # Create thread with spam email
        thread = Thread(subject="Spam Thread", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.commit()
        
        email = Email(
            subject="Spam Email",
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
        data = response.json()["data"]
        assert data["folder"] == "inbox"


class TestSpamLabelRemoval:
    """Test SPAM label removal restores emails to inbox."""

    def test_removing_spam_label_restores_to_inbox(self, client_with_auth, db_session):
        """Test that removing SPAM label restores all spam emails in thread to inbox."""
        client, token, user = client_with_auth
        
        # Create SPAM and INBOX system labels
        spam_label = Label(
            name=SystemLabel.SPAM.value,
            is_system=True,
            owner_id=user.id
        )
        inbox_label = Label(
            name=SystemLabel.INBOX.value,
            is_system=True,
            owner_id=user.id
        )
        db_session.add_all([spam_label, inbox_label])
        db_session.commit()
        
        # Create thread with multiple spam emails
        thread = Thread(subject="Spam Thread", owner_id=user.id, email_count=2)
        db_session.add(thread)
        db_session.commit()
        
        email1 = Email(
            subject="Spam 1",
            body="Content",
            status="received",
            folder=FolderType.SPAM.value,
            sender_id=user.id,
            thread_id=thread.id
        )
        email2 = Email(
            subject="Spam 2",
            body="Content",
            status="received",
            folder=FolderType.SPAM.value,
            sender_id=user.id,
            thread_id=thread.id
        )
        db_session.add_all([email1, email2])
        db_session.commit()
        
        # Add SPAM label to thread
        thread_label = ThreadLabel(
            thread_id=thread.id,
            label_id=spam_label.id,
            user_id=user.id
        )
        db_session.add(thread_label)
        db_session.commit()
        
        # Remove SPAM label via API
        response = client.delete(
            f"/api/v1/emails/{email1.id}/labels/{spam_label.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 204
        
        # Verify emails were moved to inbox
        db_session.expire_all()
        email1_check = db_session.query(Email).filter(Email.id == email1.id).first()
        email2_check = db_session.query(Email).filter(Email.id == email2.id).first()
        
        assert email1_check.folder == FolderType.INBOX.value
        assert email2_check.folder == FolderType.INBOX.value


class TestTrashLabelRemoval:
    """Test TRASH label removal restores emails to inbox."""

    def test_removing_trash_label_restores_to_inbox(self, client_with_auth, db_session):
        """Test that removing TRASH label restores all trashed emails in thread to inbox."""
        client, token, user = client_with_auth
        
        # Create TRASH and INBOX system labels
        trash_label = Label(
            name=SystemLabel.TRASH.value,
            is_system=True,
            owner_id=user.id
        )
        inbox_label = Label(
            name=SystemLabel.INBOX.value,
            is_system=True,
            owner_id=user.id
        )
        db_session.add_all([trash_label, inbox_label])
        db_session.commit()
        
        # Create thread with multiple trashed emails
        thread = Thread(subject="Trash Thread", owner_id=user.id, email_count=2)
        db_session.add(thread)
        db_session.commit()
        
        email1 = Email(
            subject="Trash 1",
            body="Content",
            status="received",
            folder=FolderType.TRASH.value,
            sender_id=user.id,
            thread_id=thread.id
        )
        email2 = Email(
            subject="Trash 2",
            body="Content",
            status="received",
            folder=FolderType.TRASH.value,
            sender_id=user.id,
            thread_id=thread.id
        )
        db_session.add_all([email1, email2])
        db_session.commit()
        
        # Add TRASH label to thread
        thread_label = ThreadLabel(
            thread_id=thread.id,
            label_id=trash_label.id,
            user_id=user.id
        )
        db_session.add(thread_label)
        db_session.commit()
        
        # Remove TRASH label via API
        response = client.delete(
            f"/api/v1/emails/{email1.id}/labels/{trash_label.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 204
        
        # Verify emails were moved to inbox
        db_session.expire_all()
        email1_check = db_session.query(Email).filter(Email.id == email1.id).first()
        email2_check = db_session.query(Email).filter(Email.id == email2.id).first()
        
        assert email1_check.folder == FolderType.INBOX.value
        assert email2_check.folder == FolderType.INBOX.value

    def test_removing_trash_label_adds_inbox_label(self, client_with_auth, db_session):
        """Test that removing TRASH label also adds INBOX label to thread."""
        client, token, user = client_with_auth
        
        # Create TRASH and INBOX system labels
        trash_label = Label(
            name=SystemLabel.TRASH.value,
            is_system=True,
            owner_id=user.id
        )
        inbox_label = Label(
            name=SystemLabel.INBOX.value,
            is_system=True,
            owner_id=user.id
        )
        db_session.add_all([trash_label, inbox_label])
        db_session.commit()
        
        # Create thread with trashed email
        thread = Thread(subject="Trash Thread", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.commit()
        
        email = Email(
            subject="Trash Email",
            body="Content",
            status="received",
            folder=FolderType.TRASH.value,
            sender_id=user.id,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        # Add TRASH label to thread
        thread_label = ThreadLabel(
            thread_id=thread.id,
            label_id=trash_label.id,
            user_id=user.id
        )
        db_session.add(thread_label)
        db_session.commit()
        
        # Remove TRASH label
        response = client.delete(
            f"/api/v1/emails/{email.id}/labels/{trash_label.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 204
        
        # Verify INBOX label was added
        inbox_thread_label = db_session.query(ThreadLabel).filter(
            ThreadLabel.thread_id == thread.id,
            ThreadLabel.label_id == inbox_label.id,
            ThreadLabel.user_id == user.id
        ).first()
        
        assert inbox_thread_label is not None


class TestTrashFolder:
    """Test trash folder behavior."""

    def test_trash_folder_shows_trashed_emails(self, client_with_auth, db_session):
        """Test that trash folder shows emails in trash folder."""
        client, token, user = client_with_auth
        
        # Create thread with trashed email
        thread = Thread(subject="Trash Thread", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.commit()
        
        trashed_email = Email(
            subject="Deleted email",
            body="Content",
            status="received",
            folder=FolderType.TRASH.value,
            sender_id=user.id,
            thread_id=thread.id
        )
        db_session.add(trashed_email)
        db_session.commit()
        
        response = client.get(
            "/api/v1/emails?folder=trash",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert len(data["results"]) == 1
        assert data["results"][0]["folder"] == "trash"

    def test_delete_email_moves_to_trash(self, client_with_auth, db_session, sample_email):
        """Test deleting an email moves it to trash folder."""
        client, token, user = client_with_auth
        email_id = sample_email.id
        
        response = client.delete(
            f"/api/v1/emails/{email_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 204
        
        # Verify email is in trash
        db_session.expire_all()
        email = db_session.query(Email).filter(Email.id == email_id).first()
        assert email.folder == FolderType.TRASH.value
