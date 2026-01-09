"""Tests for Response Wrapper Middleware.

Verifies that all API responses are wrapped in the consistent format:
{
    "success": true/false,
    "message": "...",
    "statusCode": 200,
    "data": {...}
}
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.email import Email
from app.core.constants import FolderType


class TestResponseWrapperFormat:
    """Test that responses follow the wrapped format structure."""

    def test_success_response_has_correct_structure(self, client):
        """Test that successful responses have all required fields."""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check all required fields exist
        assert "success" in data
        assert "message" in data
        assert "statusCode" in data
        assert "data" in data
        
        # Check values for success response
        assert data["success"] is True
        assert data["statusCode"] == 200
        assert data["data"]["status"] == "ok"

    def test_root_endpoint_wrapped(self, client):
        """Test root endpoint response is wrapped."""
        response = client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["statusCode"] == 200
        assert data["data"]["message"] == "Backend Mailg API"
        assert data["data"]["version"] == "1.0.0"

    def test_success_message_default(self, client):
        """Test that success responses have default 'Success' message."""
        response = client.get("/health")
        
        data = response.json()
        assert data["message"] == "Success"


class TestErrorResponseWrapping:
    """Test that error responses are properly wrapped."""

    def test_401_unauthorized_wrapped(self, client):
        """Test 401 Unauthorized is wrapped correctly."""
        response = client.get("/api/v1/emails")
        
        assert response.status_code == 401
        data = response.json()
        
        assert data["success"] is False
        assert data["statusCode"] == 401
        assert "message" in data
        assert "data" in data

    def test_404_not_found_wrapped(self, client_with_auth):
        """Test 404 Not Found is wrapped correctly."""
        client, token, user = client_with_auth
        
        # Use a valid UUID format that doesn't exist
        response = client.get(
            "/api/v1/emails/00000000-0000-0000-0000-000000099999",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 404
        data = response.json()
        
        assert data["success"] is False
        assert data["statusCode"] == 404
        assert "message" in data


class TestValidationErrorWrapping:
    """Test that validation errors are wrapped correctly."""

    def test_validation_error_wrapped(self, client_with_auth):
        """Test validation errors have correct wrapped format."""
        client, token, user = client_with_auth
        
        # Send invalid data (recipient with invalid type)
        response = client.post(
            "/api/v1/emails",
            json={
                "recipients": [{"email": "test@example.com", "type": "invalid_type"}]
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400
        data = response.json()
        
        assert data["success"] is False
        assert data["statusCode"] == 400
        assert "message" in data


class TestCRUDResponseWrapping:
    """Test CRUD operation responses are wrapped correctly."""

    def test_create_email_response_wrapped(self, client_with_auth, db_session):
        """Test POST create response is wrapped."""
        client, token, user = client_with_auth
        
        response = client.post(
            "/api/v1/emails",
            json={
                "subject": "Test Email",
                "body": "Test body",
                "recipients": [{"email": "test@example.com", "type": "to"}]
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 201
        data = response.json()
        
        assert data["success"] is True
        assert data["statusCode"] == 201
        assert data["data"]["subject"] == "Test Email"

    def test_list_emails_response_wrapped(self, client_with_auth, db_session):
        """Test GET list response is wrapped."""
        client, token, user = client_with_auth
        
        # Create some emails
        for i in range(3):
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
            "/api/v1/emails",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["statusCode"] == 200
        assert "results" in data["data"]
        assert "total" in data["data"]

    def test_get_email_response_wrapped(self, client_with_auth, db_session):
        """Test GET single email response is wrapped."""
        client, token, user = client_with_auth
        
        email = Email(
            subject="Test Email",
            body="Test body",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=user.id,
        )
        db_session.add(email)
        db_session.commit()
        db_session.refresh(email)
        
        response = client.get(
            f"/api/v1/emails/{email.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["statusCode"] == 200
        assert data["data"]["id"] == str(email.id)
        assert data["data"]["subject"] == "Test Email"


class TestDocsEndpointsNotWrapped:
    """Test that documentation endpoints are not wrapped."""

    def test_openapi_json_not_wrapped(self, client):
        """Test /openapi.json is not wrapped."""
        response = client.get("/openapi.json")
        
        assert response.status_code == 200
        data = response.json()
        
        # OpenAPI schema should have these fields, not wrapper fields
        assert "openapi" in data
        assert "info" in data
        assert "paths" in data


class TestStatusCodeMapping:
    """Test that statusCode correctly reflects HTTP status."""

    def test_200_status_code(self, client):
        """Test 200 OK has statusCode 200."""
        response = client.get("/health")
        
        data = response.json()
        assert response.status_code == 200
        assert data["statusCode"] == 200

    def test_error_status_codes_mapped(self, client):
        """Test error status codes are correctly mapped."""
        # 401 Unauthorized
        response = client.get("/api/v1/emails")
        data = response.json()
        
        assert response.status_code == data["statusCode"]


class TestSuccessFlag:
    """Test the success flag is set correctly."""

    def test_2xx_responses_success_true(self, client):
        """Test 2xx responses have success: true."""
        response = client.get("/health")
        
        data = response.json()
        assert data["success"] is True

    def test_4xx_responses_success_false(self, client):
        """Test 4xx responses have success: false."""
        response = client.get("/api/v1/emails")  # 401
        
        data = response.json()
        assert data["success"] is False

    def test_404_success_false(self, client_with_auth):
        """Test 404 has success: false."""
        client, token, user = client_with_auth
        
        response = client.get(
            "/api/v1/emails/99999",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        data = response.json()
        assert data["success"] is False


class TestNoDoubleWrapping:
    """Test that responses are not double-wrapped."""

    def test_response_wrapped_once(self, client):
        """Test responses are wrapped exactly once."""
        response = client.get("/health")
        
        data = response.json()
        
        # Should have wrapper structure
        assert "success" in data
        assert "message" in data
        assert "statusCode" in data
        assert "data" in data
        
        # Data should NOT have wrapper structure (no double wrapping)
        inner_data = data["data"]
        if isinstance(inner_data, dict):
            # If inner data happens to have these fields, they should be actual data
            # not another wrapper layer with the same structure
            if all(k in inner_data for k in ["success", "message", "statusCode", "data"]):
                # This would indicate double-wrapping - should not happen
                pytest.fail("Response appears to be double-wrapped")
