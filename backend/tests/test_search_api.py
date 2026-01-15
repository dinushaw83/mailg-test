"""Tests for Search API endpoints.

Tests the search endpoint with threaded response format matching GET /emails.
"""

import pytest
import uuid
from datetime import datetime, timedelta
from app.models.email import Email
from app.models.email_recipient import EmailRecipient
from app.models.thread import Thread
from app.models.thread_user_metadata import ThreadUserMetadata
from app.core.constants import FolderType, EmailCategory
from app.models.label import Label
from app.models.thread_label import ThreadLabel
from app.models.attachment import Attachment
from app.models.saved_search import SavedSearch


# Helper to generate a non-existent UUID for 404 tests
NON_EXISTENT_UUID = "00000000-0000-0000-0000-000000099999"


class TestSearchBasic:
    """Test basic search functionality."""

    def test_search_emails_by_query(self, client_with_auth, db_session):
        """Test searching emails with a query string."""
        client, token, user = client_with_auth
        
        # Create thread and emails with searchable content
        thread = Thread(subject="Project meeting notes", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        emails = [
            Email(subject="Project meeting notes", body="Discussing timeline", 
                  status="received", sender_id=user.id, folder=FolderType.INBOX.value,
                  thread_id=thread.id),
        ]
        for email in emails:
            db_session.add(email)
        
        thread2 = Thread(subject="Budget report Q4", owner_id=user.id, email_count=1)
        db_session.add(thread2)
        db_session.flush()
        
        email2 = Email(subject="Budget report Q4", body="Financial summary", 
                       status="received", sender_id=user.id, folder=FolderType.INBOX.value,
                       thread_id=thread2.id)
        db_session.add(email2)
        
        thread3 = Thread(subject="Team meeting agenda", owner_id=user.id, email_count=1)
        db_session.add(thread3)
        db_session.flush()
        
        email3 = Email(subject="Team meeting agenda", body="Weekly sync", 
                       status="received", sender_id=user.id, folder=FolderType.INBOX.value,
                       thread_id=thread3.id)
        db_session.add(email3)
        db_session.commit()
        
        # Search for "meeting"
        response = client.get(
            "/api/v1/search?q=meeting",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert len(data["results"]) >= 2  # Should find 2 emails with "meeting"
        
        # Verify response format matches EmailListResponse
        for result in data["results"]:
            assert "id" in result
            assert "subject" in result
            assert "snippet" in result
            assert "thread_id" in result
            assert "is_important" in result
            assert "is_archived" in result

    def test_search_unauthenticated(self, client):
        """Test search without authentication fails."""
        response = client.get("/api/v1/search?q=test")
        assert response.status_code == 401

    def test_search_empty_query(self, client_with_auth, db_session):
        """Test search with no query returns user's emails."""
        client, token, user = client_with_auth
        
        # Create a thread and email
        thread = Thread(subject="Test Email", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(subject="Test Email", body="Test body",
                      status="received", sender_id=user.id, folder=FolderType.INBOX.value,
                      thread_id=thread.id)
        db_session.add(email)
        db_session.commit()
        
        response = client.get(
            "/api/v1/search",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert "results" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data
        assert "total_pages" in data


class TestSearchThreadedResponse:
    """Test that search returns threaded responses like GET /emails."""

    def test_search_returns_latest_email_per_thread(self, client_with_auth, db_session):
        """Test that search returns only the latest email from each thread."""
        client, token, user = client_with_auth
        
        # Create a thread with multiple emails
        thread = Thread(subject="Discussion Thread", owner_id=user.id, email_count=3)
        db_session.add(thread)
        db_session.flush()
        
        # Create emails with different timestamps
        old_email = Email(
            subject="Discussion Thread",
            body="First message in thread",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id,
            sent_at=datetime.utcnow() - timedelta(days=2)
        )
        db_session.add(old_email)
        
        middle_email = Email(
            subject="Re: Discussion Thread",
            body="Reply message",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id,
            sent_at=datetime.utcnow() - timedelta(days=1)
        )
        db_session.add(middle_email)
        
        latest_email = Email(
            subject="Re: Discussion Thread",
            body="Latest reply with keyword searchable",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id,
            sent_at=datetime.utcnow()
        )
        db_session.add(latest_email)
        db_session.commit()
        
        # Search - should only return 1 email (the latest) from this thread
        response = client.get(
            "/api/v1/search?q=Discussion",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Find results for this thread
        thread_results = [r for r in data["results"] if r["thread_id"] == str(thread.id)]
        assert len(thread_results) == 1
        assert thread_results[0]["id"] == str(latest_email.id)

    def test_search_includes_thread_email_count(self, client_with_auth, db_session):
        """Test that search results include thread_email_count."""
        client, token, user = client_with_auth
        
        # Create a thread with multiple emails
        thread = Thread(subject="Multi-email Thread", owner_id=user.id, email_count=3)
        db_session.add(thread)
        db_session.flush()
        
        for i in range(3):
            email = Email(
                subject=f"Multi-email Thread {i}",
                body=f"Message {i}",
                status="received",
                sender_id=user.id,
                folder=FolderType.INBOX.value,
                thread_id=thread.id,
                sent_at=datetime.utcnow() - timedelta(hours=i)
            )
            db_session.add(email)
        db_session.commit()
        
        response = client.get(
            "/api/v1/search?q=Multi-email",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Find the result for this thread
        thread_results = [r for r in data["results"] if r["thread_id"] == str(thread.id)]
        assert len(thread_results) == 1
        assert thread_results[0]["thread_email_count"] == 3


class TestSearchOperators:
    """Test Gmail-style search operators."""

    def test_search_subject_operator(self, client_with_auth, db_session):
        """Test subject: search operator."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Quarterly Report 2024", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Quarterly Report 2024",
            body="Different content here",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        response = client.get(
            "/api/v1/search?q=subject:Quarterly",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        # Should find the email with Quarterly in subject
        matching = [r for r in data["results"] if "Quarterly" in r["subject"]]
        assert len(matching) >= 1

    def test_search_is_unread_operator(self, client_with_auth, db_session):
        """Test is:unread search operator."""
        client, token, user = client_with_auth
        
        # Create threads and emails
        thread1 = Thread(subject="Read email", owner_id=user.id, email_count=1)
        db_session.add(thread1)
        db_session.flush()
        
        read_email = Email(
            subject="Read email",
            body="Already read",
            status="received",
            is_read=True,
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread1.id
        )
        db_session.add(read_email)
        
        thread2 = Thread(subject="Unread email", owner_id=user.id, email_count=1)
        db_session.add(thread2)
        db_session.flush()
        
        unread_email = Email(
            subject="Unread email",
            body="Not yet read",
            status="received",
            is_read=False,
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread2.id
        )
        db_session.add(unread_email)
        db_session.commit()
        
        response = client.get(
            "/api/v1/search?q=is:unread",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        for result in data["results"]:
            assert result["is_read"] == False

    def test_search_is_starred_operator(self, client_with_auth, db_session):
        """Test is:starred search operator."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Starred email", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        starred_email = Email(
            subject="Starred email",
            body="Important",
            status="received",
            is_starred=True,
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id
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


class TestSearchFilters:
    """Test search filters (folder, is_read, is_starred, etc.)."""

    def test_search_filter_by_folder(self, client_with_auth, db_session):
        """Test filtering search by folder."""
        client, token, user = client_with_auth
        
        # Create emails in different folders
        thread1 = Thread(subject="Inbox email", owner_id=user.id, email_count=1)
        db_session.add(thread1)
        db_session.flush()
        
        inbox_email = Email(
            subject="Inbox email",
            body="In inbox",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread1.id
        )
        db_session.add(inbox_email)
        
        thread2 = Thread(subject="Sent email", owner_id=user.id, email_count=1)
        db_session.add(thread2)
        db_session.flush()
        
        sent_email = Email(
            subject="Sent email",
            body="In sent",
            status="sent",
            sender_id=user.id,
            folder=FolderType.SENT.value,
            thread_id=thread2.id
        )
        db_session.add(sent_email)
        db_session.commit()
        
        # Search with folder filter
        response = client.get(
            "/api/v1/search?folder=inbox",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        for result in data["results"]:
            assert result["folder"] == "inbox"

    def test_search_filter_by_is_read(self, client_with_auth, db_session):
        """Test filtering search by read status."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Test", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Test",
            body="Test",
            status="received",
            is_read=False,
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        response = client.get(
            "/api/v1/search?is_read=false",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        for result in data["results"]:
            assert result["is_read"] == False

    def test_search_filter_by_is_starred(self, client_with_auth, db_session):
        """Test filtering search by starred status."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Starred", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Starred",
            body="Important",
            status="received",
            is_starred=True,
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        response = client.get(
            "/api/v1/search?is_starred=true",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        for result in data["results"]:
            assert result["is_starred"] == True

    def test_search_filter_by_has_attachment(self, client_with_auth, db_session):
        """Test filtering search by has_attachment."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Email with attachment", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Email with attachment",
            body="Has file",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.flush()
        
        attachment = Attachment(
            email_id=email.id,
            filename="document.pdf",
            content_type="application/pdf",
            size_bytes=1024,
            storage_path="/attachments/document.pdf"
        )
        db_session.add(attachment)
        db_session.commit()
        
        response = client.get(
            "/api/v1/search?has_attachment=true",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        for result in data["results"]:
            assert result["has_attachments"] == True or result["attachment_count"] > 0


class TestSearchImportant:
    """Test is_important filter based on thread metadata."""

    def test_search_filter_by_is_important(self, client_with_auth, db_session):
        """Test filtering search by important status (thread metadata)."""
        client, token, user = client_with_auth
        
        # Create a thread marked as important
        thread = Thread(subject="Important thread", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        # Add thread user metadata marking it as important
        metadata = ThreadUserMetadata(
            thread_id=thread.id,
            user_id=user.id,
            is_important=True
        )
        db_session.add(metadata)
        
        email = Email(
            subject="Important thread",
            body="Very important email",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id
        )
        db_session.add(email)
        
        # Create a non-important thread
        thread2 = Thread(subject="Regular thread", owner_id=user.id, email_count=1)
        db_session.add(thread2)
        db_session.flush()
        
        email2 = Email(
            subject="Regular thread",
            body="Normal email",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread2.id
        )
        db_session.add(email2)
        db_session.commit()
        
        # Search for important emails
        response = client.get(
            "/api/v1/search?is_important=true",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        for result in data["results"]:
            assert result["is_important"] == True


class TestSearchLabelHierarchy:
    """Test hierarchical label names in search results."""

    def test_search_results_show_hierarchical_label_names(self, client_with_auth, db_session):
        """Test that search results show full label hierarchy path."""
        client, token, user = client_with_auth
        
        # Create hierarchical labels
        parent = Label(name="Work", owner_id=user.id)
        db_session.add(parent)
        db_session.commit()
        
        child = Label(name="Projects", parent_id=parent.id, owner_id=user.id)
        db_session.add(child)
        db_session.commit()
        
        # Create email with nested label (labels are linked to threads)
        thread = Thread(
            subject="Project Update",
            owner_id=user.id,
            email_count=1
        )
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Project Update",
            body="Status report",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        thread_label = ThreadLabel(thread_id=thread.id, label_id=child.id, user_id=user.id)
        db_session.add(thread_label)
        db_session.commit()
        
        # Search and check label names
        response = client.get(
            "/api/v1/search?q=Project",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        # Find our email
        our_result = next((r for r in data["results"] if r["id"] == str(email.id)), None)
        assert our_result is not None
        # Labels should be LabelBriefResponse objects with name containing hierarchy
        label_names = [l["name"] for l in our_result["labels"]]
        assert "Work/Projects" in label_names

    def test_search_filter_by_label_name(self, client_with_auth, db_session):
        """Test filtering search by label name."""
        client, token, user = client_with_auth
        
        # Create label
        label = Label(name="Important", owner_id=user.id)
        db_session.add(label)
        db_session.commit()
        
        # Create thread and email with label
        thread = Thread(subject="Labeled email", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Labeled email",
            body="Has label",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        thread_label = ThreadLabel(thread_id=thread.id, label_id=label.id, user_id=user.id)
        db_session.add(thread_label)
        db_session.commit()
        
        response = client.get(
            "/api/v1/search?label_name=Important",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert len(data["results"]) >= 1


class TestSearchDateFilters:
    """Test date range filters."""

    def test_search_filter_by_date_from(self, client_with_auth, db_session):
        """Test filtering search by date_from."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Recent email", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Recent email",
            body="Today's email",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id,
            created_at=datetime.utcnow()
        )
        db_session.add(email)
        db_session.commit()
        
        yesterday = (datetime.utcnow() - timedelta(days=1)).strftime('%Y-%m-%d')
        response = client.get(
            f"/api/v1/search?date_from={yesterday}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200

    def test_search_filter_by_date_to(self, client_with_auth, db_session):
        """Test filtering search by date_to."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Old email", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Old email",
            body="Past email",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id,
            created_at=datetime.utcnow() - timedelta(days=5)
        )
        db_session.add(email)
        db_session.commit()
        
        tomorrow = (datetime.utcnow() + timedelta(days=1)).strftime('%Y-%m-%d')
        response = client.get(
            f"/api/v1/search?date_to={tomorrow}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200


class TestSearchPagination:
    """Test search pagination and sorting."""

    def test_search_pagination(self, client_with_auth, db_session):
        """Test search results pagination."""
        client, token, user = client_with_auth
        
        # Create many threads and emails
        for i in range(25):
            thread = Thread(subject=f"Test email {i}", owner_id=user.id, email_count=1)
            db_session.add(thread)
            db_session.flush()
            
            email = Email(
                subject=f"Test email {i}",
                body=f"Content {i}",
                status="received",
                sender_id=user.id,
                folder=FolderType.INBOX.value,
                thread_id=thread.id
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

    def test_search_sorting_by_date(self, client_with_auth, db_session):
        """Test search results sorting by date."""
        client, token, user = client_with_auth
        
        # Create emails with different dates
        thread1 = Thread(subject="Old email", owner_id=user.id, email_count=1)
        db_session.add(thread1)
        db_session.flush()
        
        old_email = Email(
            subject="Old email",
            body="Old",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread1.id,
            sent_at=datetime.utcnow() - timedelta(days=5)
        )
        db_session.add(old_email)
        
        thread2 = Thread(subject="New email", owner_id=user.id, email_count=1)
        db_session.add(thread2)
        db_session.flush()
        
        new_email = Email(
            subject="New email",
            body="New",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread2.id,
            sent_at=datetime.utcnow()
        )
        db_session.add(new_email)
        db_session.commit()
        
        # Test descending order (default)
        response = client.get(
            "/api/v1/search?sort_by=date&sort_order=desc",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        if len(data["results"]) >= 2:
            # Newer email should come first
            results = data["results"]
            new_result = next((r for r in results if r["id"] == str(new_email.id)), None)
            old_result = next((r for r in results if r["id"] == str(old_email.id)), None)
            if new_result and old_result:
                new_idx = results.index(new_result)
                old_idx = results.index(old_result)
                assert new_idx < old_idx


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

    def test_get_folder_suggestions(self, client_with_auth):
        """Test getting folder suggestions for in: operator."""
        client, token, user = client_with_auth
        
        response = client.get(
            "/api/v1/search/suggestions?q=in:",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert "folders" in data
        assert len(data["folders"]) > 0


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

    def test_delete_saved_search_permanent(self, client_with_auth, db_session):
        """Test permanently deleting a saved search removes it from database."""
        client, token, user = client_with_auth
        
        saved = SavedSearch(
            name="Test Search Permanent",
            query="is:unread",
            owner_id=user.id
        )
        db_session.add(saved)
        db_session.commit()
        saved_id = saved.id
        
        response = client.delete(
            f"/api/v1/search/saved/{saved_id}?permanent=true",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 204
        
        # Verify saved search is completely gone
        db_session.expire_all()
        saved_check = db_session.query(SavedSearch).filter(SavedSearch.id == saved_id).first()
        assert saved_check is None


class TestSearchResponseFormat:
    """Test that search response matches EmailListResponse format."""

    def test_search_response_has_email_list_fields(self, client_with_auth, db_session):
        """Test that search response includes all EmailListResponse fields."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Test Response Format", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Test Response Format",
            body="Testing response fields",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id,
            is_read=False,
            is_starred=True
        )
        db_session.add(email)
        db_session.commit()
        
        response = client.get(
            "/api/v1/search?q=Response Format",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Verify PaginatedListResponse structure
        assert "results" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data
        assert "total_pages" in data
        
        # Verify EmailListResponse fields in results
        if len(data["results"]) > 0:
            result = data["results"][0]
            
            # Required fields from EmailListResponse
            assert "id" in result
            assert "subject" in result
            assert "snippet" in result
            assert "folder" in result
            assert "labels" in result  # Category is now via labels
            assert "is_read" in result
            assert "is_starred" in result
            assert "is_important" in result
            assert "is_archived" in result
            assert "sender_id" in result
            assert "thread_id" in result
            assert "created_at" in result
            assert "attachment_count" in result
            assert "has_attachments" in result
            assert "labels" in result

    def test_search_response_labels_are_objects(self, client_with_auth, db_session):
        """Test that labels in search results are LabelBriefResponse objects, not strings."""
        client, token, user = client_with_auth
        
        # Create label
        label = Label(name="TestLabel", color="#ff0000", owner_id=user.id)
        db_session.add(label)
        db_session.commit()
        
        thread = Thread(subject="Label Test", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Label Test",
            body="Testing labels",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        thread_label = ThreadLabel(thread_id=thread.id, label_id=label.id, user_id=user.id)
        db_session.add(thread_label)
        db_session.commit()
        
        response = client.get(
            "/api/v1/search?q=Label Test",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Find our email
        our_result = next((r for r in data["results"] if r["id"] == str(email.id)), None)
        assert our_result is not None
        
        # Labels should be objects with id, name, color, etc.
        assert len(our_result["labels"]) > 0
        label_obj = our_result["labels"][0]
        assert isinstance(label_obj, dict)
        assert "id" in label_obj
        assert "name" in label_obj
        assert "color" in label_obj
        assert "owner_id" in label_obj


class TestSearchTimezoneOffset:
    """Test timezone offset (tz_offset) functionality for date parsing in search queries."""

    def test_search_with_tz_offset_param_accepted(self, client_with_auth, db_session):
        """Test that tz_offset parameter is accepted by the API."""
        client, token, user = client_with_auth
        
        # Create a thread and email
        thread = Thread(subject="Timezone Test", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Timezone Test",
            body="Testing tz_offset",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        # Test with EST offset (300 minutes = UTC-5)
        response = client.get(
            "/api/v1/search?q=Timezone&tz_offset=300",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert "results" in data

    def test_search_tz_offset_with_after_operator(self, client_with_auth, db_session):
        """Test that tz_offset correctly converts after: dates in q param."""
        client, token, user = client_with_auth
        
        # Create email with known timestamp (today at midnight UTC)
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        thread = Thread(subject="After Test", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="After Test",
            body="Testing after filter with tz_offset",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id,
            created_at=today + timedelta(hours=3)  # 03:00 UTC today
        )
        db_session.add(email)
        db_session.commit()
        
        today_str = today.strftime('%Y-%m-%d')
        
        # Without tz_offset: after:today means >= midnight UTC
        # Email at 03:00 UTC should be found
        response = client.get(
            f"/api/v1/search?q=after:{today_str}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()["data"]
        found_without_offset = any(r["id"] == str(email.id) for r in data["results"])
        
        # With EST offset (300): after:today means >= 05:00 UTC (midnight EST = 05:00 UTC)
        # Email at 03:00 UTC should NOT be found
        response = client.get(
            f"/api/v1/search?q=after:{today_str}&tz_offset=300",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()["data"]
        found_with_est_offset = any(r["id"] == str(email.id) for r in data["results"])
        
        # The email at 03:00 UTC should be found without offset but not with EST offset
        assert found_without_offset == True
        assert found_with_est_offset == False

    def test_search_tz_offset_with_before_operator(self, client_with_auth, db_session):
        """Test that tz_offset correctly converts before: dates in q param."""
        client, token, user = client_with_auth
        
        # Create email with known timestamp
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        thread = Thread(subject="Before Test", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Before Test",
            body="Testing before filter with tz_offset",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id,
            created_at=today + timedelta(hours=3)  # 03:00 UTC today
        )
        db_session.add(email)
        db_session.commit()
        
        tomorrow_str = (today + timedelta(days=1)).strftime('%Y-%m-%d')
        
        # With IST offset (-330): before:tomorrow means < 18:30 UTC today (midnight IST tomorrow = 18:30 UTC today)
        # Email at 03:00 UTC should be found
        response = client.get(
            f"/api/v1/search?q=before:{tomorrow_str}&tz_offset=-330",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()["data"]
        found = any(r["id"] == str(email.id) for r in data["results"])
        assert found == True

    def test_search_tz_offset_does_not_affect_explicit_date_params(self, client_with_auth, db_session):
        """Test that tz_offset only affects q param dates, not explicit date_from/date_to."""
        client, token, user = client_with_auth
        
        # Create email with known timestamp
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        thread = Thread(subject="Explicit Date Test", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Explicit Date Test",
            body="Testing explicit date params",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id,
            created_at=today + timedelta(hours=3)  # 03:00 UTC today
        )
        db_session.add(email)
        db_session.commit()
        
        today_str = today.strftime('%Y-%m-%d')
        
        # Explicit date_from param should be treated as UTC regardless of tz_offset
        # Email at 03:00 UTC should be found with date_from=today (midnight UTC)
        response = client.get(
            f"/api/v1/search?date_from={today_str}&tz_offset=300",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()["data"]
        found = any(r["id"] == str(email.id) for r in data["results"])
        # Should be found because explicit params are treated as UTC
        assert found == True

    def test_search_tz_offset_negative_value(self, client_with_auth, db_session):
        """Test tz_offset with negative value (ahead of UTC, e.g., IST)."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Negative Offset", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Negative Offset",
            body="Testing negative offset",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        # IST offset is -330 (UTC+5:30)
        response = client.get(
            "/api/v1/search?q=Negative&tz_offset=-330",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200

    def test_search_tz_offset_zero(self, client_with_auth, db_session):
        """Test tz_offset with zero (UTC)."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Zero Offset", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Zero Offset",
            body="Testing zero offset",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        response = client.get(
            "/api/v1/search?q=Zero&tz_offset=0",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200

    def test_search_tz_offset_invalid_falls_back_to_utc(self, client_with_auth, db_session):
        """Test that invalid tz_offset values fall back to UTC."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Invalid Offset", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Invalid Offset",
            body="Testing invalid offset",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        # Invalid offset (way out of range)
        response = client.get(
            "/api/v1/search?q=Invalid&tz_offset=99999",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Should still work, falling back to UTC
        assert response.status_code == 200

    def test_search_tz_offset_with_combined_operators(self, client_with_auth, db_session):
        """Test tz_offset with combined search operators in q param."""
        client, token, user = client_with_auth
        
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        thread = Thread(subject="Combined Test", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Combined Test Report",
            body="This is a test report email",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id,
            is_starred=True,
            created_at=today + timedelta(hours=12)
        )
        db_session.add(email)
        db_session.commit()
        
        today_str = today.strftime('%Y-%m-%d')
        
        # Complex query with date operator and other filters
        response = client.get(
            f"/api/v1/search?q=after:{today_str} is:starred report&tz_offset=300",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200

    def test_search_tz_offset_with_newer_than_relative_date(self, client_with_auth, db_session):
        """Test that tz_offset does NOT affect relative dates (newer_than/older_than)."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Relative Date Test", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Relative Date Test",
            body="Testing relative dates",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id,
            created_at=datetime.utcnow() - timedelta(days=3)  # 3 days ago
        )
        db_session.add(email)
        db_session.commit()
        
        # newer_than:7d should find emails from last 7 days regardless of tz_offset
        response = client.get(
            "/api/v1/search?q=newer_than:7d Relative&tz_offset=300",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        found = any(r["id"] == str(email.id) for r in data["results"])
        assert found == True

    def test_search_tz_offset_boundary_values(self, client_with_auth, db_session):
        """Test tz_offset at boundary values (UTC-12 and UTC+14)."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Boundary Test", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Boundary Test",
            body="Testing boundary offsets",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        # UTC-12 (720 minutes) - Baker Island, westernmost timezone
        response = client.get(
            "/api/v1/search?q=Boundary&tz_offset=720",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        # UTC+14 (-840 minutes) - Line Islands, easternmost timezone
        response = client.get(
            "/api/v1/search?q=Boundary&tz_offset=-840",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200


class TestParseDateToUtc:
    """Unit tests for parse_date_to_utc function."""

    def test_parse_date_no_offset(self):
        """Test parsing date without offset returns UTC midnight."""
        from app.utils.search_utils import parse_date_to_utc
        from datetime import UTC
        
        result = parse_date_to_utc('2024-01-15')
        
        assert result.year == 2024
        assert result.month == 1
        assert result.day == 15
        assert result.hour == 0
        assert result.minute == 0
        assert result.tzinfo == UTC

    def test_parse_date_with_positive_offset_est(self):
        """Test parsing date with EST offset (300 minutes = UTC-5)."""
        from app.utils.search_utils import parse_date_to_utc
        
        # EST: midnight local = 05:00 UTC
        result = parse_date_to_utc('2024-01-15', tz_offset=300)
        
        assert result.year == 2024
        assert result.month == 1
        assert result.day == 15
        assert result.hour == 5
        assert result.minute == 0

    def test_parse_date_with_negative_offset_ist(self):
        """Test parsing date with IST offset (-330 minutes = UTC+5:30)."""
        from app.utils.search_utils import parse_date_to_utc
        
        # IST: midnight local = previous day 18:30 UTC
        result = parse_date_to_utc('2024-01-15', tz_offset=-330)
        
        assert result.year == 2024
        assert result.month == 1
        assert result.day == 14  # Previous day
        assert result.hour == 18
        assert result.minute == 30

    def test_parse_date_with_zero_offset(self):
        """Test parsing date with zero offset (UTC)."""
        from app.utils.search_utils import parse_date_to_utc
        
        result = parse_date_to_utc('2024-01-15', tz_offset=0)
        
        assert result.hour == 0
        assert result.minute == 0

    def test_parse_date_invalid_offset_out_of_range_high(self):
        """Test that offset > 840 falls back to UTC."""
        from app.utils.search_utils import parse_date_to_utc
        
        result = parse_date_to_utc('2024-01-15', tz_offset=9999)
        
        # Should fall back to UTC midnight
        assert result.hour == 0
        assert result.minute == 0

    def test_parse_date_invalid_offset_out_of_range_low(self):
        """Test that offset < -720 falls back to UTC."""
        from app.utils.search_utils import parse_date_to_utc
        
        result = parse_date_to_utc('2024-01-15', tz_offset=-9999)
        
        # Should fall back to UTC midnight
        assert result.hour == 0
        assert result.minute == 0

    def test_parse_date_boundary_offset_utc_minus_12(self):
        """Test boundary offset UTC-12 (720 minutes)."""
        from app.utils.search_utils import parse_date_to_utc
        
        result = parse_date_to_utc('2024-01-15', tz_offset=720)
        
        # Midnight UTC-12 = 12:00 UTC same day
        assert result.day == 15
        assert result.hour == 12
        assert result.minute == 0

    def test_parse_date_boundary_offset_utc_plus_14(self):
        """Test boundary offset UTC+14 (-840 minutes)."""
        from app.utils.search_utils import parse_date_to_utc
        
        result = parse_date_to_utc('2024-01-15', tz_offset=-840)
        
        # Midnight UTC+14 on Jan 15 = 10:00 UTC on Jan 14 (14 hours earlier)
        assert result.day == 14
        assert result.hour == 10
        assert result.minute == 0

    def test_parse_date_year_boundary_positive_offset(self):
        """Test date parsing across year boundary with positive offset."""
        from app.utils.search_utils import parse_date_to_utc
        
        # New Year's Day in EST (UTC-5)
        result = parse_date_to_utc('2024-01-01', tz_offset=300)
        
        # Midnight EST Jan 1 = 05:00 UTC Jan 1
        assert result.year == 2024
        assert result.month == 1
        assert result.day == 1
        assert result.hour == 5

    def test_parse_date_year_boundary_negative_offset(self):
        """Test date parsing across year boundary with negative offset."""
        from app.utils.search_utils import parse_date_to_utc
        
        # New Year's Day in IST (UTC+5:30)
        result = parse_date_to_utc('2024-01-01', tz_offset=-330)
        
        # Midnight IST Jan 1 = 18:30 UTC Dec 31 2023
        assert result.year == 2023
        assert result.month == 12
        assert result.day == 31
        assert result.hour == 18
        assert result.minute == 30


class TestParseSearchQueryTimezone:
    """Unit tests for parse_search_query with timezone offset."""

    def test_parse_query_after_with_offset(self):
        """Test parsing after: operator with timezone offset."""
        from app.utils.search_utils import parse_search_query
        
        result = parse_search_query('after:2024-01-15', tz_offset=300)
        
        assert 'date_from' in result
        assert result['date_from'].hour == 5  # EST midnight = 05:00 UTC

    def test_parse_query_before_with_offset(self):
        """Test parsing before: operator with timezone offset."""
        from app.utils.search_utils import parse_search_query
        
        result = parse_search_query('before:2024-01-15', tz_offset=-330)
        
        assert 'date_to' in result
        # IST midnight = previous day 18:30 UTC
        assert result['date_to'].day == 14
        assert result['date_to'].hour == 18
        assert result['date_to'].minute == 30

    def test_parse_query_after_without_offset(self):
        """Test parsing after: operator without timezone offset."""
        from app.utils.search_utils import parse_search_query
        
        result = parse_search_query('after:2024-01-15')
        
        assert 'date_from' in result
        assert result['date_from'].hour == 0  # UTC midnight

    def test_parse_query_newer_than_ignores_offset(self):
        """Test that newer_than relative date is not affected by tz_offset."""
        from app.utils.search_utils import parse_search_query
        from datetime import datetime, UTC
        
        now = datetime.now(UTC)
        result = parse_search_query('newer_than:7d', tz_offset=300)
        
        assert 'date_from' in result
        # Should be approximately 7 days ago from now, not affected by offset
        expected = now - timedelta(days=7)
        diff = abs((result['date_from'] - expected).total_seconds())
        assert diff < 5  # Within 5 seconds

    def test_parse_query_older_than_ignores_offset(self):
        """Test that older_than relative date is not affected by tz_offset."""
        from app.utils.search_utils import parse_search_query
        from datetime import datetime, UTC
        
        now = datetime.now(UTC)
        result = parse_search_query('older_than:30d', tz_offset=-330)
        
        assert 'date_to' in result
        # Should be approximately 30 days ago from now, not affected by offset
        expected = now - timedelta(days=30)
        diff = abs((result['date_to'] - expected).total_seconds())
        assert diff < 5  # Within 5 seconds

    def test_parse_query_combined_date_and_text(self):
        """Test parsing query with date operator and text."""
        from app.utils.search_utils import parse_search_query
        
        result = parse_search_query('after:2024-01-15 important meeting', tz_offset=300)
        
        assert 'date_from' in result
        assert result['date_from'].hour == 5
        assert 'text' in result
        assert 'important meeting' in result['text']

    def test_parse_query_combined_before_after_with_offset(self):
        """Test parsing query with both before: and after: operators."""
        from app.utils.search_utils import parse_search_query
        
        result = parse_search_query('after:2024-01-01 before:2024-01-31', tz_offset=300)
        
        assert 'date_from' in result
        assert 'date_to' in result
        assert result['date_from'].day == 1
        assert result['date_from'].hour == 5
        assert result['date_to'].day == 31
        assert result['date_to'].hour == 5

    def test_parse_query_date_with_other_operators(self):
        """Test parsing query with date and other operators."""
        from app.utils.search_utils import parse_search_query
        
        result = parse_search_query(
            'from:test@example.com after:2024-01-15 is:starred has:attachment',
            tz_offset=300
        )
        
        assert result['from_email'] == 'test@example.com'
        assert result['date_from'].hour == 5
        assert result['is_starred'] == True
        assert result['has_attachment'] == True


class TestSearchHasnotFilter:
    """Test hasnot/exclusion filter."""

    def test_search_hasnot_excludes_matching_emails(self, client_with_auth, db_session):
        """Test that hasnot parameter excludes emails containing the term."""
        client, token, user = client_with_auth
        
        # Create email with "spam" in body
        thread1 = Thread(subject="Spam Email", owner_id=user.id, email_count=1)
        db_session.add(thread1)
        db_session.flush()
        
        email1 = Email(
            subject="Spam Email",
            body="This is spam content",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread1.id
        )
        db_session.add(email1)
        
        # Create email without "spam"
        thread2 = Thread(subject="Normal Email", owner_id=user.id, email_count=1)
        db_session.add(thread2)
        db_session.flush()
        
        email2 = Email(
            subject="Normal Email",
            body="This is regular content",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread2.id
        )
        db_session.add(email2)
        db_session.commit()
        
        # Search excluding "spam"
        response = client.get(
            "/api/v1/search?hasnot=spam",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Should not include email with "spam"
        result_ids = [r["id"] for r in data["results"]]
        assert str(email1.id) not in result_ids
        assert str(email2.id) in result_ids

    def test_search_hasnot_via_q_operator(self, client_with_auth, db_session):
        """Test exclusion via -term in q parameter."""
        client, token, user = client_with_auth
        
        thread1 = Thread(subject="Newsletter Update", owner_id=user.id, email_count=1)
        db_session.add(thread1)
        db_session.flush()
        
        email1 = Email(
            subject="Newsletter Update",
            body="Weekly newsletter",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread1.id
        )
        db_session.add(email1)
        
        thread2 = Thread(subject="Important Update", owner_id=user.id, email_count=1)
        db_session.add(thread2)
        db_session.flush()
        
        email2 = Email(
            subject="Important Update",
            body="Critical update",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread2.id
        )
        db_session.add(email2)
        db_session.commit()
        
        # Search for "Update" excluding "newsletter"
        response = client.get(
            "/api/v1/search?q=Update -newsletter",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        result_ids = [r["id"] for r in data["results"]]
        assert str(email1.id) not in result_ids
        assert str(email2.id) in result_ids


class TestSearchSizeFilters:
    """Test size-based filters (based on total attachment size)."""

    def test_search_size_larger_filter(self, client_with_auth, db_session):
        """Test filtering emails larger than specified size (by attachment size)."""
        client, token, user = client_with_auth
        
        # Create email with large attachment
        thread1 = Thread(subject="Large Email", owner_id=user.id, email_count=1)
        db_session.add(thread1)
        db_session.flush()
        
        email1 = Email(
            subject="Large Email",
            body="Has large attachment",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread1.id
        )
        db_session.add(email1)
        db_session.flush()
        
        # Add large attachment
        attachment1 = Attachment(
            email_id=email1.id,
            filename="large_file.zip",
            content_type="application/zip",
            size_bytes=15000
        )
        db_session.add(attachment1)
        
        # Create email with small attachment
        thread2 = Thread(subject="Small Email", owner_id=user.id, email_count=1)
        db_session.add(thread2)
        db_session.flush()
        
        email2 = Email(
            subject="Small Email",
            body="Has small attachment",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread2.id
        )
        db_session.add(email2)
        db_session.flush()
        
        # Add small attachment
        attachment2 = Attachment(
            email_id=email2.id,
            filename="small_file.txt",
            content_type="text/plain",
            size_bytes=100
        )
        db_session.add(attachment2)
        db_session.commit()
        
        # Search for emails larger than 5000 bytes
        response = client.get(
            "/api/v1/search?larger=5000",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        result_ids = [r["id"] for r in data["results"]]
        assert str(email1.id) in result_ids
        assert str(email2.id) not in result_ids

    def test_search_size_smaller_filter(self, client_with_auth, db_session):
        """Test filtering emails smaller than specified size (by attachment size)."""
        client, token, user = client_with_auth
        
        # Create email with large attachment
        thread1 = Thread(subject="Large Email", owner_id=user.id, email_count=1)
        db_session.add(thread1)
        db_session.flush()
        
        email1 = Email(
            subject="Large Email",
            body="Has large attachment",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread1.id
        )
        db_session.add(email1)
        db_session.flush()
        
        attachment1 = Attachment(
            email_id=email1.id,
            filename="large_file.zip",
            content_type="application/zip",
            size_bytes=15000
        )
        db_session.add(attachment1)
        
        # Create email with small attachment
        thread2 = Thread(subject="Small Email", owner_id=user.id, email_count=1)
        db_session.add(thread2)
        db_session.flush()
        
        email2 = Email(
            subject="Small Email",
            body="Has small attachment",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread2.id
        )
        db_session.add(email2)
        db_session.flush()
        
        attachment2 = Attachment(
            email_id=email2.id,
            filename="small_file.txt",
            content_type="text/plain",
            size_bytes=100
        )
        db_session.add(attachment2)
        db_session.commit()
        
        # Search for emails smaller than 1000 bytes
        response = client.get(
            "/api/v1/search?smaller=1000",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        result_ids = [r["id"] for r in data["results"]]
        assert str(email1.id) not in result_ids
        assert str(email2.id) in result_ids

    def test_search_size_via_q_larger_operator(self, client_with_auth, db_session):
        """Test larger: operator in q parameter with K/M suffixes."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Size Test", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Size Test",
            body="Content",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.flush()
        
        # Add large attachment (~2MB)
        attachment = Attachment(
            email_id=email.id,
            filename="big_file.bin",
            content_type="application/octet-stream",
            size_bytes=2048000
        )
        db_session.add(attachment)
        db_session.commit()
        
        # Search for emails larger than 1M
        response = client.get(
            "/api/v1/search?q=larger:1M",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        result_ids = [r["id"] for r in data["results"]]
        assert str(email.id) in result_ids

    def test_search_size_exact_filter(self, client_with_auth, db_session):
        """Test filtering by exact size."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Exact Size", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Exact Size",
            body="Content",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.flush()
        
        attachment = Attachment(
            email_id=email.id,
            filename="exact.dat",
            content_type="application/octet-stream",
            size_bytes=5000
        )
        db_session.add(attachment)
        db_session.commit()
        
        response = client.get(
            "/api/v1/search?size=5000",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200


class TestSearchCcBccFilters:
    """Test CC and BCC recipient filters."""

    def test_search_cc_filter(self, client_with_auth, db_session):
        """Test filtering by CC recipients."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="CC Test", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="CC Test",
            body="Email with CC",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.flush()
        
        # Add CC recipient
        cc_recipient = EmailRecipient(
            email_id=email.id,
            recipient_email="cc-user@example.com",
            recipient_type="cc"
        )
        db_session.add(cc_recipient)
        db_session.commit()
        
        response = client.get(
            "/api/v1/search?cc=cc-user@example.com",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        result_ids = [r["id"] for r in data["results"]]
        assert str(email.id) in result_ids

    def test_search_bcc_filter(self, client_with_auth, db_session):
        """Test filtering by BCC recipients."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="BCC Test", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="BCC Test",
            body="Email with BCC",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.flush()
        
        # Add BCC recipient
        bcc_recipient = EmailRecipient(
            email_id=email.id,
            recipient_email="bcc-user@example.com",
            recipient_type="bcc"
        )
        db_session.add(bcc_recipient)
        db_session.commit()
        
        response = client.get(
            "/api/v1/search?bcc=bcc-user@example.com",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        result_ids = [r["id"] for r in data["results"]]
        assert str(email.id) in result_ids

    def test_search_cc_via_q_operator(self, client_with_auth, db_session):
        """Test cc: operator in q parameter."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="CC Q Test", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="CC Q Test",
            body="Test email",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.flush()
        
        cc_recipient = EmailRecipient(
            email_id=email.id,
            recipient_email="manager@company.com",
            recipient_type="cc"
        )
        db_session.add(cc_recipient)
        db_session.commit()
        
        response = client.get(
            "/api/v1/search?q=cc:manager@company.com",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        result_ids = [r["id"] for r in data["results"]]
        assert str(email.id) in result_ids


class TestSearchFilenameFilter:
    """Test filename/attachment filter."""

    def test_search_filename_filter(self, client_with_auth, db_session):
        """Test filtering by attachment filename."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Document Email", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Document Email",
            body="Please find attached",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.flush()
        
        # Add attachment
        attachment = Attachment(
            email_id=email.id,
            filename="report.pdf",
            content_type="application/pdf",
            size_bytes=1024
        )
        db_session.add(attachment)
        db_session.commit()
        
        response = client.get(
            "/api/v1/search?filename=report.pdf",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        result_ids = [r["id"] for r in data["results"]]
        assert str(email.id) in result_ids

    def test_search_filename_extension_filter(self, client_with_auth, db_session):
        """Test filtering by file extension."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="PDF Email", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="PDF Email",
            body="PDF attached",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.flush()
        
        attachment = Attachment(
            email_id=email.id,
            filename="quarterly-report.pdf",
            content_type="application/pdf",
            size_bytes=2048
        )
        db_session.add(attachment)
        db_session.commit()
        
        # Search for .pdf files
        response = client.get(
            "/api/v1/search?filename=pdf",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        result_ids = [r["id"] for r in data["results"]]
        assert str(email.id) in result_ids

    def test_search_filename_via_q_operator(self, client_with_auth, db_session):
        """Test filename: operator in q parameter."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Filename Q Test", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Filename Q Test",
            body="Doc attached",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.flush()
        
        attachment = Attachment(
            email_id=email.id,
            filename="invoice.xlsx",
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            size_bytes=4096
        )
        db_session.add(attachment)
        db_session.commit()
        
        response = client.get(
            "/api/v1/search?q=filename:xlsx",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        result_ids = [r["id"] for r in data["results"]]
        assert str(email.id) in result_ids


class TestSearchCategoryFilter:
    """Test category filter - now uses labels with is_system=True, is_exclusive=False."""

    def test_search_category_promotions(self, client_with_auth, db_session):
        """Test filtering by promotions category via label."""
        from app.models.label import Label
        from app.models.thread_label import ThreadLabel
        
        client, token, user = client_with_auth
        
        thread = Thread(subject="Sale Alert", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Sale Alert",
            body="50% off everything",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.flush()
        
        # Get promotions label for user (is_system=True, is_exclusive=False)
        promo_label = db_session.query(Label).filter(
            Label.owner_id == user.id,
            Label.name == "Promotions",
            Label.is_system == True,
            Label.is_exclusive == False
        ).first()
        
        if promo_label:
            thread_label = ThreadLabel(
                thread_id=thread.id,
                label_id=promo_label.id,
                user_id=user.id
            )
            db_session.add(thread_label)
        
        db_session.commit()
        
        response = client.get(
            "/api/v1/search?category=promotions",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # If label was found and added, email should be in results
        if promo_label:
            result_ids = [r["id"] for r in data["results"]]
            assert str(email.id) in result_ids

    def test_search_category_via_q_operator(self, client_with_auth, db_session):
        """Test category: operator in q parameter via label."""
        from app.models.label import Label
        from app.models.thread_label import ThreadLabel
        
        client, token, user = client_with_auth
        
        thread = Thread(subject="Social Update", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Social Update",
            body="New follower",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.flush()
        
        # Get social label for user (is_system=True, is_exclusive=False)
        social_label = db_session.query(Label).filter(
            Label.owner_id == user.id,
            Label.name == "Social",
            Label.is_system == True,
            Label.is_exclusive == False
        ).first()
        
        if social_label:
            thread_label = ThreadLabel(
                thread_id=thread.id,
                label_id=social_label.id,
                user_id=user.id
            )
            db_session.add(thread_label)
        
        db_session.commit()
        
        response = client.get(
            "/api/v1/search?q=category:social",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # If label was found and added, email should be in results
        if social_label:
            result_ids = [r["id"] for r in data["results"]]
            assert str(email.id) in result_ids


class TestSearchInAnywhereFilter:
    """Test in:anywhere filter to include spam/trash."""

    def test_search_in_anywhere_includes_spam(self, client_with_auth, db_session):
        """Test that in:anywhere includes spam folder."""
        client, token, user = client_with_auth
        
        # Create email in spam
        thread = Thread(subject="Spam Email", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Spam Email",
            body="This is spam",
            status="received",
            sender_id=user.id,
            folder=FolderType.SPAM.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        # Normal search should NOT include spam
        response = client.get(
            "/api/v1/search?q=Spam",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()["data"]
        result_ids = [r["id"] for r in data["results"]]
        assert str(email.id) not in result_ids
        
        # in:anywhere should include spam
        response = client.get(
            "/api/v1/search?in_anywhere=true&q=Spam",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()["data"]
        result_ids = [r["id"] for r in data["results"]]
        assert str(email.id) in result_ids

    def test_search_in_anywhere_includes_trash(self, client_with_auth, db_session):
        """Test that in:anywhere includes trash folder."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Deleted Email", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Deleted Email",
            body="In trash",
            status="received",
            sender_id=user.id,
            folder=FolderType.TRASH.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        # Normal search should NOT include trash
        response = client.get(
            "/api/v1/search?q=Deleted",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()["data"]
        result_ids = [r["id"] for r in data["results"]]
        assert str(email.id) not in result_ids
        
        # in:anywhere should include trash
        response = client.get(
            "/api/v1/search?q=in:anywhere Deleted",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()["data"]
        result_ids = [r["id"] for r in data["results"]]
        assert str(email.id) in result_ids


class TestSearchInArchiveFilter:
    """Test in:archive filter."""

    def test_search_in_archive(self, client_with_auth, db_session):
        """Test filtering archived emails."""
        client, token, user = client_with_auth
        
        # Create archived email (is_archived = True)
        thread = Thread(subject="Archived Email", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        # Create thread metadata with is_archived = True
        metadata = ThreadUserMetadata(
            thread_id=thread.id,
            user_id=user.id,
            is_archived=True
        )
        db_session.add(metadata)
        
        email = Email(
            subject="Archived Email",
            body="This is archived",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        response = client.get(
            "/api/v1/search?in_archive=true",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        result_ids = [r["id"] for r in data["results"]]
        assert str(email.id) in result_ids


class TestSearchHasUserlabelsFilter:
    """Test has_userlabels filter."""

    def test_search_has_userlabels_true(self, client_with_auth, db_session):
        """Test filtering emails with user labels."""
        client, token, user = client_with_auth
        
        # Create label
        label = Label(name="MyLabel", color="#ff0000", owner_id=user.id)
        db_session.add(label)
        db_session.flush()
        
        # Create thread with label
        thread = Thread(subject="Labeled Email", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        thread_label = ThreadLabel(thread_id=thread.id, label_id=label.id, user_id=user.id)
        db_session.add(thread_label)
        
        email = Email(
            subject="Labeled Email",
            body="Has label",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        response = client.get(
            "/api/v1/search?has_userlabels=true",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        result_ids = [r["id"] for r in data["results"]]
        assert str(email.id) in result_ids

    def test_search_has_userlabels_false(self, client_with_auth, db_session):
        """Test filtering emails without user labels."""
        client, token, user = client_with_auth
        
        # Create email without label
        thread = Thread(subject="Unlabeled Email", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Unlabeled Email",
            body="No label",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        response = client.get(
            "/api/v1/search?has_userlabels=false",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        result_ids = [r["id"] for r in data["results"]]
        assert str(email.id) in result_ids


class TestSearchDeliveredtoFilter:
    """Test deliveredto filter."""

    def test_search_deliveredto_filter(self, client_with_auth, db_session):
        """Test filtering by delivered-to address."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Delivered To Test", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Delivered To Test",
            body="Test email",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.flush()
        
        # Add to recipient
        recipient = EmailRecipient(
            email_id=email.id,
            recipient_email="delivered@example.com",
            recipient_type="to"
        )
        db_session.add(recipient)
        db_session.commit()
        
        response = client.get(
            "/api/v1/search?deliveredto=delivered@example.com",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        result_ids = [r["id"] for r in data["results"]]
        assert str(email.id) in result_ids


class TestSearchCommaSeperatedValues:
    """Test comma-separated values for from, to, cc, bcc."""

    def test_search_multiple_from_addresses(self, client_with_auth, db_session):
        """Test filtering by multiple from addresses."""
        client, token, user = client_with_auth
        
        # Create user2 for second sender
        from app.models.user import User
        user2 = User(
            email="sender2@example.com",
            first_name="Sender",
            last_name="Two",
            role="user"
        )
        db_session.add(user2)
        db_session.flush()
        
        # Email from user (current user is sender, so they can see it)
        thread1 = Thread(subject="From User 1", owner_id=user.id, email_count=1)
        db_session.add(thread1)
        db_session.flush()
        
        email1 = Email(
            subject="From User 1",
            body="Email from user 1",
            status="sent",
            sender_id=user.id,
            folder=FolderType.SENT.value,
            thread_id=thread1.id
        )
        db_session.add(email1)
        
        # Email from user2 to current user (current user is recipient, so they can see it)
        thread2 = Thread(subject="From User 2", owner_id=user.id, email_count=1)
        db_session.add(thread2)
        db_session.flush()
        
        email2 = Email(
            subject="From User 2",
            body="Email from user 2",
            status="received",
            sender_id=user2.id,
            folder=FolderType.INBOX.value,
            thread_id=thread2.id
        )
        db_session.add(email2)
        db_session.flush()
        
        # Add current user as recipient so they can see this email
        recipient = EmailRecipient(
            email_id=email2.id,
            recipient_email=user.email,
            recipient_id=user.id,
            recipient_type="to"
        )
        db_session.add(recipient)
        db_session.commit()
        
        # Search with comma-separated from addresses
        response = client.get(
            f"/api/v1/search?from={user.email},{user2.email}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        result_ids = [r["id"] for r in data["results"]]
        # Both emails should be found (user can see email1 as sender, email2 as recipient)
        assert str(email1.id) in result_ids
        assert str(email2.id) in result_ids


class TestSearchQueryParsing:
    """Test advanced query parsing features."""

    def test_search_exact_phrase(self, client_with_auth, db_session):
        """Test exact phrase matching with quotes."""
        client, token, user = client_with_auth
        
        thread1 = Thread(subject="Exact Match Test", owner_id=user.id, email_count=1)
        db_session.add(thread1)
        db_session.flush()
        
        email1 = Email(
            subject="Exact Match Test",
            body="This contains exact phrase match",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread1.id
        )
        db_session.add(email1)
        
        thread2 = Thread(subject="Partial Test", owner_id=user.id, email_count=1)
        db_session.add(thread2)
        db_session.flush()
        
        email2 = Email(
            subject="Partial Test",
            body="This contains exact but not phrase",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread2.id
        )
        db_session.add(email2)
        db_session.commit()
        
        # Search for exact phrase
        response = client.get(
            '/api/v1/search?q="exact phrase"',
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        result_ids = [r["id"] for r in data["results"]]
        assert str(email1.id) in result_ids
        assert str(email2.id) not in result_ids

    def test_search_or_operator(self, client_with_auth, db_session):
        """Test OR operator in search."""
        client, token, user = client_with_auth
        
        thread1 = Thread(subject="Apple Report", owner_id=user.id, email_count=1)
        db_session.add(thread1)
        db_session.flush()
        
        email1 = Email(
            subject="Apple Report",
            body="About apples",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread1.id
        )
        db_session.add(email1)
        
        thread2 = Thread(subject="Orange Report", owner_id=user.id, email_count=1)
        db_session.add(thread2)
        db_session.flush()
        
        email2 = Email(
            subject="Orange Report",
            body="About oranges",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread2.id
        )
        db_session.add(email2)
        
        thread3 = Thread(subject="Banana Report", owner_id=user.id, email_count=1)
        db_session.add(thread3)
        db_session.flush()
        
        email3 = Email(
            subject="Banana Report",
            body="About bananas",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread3.id
        )
        db_session.add(email3)
        db_session.commit()
        
        # Search for Apple OR Orange
        response = client.get(
            "/api/v1/search?q=Apple OR Orange",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        result_ids = [r["id"] for r in data["results"]]
        assert str(email1.id) in result_ids
        assert str(email2.id) in result_ids
        assert str(email3.id) not in result_ids

    def test_search_grouped_subject(self, client_with_auth, db_session):
        """Test grouped terms in subject: operator."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Dinner and Movie Plans", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Dinner and Movie Plans",
            body="Let's plan",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        # Search with grouped subject terms
        response = client.get(
            "/api/v1/search?q=subject:(dinner movie)",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200


class TestSearchRelativeDates:
    """Test relative date filters (newer_than, older_than)."""

    def test_search_newer_than_days(self, client_with_auth, db_session):
        """Test newer_than:Xd filter."""
        client, token, user = client_with_auth
        
        # Create recent email
        thread = Thread(subject="Recent Email", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Recent Email",
            body="Created recently",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id,
            created_at=datetime.utcnow() - timedelta(days=2)
        )
        db_session.add(email)
        db_session.commit()
        
        # Search for emails newer than 7 days
        response = client.get(
            "/api/v1/search?q=newer_than:7d Recent",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        result_ids = [r["id"] for r in data["results"]]
        assert str(email.id) in result_ids

    def test_search_older_than_days(self, client_with_auth, db_session):
        """Test older_than:Xd filter."""
        client, token, user = client_with_auth
        
        # Create old email
        thread = Thread(subject="Old Email", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Old Email",
            body="Created long ago",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id,
            created_at=datetime.utcnow() - timedelta(days=60)
        )
        db_session.add(email)
        db_session.commit()
        
        # Search for emails older than 30 days
        response = client.get(
            "/api/v1/search?q=older_than:30d Old",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        result_ids = [r["id"] for r in data["results"]]
        assert str(email.id) in result_ids

    def test_search_newer_than_weeks(self, client_with_auth, db_session):
        """Test newer_than:Xw filter."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Weekly Email", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Weekly Email",
            body="Within a week",
            status="received",
            sender_id=user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id,
            created_at=datetime.utcnow() - timedelta(days=5)
        )
        db_session.add(email)
        db_session.commit()
        
        response = client.get(
            "/api/v1/search?q=newer_than:2w Weekly",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        result_ids = [r["id"] for r in data["results"]]
        assert str(email.id) in result_ids
