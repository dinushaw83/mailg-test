"""Tests for Folders API endpoints."""

import pytest
from app.models.folder import Folder


class TestFolderCreate:
    """Test folder creation."""

    def test_create_custom_folder(self, client_with_auth, db_session):
        """Test creating a custom folder."""
        client, token, user = client_with_auth
        
        response = client.post(
            "/api/v1/folders",
            json={
                "name": "My Custom Folder",
                "folder_type": "custom",
                "color": "#ff5722"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 201
        data = response.json()["data"]
        assert data["name"] == "My Custom Folder"
        assert data["folder_type"] == "custom"
        assert data["is_system"] == False

    def test_create_folder_unauthenticated(self, client):
        """Test creating a folder without authentication fails."""
        response = client.post(
            "/api/v1/folders",
            json={"name": "Test Folder"}
        )
        
        assert response.status_code == 401

    def test_cannot_create_system_folder(self, client_with_auth, db_session):
        """Test that system folders cannot be created via API."""
        client, token, user = client_with_auth
        
        response = client.post(
            "/api/v1/folders",
            json={
                "name": "Fake Inbox",
                "folder_type": "inbox"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400


class TestFolderList:
    """Test folder listing."""

    def test_list_user_folders(self, client_with_auth, db_session):
        """Test listing user's folders."""
        client, token, user = client_with_auth
        
        # Create folders for user
        folders = [
            Folder(name="Inbox", folder_type="inbox", owner_id=user.id, is_system=True),
            Folder(name="Sent", folder_type="sent", owner_id=user.id, is_system=True),
            Folder(name="Custom", folder_type="custom", owner_id=user.id, is_system=False),
        ]
        for folder in folders:
            db_session.add(folder)
        db_session.commit()
        
        response = client.get(
            "/api/v1/folders",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert len(data) >= 3


class TestFolderOperations:
    """Test folder operations."""

    def test_get_folder_by_id(self, client_with_auth, db_session, sample_folder):
        """Test getting a folder by ID."""
        client, token, user = client_with_auth
        
        response = client.get(
            f"/api/v1/folders/{sample_folder.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200

    def test_update_custom_folder(self, client_with_auth, db_session):
        """Test updating a custom folder."""
        client, token, user = client_with_auth
        
        folder = Folder(
            name="Original Name",
            folder_type="custom",
            owner_id=user.id,
            is_system=False
        )
        db_session.add(folder)
        db_session.commit()
        db_session.refresh(folder)
        
        response = client.put(
            f"/api/v1/folders/{folder.id}",
            json={"name": "Updated Name", "color": "#2196f3"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["name"] == "Updated Name"

    def test_cannot_rename_system_folder(self, client_with_auth, db_session, sample_folder):
        """Test that system folders cannot have their name changed."""
        client, token, user = client_with_auth
        
        response = client.put(
            f"/api/v1/folders/{sample_folder.id}",
            json={"name": "New Name"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400

    def test_delete_custom_folder(self, client_with_auth, db_session):
        """Test deleting a custom folder."""
        client, token, user = client_with_auth
        
        # Create inbox folder first (for moving emails)
        inbox = Folder(name="Inbox", folder_type="inbox", owner_id=user.id, is_system=True)
        db_session.add(inbox)
        db_session.commit()
        
        folder = Folder(
            name="To Delete",
            folder_type="custom",
            owner_id=user.id,
            is_system=False
        )
        db_session.add(folder)
        db_session.commit()
        folder_id = folder.id
        
        response = client.delete(
            f"/api/v1/folders/{folder_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 204

    def test_cannot_delete_system_folder(self, client_with_auth, db_session, sample_folder):
        """Test that system folders cannot be deleted."""
        client, token, user = client_with_auth
        
        response = client.delete(
            f"/api/v1/folders/{sample_folder.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400

    def test_list_emails_in_folder(self, client_with_auth, db_session, sample_folder):
        """Test listing emails in a specific folder."""
        client, token, user = client_with_auth
        
        response = client.get(
            f"/api/v1/folders/{sample_folder.id}/emails",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200

