"""Tests for User Settings API endpoints.

Tests CRUD operations for:
- General Settings (language, page size, undo send delay, smart features, etc.)
- Advanced Settings (auto-advance, templates, keyboard shortcuts, etc.)
- Signatures (email signatures with defaults)
- Combined Settings endpoints
- Settings in Auth responses
"""

import pytest
from uuid import uuid4
from app.models.general_settings import GeneralSettings, DefaultTextStyle, Signature
from app.models.advanced_settings import AdvancedSettings


class TestGeneralSettingsAPI:
    """Test general settings endpoints."""

    def test_get_general_settings_creates_default(self, client_with_auth):
        """Test that getting general settings creates defaults if none exist."""
        client, token, user = client_with_auth
        
        response = client.get(
            f"/api/v1/users/{user.id}/settings/general",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Check default values
        assert data["language"] == "en"
        assert data["max_page_size"] == 50
        assert data["undo_send_delay_seconds"] == 5
        assert data["default_reply_behavior"] == "reply"
        assert data["hover_actions_enabled"] == True
        assert data["conversation_view_enabled"] == True
        assert data["smart_compose_enabled"] == True
        assert data["desktop_notifications"] == "off"
        assert data["button_labels"] == "icons"
        
        # Check default text style is created
        assert data["default_text_style"] is not None
        assert data["default_text_style"]["font"] == "Sans Serif"
        assert data["default_text_style"]["size"] == "normal"
        assert data["default_text_style"]["color"] == "#000000"

    def test_update_general_settings_language(self, client_with_auth):
        """Test updating language setting."""
        client, token, user = client_with_auth
        
        response = client.patch(
            f"/api/v1/users/{user.id}/settings/general",
            json={"language": "es"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["language"] == "es"

    def test_update_general_settings_page_size_valid(self, client_with_auth):
        """Test updating page size to valid values."""
        client, token, user = client_with_auth
        
        for size in [10, 15, 20, 25, 50, 100]:
            response = client.patch(
                f"/api/v1/users/{user.id}/settings/general",
                json={"max_page_size": size},
                headers={"Authorization": f"Bearer {token}"}
            )
            
            assert response.status_code == 200
            data = response.json()["data"]
            assert data["max_page_size"] == size

    def test_update_general_settings_page_size_invalid(self, client_with_auth):
        """Test that invalid page sizes are rejected."""
        client, token, user = client_with_auth
        
        response = client.patch(
            f"/api/v1/users/{user.id}/settings/general",
            json={"max_page_size": 30},  # Not in allowed values
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 422

    def test_update_general_settings_reply_behavior(self, client_with_auth):
        """Test updating reply behavior setting."""
        client, token, user = client_with_auth
        
        response = client.patch(
            f"/api/v1/users/{user.id}/settings/general",
            json={"default_reply_behavior": "reply_all"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["default_reply_behavior"] == "reply_all"

    def test_update_general_settings_reply_behavior_invalid(self, client_with_auth):
        """Test that invalid reply behavior is rejected."""
        client, token, user = client_with_auth
        
        response = client.patch(
            f"/api/v1/users/{user.id}/settings/general",
            json={"default_reply_behavior": "invalid"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 422

    def test_update_general_settings_images_display(self, client_with_auth):
        """Test updating images display setting."""
        client, token, user = client_with_auth
        
        response = client.patch(
            f"/api/v1/users/{user.id}/settings/general",
            json={"images_display": "ask"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["images_display"] == "ask"

    def test_update_general_settings_desktop_notifications(self, client_with_auth):
        """Test updating desktop notifications setting."""
        client, token, user = client_with_auth
        
        for notification_type in ["new_mail", "important_mail", "off"]:
            response = client.patch(
                f"/api/v1/users/{user.id}/settings/general",
                json={"desktop_notifications": notification_type},
                headers={"Authorization": f"Bearer {token}"}
            )
            
            assert response.status_code == 200
            data = response.json()["data"]
            assert data["desktop_notifications"] == notification_type

    def test_update_general_settings_button_labels(self, client_with_auth):
        """Test updating button labels setting."""
        client, token, user = client_with_auth
        
        response = client.patch(
            f"/api/v1/users/{user.id}/settings/general",
            json={"button_labels": "text"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["button_labels"] == "text"

    def test_update_general_settings_boolean_toggles(self, client_with_auth):
        """Test updating various boolean settings."""
        client, token, user = client_with_auth
        
        boolean_settings = {
            "hover_actions_enabled": False,
            "send_and_archive_visible": True,
            "dynamic_email_enabled": False,
            "grammar_suggestions_enabled": False,
            "spelling_suggestions_enabled": False,
            "autocorrect_enabled": False,
            "smart_compose_enabled": False,
            "smart_compose_personalization_enabled": False,
            "conversation_view_enabled": False,
            "nudges_suggest_reply_enabled": False,
            "nudges_suggest_followup_enabled": False,
            "smart_reply_enabled": False,
            "smart_features_enabled": False,
            "package_tracking_enabled": True,
            "keyboard_shortcuts_enabled": True,
            "auto_create_contacts_enabled": False,
            "personal_level_indicators_enabled": True,
            "input_tools_enabled": True,
            "right_to_left_editing": True,
        }
        
        response = client.patch(
            f"/api/v1/users/{user.id}/settings/general",
            json=boolean_settings,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        for key, value in boolean_settings.items():
            assert data[key] == value, f"Expected {key} to be {value}, got {data[key]}"

    def test_update_general_settings_default_text_style(self, client_with_auth):
        """Test updating default text style nested within general settings."""
        client, token, user = client_with_auth
        
        # First ensure settings exist
        client.get(
            f"/api/v1/users/{user.id}/settings/general",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        response = client.patch(
            f"/api/v1/users/{user.id}/settings/general",
            json={
                "default_text_style": {
                    "font": "Georgia",
                    "size": "large",
                    "color": "#333333"
                }
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["default_text_style"]["font"] == "Georgia"
        assert data["default_text_style"]["size"] == "large"
        assert data["default_text_style"]["color"] == "#333333"

    def test_update_general_settings_multiple_fields(self, client_with_auth):
        """Test updating multiple fields at once."""
        client, token, user = client_with_auth
        
        response = client.patch(
            f"/api/v1/users/{user.id}/settings/general",
            json={
                "language": "fr",
                "max_page_size": 25,
                "undo_send_delay_seconds": 20,
                "keyboard_shortcuts_enabled": True,
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["language"] == "fr"
        assert data["max_page_size"] == 25
        assert data["undo_send_delay_seconds"] == 20
        assert data["keyboard_shortcuts_enabled"] == True


class TestAdvancedSettingsAPI:
    """Test advanced settings endpoints."""

    def test_get_advanced_settings_creates_default(self, client_with_auth):
        """Test that getting advanced settings creates defaults if none exist."""
        client, token, user = client_with_auth
        
        response = client.get(
            f"/api/v1/users/{user.id}/settings/advanced",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Check default values
        assert data["auto_advance_enabled"] == False
        assert data["templates_enabled"] == True
        assert data["custom_keyboard_shortcuts_enabled"] == False
        assert data["unread_message_icon_enabled"] == True

    def test_update_advanced_settings_auto_advance(self, client_with_auth):
        """Test updating auto advance setting."""
        client, token, user = client_with_auth
        
        response = client.patch(
            f"/api/v1/users/{user.id}/settings/advanced",
            json={"auto_advance_enabled": True},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["auto_advance_enabled"] == True

    def test_update_advanced_settings_templates(self, client_with_auth):
        """Test updating templates setting."""
        client, token, user = client_with_auth
        
        response = client.patch(
            f"/api/v1/users/{user.id}/settings/advanced",
            json={"templates_enabled": False},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["templates_enabled"] == False

    def test_update_advanced_settings_keyboard_shortcuts(self, client_with_auth):
        """Test updating custom keyboard shortcuts setting."""
        client, token, user = client_with_auth
        
        response = client.patch(
            f"/api/v1/users/{user.id}/settings/advanced",
            json={"custom_keyboard_shortcuts_enabled": True},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["custom_keyboard_shortcuts_enabled"] == True

    def test_update_advanced_settings_unread_icon(self, client_with_auth):
        """Test updating unread message icon setting."""
        client, token, user = client_with_auth
        
        response = client.patch(
            f"/api/v1/users/{user.id}/settings/advanced",
            json={"unread_message_icon_enabled": False},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["unread_message_icon_enabled"] == False

    def test_update_advanced_settings_all_fields(self, client_with_auth):
        """Test updating all advanced settings at once."""
        client, token, user = client_with_auth
        
        response = client.patch(
            f"/api/v1/users/{user.id}/settings/advanced",
            json={
                "auto_advance_enabled": True,
                "templates_enabled": False,
                "custom_keyboard_shortcuts_enabled": True,
                "unread_message_icon_enabled": False,
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["auto_advance_enabled"] == True
        assert data["templates_enabled"] == False
        assert data["custom_keyboard_shortcuts_enabled"] == True
        assert data["unread_message_icon_enabled"] == False


class TestSignaturesAPI:
    """Test signature CRUD endpoints."""

    def test_list_signatures_empty(self, client_with_auth):
        """Test listing signatures when none exist."""
        client, token, user = client_with_auth
        
        response = client.get(
            f"/api/v1/users/{user.id}/settings/signatures",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert isinstance(data, list)

    def test_create_signature(self, client_with_auth):
        """Test creating a new signature."""
        client, token, user = client_with_auth
        
        response = client.post(
            f"/api/v1/users/{user.id}/settings/signatures",
            json={
                "name": "Work Signature",
                "content": "<p>Best regards,<br>Test User</p>",
                "is_default_for_new": True,
                "is_default_for_reply": False,
                "insert_before_quoted": True,
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 201
        data = response.json()["data"]
        assert data["name"] == "Work Signature"
        assert data["content"] == "<p>Best regards,<br>Test User</p>"
        assert data["is_default_for_new"] == True
        assert data["is_default_for_reply"] == False
        assert data["insert_before_quoted"] == True
        assert "id" in data

    def test_create_signature_minimal(self, client_with_auth):
        """Test creating a signature with minimal fields."""
        client, token, user = client_with_auth
        
        response = client.post(
            f"/api/v1/users/{user.id}/settings/signatures",
            json={"name": "Simple Sig"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 201
        data = response.json()["data"]
        assert data["name"] == "Simple Sig"
        assert data["content"] == ""
        assert data["is_default_for_new"] == False
        assert data["is_default_for_reply"] == False

    def test_get_signature(self, client_with_auth):
        """Test getting a specific signature."""
        client, token, user = client_with_auth
        
        # Create a signature first
        create_response = client.post(
            f"/api/v1/users/{user.id}/settings/signatures",
            json={"name": "Test Sig", "content": "Hello World"},
            headers={"Authorization": f"Bearer {token}"}
        )
        sig_id = create_response.json()["data"]["id"]
        
        # Get the signature
        response = client.get(
            f"/api/v1/users/{user.id}/settings/signatures/{sig_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["id"] == sig_id
        assert data["name"] == "Test Sig"
        assert data["content"] == "Hello World"

    def test_update_signature(self, client_with_auth):
        """Test updating a signature."""
        client, token, user = client_with_auth
        
        # Create a signature first
        create_response = client.post(
            f"/api/v1/users/{user.id}/settings/signatures",
            json={"name": "Original Name", "content": "Original Content"},
            headers={"Authorization": f"Bearer {token}"}
        )
        sig_id = create_response.json()["data"]["id"]
        
        # Update the signature
        response = client.put(
            f"/api/v1/users/{user.id}/settings/signatures/{sig_id}",
            json={
                "name": "Updated Name",
                "content": "Updated Content",
                "is_default_for_new": True,
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["name"] == "Updated Name"
        assert data["content"] == "Updated Content"
        assert data["is_default_for_new"] == True

    def test_delete_signature(self, client_with_auth):
        """Test deleting a signature."""
        client, token, user = client_with_auth
        
        # Create a signature first
        create_response = client.post(
            f"/api/v1/users/{user.id}/settings/signatures",
            json={"name": "To Delete"},
            headers={"Authorization": f"Bearer {token}"}
        )
        sig_id = create_response.json()["data"]["id"]
        
        # Delete the signature
        response = client.delete(
            f"/api/v1/users/{user.id}/settings/signatures/{sig_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 204
        
        # Verify it's deleted
        get_response = client.get(
            f"/api/v1/users/{user.id}/settings/signatures/{sig_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert get_response.status_code == 404

    def test_create_signature_default_for_new_unsets_others(self, client_with_auth):
        """Test that setting a signature as default for new unsets others."""
        client, token, user = client_with_auth
        
        # Create first signature as default
        response1 = client.post(
            f"/api/v1/users/{user.id}/settings/signatures",
            json={"name": "First Sig", "is_default_for_new": True},
            headers={"Authorization": f"Bearer {token}"}
        )
        sig1_id = response1.json()["data"]["id"]
        
        # Create second signature as default (should unset first)
        response2 = client.post(
            f"/api/v1/users/{user.id}/settings/signatures",
            json={"name": "Second Sig", "is_default_for_new": True},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response2.status_code == 201
        
        # Check first signature is no longer default
        get_response = client.get(
            f"/api/v1/users/{user.id}/settings/signatures/{sig1_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert get_response.json()["data"]["is_default_for_new"] == False

    def test_create_signature_default_for_reply_unsets_others(self, client_with_auth):
        """Test that setting a signature as default for reply unsets others."""
        client, token, user = client_with_auth
        
        # Create first signature as default for reply
        response1 = client.post(
            f"/api/v1/users/{user.id}/settings/signatures",
            json={"name": "First Sig", "is_default_for_reply": True},
            headers={"Authorization": f"Bearer {token}"}
        )
        sig1_id = response1.json()["data"]["id"]
        
        # Create second signature as default for reply
        response2 = client.post(
            f"/api/v1/users/{user.id}/settings/signatures",
            json={"name": "Second Sig", "is_default_for_reply": True},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response2.status_code == 201
        
        # Check first signature is no longer default for reply
        get_response = client.get(
            f"/api/v1/users/{user.id}/settings/signatures/{sig1_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert get_response.json()["data"]["is_default_for_reply"] == False

    def test_get_nonexistent_signature(self, client_with_auth):
        """Test getting a signature that doesn't exist returns 404."""
        client, token, user = client_with_auth
        
        fake_id = str(uuid4())
        response = client.get(
            f"/api/v1/users/{user.id}/settings/signatures/{fake_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 404


class TestCombinedSettingsAPI:
    """Test combined settings endpoints."""

    def test_get_all_settings(self, client_with_auth):
        """Test getting all settings at once."""
        client, token, user = client_with_auth
        
        response = client.get(
            f"/api/v1/users/{user.id}/settings",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Check structure
        assert "general" in data
        assert "advanced" in data
        assert "labels" in data
        
        # Check general settings
        assert data["general"]["language"] == "en"
        assert data["general"]["max_page_size"] == 50
        
        # Check advanced settings
        assert data["advanced"]["templates_enabled"] == True

    def test_update_all_settings(self, client_with_auth):
        """Test updating multiple settings categories at once."""
        client, token, user = client_with_auth
        
        response = client.put(
            f"/api/v1/users/{user.id}/settings",
            json={
                "general": {
                    "language": "de",
                    "max_page_size": 25,
                },
                "advanced": {
                    "auto_advance_enabled": True,
                }
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        assert data["general"]["language"] == "de"
        assert data["general"]["max_page_size"] == 25
        assert data["advanced"]["auto_advance_enabled"] == True

    def test_update_settings_partial(self, client_with_auth):
        """Test updating only general settings in combined endpoint."""
        client, token, user = client_with_auth
        
        response = client.put(
            f"/api/v1/users/{user.id}/settings",
            json={
                "general": {"language": "it"}
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["general"]["language"] == "it"


class TestSettingsAccessControl:
    """Test access control for settings endpoints."""

    def test_user_cannot_access_other_user_settings(self, client_with_auth, db_session):
        """Test that users cannot access another user's settings."""
        client, token, user = client_with_auth
        
        # Create another user
        from app.models.user import User
        other_user = User(
            email="other@example.com",
            first_name="Other",
            last_name="User",
            role="user"
        )
        db_session.add(other_user)
        db_session.commit()
        
        # Try to access other user's settings
        response = client.get(
            f"/api/v1/users/{other_user.id}/settings",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 403

    def test_admin_can_access_other_user_settings(self, client_with_admin_auth, sample_user):
        """Test that admins can access any user's settings."""
        client, token, admin = client_with_admin_auth
        
        response = client.get(
            f"/api/v1/users/{sample_user.id}/settings",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200

    def test_unauthenticated_cannot_access_settings(self, client, sample_user):
        """Test that unauthenticated requests are rejected."""
        response = client.get(f"/api/v1/users/{sample_user.id}/settings")
        
        assert response.status_code == 401


class TestAuthResponseWithSettings:
    """Test that auth endpoints include settings."""

    def test_me_endpoint_includes_settings(self, client_with_auth):
        """Test that /auth/me endpoint returns settings."""
        client, token, user = client_with_auth
        
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Check user fields
        assert data["id"] == str(user.id)
        assert data["email"] == user.email
        
        # Check settings are included
        assert "settings" in data
        assert "general" in data["settings"]
        assert "advanced" in data["settings"]
        assert "labels" in data["settings"]


class TestSettingsValidation:
    """Test validation of settings values."""

    def test_general_settings_undo_delay_valid_values(self, client_with_auth):
        """Test that only valid undo delay values are accepted."""
        client, token, user = client_with_auth
        
        # Valid values: 5, 10, 20, 30
        for value in [5, 10, 20, 30]:
            response = client.patch(
                f"/api/v1/users/{user.id}/settings/general",
                json={"undo_send_delay_seconds": value},
                headers={"Authorization": f"Bearer {token}"}
            )
            assert response.status_code == 200

    def test_general_settings_undo_delay_invalid_values(self, client_with_auth):
        """Test that invalid undo delay values are rejected."""
        client, token, user = client_with_auth
        
        # Invalid values
        for value in [0, 1, 3, 7, 15, 25, 60]:
            response = client.patch(
                f"/api/v1/users/{user.id}/settings/general",
                json={"undo_send_delay_seconds": value},
                headers={"Authorization": f"Bearer {token}"}
            )
            assert response.status_code == 422, f"Expected 422 for value {value}"

    def test_general_settings_page_size_invalid_values(self, client_with_auth):
        """Test that invalid page sizes are rejected."""
        client, token, user = client_with_auth
        
        for value in [5, 30, 75, 200]:
            response = client.patch(
                f"/api/v1/users/{user.id}/settings/general",
                json={"max_page_size": value},
                headers={"Authorization": f"Bearer {token}"}
            )
            assert response.status_code == 422, f"Expected 422 for value {value}"

    def test_general_settings_desktop_notifications_invalid(self, client_with_auth):
        """Test that invalid desktop notification values are rejected."""
        client, token, user = client_with_auth
        
        response = client.patch(
            f"/api/v1/users/{user.id}/settings/general",
            json={"desktop_notifications": "all"},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 422

    def test_general_settings_button_labels_invalid(self, client_with_auth):
        """Test that invalid button label values are rejected."""
        client, token, user = client_with_auth
        
        response = client.patch(
            f"/api/v1/users/{user.id}/settings/general",
            json={"button_labels": "both"},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 422

    def test_general_settings_images_display_invalid(self, client_with_auth):
        """Test that invalid images display values are rejected."""
        client, token, user = client_with_auth
        
        response = client.patch(
            f"/api/v1/users/{user.id}/settings/general",
            json={"images_display": "never"},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 422
