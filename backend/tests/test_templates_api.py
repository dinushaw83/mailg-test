"""Tests for Email Templates API endpoints."""

import pytest
import uuid
from app.models.email_template import EmailTemplate
from app.models.email import Email
from app.models.user import User


# Helper to generate a non-existent UUID for 404 tests
NON_EXISTENT_UUID = "00000000-0000-0000-0000-000000099999"


@pytest.fixture
def sample_template(db_session, sample_user):
    """Create a sample email template for testing."""
    template = EmailTemplate(
        name="Welcome Email",
        description="Template for welcoming new users",
        subject="Welcome to Our Platform!",
        body="Dear User,\n\nWelcome to our platform!\n\nBest regards",
        html_body="<p>Dear User,</p><p>Welcome to our platform!</p><p>Best regards</p>",
        is_shared=False,
        owner_id=sample_user.id
    )
    db_session.add(template)
    db_session.commit()
    db_session.refresh(template)
    return template


@pytest.fixture
def sample_shared_template(db_session, sample_user):
    """Create a shared template for testing."""
    template = EmailTemplate(
        name="Meeting Request",
        description="Template for scheduling meetings",
        subject="Meeting Request: [Topic]",
        body="Hi,\n\nI'd like to schedule a meeting to discuss [topic].",
        is_shared=True,
        owner_id=sample_user.id
    )
    db_session.add(template)
    db_session.commit()
    db_session.refresh(template)
    return template


