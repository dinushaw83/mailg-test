"""Tests for Search API endpoints."""

import pytest
from app.models.email import Email
from app.models.folder import Folder
from app.models.label import Label
from app.models.email_label import EmailLabel
from app.models.attachment import Attachment
from app.models.saved_search import SavedSearch


class TestSearchBasic:
    """Test basic search functionality."""

    def test_search_emails_by_query(self, client_with_auth, db_session, sample_folder):
        """Test searching emails with a query string."""
        client, token, user = client_with_auth
        
        # Create emails with searchable content
        emails = [
            Email(subject="Project meeting notes", body="Discussing timeline", 
                  status="received", sender_id=user.id, folder_id=sample_folder.id),
            Email(subject="Budget report Q4", body="Financial summary", 
                  status="received", sender_id=user.id, folder_id=sample_folder.id),
            Email(subject="Team meeting agenda", body="Weekly sync", 
                  status="received", sender_id=user.id, folder_id=sample_folder.id),
        ]
        for email in emails:
            db_session.add(email)
        db_session.commit()
        
        # Search for "meeting"
        response = client.get(
            "/api/v1/search?q=meeting",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert len(data["results"]) >= 2  # Should find 2 emails with "meeting"

    def test_search_unauthenticated(self, client):
        """Test search without authentication fails."""
        response = client.get("/api/v1/search?q=test")
        assert response.status_code == 401

    def test_search_empty_query(self, client_with_auth):
        """Test search with no query returns user's emails."""
        client, token, user = client_with_auth
        
        response = client.get(
            "/api/v1/search",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200


class TestSearchOperators:
    """Test Gmail-style search operators."""

    def test_search_subject_operator(self, client_with_auth, db_session, sample_folder):
        """Test subject: search operator."""
        client, token, user = client_with_auth
        
        email = Email(
            subject="Quarterly Report 2024",
            body="Different content here",
            status="received",
            sender_id=user.id,
            folder_id=sample_folder.id
        )
        db_session.add(email)
        db_session.commit()
        
        response = client.get(
            "/api/v1/search?q=subject:Quarterly",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200

    def test_search_is_unread_operator(self, client_with_auth, db_session, sample_folder):
        """Test is:unread search operator."""
        client, token, user = client_with_auth
        
        read_email = Email(
            subject="Read email",
            body="Already read",
            status="received",
            is_read=True,
            sender_id=user.id,
            folder_id=sample_folder.id
        )
        unread_email = Email(
            subject="Unread email",
            body="Not yet read",
            status="received",
            is_read=False,
            sender_id=user.id,
            folder_id=sample_folder.id
        )
        db_session.add_all([read_email, unread_email])
        db_session.commit()
        
        response = client.get(
            "/api/v1/search?q=is:unread",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        for result in data["results"]:
            assert result["is_read"] == False

    def test_search_is_starred_operator(self, client_with_auth, db_session, sample_folder):
        """Test is:starred search operator."""
        client, token, user = client_with_auth
        
        starred_email = Email(
            subject="Starred email",
            body="Important",
            status="received",
            is_starred=True,
            sender_id=user.id,
            folder_id=sample_folder.id
        )
        db_session.add(starred_email)
        db_session.commit()
        
        response = client.get(
            "/api/v1/search?q=is:starred",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        for result in data["results"]:
            assert result["is_starred"] == True


class TestSearchPagination:
    """Test search pagination and sorting."""

    def test_search_pagination(self, client_with_auth, db_session, sample_folder):
        """Test search results pagination."""
        client, token, user = client_with_auth
        
        # Create many emails
        for i in range(25):
            email = Email(
                subject=f"Test email {i}",
                body=f"Content {i}",
                status="received",
                sender_id=user.id,
                folder_id=sample_folder.id
            )
            db_session.add(email)
        db_session.commit()
        
        # Get first page
        response = client.get(
            "/api/v1/search?page=1&page_size=10",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert len(data["results"]) == 10
        assert data["page"] == 1
        assert data["total"] >= 25


class TestSearchSuggestions:
    """Test search suggestions/autocomplete."""

    def test_get_operator_suggestions(self, client_with_auth):
        """Test getting available search operators."""
        client, token, user = client_with_auth
        
        response = client.get(
            "/api/v1/search/suggestions?q=",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert "operators" in data


class TestSavedSearches:
    """Test saved search functionality."""

    def test_save_search(self, client_with_auth):
        """Test saving a search query."""
        client, token, user = client_with_auth
        
        response = client.post(
            "/api/v1/search/saved",
            json={
                "name": "Unread from team",
                "query": "is:unread from:team@example.com"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 201

    def test_list_saved_searches(self, client_with_auth):
        """Test listing saved searches."""
        client, token, user = client_with_auth
        
        response = client.get(
            "/api/v1/search/saved",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200

    def test_delete_saved_search(self, client_with_auth, db_session):
        """Test deleting a saved search."""
        client, token, user = client_with_auth
        
        # First create a saved search
        saved = SavedSearch(
            name="Test Search",
            query="is:starred",
            owner_id=user.id
        )
        db_session.add(saved)
        db_session.commit()
        saved_id = saved.id
        
        response = client.delete(
            f"/api/v1/search/saved/{saved_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 204

