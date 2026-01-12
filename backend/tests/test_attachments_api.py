"""Tests for Attachments API endpoints."""

import pytest
import uuid
from app.models.attachment import Attachment
from app.models.email import Email


# Helper to generate a non-existent UUID for 404 tests
NON_EXISTENT_UUID = "00000000-0000-0000-0000-000000099999"


class TestAttachmentList:
    """Test attachment listing."""

    def test_list_email_attachments(self, client_with_auth, db_session, sample_email):
        """Test listing attachments for an email."""
        client, token, user = client_with_auth
        
        # Create attachments
        attachments = [
            Attachment(
                email_id=sample_email.id,
                filename="document.pdf",
                content_type="application/pdf",
                size_bytes=1024
            ),
            Attachment(
                email_id=sample_email.id,
                filename="image.png",
                content_type="image/png",
                size_bytes=2048
            ),
        ]
        for att in attachments:
            db_session.add(att)
        db_session.commit()
        
        response = client.get(
            f"/api/v1/emails/{sample_email.id}/attachments",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert len(data) >= 2


class TestAttachmentOperations:
    """Test attachment operations."""

    def test_get_attachment_details(self, client_with_auth, db_session, sample_attachment):
        """Test getting attachment details."""
        client, token, user = client_with_auth
        
        response = client.get(
            f"/api/v1/attachments/{sample_attachment.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["filename"] == sample_attachment.filename

    def test_attachment_not_found(self, client_with_auth):
        """Test getting a non-existent attachment returns 404."""
        client, token, user = client_with_auth
        
        response = client.get(
            f"/api/v1/attachments/{NON_EXISTENT_UUID}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 404

    def test_download_attachment_mock(self, client_with_auth, db_session, sample_attachment):
        """Test download endpoint returns mock info (no actual file content)."""
        client, token, user = client_with_auth
        
        response = client.get(
            f"/api/v1/attachments/{sample_attachment.id}/download",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["filename"] == sample_attachment.filename
        assert "download_url" in data
        assert "mock" in data["message"].lower()


class TestAttachmentCreate:
    """Test attachment metadata creation."""

    def test_create_attachment_metadata(self, client_with_auth, db_session, sample_draft_email):
        """Test creating attachment metadata (mock - no actual file)."""
        client, token, user = client_with_auth
        
        response = client.post(
            f"/api/v1/emails/{sample_draft_email.id}/attachments",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "filename": "test_document.pdf",
                "content_type": "application/pdf",
                "size_bytes": 1024
            }
        )
        
        assert response.status_code == 201
        data = response.json()["data"]
        assert data["filename"] == "test_document.pdf"
        assert data["content_type"] == "application/pdf"
        assert data["size_bytes"] == 1024
        assert data["attachment_type"] == "document"

    def test_create_attachment_minimal(self, client_with_auth, db_session, sample_draft_email):
        """Test creating attachment with minimal data (only filename)."""
        client, token, user = client_with_auth
        
        response = client.post(
            f"/api/v1/emails/{sample_draft_email.id}/attachments",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "filename": "minimal.txt"
            }
        )
        
        assert response.status_code == 201
        data = response.json()["data"]
        assert data["filename"] == "minimal.txt"
        # Defaults should be applied
        assert data["content_type"] == "application/octet-stream"
        assert data["size_bytes"] == 0

    def test_create_attachment_on_non_draft_fails(self, client_with_auth, db_session, sample_email):
        """Test that creating attachment on non-draft email fails."""
        client, token, user = client_with_auth
        
        response = client.post(
            f"/api/v1/emails/{sample_email.id}/attachments",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "filename": "should_fail.pdf"
            }
        )
        
        assert response.status_code == 404


class TestAttachmentDelete:
    """Test attachment deletion."""

    def test_delete_attachment_permanent(self, client_with_auth, db_session, sample_draft_email):
        """Test permanently deleting an attachment removes it from database."""
        client, token, user = client_with_auth
        
        # Create attachment on draft
        attachment = Attachment(
            email_id=sample_draft_email.id,
            filename="permanent_delete.pdf",
            content_type="application/pdf",
            size_bytes=512
        )
        db_session.add(attachment)
        db_session.commit()
        attachment_id = attachment.id
        
        response = client.delete(
            f"/api/v1/attachments/{attachment_id}?permanent=true",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 204
        
        # Verify attachment is completely gone
        db_session.expire_all()
        attachment_check = db_session.query(Attachment).filter(Attachment.id == attachment_id).first()
        assert attachment_check is None

