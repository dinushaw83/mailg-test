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
            category=EmailCategory.PRIMARY.value,
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
            assert "category" in result
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