class TestTemplateCreate:
    """Test template creation endpoints."""

    def test_create_template_success(self, client_with_auth):
        """Test creating a new template."""
        client, token, user = client_with_auth
        
        response = client.post(
            "/api/v1/templates",
            json={
                "name": "New Template",
                "description": "A test template",
                "subject": "Test Subject",
                "body": "Test body content"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 201
        data = response.json()["data"]
        assert data["name"] == "New Template"
        assert data["description"] == "A test template"
        assert data["subject"] == "Test Subject"
        assert data["is_shared"] == False

    def test_create_template_minimal(self, client_with_auth):
        """Test creating a template with minimal data."""
        client, token, user = client_with_auth
        
        response = client.post(
            "/api/v1/templates",
            json={"name": "Minimal Template"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 201
        data = response.json()["data"]
        assert data["name"] == "Minimal Template"

    def test_create_template_shared(self, client_with_auth):
        """Test creating a shared template."""
        client, token, user = client_with_auth
        
        response = client.post(
            "/api/v1/templates",
            json={
                "name": "Shared Template",
                "subject": "Shared Subject",
                "is_shared": True
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 201
        data = response.json()["data"]
        assert data["is_shared"] == True

    def test_create_template_unauthenticated(self, client):
        """Test creating a template without authentication fails."""
        response = client.post(
            "/api/v1/templates",
            json={"name": "Test Template"}
        )
        
        assert response.status_code == 401

    def test_create_template_empty_name_fails(self, client_with_auth):
        """Test creating a template with empty name fails validation."""
        client, token, user = client_with_auth
        
        response = client.post(
            "/api/v1/templates",
            json={"name": ""},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 422


class TestTemplateList:
    """Test template listing endpoints."""

    def test_list_templates_pagination(self, client_with_auth, db_session, sample_user):
        """Test listing templates with pagination."""
        client, token, user = client_with_auth
        
        # Create multiple templates
        for i in range(5):
            template = EmailTemplate(
                name=f"Template {i}",
                owner_id=user.id
            )
            db_session.add(template)
        db_session.commit()
        
        response = client.get(
            "/api/v1/templates?page=1&page_size=3",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert len(data["results"]) <= 3
        assert "total" in data
        assert "page" in data

    def test_list_templates_search(self, client_with_auth, db_session, sample_user):
        """Test searching templates."""
        client, token, user = client_with_auth
        
        # Create templates
        template1 = EmailTemplate(name="Welcome Email", description="For new users", owner_id=user.id)
        template2 = EmailTemplate(name="Goodbye Email", description="For leaving users", owner_id=user.id)
        db_session.add_all([template1, template2])
        db_session.commit()
        
        response = client.get(
            "/api/v1/templates?search=Welcome",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["total"] >= 1

    def test_list_includes_shared_templates(self, client_with_auth, db_session, sample_user):
        """Test that shared templates from others are included."""
        client, token, user = client_with_auth
        
        # Create another user with a shared template
        other_user = User(
            first_name="Other",
            last_name="User",
            email="other@example.com",
            role="user",
            active=True
        )
        db_session.add(other_user)
        db_session.commit()
        
        shared_template = EmailTemplate(
            name="Shared from Other",
            owner_id=other_user.id,
            is_shared=True
        )
        db_session.add(shared_template)
        db_session.commit()
        
        response = client.get(
            "/api/v1/templates?include_shared=true",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        names = [t["name"] for t in data["results"]]
        assert "Shared from Other" in names

    def test_list_excludes_shared_when_disabled(self, client_with_auth, db_session, sample_user):
        """Test excluding shared templates."""
        client, token, user = client_with_auth
        
        # Create own template
        own_template = EmailTemplate(name="My Template", owner_id=user.id)
        db_session.add(own_template)
        
        # Create another user with a shared template
        other_user = User(
            first_name="Another",
            last_name="User",
            email="another@example.com",
            role="user",
            active=True
        )
        db_session.add(other_user)
        db_session.commit()
        
        shared_template = EmailTemplate(
            name="Shared Template",
            owner_id=other_user.id,
            is_shared=True
        )
        db_session.add(shared_template)
        db_session.commit()
        
        response = client.get(
            "/api/v1/templates?include_shared=false",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        # Only own templates
        for template in data["results"]:
            assert template["owner_id"] == str(user.id)


class TestTemplateOperations:
    """Test template CRUD operations."""

    def test_get_template_by_id(self, client_with_auth, sample_template):
        """Test getting a specific template by ID."""
        client, token, user = client_with_auth
        
        response = client.get(
            f"/api/v1/templates/{sample_template.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["id"] == str(sample_template.id)
        assert data["name"] == sample_template.name

    def test_get_template_not_found(self, client_with_auth):
        """Test getting a non-existent template returns 404."""
        client, token, user = client_with_auth
        
        response = client.get(
            f"/api/v1/templates/{NON_EXISTENT_UUID}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 404

    def test_get_shared_template(self, client_with_auth, db_session):
        """Test accessing a shared template from another user."""
        client, token, user = client_with_auth
        
        # Create another user with a shared template
        other_user = User(
            first_name="Sharer",
            last_name="User",
            email="sharer@example.com",
            role="user",
            active=True
        )
        db_session.add(other_user)
        db_session.commit()
        
        shared_template = EmailTemplate(
            name="Shared",
            subject="Shared Subject",
            owner_id=other_user.id,
            is_shared=True
        )
        db_session.add(shared_template)
        db_session.commit()
        
        response = client.get(
            f"/api/v1/templates/{shared_template.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["name"] == "Shared"

    def test_update_template(self, client_with_auth, sample_template):
        """Test updating a template."""
        client, token, user = client_with_auth
        
        response = client.put(
            f"/api/v1/templates/{sample_template.id}",
            json={
                "name": "Updated Name",
                "subject": "Updated Subject"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["name"] == "Updated Name"
        assert data["subject"] == "Updated Subject"

    def test_update_template_partial(self, client_with_auth, sample_template):
        """Test partial update of a template."""
        client, token, user = client_with_auth
        original_body = sample_template.body
        
        response = client.put(
            f"/api/v1/templates/{sample_template.id}",
            json={"name": "Only Name Changed"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["name"] == "Only Name Changed"
        assert data["body"] == original_body

    def test_update_other_user_template_forbidden(self, client_with_auth, db_session):
        """Test updating another user's template is forbidden."""
        client, token, user = client_with_auth
        
        other_user = User(
            first_name="Other",
            last_name="Owner",
            email="otherowner@example.com",
            role="user",
            active=True
        )
        db_session.add(other_user)
        db_session.commit()
        
        other_template = EmailTemplate(
            name="Other's Template",
            owner_id=other_user.id,
            is_shared=True  # Even shared, can't update
        )
        db_session.add(other_template)
        db_session.commit()
        
        response = client.put(
            f"/api/v1/templates/{other_template.id}",
            json={"name": "Trying to Change"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 403

    def test_delete_template(self, client_with_auth, sample_template, db_session):
        """Test deleting a template (soft delete)."""
        client, token, user = client_with_auth
        template_id = sample_template.id
        
        response = client.delete(
            f"/api/v1/templates/{template_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 204
        
        # Verify soft deleted
        db_session.refresh(sample_template)
        assert sample_template.is_deleted == True

    def test_delete_template_permanent(self, client_with_auth, db_session):
        """Test permanently deleting a template removes it from database."""
        client, token, user = client_with_auth
        
        # Create template
        template = EmailTemplate(
            name="To Delete Permanently",
            subject="Test",
            owner_id=user.id
        )
        db_session.add(template)
        db_session.commit()
        template_id = template.id
        
        response = client.delete(
            f"/api/v1/templates/{template_id}?permanent=true",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 204
        
        # Verify template is completely gone
        db_session.expire_all()
        template_check = db_session.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
        assert template_check is None

    def test_delete_other_user_template_forbidden(self, client_with_auth, db_session):
        """Test deleting another user's template is forbidden."""
        client, token, user = client_with_auth
        
        other_user = User(
            first_name="Another",
            last_name="Owner",
            email="anotherowner@example.com",
            role="user",
            active=True
        )
        db_session.add(other_user)
        db_session.commit()
        
        other_template = EmailTemplate(
            name="Others Template",
            owner_id=other_user.id
        )
        db_session.add(other_template)
        db_session.commit()
        
        response = client.delete(
            f"/api/v1/templates/{other_template.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 403


class TestTemplateApply:
    """Test applying templates to create emails."""

    def test_apply_template_success(self, client_with_auth, sample_template):
        """Test applying a template to create a draft email."""
        client, token, user = client_with_auth
        
        response = client.post(
            f"/api/v1/templates/{sample_template.id}/apply",
            json={"template_id": str(sample_template.id)},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 201
        data = response.json()["data"]
        assert data["subject"] == sample_template.subject
        assert data["body"] == sample_template.body
        assert data["status"] == "draft"

    def test_apply_template_with_recipients(self, client_with_auth, sample_template):
        """Test applying a template with recipients."""
        client, token, user = client_with_auth
        
        response = client.post(
            f"/api/v1/templates/{sample_template.id}/apply",
            json={
                "template_id": str(sample_template.id),
                "recipients": [
                    {"email": "recipient@example.com", "name": "Test Recipient", "type": "to"}
                ]
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 201
        data = response.json()["data"]
        assert len(data["recipients"]) == 1
        assert data["recipients"][0]["email"] == "recipient@example.com"

    def test_apply_template_with_additional_body(self, client_with_auth, sample_template):
        """Test applying a template with additional content."""
        client, token, user = client_with_auth
        
        response = client.post(
            f"/api/v1/templates/{sample_template.id}/apply",
            json={
                "template_id": str(sample_template.id),
                "additional_body": "P.S. Additional message"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 201
        data = response.json()["data"]
        assert "Additional message" in data["body"]

    def test_apply_shared_template(self, client_with_auth, sample_shared_template):
        """Test applying a shared template from another context."""
        client, token, user = client_with_auth
        
        response = client.post(
            f"/api/v1/templates/{sample_shared_template.id}/apply",
            json={"template_id": str(sample_shared_template.id)},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 201

    def test_apply_template_not_found(self, client_with_auth):
        """Test applying a non-existent template."""
        client, token, user = client_with_auth
        
        response = client.post(
            f"/api/v1/templates/{NON_EXISTENT_UUID}/apply",
            json={"template_id": NON_EXISTENT_UUID},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 404

