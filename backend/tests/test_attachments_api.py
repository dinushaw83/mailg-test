"""Tests for Attachments API endpoints."""

import pytest
from app.models.attachment import Attachment


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
            "/api/v1/attachments/99999",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 404

