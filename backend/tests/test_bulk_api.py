"""Tests for Bulk Operations API endpoints."""

import pytest
import uuid
from datetime import datetime, timedelta
from app.models.email import Email
from app.models.folder import Folder
from app.models.label import Label
from app.models.email_label import EmailLabel
from app.models.user import User


# Helper to generate a non-existent UUID for 404 tests
NON_EXISTENT_UUID = "00000000-0000-0000-0000-000000099999"
NON_EXISTENT_UUID_2 = "00000000-0000-0000-0000-000000099998"


class TestBulkRead:
    """Test bulk mark read/unread operations."""

    def test_bulk_mark_read_success(self, client_with_auth, db_session, sample_folder):
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
                folder_id=sample_folder.id
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

    def test_bulk_mark_unread_success(self, client_with_auth, db_session, sample_folder):
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
                folder_id=sample_folder.id
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

    def test_bulk_read_partial_success(self, client_with_auth, db_session, sample_folder):
        """Test bulk read with some invalid email IDs."""
        client, token, user = client_with_auth
        
        # Create one valid email
        email = Email(
            subject="Valid Email",
            body="Body",
            status="received",
            is_read=False,
            sender_id=user.id,
            folder_id=sample_folder.id
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

    def test_bulk_star_success(self, client_with_auth, db_session, sample_folder):
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
                folder_id=sample_folder.id
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

    def test_bulk_unstar_success(self, client_with_auth, db_session, sample_folder):
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
                folder_id=sample_folder.id
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

    def test_bulk_move_success(self, client_with_auth, db_session, sample_folder, sample_trash_folder):
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
                folder_id=sample_folder.id
            )
            db_session.add(email)
            emails.append(email)
        db_session.commit()
        
        email_ids = [str(e.id) for e in emails]
        
        response = client.post(
            "/api/v1/bulk/move",
            json={"email_ids": email_ids, "folder_id": str(sample_trash_folder.id)},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["successful"] == 3
        
        # Verify emails are moved
        for email in emails:
            db_session.refresh(email)
            assert email.folder_id == sample_trash_folder.id

    def test_bulk_move_invalid_folder(self, client_with_auth, db_session, sample_folder):
        """Test bulk move to invalid folder fails."""
        client, token, user = client_with_auth
        
        # Create an email
        email = Email(
            subject="Test Email",
            body="Body",
            status="received",
            sender_id=user.id,
            folder_id=sample_folder.id
        )
        db_session.add(email)
        db_session.commit()
        
        response = client.post(
            "/api/v1/bulk/move",
            json={"email_ids": [str(email.id)], "folder_id": NON_EXISTENT_UUID},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400


class TestBulkDelete:
    """Test bulk delete operations."""

    def test_bulk_delete_to_trash(self, client_with_auth, db_session, sample_folder, sample_trash_folder):
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
                folder_id=sample_folder.id
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
            assert email.folder_id == sample_trash_folder.id

    def test_bulk_delete_permanent(self, client_with_auth, db_session, sample_folder):
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
                folder_id=sample_folder.id
            )
            db_session.add(email)
            emails.append(email)
        db_session.commit()
        
        email_ids = [str(e.id) for e in emails]
        
        response = client.post(
            "/api/v1/bulk/delete",
            json={"email_ids": email_ids, "permanent": True},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["successful"] == 3
        
        # Verify emails are soft deleted
        for email in emails:
            db_session.refresh(email)
            assert email.is_deleted == True


class TestBulkLabels:
    """Test bulk label add/remove operations."""

    def test_bulk_add_labels_success(self, client_with_auth, db_session, sample_folder, sample_label):
        """Test adding labels to multiple emails."""
        client, token, user = client_with_auth
        
        # Create another label
        label2 = Label(
            name="Label 2",
            color="#00ff00",
            owner_id=user.id
        )
        db_session.add(label2)
        db_session.commit()
        
        # Create multiple emails
        emails = []
        for i in range(3):
            email = Email(
                subject=f"Email {i}",
                body=f"Body {i}",
                status="received",
                sender_id=user.id,
                folder_id=sample_folder.id
            )
            db_session.add(email)
            emails.append(email)
        db_session.commit()
        
        email_ids = [str(e.id) for e in emails]
        
        response = client.post(
            "/api/v1/bulk/labels/add",
            json={"email_ids": email_ids, "label_ids": [str(sample_label.id), str(label2.id)]},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["successful"] == 3
        
        # Verify labels are added
        for email in emails:
            email_labels = db_session.query(EmailLabel).filter(
                EmailLabel.email_id == email.id
            ).all()
            assert len(email_labels) == 2

    def test_bulk_add_labels_invalid_label(self, client_with_auth, db_session, sample_folder):
        """Test adding invalid labels fails."""
        client, token, user = client_with_auth
        
        # Create an email
        email = Email(
            subject="Test Email",
            body="Body",
            status="received",
            sender_id=user.id,
            folder_id=sample_folder.id
        )
        db_session.add(email)
        db_session.commit()
        
        response = client.post(
            "/api/v1/bulk/labels/add",
            json={"email_ids": [str(email.id)], "label_ids": [NON_EXISTENT_UUID]},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400

    def test_bulk_remove_labels_success(self, client_with_auth, db_session, sample_folder, sample_label):
        """Test removing labels from multiple emails."""
        client, token, user = client_with_auth
        
        # Create multiple emails with labels
        emails = []
        for i in range(3):
            email = Email(
                subject=f"Email {i}",
                body=f"Body {i}",
                status="received",
                sender_id=user.id,
                folder_id=sample_folder.id
            )
            db_session.add(email)
            emails.append(email)
        db_session.commit()
        
        # Add labels to emails
        for email in emails:
            email_label = EmailLabel(email_id=email.id, label_id=sample_label.id)
            db_session.add(email_label)
        db_session.commit()
        
        email_ids = [str(e.id) for e in emails]
        
        response = client.post(
            "/api/v1/bulk/labels/remove",
            json={"email_ids": email_ids, "label_ids": [str(sample_label.id)]},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["successful"] == 3
        
        # Verify labels are removed
        for email in emails:
            email_labels = db_session.query(EmailLabel).filter(
                EmailLabel.email_id == email.id
            ).all()
            assert len(email_labels) == 0


class TestBulkSnooze:
    """Test bulk snooze/unsnooze operations."""

    def test_bulk_snooze_success(self, client_with_auth, db_session, sample_folder):
        """Test snoozing multiple emails."""
        client, token, user = client_with_auth
        
        # Create multiple emails
        emails = []
        for i in range(3):
            email = Email(
                subject=f"Email {i}",
                body=f"Body {i}",
                status="received",
                sender_id=user.id,
                folder_id=sample_folder.id
            )
            db_session.add(email)
            emails.append(email)
        db_session.commit()
        
        email_ids = [str(e.id) for e in emails]
        snooze_time = (datetime.utcnow() + timedelta(days=1)).isoformat()
        
        response = client.post(
            "/api/v1/bulk/snooze",
            json={"email_ids": email_ids, "snooze_until": snooze_time},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["successful"] == 3
        
        # Verify emails are snoozed
        for email in emails:
            db_session.refresh(email)
            assert email.snooze_until is not None

    def test_bulk_snooze_past_time_fails(self, client_with_auth, db_session, sample_folder):
        """Test bulk snooze with past time fails."""
        client, token, user = client_with_auth
        
        # Create an email
        email = Email(
            subject="Test Email",
            body="Body",
            status="received",
            sender_id=user.id,
            folder_id=sample_folder.id
        )
        db_session.add(email)
        db_session.commit()
        
        snooze_time = (datetime.utcnow() - timedelta(days=1)).isoformat()
        
        response = client.post(
            "/api/v1/bulk/snooze",
            json={"email_ids": [str(email.id)], "snooze_until": snooze_time},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400

    def test_bulk_unsnooze_success(self, client_with_auth, db_session, sample_folder):
        """Test unsnoozing multiple emails."""
        client, token, user = client_with_auth
        
        # Create multiple snoozed emails
        emails = []
        for i in range(3):
            email = Email(
                subject=f"Email {i}",
                body=f"Body {i}",
                status="received",
                sender_id=user.id,
                folder_id=sample_folder.id,
                snooze_until=datetime.utcnow() + timedelta(days=1)
            )
            db_session.add(email)
            emails.append(email)
        db_session.commit()
        
        email_ids = [str(e.id) for e in emails]
        
        response = client.post(
            "/api/v1/bulk/unsnooze",
            json={"email_ids": email_ids},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["successful"] == 3
        
        # Verify emails are unsnoozed
        for email in emails:
            db_session.refresh(email)
            assert email.snooze_until is None


class TestBulkArchive:
    """Test bulk archive operations."""

    def test_bulk_archive_success(self, client_with_auth, db_session, sample_folder):
        """Test archiving multiple emails."""
        client, token, user = client_with_auth
        
        # Create multiple emails
        emails = []
        for i in range(3):
            email = Email(
                subject=f"Email {i}",
                body=f"Body {i}",
                status="received",
                sender_id=user.id,
                folder_id=sample_folder.id
            )
            db_session.add(email)
            emails.append(email)
        db_session.commit()
        
        email_ids = [str(e.id) for e in emails]
        
        response = client.post(
            "/api/v1/bulk/archive",
            json={"email_ids": email_ids},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["successful"] == 3
        
        # Verify emails are archived
        for email in emails:
            db_session.refresh(email)
            assert email.status == "archived"


class TestBulkAccessControl:
    """Test bulk operations access control."""

    def test_bulk_operation_other_user_emails(self, client_with_auth, db_session, sample_folder):
        """Test that users cannot modify other users' emails."""
        client, token, user = client_with_auth
        
        # Create another user
        other_user = User(
            first_name="Other",
            last_name="User",
            email="other@example.com",
            role="user",
            active=True,
            is_deleted=False
        )
        db_session.add(other_user)
        db_session.commit()
        
        # Create another user's folder
        other_folder = Folder(
            name="Other Inbox",
            folder_type="inbox",
            owner_id=other_user.id,
            is_system=True
        )
        db_session.add(other_folder)
        db_session.commit()
        
        # Create email owned by other user
        other_email = Email(
            subject="Other's Email",
            body="Body",
            status="received",
            sender_id=other_user.id,
            folder_id=other_folder.id
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

    def test_bulk_response_structure(self, client_with_auth, db_session, sample_folder):
        """Test that bulk response has correct structure."""
        client, token, user = client_with_auth
        
        # Create an email
        email = Email(
            subject="Test Email",
            body="Body",
            status="received",
            sender_id=user.id,
            folder_id=sample_folder.id
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


class TestBulkCategory:
    """Test bulk category update operations."""

    def test_bulk_category_success(self, client_with_auth, db_session, sample_folder):
        """Test updating category for multiple emails."""
        client, token, user = client_with_auth
        
        # Create multiple emails with primary category
        emails = []
        for i in range(3):
            email = Email(
                subject=f"Email {i}",
                body=f"Body {i}",
                status="received",
                category="primary",
                sender_id=user.id,
                folder_id=sample_folder.id
            )
            db_session.add(email)
            emails.append(email)
        db_session.commit()
        
        email_ids = [str(e.id) for e in emails]
        
        response = client.post(
            "/api/v1/bulk/category",
            json={"email_ids": email_ids, "category": "promotions"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["successful"] == 3
        
        # Verify emails have new category
        for email in emails:
            db_session.refresh(email)
            assert email.category == "promotions"

    def test_bulk_category_all_types(self, client_with_auth, db_session, sample_folder):
        """Test all valid category types."""
        client, token, user = client_with_auth
        
        categories = ["primary", "promotions", "social", "updates", "forums"]
        
        for category in categories:
            # Create an email
            email = Email(
                subject=f"Email for {category}",
                body="Body",
                status="received",
                sender_id=user.id,
                folder_id=sample_folder.id
            )
            db_session.add(email)
            db_session.commit()
            
            response = client.post(
                "/api/v1/bulk/category",
                json={"email_ids": [str(email.id)], "category": category},
                headers={"Authorization": f"Bearer {token}"}
            )
            
            assert response.status_code == 200
            data = response.json()["data"]
            assert data["successful"] == 1
            
            db_session.refresh(email)
            assert email.category == category

    def test_bulk_category_invalid_fails(self, client_with_auth, db_session, sample_folder):
        """Test bulk category with invalid category fails."""
        client, token, user = client_with_auth
        
        # Create an email
        email = Email(
            subject="Test Email",
            body="Body",
            status="received",
            sender_id=user.id,
            folder_id=sample_folder.id
        )
        db_session.add(email)
        db_session.commit()
        
        response = client.post(
            "/api/v1/bulk/category",
            json={"email_ids": [str(email.id)], "category": "invalid_category"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400

    def test_bulk_category_partial_success(self, client_with_auth, db_session, sample_folder):
        """Test bulk category with some invalid email IDs."""
        client, token, user = client_with_auth
        
        # Create one valid email
        email = Email(
            subject="Valid Email",
            body="Body",
            status="received",
            sender_id=user.id,
            folder_id=sample_folder.id
        )
        db_session.add(email)
        db_session.commit()
        
        # Mix valid and invalid IDs
        email_ids = [str(email.id), NON_EXISTENT_UUID, NON_EXISTENT_UUID_2]
        
        response = client.post(
            "/api/v1/bulk/category",
            json={"email_ids": email_ids, "category": "social"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["total_requested"] == 3
        assert data["successful"] == 1
        assert data["failed"] == 2

    def test_bulk_category_unauthenticated(self, client):
        """Test bulk category without authentication fails."""
        response = client.post(
            "/api/v1/bulk/category",
            json={"email_ids": [NON_EXISTENT_UUID, NON_EXISTENT_UUID_2], "category": "promotions"}
        )
        
        assert response.status_code == 401

