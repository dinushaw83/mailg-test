"""Tests for Bulk Operations API endpoints."""

import pytest
import uuid
from datetime import UTC, datetime, timedelta
from app.models.email import Email
from app.models.thread import Thread
from app.core.constants import FolderType
from app.models.label import Label
from app.models.thread_label import ThreadLabel
from app.models.user import User


# Helper to generate a non-existent UUID for 404 tests
NON_EXISTENT_UUID = "00000000-0000-0000-0000-000000099999"
NON_EXISTENT_UUID_2 = "00000000-0000-0000-0000-000000099998"


class TestBulkRead:
    """Test bulk mark read/unread operations."""

    def test_bulk_mark_read_success(self, client_with_auth, db_session):
        """Test marking multiple emails as read."""
        client, token, user = client_with_auth
        
        # Create multiple unread emails
        emails = []
        for i in range(3):
            email = Email(
                subject=f"Email {i}",
                body=f"Body {i}",
                status="received",
                is_read=False,
                sender_id=user.id,
                folder=FolderType.INBOX.value
            )
            db_session.add(email)
            emails.append(email)
        db_session.commit()
        
        email_ids = [str(e.id) for e in emails]
        
        response = client.post(
            "/api/v1/bulk/read",
            json={"email_ids": email_ids, "is_read": True},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["total_requested"] == 3
        assert data["successful"] == 3
        assert data["failed"] == 0
        
        # Verify emails are marked as read
        for email in emails:
            db_session.refresh(email)
            assert email.is_read == True

    def test_bulk_mark_unread_success(self, client_with_auth, db_session):
        """Test marking multiple emails as unread."""
        client, token, user = client_with_auth
        
        # Create multiple read emails
        emails = []
        for i in range(3):
            email = Email(
                subject=f"Email {i}",
                body=f"Body {i}",
                status="received",
                is_read=True,
                sender_id=user.id,
                folder=FolderType.INBOX.value
            )
            db_session.add(email)
            emails.append(email)
        db_session.commit()
        
        email_ids = [str(e.id) for e in emails]
        
        response = client.post(
            "/api/v1/bulk/read",
            json={"email_ids": email_ids, "is_read": False},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["successful"] == 3
        
        # Verify emails are marked as unread
        for email in emails:
            db_session.refresh(email)
            assert email.is_read == False

    def test_bulk_read_partial_success(self, client_with_auth, db_session):
        """Test bulk read with some invalid email IDs."""
        client, token, user = client_with_auth
        
        # Create one valid email
        email = Email(
            subject="Valid Email",
            body="Body",
            status="received",
            is_read=False,
            sender_id=user.id,
            folder=FolderType.INBOX.value
        )
        db_session.add(email)
        db_session.commit()
        
        # Mix valid and invalid IDs
        email_ids = [str(email.id), NON_EXISTENT_UUID, NON_EXISTENT_UUID_2]
        
        response = client.post(
            "/api/v1/bulk/read",
            json={"email_ids": email_ids, "is_read": True},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["total_requested"] == 3
        assert data["successful"] == 1
        assert data["failed"] == 2

    def test_bulk_read_unauthenticated(self, client):
        """Test bulk read without authentication fails."""
        response = client.post(
            "/api/v1/bulk/read",
            json={"email_ids": [NON_EXISTENT_UUID, NON_EXISTENT_UUID_2], "is_read": True}
        )
        
        assert response.status_code == 401

    def test_bulk_read_empty_list(self, client_with_auth):
        """Test bulk read with empty email list fails validation."""
        client, token, user = client_with_auth
        
        response = client.post(
            "/api/v1/bulk/read",
            json={"email_ids": [], "is_read": True},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 422


class TestBulkStar:
    """Test bulk star/unstar operations."""

    def test_bulk_star_success(self, client_with_auth, db_session):
        """Test starring multiple emails."""
        client, token, user = client_with_auth
        
        # Create multiple unstarred emails
        emails = []
        for i in range(3):
            email = Email(
                subject=f"Email {i}",
                body=f"Body {i}",
                status="received",
                is_starred=False,
                sender_id=user.id,
                folder=FolderType.INBOX.value
            )
            db_session.add(email)
            emails.append(email)
        db_session.commit()
        
        email_ids = [str(e.id) for e in emails]
        
        response = client.post(
            "/api/v1/bulk/star",
            json={"email_ids": email_ids, "is_starred": True},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["successful"] == 3
        
        # Verify emails are starred
        for email in emails:
            db_session.refresh(email)
            assert email.is_starred == True

    def test_bulk_unstar_success(self, client_with_auth, db_session):
        """Test unstarring multiple emails."""
        client, token, user = client_with_auth
        
        # Create multiple starred emails
        emails = []
        for i in range(3):
            email = Email(
                subject=f"Email {i}",
                body=f"Body {i}",
                status="received",
                is_starred=True,
                sender_id=user.id,
                folder=FolderType.INBOX.value
            )
            db_session.add(email)
            emails.append(email)
        db_session.commit()
        
        email_ids = [str(e.id) for e in emails]
        
        response = client.post(
            "/api/v1/bulk/star",
            json={"email_ids": email_ids, "is_starred": False},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["successful"] == 3


class TestBulkMove:
    """Test bulk move to folder operations."""

    def test_bulk_move_success(self, client_with_auth, db_session):
        """Test moving multiple emails to a folder."""
        client, token, user = client_with_auth
        
        # Create multiple emails
        emails = []
        for i in range(3):
            email = Email(
                subject=f"Email {i}",
                body=f"Body {i}",
                status="received",
                sender_id=user.id,
                folder=FolderType.INBOX.value
            )
            db_session.add(email)
            emails.append(email)
        db_session.commit()
        
        email_ids = [str(e.id) for e in emails]
        
        response = client.post(
            "/api/v1/bulk/move",
            json={"email_ids": email_ids, "folder": "trash"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["successful"] == 3
        
        # Verify emails are moved
        for email in emails:
            db_session.refresh(email)
            assert email.folder == FolderType.TRASH.value

    def test_bulk_move_invalid_folder(self, client_with_auth, db_session):
        """Test bulk move to invalid folder fails."""
        client, token, user = client_with_auth
        
        # Create an email
        email = Email(
            subject="Test Email",
            body="Body",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value
        )
        db_session.add(email)
        db_session.commit()
        
        response = client.post(
            "/api/v1/bulk/move",
            json={"email_ids": [str(email.id)], "folder": "invalid_folder"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400


class TestBulkDelete:
    """Test bulk delete operations."""

    def test_bulk_delete_to_trash(self, client_with_auth, db_session):
        """Test deleting multiple emails (moves to trash)."""
        client, token, user = client_with_auth
        
        # Create multiple emails
        emails = []
        for i in range(3):
            email = Email(
                subject=f"Email {i}",
                body=f"Body {i}",
                status="received",
                sender_id=user.id,
                folder=FolderType.INBOX.value
            )
            db_session.add(email)
            emails.append(email)
        db_session.commit()
        
        email_ids = [str(e.id) for e in emails]
        
        response = client.post(
            "/api/v1/bulk/delete",
            json={"email_ids": email_ids, "permanent": False},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["successful"] == 3
        
        # Verify emails are moved to trash
        for email in emails:
            db_session.refresh(email)
            assert email.folder == FolderType.TRASH.value

    def test_bulk_delete_permanent(self, client_with_auth, db_session):
        """Test permanently deleting multiple emails."""
        client, token, user = client_with_auth
        
        # Create multiple emails
        emails = []
        for i in range(3):
            email = Email(
                subject=f"Email {i}",
                body=f"Body {i}",
                status="received",
                sender_id=user.id,
                folder=FolderType.INBOX.value
            )
            db_session.add(email)
            emails.append(email)
        db_session.commit()
        
        email_ids = [str(e.id) for e in emails]
        email_ids_raw = [e.id for e in emails]
        
        response = client.post(
            "/api/v1/bulk/delete",
            json={"email_ids": email_ids, "permanent": True},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["successful"] == 3
        
        # Verify emails are deleted
        db_session.expire_all()
        db_session.query(Email).filter(Email.id.in_(email_ids_raw)).all() == []


class TestBulkLabels:
    """Test bulk label add/remove operations."""

    def test_bulk_update_labels_add_and_remove(self, client_with_auth, db_session, sample_label):
        """Test unified endpoint to add and remove labels in one operation."""
        client, token, user = client_with_auth

        # Create two more labels
        label2 = Label(name="Label 2", color="#00ff00", owner_id=user.id)
        label3 = Label(name="Label 3", color="#0000ff", owner_id=user.id)
        db_session.add_all([label2, label3])
        db_session.commit()

        # Create multiple threads with emails
        threads = []
        for i in range(3):
            thread = Thread(subject=f"Thread {i}", owner_id=user.id, email_count=1)
            db_session.add(thread)
            db_session.flush()
            threads.append(thread)
            # Create email in thread for access
            email = Email(
                subject=f"Email {i}",
                body=f"Body {i}",
                status="sent",
                sender_id=user.id,
                thread_id=thread.id,
                folder=FolderType.SENT.value
            )
            db_session.add(email)
        db_session.commit()

        # Add label1 to all threads initially
        for thread in threads:
            thread_label = ThreadLabel(thread_id=thread.id, label_id=sample_label.id, user_id=user.id)
            db_session.add(thread_label)
        db_session.commit()

        thread_ids = [str(t.id) for t in threads]

        # Update: Add label2 and label3, Remove label1
        response = client.post(
            "/api/v1/bulk/labels/update",
            json={
                "thread_ids": thread_ids,
                "labels": {
                    "add": [str(label2.id), str(label3.id)],
                    "remove": [str(sample_label.id)]
                }
            },
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["successful"] == 3

        # Verify: label1 removed, label2 and label3 added
        for thread in threads:
            thread_labels = db_session.query(ThreadLabel).filter(
                ThreadLabel.thread_id == thread.id
            ).all()
            label_ids = {tl.label_id for tl in thread_labels}
            assert sample_label.id not in label_ids  # label1 removed
            assert label2.id in label_ids  # label2 added
            assert label3.id in label_ids  # label3 added
            assert len(thread_labels) == 2

    def test_bulk_update_labels_only_add(self, client_with_auth, db_session, sample_label):
        """Test unified endpoint with only add operation."""
        client, token, user = client_with_auth

        # Create thread with email
        thread = Thread(subject="Test Thread", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        email = Email(
            subject="Test Email",
            body="Body",
            status="sent",
            sender_id=user.id,
            thread_id=thread.id,
            folder=FolderType.SENT.value
        )
        db_session.add(email)
        db_session.commit()

        response = client.post(
            "/api/v1/bulk/labels/update",
            json={
                "thread_ids": [str(thread.id)],
                "labels": {
                    "add": [str(sample_label.id)],
                    "remove": []
                }
            },
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["successful"] == 1

        # Verify label added
        thread_labels = db_session.query(ThreadLabel).filter(
            ThreadLabel.thread_id == thread.id
        ).all()
        assert len(thread_labels) == 1
        assert thread_labels[0].label_id == sample_label.id

    def test_bulk_update_labels_only_remove(self, client_with_auth, db_session, sample_label):
        """Test unified endpoint with only remove operation."""
        client, token, user = client_with_auth

        # Create thread with email and label
        thread = Thread(subject="Test Thread", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        email = Email(
            subject="Test Email",
            body="Body",
            status="sent",
            sender_id=user.id,
            thread_id=thread.id,
            folder=FolderType.SENT.value
        )
        db_session.add(email)
        db_session.commit()

        thread_label = ThreadLabel(thread_id=thread.id, label_id=sample_label.id, user_id=user.id)
        db_session.add(thread_label)
        db_session.commit()

        response = client.post(
            "/api/v1/bulk/labels/update",
            json={
                "thread_ids": [str(thread.id)],
                "labels": {
                    "add": [],
                    "remove": [str(sample_label.id)]
                }
            },
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["successful"] == 1

        # Verify label removed
        thread_labels = db_session.query(ThreadLabel).filter(
            ThreadLabel.thread_id == thread.id
        ).all()
        assert len(thread_labels) == 0

    def test_bulk_update_labels_empty_fails(self, client_with_auth, db_session):
        """Test unified endpoint fails with no labels to add or remove."""
        client, token, user = client_with_auth

        thread = Thread(subject="Test Thread", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.commit()

        response = client.post(
            "/api/v1/bulk/labels/update",
            json={
                "thread_ids": [str(thread.id)],
                "labels": {
                    "add": [],
                    "remove": []
                }
            },
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 400


class TestBulkSnooze:
    """Test bulk snooze/unsnooze operations."""

    def test_bulk_snooze_success(self, client_with_auth, db_session):
        """Test snoozing multiple threads."""
        from app.models.thread_user_metadata import ThreadUserMetadata

        client, token, user = client_with_auth

        # Create multiple threads with emails
        threads = []
        for i in range(3):
            thread = Thread(
                subject=f"Thread {i}",
                owner_id=user.id,
                email_count=1
            )
            db_session.add(thread)
            db_session.flush()
            threads.append(thread)
            # Create email in thread for access
            email = Email(
                subject=f"Email {i}",
                body=f"Body {i}",
                status="sent",
                sender_id=user.id,
                thread_id=thread.id,
                folder=FolderType.SENT.value
            )
            db_session.add(email)
        db_session.commit()

        thread_ids = [str(t.id) for t in threads]
        snooze_time = (datetime.now(UTC) + timedelta(days=1)).isoformat()

        response = client.post(
            "/api/v1/bulk/snooze",
            json={"thread_ids": thread_ids, "snooze_until": snooze_time},
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["successful"] == 3

        # Verify threads are snoozed via ThreadUserMetadata
        for thread in threads:
            metadata = db_session.query(ThreadUserMetadata).filter(
                ThreadUserMetadata.thread_id == thread.id,
                ThreadUserMetadata.user_id == user.id
            ).first()
            assert metadata is not None
            assert metadata.snooze_until is not None

    def test_bulk_snooze_past_time_fails(self, client_with_auth, db_session):
        """Test bulk snooze with past time fails."""
        client, token, user = client_with_auth

        # Create a thread
        thread = Thread(subject="Test Thread", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.commit()

        snooze_time = (datetime.now(UTC) - timedelta(days=1)).isoformat()

        response = client.post(
            "/api/v1/bulk/snooze",
            json={"thread_ids": [str(thread.id)], "snooze_until": snooze_time},
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 400

    def test_bulk_unsnooze_success(self, client_with_auth, db_session):
        """Test unsnoozing multiple threads."""
        from app.models.thread_user_metadata import ThreadUserMetadata

        client, token, user = client_with_auth

        # Create multiple threads with emails and snooze metadata
        threads = []
        for i in range(3):
            thread = Thread(
                subject=f"Thread {i}",
                owner_id=user.id,
                email_count=1
            )
            db_session.add(thread)
            db_session.flush()
            threads.append(thread)

            # Create email in thread for access
            email = Email(
                subject=f"Email {i}",
                body=f"Body {i}",
                status="sent",
                sender_id=user.id,
                thread_id=thread.id,
                folder=FolderType.SENT.value
            )
            db_session.add(email)

            # Create snooze metadata for thread
            metadata = ThreadUserMetadata(
                thread_id=thread.id,
                user_id=user.id,
                snooze_until=datetime.now(UTC) + timedelta(days=1)
            )
            db_session.add(metadata)
        db_session.commit()

        thread_ids = [str(t.id) for t in threads]

        response = client.post(
            "/api/v1/bulk/unsnooze",
            json={"thread_ids": thread_ids},
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["successful"] == 3

        # Verify threads are unsnoozed
        for thread in threads:
            metadata = db_session.query(ThreadUserMetadata).filter(
                ThreadUserMetadata.thread_id == thread.id,
                ThreadUserMetadata.user_id == user.id
            ).first()
            assert metadata is not None
            assert metadata.snooze_until is None


class TestBulkArchive:
    """Test bulk archive operations."""

    def test_bulk_archive_success(self, client_with_auth, db_session):
        """Test archiving multiple threads."""
        client, token, user = client_with_auth

        # Create multiple threads with emails
        threads = []
        for i in range(3):
            thread = Thread(
                subject=f"Thread {i}",
                owner_id=user.id,
                email_count=1
            )
            db_session.add(thread)
            db_session.flush()
            threads.append(thread)
            # Create email in thread for access
            email = Email(
                subject=f"Email {i}",
                body=f"Body {i}",
                status="sent",
                sender_id=user.id,
                thread_id=thread.id,
                folder=FolderType.SENT.value
            )
            db_session.add(email)
        db_session.commit()

        thread_ids = [str(t.id) for t in threads]

        response = client.post(
            "/api/v1/bulk/archive",
            json={"thread_ids": thread_ids},
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["successful"] == 3

        # Verify threads are archived in ThreadUserMetadata
        from app.models.thread_user_metadata import ThreadUserMetadata
        for thread in threads:
            metadata = db_session.query(ThreadUserMetadata).filter(
                ThreadUserMetadata.thread_id == thread.id,
                ThreadUserMetadata.user_id == user.id
            ).first()
            assert metadata is not None
            assert metadata.is_archived == True

    def test_bulk_unarchive_success(self, client_with_auth, db_session):
        """Test unarchiving multiple threads."""
        from app.models.thread_user_metadata import ThreadUserMetadata

        client, token, user = client_with_auth

        # Create multiple threads with emails and archive metadata
        threads = []
        for i in range(3):
            # Create thread
            thread = Thread(
                subject=f"Thread {i}",
                owner_id=user.id,
                email_count=1
            )
            db_session.add(thread)
            db_session.flush()
            threads.append(thread)

            # Create email in thread for access
            email = Email(
                subject=f"Email {i}",
                body=f"Body {i}",
                status="sent",
                sender_id=user.id,
                thread_id=thread.id,
                folder=FolderType.SENT.value
            )
            db_session.add(email)

            # Create archive metadata for thread
            metadata = ThreadUserMetadata(
                thread_id=thread.id,
                user_id=user.id,
                is_archived=True
            )
            db_session.add(metadata)
        db_session.commit()

        thread_ids = [str(t.id) for t in threads]

        response = client.post(
            "/api/v1/bulk/unarchive",
            json={"thread_ids": thread_ids},
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["successful"] == 3

        # Verify threads are unarchived in ThreadUserMetadata
        for thread in threads:
            metadata = db_session.query(ThreadUserMetadata).filter(
                ThreadUserMetadata.thread_id == thread.id,
                ThreadUserMetadata.user_id == user.id
            ).first()
            assert metadata is not None
            assert metadata.is_archived == False


class TestBulkAccessControl:
    """Test bulk operations access control."""

    def test_bulk_operation_other_user_emails(self, client_with_auth, db_session):
        """Test that users cannot modify other users' emails."""
        client, token, user = client_with_auth
        
        # Create another user
        other_user = User(
            first_name="Other",
            last_name="User",
            email="other@example.com",
            role="user",
            active=True
        )
        db_session.add(other_user)
        db_session.commit()
        
        # Create email owned by other user
        other_email = Email(
            subject="Other's Email",
            body="Body",
            status="received",
            sender_id=other_user.id,
            folder=FolderType.INBOX.value
        )
        db_session.add(other_email)
        db_session.commit()
        
        # Try to modify other user's email
        response = client.post(
            "/api/v1/bulk/read",
            json={"email_ids": [str(other_email.id)], "is_read": True},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        # Should fail for the other user's email
        assert data["failed"] == 1
        assert data["successful"] == 0

    def test_bulk_response_structure(self, client_with_auth, db_session):
        """Test that bulk response has correct structure."""
        client, token, user = client_with_auth
        
        # Create an email
        email = Email(
            subject="Test Email",
            body="Body",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value
        )
        db_session.add(email)
        db_session.commit()
        
        response = client.post(
            "/api/v1/bulk/read",
            json={"email_ids": [str(email.id), NON_EXISTENT_UUID], "is_read": True},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Check response structure
        assert "total_requested" in data
        assert "successful" in data
        assert "failed" in data
        assert "results" in data
        
        # Check individual results
        assert len(data["results"]) == 2
        for result in data["results"]:
            assert "id" in result
            assert "success" in result
            if not result["success"]:
                assert "error" in result


class TestBulkThreadUnstar:
    """Test bulk thread unstar operations."""

    def test_bulk_thread_unstar_success(self, client_with_auth, db_session):
        """Test unstarring all emails in multiple threads."""
        client, token, user = client_with_auth

        # Create multiple threads with multiple starred emails each
        threads = []
        all_emails = []
        for i in range(3):
            thread = Thread(
                subject=f"Thread {i}",
                owner_id=user.id,
                email_count=2
            )
            db_session.add(thread)
            db_session.flush()
            threads.append(thread)

            # Create 2 starred emails per thread
            for j in range(2):
                email = Email(
                    subject=f"Email {i}-{j}",
                    body=f"Body {i}-{j}",
                    status="sent",
                    is_starred=True,
                    sender_id=user.id,
                    thread_id=thread.id,
                    folder=FolderType.SENT.value
                )
                db_session.add(email)
                all_emails.append(email)
        db_session.commit()

        thread_ids = [str(t.id) for t in threads]

        response = client.post(
            "/api/v1/bulk/threads/unstar",
            json={"thread_ids": thread_ids},
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["total_requested"] == 3
        assert data["successful"] == 3
        assert data["failed"] == 0

        # Verify all emails in all threads are unstarred
        for email in all_emails:
            db_session.refresh(email)
            assert email.is_starred == False

    def test_bulk_thread_unstar_partial_success(self, client_with_auth, db_session):
        """Test bulk thread unstar with some invalid thread IDs."""
        client, token, user = client_with_auth

        # Create one valid thread with starred email
        thread = Thread(
            subject="Valid Thread",
            owner_id=user.id,
            email_count=1
        )
        db_session.add(thread)
        db_session.flush()

        email = Email(
            subject="Email",
            body="Body",
            status="sent",
            is_starred=True,
            sender_id=user.id,
            thread_id=thread.id,
            folder=FolderType.SENT.value
        )
        db_session.add(email)
        db_session.commit()

        # Mix valid and invalid thread IDs
        thread_ids = [str(thread.id), NON_EXISTENT_UUID, NON_EXISTENT_UUID_2]

        response = client.post(
            "/api/v1/bulk/threads/unstar",
            json={"thread_ids": thread_ids},
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["total_requested"] == 3
        assert data["successful"] == 1
        assert data["failed"] == 2

        # Verify the valid thread's email is unstarred
        db_session.refresh(email)
        assert email.is_starred == False

    def test_bulk_thread_unstar_empty_list_fails(self, client_with_auth):
        """Test bulk thread unstar with empty thread list fails validation."""
        client, token, user = client_with_auth

        response = client.post(
            "/api/v1/bulk/threads/unstar",
            json={"thread_ids": []},
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 422

    def test_bulk_thread_unstar_unauthenticated(self, client):
        """Test bulk thread unstar without authentication fails."""
        response = client.post(
            "/api/v1/bulk/threads/unstar",
            json={"thread_ids": [NON_EXISTENT_UUID]}
        )

        assert response.status_code == 401

    def test_bulk_thread_unstar_other_user_thread(self, client_with_auth, db_session):
        """Test that users cannot unstar threads they don't have access to."""
        client, token, user = client_with_auth

        # Create another user
        other_user = User(
            first_name="Other",
            last_name="User",
            email="other_thread_unstar@example.com",
            role="user",
            active=True
        )
        db_session.add(other_user)
        db_session.commit()

        # Create thread owned by other user with starred email
        other_thread = Thread(
            subject="Other's Thread",
            owner_id=other_user.id,
            email_count=1
        )
        db_session.add(other_thread)
        db_session.flush()

        other_email = Email(
            subject="Other's Email",
            body="Body",
            status="sent",
            is_starred=True,
            sender_id=other_user.id,
            thread_id=other_thread.id,
            folder=FolderType.SENT.value
        )
        db_session.add(other_email)
        db_session.commit()

        # Try to unstar other user's thread
        response = client.post(
            "/api/v1/bulk/threads/unstar",
            json={"thread_ids": [str(other_thread.id)]},
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        data = response.json()["data"]
        # Should fail for the other user's thread
        assert data["failed"] == 1
        assert data["successful"] == 0

        # Verify email is still starred
        db_session.refresh(other_email)
        assert other_email.is_starred == True


# Note: TestBulkCategory removed - category is now handled via labels
