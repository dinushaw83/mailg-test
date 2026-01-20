"""Tests for User API endpoints.

This module tests that deleting a user properly cascades to all related data:
- User's labels (system and custom)
- User's email templates
- User's saved searches
- User's threads (and associated thread_labels, thread_user_metadata)
- User's emails (as sender)
"""

import pytest
from app.models.user import User
from app.models.label import Label
from app.models.email_template import EmailTemplate
from app.models.saved_search import SavedSearch
from app.models.thread import Thread
from app.models.email import Email
from app.core.constants import SystemLabel, FolderType, EmailStatus


# Helper to generate a non-existent UUID for 404 tests
NON_EXISTENT_UUID = "00000000-0000-0000-0000-000000099999"


@pytest.fixture
def user_with_full_data(db_session):
    """Create a user with all types of related data for cascade testing."""
    # Create the user
    user = User(
        first_name="Delete",
        last_name="Test",
        email="delete.test@example.com",
        role="user",
        active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    # Create system labels
    system_label = Label(
        owner_id=user.id,
        name=SystemLabel.INBOX.value,
        color="#e1e3e1",
        is_system=True,
        is_exclusive=False,
        show_in_label_list=True,
        show_in_message_list=True,
    )
    db_session.add(system_label)

    # Create custom label
    custom_label = Label(
        owner_id=user.id,
        name="My Custom Label",
        color="#ff0000",
        is_system=False,
        is_exclusive=False,
        show_in_label_list=True,
        show_in_message_list=True,
    )
    db_session.add(custom_label)

    # Create email template
    template = EmailTemplate(
        owner_id=user.id,
        name="Test Template",
        body="Template body content",
        is_shared=False
    )
    db_session.add(template)

    # Create saved search
    saved_search = SavedSearch(
        owner_id=user.id,
        name="My Search",
        query="from:example@test.com"
    )
    db_session.add(saved_search)

    # Create thread
    thread = Thread(
        owner_id=user.id,
        subject="Test Thread"
    )
    db_session.add(thread)
    db_session.commit()
    db_session.refresh(thread)

    # Create email
    email = Email(
        sender_id=user.id,
        thread_id=thread.id,
        subject="Test Email",
        body="Test body",
        status=EmailStatus.SENT.value,
        folder=FolderType.SENT.value,
        is_read=True
    )
    db_session.add(email)

    db_session.commit()
    db_session.refresh(user)

    return user


class TestUserSoftDelete:
    """Test user soft deletion (default behavior)."""

    def test_soft_delete_user_sets_active_false(self, client_with_admin_auth, db_session, user_with_full_data):
        """Test that soft delete sets user's active field to False."""
        client, token, admin_user = client_with_admin_auth
        user_id = user_with_full_data.id

        # Verify user is active before deletion
        user_check = db_session.query(User).filter(User.id == user_id).first()
        assert user_check is not None
        assert user_check.active is True

        # Soft delete the user (default behavior)
        response = client.delete(
            f"/api/v1/users/{user_id}",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 204

        # Verify user still exists but is inactive
        db_session.expire_all()
        user_check = db_session.query(User).filter(User.id == user_id).first()
        assert user_check is not None
        assert user_check.active is False

    def test_soft_delete_preserves_all_related_data(self, client_with_admin_auth, db_session, user_with_full_data):
        """Test that soft delete preserves all related data."""
        client, token, admin_user = client_with_admin_auth
        user_id = user_with_full_data.id

        # Count data before deletion
        labels_count = db_session.query(Label).filter(Label.owner_id == user_id).count()
        templates_count = db_session.query(EmailTemplate).filter(EmailTemplate.owner_id == user_id).count()
        searches_count = db_session.query(SavedSearch).filter(SavedSearch.owner_id == user_id).count()
        threads_count = db_session.query(Thread).filter(Thread.owner_id == user_id).count()
        emails_count = db_session.query(Email).filter(Email.sender_id == user_id).count()

        assert labels_count > 0
        assert templates_count > 0
        assert searches_count > 0
        assert threads_count > 0
        assert emails_count > 0

        # Soft delete the user
        response = client.delete(
            f"/api/v1/users/{user_id}",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 204

        # Verify all related data is preserved
        db_session.expire_all()
        labels_count_after = db_session.query(Label).filter(Label.owner_id == user_id).count()
        templates_count_after = db_session.query(EmailTemplate).filter(EmailTemplate.owner_id == user_id).count()
        searches_count_after = db_session.query(SavedSearch).filter(SavedSearch.owner_id == user_id).count()
        threads_count_after = db_session.query(Thread).filter(Thread.owner_id == user_id).count()
        emails_count_after = db_session.query(Email).filter(Email.sender_id == user_id).count()

        assert labels_count_after == labels_count
        assert templates_count_after == templates_count
        assert searches_count_after == searches_count
        assert threads_count_after == threads_count
        assert emails_count_after == emails_count

    def test_soft_delete_with_permanent_false(self, client_with_admin_auth, db_session, user_with_full_data):
        """Test that explicitly passing permanent=false does soft delete."""
        client, token, admin_user = client_with_admin_auth
        user_id = user_with_full_data.id

        # Soft delete with explicit permanent=false
        response = client.delete(
            f"/api/v1/users/{user_id}?permanent=false",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 204

        # Verify user still exists but is inactive
        db_session.expire_all()
        user_check = db_session.query(User).filter(User.id == user_id).first()
        assert user_check is not None
        assert user_check.active is False


class TestUserPermanentDelete:
    """Test user permanent deletion with cascade to all related data."""

    def test_permanent_delete_user_with_all_data_success(self, client_with_admin_auth, db_session, user_with_full_data):
        """Test that permanently deleting a user cascades to all related data."""
        client, token, admin_user = client_with_admin_auth
        user_id = user_with_full_data.id

        # Verify user and related data exist before deletion
        user_check = db_session.query(User).filter(User.id == user_id).first()
        assert user_check is not None

        labels_count = db_session.query(Label).filter(Label.owner_id == user_id).count()
        templates_count = db_session.query(EmailTemplate).filter(EmailTemplate.owner_id == user_id).count()
        searches_count = db_session.query(SavedSearch).filter(SavedSearch.owner_id == user_id).count()
        threads_count = db_session.query(Thread).filter(Thread.owner_id == user_id).count()
        emails_count = db_session.query(Email).filter(Email.sender_id == user_id).count()

        assert labels_count > 0
        assert templates_count > 0
        assert searches_count > 0
        assert threads_count > 0
        assert emails_count > 0

        # Permanently delete the user
        response = client.delete(
            f"/api/v1/users/{user_id}?permanent=true",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 204

        # Verify user is deleted
        db_session.expire_all()
        user_check = db_session.query(User).filter(User.id == user_id).first()
        assert user_check is None

        # Verify all related data is deleted
        labels_count_after = db_session.query(Label).filter(Label.owner_id == user_id).count()
        templates_count_after = db_session.query(EmailTemplate).filter(EmailTemplate.owner_id == user_id).count()
        searches_count_after = db_session.query(SavedSearch).filter(SavedSearch.owner_id == user_id).count()
        threads_count_after = db_session.query(Thread).filter(Thread.owner_id == user_id).count()
        emails_count_after = db_session.query(Email).filter(Email.sender_id == user_id).count()

        assert labels_count_after == 0
        assert templates_count_after == 0
        assert searches_count_after == 0
        assert threads_count_after == 0
        assert emails_count_after == 0

    def test_permanent_delete_user_system_labels_removed(self, client_with_admin_auth, db_session, user_with_full_data):
        """Test that system labels are deleted along with user on permanent delete."""
        client, token, admin_user = client_with_admin_auth
        user_id = user_with_full_data.id

        # Verify system labels exist
        system_labels = db_session.query(Label).filter(
            Label.owner_id == user_id,
            Label.is_system == True
        ).count()
        assert system_labels > 0

        # Permanently delete user
        response = client.delete(
            f"/api/v1/users/{user_id}?permanent=true",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 204

        # Verify system labels are deleted
        db_session.expire_all()
        system_labels_after = db_session.query(Label).filter(
            Label.owner_id == user_id,
            Label.is_system == True
        ).count()
        assert system_labels_after == 0

    def test_permanent_delete_user_custom_labels_removed(self, client_with_admin_auth, db_session, user_with_full_data):
        """Test that custom labels are deleted along with user on permanent delete."""
        client, token, admin_user = client_with_admin_auth
        user_id = user_with_full_data.id

        # Verify custom labels exist
        custom_labels = db_session.query(Label).filter(
            Label.owner_id == user_id,
            Label.is_system == False
        ).count()
        assert custom_labels > 0

        # Permanently delete user
        response = client.delete(
            f"/api/v1/users/{user_id}?permanent=true",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 204

        # Verify custom labels are deleted
        db_session.expire_all()
        custom_labels_after = db_session.query(Label).filter(
            Label.owner_id == user_id,
            Label.is_system == False
        ).count()
        assert custom_labels_after == 0

    def test_permanent_delete_user_with_no_data(self, client_with_admin_auth, db_session):
        """Test permanently deleting a user with no associated data."""
        client, token, admin_user = client_with_admin_auth

        # Create a minimal user with no associated data
        minimal_user = User(
            first_name="Minimal",
            last_name="User",
            email="minimal@example.com",
            role="user",
            active=True
        )
        db_session.add(minimal_user)
        db_session.commit()
        db_session.refresh(minimal_user)
        user_id = minimal_user.id

        # Permanently delete the user
        response = client.delete(
            f"/api/v1/users/{user_id}?permanent=true",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 204

        # Verify user is deleted
        db_session.expire_all()
        user_check = db_session.query(User).filter(User.id == user_id).first()
        assert user_check is None

    def test_permanent_delete_user_shared_templates_not_affected(self, client_with_admin_auth, db_session, user_with_full_data):
        """Test that permanently deleting a user doesn't affect templates shared by others."""
        client, token, admin_user = client_with_admin_auth

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
            owner_id=other_user.id,
            name="Shared Template",
            body="Shared content",
            is_shared=True
        )
        db_session.add(shared_template)
        db_session.commit()
        shared_template_id = shared_template.id

        # Permanently delete the test user (not the one with shared template)
        response = client.delete(
            f"/api/v1/users/{user_with_full_data.id}?permanent=true",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 204

        # Verify shared template from other user still exists
        db_session.expire_all()
        shared_template_check = db_session.query(EmailTemplate).filter(
            EmailTemplate.id == shared_template_id
        ).first()
        assert shared_template_check is not None


class TestUserDeleteCommon:
    """Common tests for user deletion (applies to both soft and permanent delete)."""

    def test_delete_user_not_found(self, client_with_admin_auth):
        """Test deleting a non-existent user returns 404."""
        client, token, admin_user = client_with_admin_auth

        response = client.delete(
            f"/api/v1/users/{NON_EXISTENT_UUID}",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 404
        response_data = response.json()
        # API returns custom format with 'message' instead of 'detail'
        assert "message" in response_data or "detail" in response_data
        message = response_data.get("message") or response_data.get("detail")
        assert "not found" in message.lower()

    def test_delete_user_not_found_permanent(self, client_with_admin_auth):
        """Test permanently deleting a non-existent user returns 404."""
        client, token, admin_user = client_with_admin_auth

        response = client.delete(
            f"/api/v1/users/{NON_EXISTENT_UUID}?permanent=true",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 404
        response_data = response.json()
        assert "message" in response_data or "detail" in response_data
        message = response_data.get("message") or response_data.get("detail")
        assert "not found" in message.lower()

    def test_delete_user_requires_admin(self, client_with_auth, db_session):
        """Test that regular users cannot delete users."""
        client, token, user = client_with_auth

        # Create another user to try to delete
        other_user = User(
            first_name="Other",
            last_name="User",
            email="other@example.com",
            role="user",
            active=True
        )
        db_session.add(other_user)
        db_session.commit()

        # Try to delete as regular user
        response = client.delete(
            f"/api/v1/users/{other_user.id}",
            headers={"Authorization": f"Bearer {token}"}
        )

        # Should be forbidden (403) due to RBAC
        assert response.status_code == 403

    def test_delete_user_requires_admin_permanent(self, client_with_auth, db_session):
        """Test that regular users cannot permanently delete users."""
        client, token, user = client_with_auth

        # Create another user to try to delete
        other_user = User(
            first_name="Other",
            last_name="User",
            email="other2@example.com",
            role="user",
            active=True
        )
        db_session.add(other_user)
        db_session.commit()

        # Try to permanently delete as regular user
        response = client.delete(
            f"/api/v1/users/{other_user.id}?permanent=true",
            headers={"Authorization": f"Bearer {token}"}
        )

        # Should be forbidden (403) due to RBAC
        assert response.status_code == 403

    def test_delete_user_unauthenticated(self, client, user_with_full_data):
        """Test that unauthenticated requests cannot delete users."""
        response = client.delete(f"/api/v1/users/{user_with_full_data.id}")

        assert response.status_code == 401

    def test_delete_user_unauthenticated_permanent(self, client, user_with_full_data):
        """Test that unauthenticated requests cannot permanently delete users."""
        response = client.delete(f"/api/v1/users/{user_with_full_data.id}?permanent=true")

        assert response.status_code == 401
