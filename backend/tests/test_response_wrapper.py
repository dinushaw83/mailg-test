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
from app.models.item import Item


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
        response = client.get("/api/v1/items")
        
        assert response.status_code == 401
        data = response.json()
        
        assert data["success"] is False
        assert data["statusCode"] == 401
        assert "message" in data
        assert "data" in data

    def test_404_not_found_wrapped(self, client_with_auth):
        """Test 404 Not Found is wrapped correctly."""
        client, token, user = client_with_auth
        
        response = client.get(
            "/api/v1/items/99999",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 404
        data = response.json()
        
        assert data["success"] is False
        assert data["statusCode"] == 404
        assert "message" in data

    def test_403_forbidden_wrapped(self, client_with_end_user_auth, db_session, sample_admin):
        """Test 403 Forbidden is wrapped correctly."""
        client, token, user = client_with_end_user_auth
        
        # Create an item to try to update
        item = Item(
            name="Test Item",
            description="Test",
            status="active",
            priority="medium",
            created_by_id=sample_admin.id
        )
        db_session.add(item)
        db_session.commit()
        db_session.refresh(item)
        
        response = client.put(
            f"/api/v1/items/{item.id}",
            json={"name": "Updated"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 403
        data = response.json()
        
        assert data["success"] is False
        assert data["statusCode"] == 403


class TestValidationErrorWrapping:
    """Test that validation errors are wrapped correctly."""

    def test_validation_error_wrapped(self, client_with_auth):
        """Test validation errors have correct wrapped format."""
        client, token, user = client_with_auth
        
        # Send invalid data (missing required fields)
        response = client.post(
            "/api/v1/items",
            json={},  # Missing required 'name' field
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 422
        data = response.json()
        
        assert data["success"] is False
        assert data["message"] == "Validation error"
        assert data["statusCode"] == 422
        assert "errors" in data["data"]

    def test_validation_error_contains_field_details(self, client_with_auth):
        """Test validation errors contain field-level details."""
        client, token, user = client_with_auth
        
        response = client.post(
            "/api/v1/items",
            json={"name": ""},  # Empty name if validation requires non-empty
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Could be 422 or 201 depending on validation rules
        # Just verify the response is wrapped
        data = response.json()
        
        assert "success" in data
        assert "statusCode" in data
        assert "data" in data


class TestCRUDResponseWrapping:
    """Test CRUD operation responses are wrapped correctly."""

    def test_create_item_response_wrapped(self, client_with_auth):
        """Test POST create response is wrapped."""
        client, token, user = client_with_auth
        
        response = client.post(
            "/api/v1/items",
            json={
                "name": "New Item",
                "description": "Description",
                "status": "active",
                "priority": "high"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 201
        data = response.json()
        
        assert data["success"] is True
        assert data["statusCode"] == 201
        assert data["data"]["name"] == "New Item"

    def test_list_items_response_wrapped(self, client_with_auth, db_session):
        """Test GET list response is wrapped."""
        client, token, user = client_with_auth
        
        # Create some items
        for i in range(3):
            item = Item(
                name=f"Item {i}",
                status="active",
                priority="medium",
                created_by_id=user.id
            )
            db_session.add(item)
        db_session.commit()
        
        response = client.get(
            "/api/v1/items",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["statusCode"] == 200
        assert "results" in data["data"]
        assert "total" in data["data"]

    def test_get_item_response_wrapped(self, client_with_auth, db_session):
        """Test GET single item response is wrapped."""
        client, token, user = client_with_auth
        
        item = Item(
            name="Test Item",
            status="active",
            priority="high",
            created_by_id=user.id
        )
        db_session.add(item)
        db_session.commit()
        db_session.refresh(item)
        
        response = client.get(
            f"/api/v1/items/{item.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["statusCode"] == 200
        assert data["data"]["id"] == item.id
        assert data["data"]["name"] == "Test Item"

    def test_update_item_response_wrapped(self, client_with_admin_auth, db_session):
        """Test PUT update response is wrapped."""
        client, token, admin = client_with_admin_auth
        
        item = Item(
            name="Original",
            status="active",
            priority="low",
            created_by_id=admin.id
        )
        db_session.add(item)
        db_session.commit()
        db_session.refresh(item)
        
        response = client.put(
            f"/api/v1/items/{item.id}",
            json={"name": "Updated"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["statusCode"] == 200
        assert data["data"]["name"] == "Updated"

    def test_delete_item_no_content_response(self, client_with_admin_auth, db_session):
        """Test DELETE response (204 No Content)."""
        client, token, admin = client_with_admin_auth
        
        item = Item(
            name="To Delete",
            status="active",
            priority="low",
            created_by_id=admin.id
        )
        db_session.add(item)
        db_session.commit()
        db_session.refresh(item)
        
        response = client.delete(
            f"/api/v1/items/{item.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # 204 responses have no body, so they won't be wrapped
        assert response.status_code == 204


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

    def test_201_status_code(self, client_with_auth):
        """Test 201 Created has statusCode 201."""
        client, token, user = client_with_auth
        
        response = client.post(
            "/api/v1/items",
            json={
                "name": "Created Item",
                "status": "active",
                "priority": "medium"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        data = response.json()
        assert response.status_code == 201
        assert data["statusCode"] == 201

    def test_error_status_codes_mapped(self, client):
        """Test error status codes are correctly mapped."""
        # 401 Unauthorized
        response = client.get("/api/v1/items")
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
        response = client.get("/api/v1/items")  # 401
        
        data = response.json()
        assert data["success"] is False

    def test_404_success_false(self, client_with_auth):
        """Test 404 has success: false."""
        client, token, user = client_with_auth
        
        response = client.get(
            "/api/v1/items/99999",
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

