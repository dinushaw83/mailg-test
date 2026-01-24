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
from app.core.constants import FolderType, EmailCategory, EmailStatus
from app.models.label import Label
from app.models.thread_label import ThreadLabel
from app.models.attachment import Attachment
from app.models.saved_search import SavedSearch
from tests.conftest import create_received_email_for_user, create_sent_email_for_user


# Helper to generate a non-existent UUID for 404 tests
NON_EXISTENT_UUID = "00000000-0000-0000-0000-000000099999"


class TestSearchBasic:
    """Test basic search functionality."""

    def test_search_emails_by_query(self, client_with_auth, db_session):
        """Test searching emails with a query string."""
        client, token, user = client_with_auth
        
        # Create thread and emails with searchable content (perspective-aware)
        thread = Thread(subject="Project meeting notes", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email1 = create_received_email_for_user(
            db_session, user,
            subject="Project meeting notes",
            body="Discussing timeline",
            thread=thread
        )
        
        thread2 = Thread(subject="Budget report Q4", owner_id=user.id, email_count=1)
        db_session.add(thread2)
        db_session.flush()
        
        email2 = create_received_email_for_user(
            db_session, user,
            subject="Budget report Q4",
            body="Financial summary",
            thread=thread2
        )
        
        thread3 = Thread(subject="Team meeting agenda", owner_id=user.id, email_count=1)
        db_session.add(thread3)
        db_session.flush()
        
        email3 = create_received_email_for_user(
            db_session, user,
            subject="Team meeting agenda",
            body="Weekly sync",
            thread=thread3
        )
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
        
        # Create a thread and email (perspective-aware)
        thread = Thread(subject="Test Email", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = create_received_email_for_user(
            db_session, user,
            subject="Test Email",
            body="Test body",
            thread=thread
        )
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
        
        # Create a thread with multiple emails (perspective-aware)
        thread = Thread(subject="Discussion Thread", owner_id=user.id, email_count=3)
        db_session.add(thread)
        db_session.flush()
        
        # Create emails with different timestamps
        old_email = create_received_email_for_user(
            db_session, user,
            subject="Discussion Thread",
            body="First message in thread",
            thread=thread
        )
        old_email.sent_at = datetime.utcnow() - timedelta(days=2)
        
        middle_email = create_received_email_for_user(
            db_session, user,
            subject="Re: Discussion Thread",
            body="Reply message",
            thread=thread
        )
        middle_email.sent_at = datetime.utcnow() - timedelta(days=1)
        
        latest_email = create_received_email_for_user(
            db_session, user,
            subject="Re: Discussion Thread",
            body="Latest reply with keyword searchable",
            thread=thread
        )
        latest_email.sent_at = datetime.utcnow()
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
        
        # Create a thread with multiple emails (perspective-aware)
        thread = Thread(subject="Multi-email Thread", owner_id=user.id, email_count=3)
        db_session.add(thread)
        db_session.flush()
        
        for i in range(3):
            email = create_received_email_for_user(
                db_session, user,
                subject=f"Multi-email Thread {i}",
                body=f"Message {i}",
                thread=thread
            )
            email.sent_at = datetime.utcnow() - timedelta(hours=i)
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
        
        # Create email (perspective-aware)
        email = create_received_email_for_user(
            db_session, user,
            subject="Quarterly Report 2024",
            body="Different content here",
            thread=thread
        )
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
        
        # Create threads and emails (perspective-aware)
        thread1 = Thread(subject="Read email", owner_id=user.id, email_count=1)
        db_session.add(thread1)
        db_session.flush()
        
        read_email = create_received_email_for_user(
            db_session, user,
            subject="Read email",
            body="Already read",
            is_read=True,
            thread=thread1
        )
        
        thread2 = Thread(subject="Unread email", owner_id=user.id, email_count=1)
        db_session.add(thread2)
        db_session.flush()
        
        unread_email = create_received_email_for_user(
            db_session, user,
            subject="Unread email",
            body="Not yet read",
            is_read=False,
            thread=thread2
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
        
        # Create email (perspective-aware)
        starred_email = create_received_email_for_user(
            db_session, user,
            subject="Starred email",
            body="Important",
            is_starred=True,
            thread=thread
        )
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
        
        # Create emails in different folders (perspective-aware)
        thread1 = Thread(subject="Inbox email", owner_id=user.id, email_count=1)
        db_session.add(thread1)
        db_session.flush()
        
        inbox_email = create_received_email_for_user(
            db_session, user,
            subject="Inbox email",
            body="In inbox",
            thread=thread1
        )
        
        thread2 = Thread(subject="Sent email", owner_id=user.id, email_count=1)
        db_session.add(thread2)
        db_session.flush()
        
        sent_email = create_sent_email_for_user(
            db_session, user,
            subject="Sent email",
            body="In sent",
            thread=thread2
        )
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
        
        # Create email (perspective-aware)
        email = create_received_email_for_user(
            db_session, user,
            subject="Test",
            body="Test",
            is_read=False,
            thread=thread
        )
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
        
        # Create email (perspective-aware)
        email = create_received_email_for_user(
            db_session, user,
            subject="Starred",
            body="Important",
            is_starred=True,
            thread=thread
        )
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
        
        # Create email (perspective-aware)
        email = create_received_email_for_user(
            db_session, user,
            subject="Email with attachment",
            body="Has file",
            thread=thread
        )
        
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
        
        # Create email (perspective-aware)
        email = create_received_email_for_user(
            db_session, user,
            subject="Important thread",
            body="Very important email",
            thread=thread
        )
        
        # Create a non-important thread
        thread2 = Thread(subject="Regular thread", owner_id=user.id, email_count=1)
        db_session.add(thread2)
        db_session.flush()
        
        # Create email (perspective-aware)
        email2 = create_received_email_for_user(
            db_session, user,
            subject="Regular thread",
            body="Normal email",
            thread=thread2
        )
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
        
        # Create email with nested label (labels are linked to threads, perspective-aware)
        thread = Thread(
            subject="Project Update",
            owner_id=user.id,
            email_count=1
        )
        db_session.add(thread)
        db_session.flush()
        
        email = create_received_email_for_user(
            db_session, user,
            subject="Project Update",
            body="Status report",
            thread=thread
        )
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
        
        # Create thread and email with label (perspective-aware)
        thread = Thread(subject="Labeled email", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = create_received_email_for_user(
            db_session, user,
            subject="Labeled email",
            body="Has label",
            thread=thread
        )
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
        
        # Create email (perspective-aware)
        email = create_received_email_for_user(
            db_session, user,
            subject="Recent email",
            body="Today's email",
            thread=thread
        )
        email.created_at = datetime.utcnow()
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
        
        # Create email (perspective-aware)
        email = create_received_email_for_user(
            db_session, user,
            subject="Old email",
            body="Past email",
            thread=thread
        )
        email.created_at = datetime.utcnow() - timedelta(days=5)
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
        
        # Create many threads and emails (perspective-aware)
        for i in range(25):
            thread = Thread(subject=f"Test email {i}", owner_id=user.id, email_count=1)
            db_session.add(thread)
            db_session.flush()
            
            email = create_received_email_for_user(
                db_session, user,
                subject=f"Test email {i}",
                body=f"Content {i}",
                thread=thread
            )
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
        
        # Create emails (perspective-aware)
        old_email = create_received_email_for_user(
            db_session, user,
            subject="Old email",
            body="Old",
            thread=thread1
        )
        old_email.sent_at = datetime.utcnow() - timedelta(days=5)
        
        thread2 = Thread(subject="New email", owner_id=user.id, email_count=1)
        db_session.add(thread2)
        db_session.flush()
        
        new_email = create_received_email_for_user(
            db_session, user,
            subject="New email",
            body="New",
            thread=thread2
        )
        new_email.sent_at = datetime.utcnow()
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

    # === General/Operator Suggestions ===

    def test_get_operator_suggestions_empty_query(self, client_with_auth):
        """Test getting all operators with empty query."""
        client, token, user = client_with_auth
        
        response = client.get(
            "/api/v1/search/suggestions?q=",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert "operators" in data
        # Should return all operators when query is empty
        operator_values = [op["value"] for op in data["operators"]]
        assert "from:" in operator_values
        assert "to:" in operator_values
        assert "is:unread" in operator_values

    def test_operator_suggestions_filtered_by_query(self, client_with_auth):
        """Test operators are filtered by query prefix."""
        client, token, user = client_with_auth
        
        response = client.get(
            "/api/v1/search/suggestions?q=fr",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        # Only operators starting with "fr" should be returned
        operator_values = [op["value"] for op in data["operators"]]
        assert "from:" in operator_values
        # Should NOT include operators that don't start with "fr"
        assert "to:" not in operator_values
        assert "is:unread" not in operator_values

    def test_operator_suggestions_is_prefix(self, client_with_auth):
        """Test filtering operators with 'is' prefix."""
        client, token, user = client_with_auth
        
        response = client.get(
            "/api/v1/search/suggestions?q=is",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        operator_values = [op["value"] for op in data["operators"]]
        # Should include all is: operators
        assert "is:unread" in operator_values
        assert "is:starred" in operator_values
        assert "is:important" in operator_values
        # Should NOT include other operators
        assert "from:" not in operator_values

    def test_operator_suggestions_has_prefix(self, client_with_auth):
        """Test filtering operators with 'has' prefix."""
        client, token, user = client_with_auth
        
        response = client.get(
            "/api/v1/search/suggestions?q=has",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        operator_values = [op["value"] for op in data["operators"]]
        assert "has:attachment" in operator_values
        assert "has:userlabels" in operator_values
        assert "from:" not in operator_values

    def test_operator_suggestions_no_match(self, client_with_auth):
        """Test operators filter returns empty when no match."""
        client, token, user = client_with_auth
        
        response = client.get(
            "/api/v1/search/suggestions?q=xyz",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["operators"] == []

    # === Folder (in:) Suggestions ===

    def test_get_folder_suggestions_all(self, client_with_auth):
        """Test getting all folder suggestions with in: prefix."""
        client, token, user = client_with_auth
        
        response = client.get(
            "/api/v1/search/suggestions?q=in:",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert "folders" in data
        folder_values = [f["value"] for f in data["folders"]]
        # Should include all folders
        assert "inbox" in folder_values
        assert "sent" in folder_values
        assert "drafts" in folder_values
        assert "trash" in folder_values
        assert "spam" in folder_values
        assert "starred" in folder_values
        assert "anywhere" in folder_values
        assert "archive" in folder_values
        assert "snoozed" in folder_values

    def test_folder_suggestions_filtered_by_partial(self, client_with_auth):
        """Test folders are filtered by partial after in:."""
        client, token, user = client_with_auth
        
        response = client.get(
            "/api/v1/search/suggestions?q=in:s",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        folder_values = [f["value"] for f in data["folders"]]
        # Should include folders starting with 's'
        assert "sent" in folder_values
        assert "spam" in folder_values
        assert "starred" in folder_values
        assert "snoozed" in folder_values
        # Should NOT include folders not starting with 's'
        assert "inbox" not in folder_values
        assert "drafts" not in folder_values
        assert "trash" not in folder_values

    def test_folder_suggestions_specific_match(self, client_with_auth):
        """Test folder suggestions with more specific partial."""
        client, token, user = client_with_auth
        
        response = client.get(
            "/api/v1/search/suggestions?q=in:sp",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        folder_values = [f["value"] for f in data["folders"]]
        assert "spam" in folder_values
        assert len(folder_values) == 1  # Only spam starts with "sp"

    def test_folder_suggestions_no_match(self, client_with_auth):
        """Test folder suggestions with non-matching partial."""
        client, token, user = client_with_auth
        
        response = client.get(
            "/api/v1/search/suggestions?q=in:xyz",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["folders"] == []

    # === Category (category:) Suggestions ===

    def test_get_category_suggestions_all(self, client_with_auth):
        """Test getting all category suggestions with category: prefix."""
        client, token, user = client_with_auth
        
        response = client.get(
            "/api/v1/search/suggestions?q=category:",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert "categories" in data
        category_values = [c["value"] for c in data["categories"]]
        # Should include all categories
        assert "primary" in category_values
        assert "social" in category_values
        assert "promotions" in category_values
        assert "updates" in category_values
        assert "forums" in category_values

    def test_category_suggestions_filtered_by_partial(self, client_with_auth):
        """Test categories are filtered by partial after category:."""
        client, token, user = client_with_auth
        
        response = client.get(
            "/api/v1/search/suggestions?q=category:p",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        category_values = [c["value"] for c in data["categories"]]
        # Should include categories starting with 'p'
        assert "primary" in category_values
        assert "promotions" in category_values
        # Should NOT include categories not starting with 'p'
        assert "social" not in category_values
        assert "updates" not in category_values
        assert "forums" not in category_values

    def test_category_suggestions_specific_match(self, client_with_auth):
        """Test category suggestions with specific partial."""
        client, token, user = client_with_auth
        
        response = client.get(
            "/api/v1/search/suggestions?q=category:so",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        category_values = [c["value"] for c in data["categories"]]
        assert "social" in category_values
        assert len(category_values) == 1

    def test_category_suggestions_no_match(self, client_with_auth):
        """Test category suggestions with non-matching partial."""
        client, token, user = client_with_auth
        
        response = client.get(
            "/api/v1/search/suggestions?q=category:xyz",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["categories"] == []

    # === Contact (from:/to:) Suggestions ===

    def test_contact_suggestions_from_prefix(self, client_with_auth, db_session):
        """Test contact suggestions with from: prefix."""
        client, token, user = client_with_auth
        
        # Create some users to find as contacts
        from app.models.user import User
        contact1 = User(
            email="alice@example.com",
            first_name="Alice",
            last_name="Smith",
            role="user"
        )
        contact2 = User(
            email="bob@example.com",
            first_name="Bob",
            last_name="Jones",
            role="user"
        )
        db_session.add_all([contact1, contact2])
        db_session.commit()
        
        response = client.get(
            "/api/v1/search/suggestions?q=from:alice",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert "contacts" in data
        contact_emails = [c["value"] for c in data["contacts"]]
        assert "alice@example.com" in contact_emails
        # Bob should not be in results
        assert "bob@example.com" not in contact_emails

    def test_contact_suggestions_to_prefix(self, client_with_auth, db_session):
        """Test contact suggestions with to: prefix."""
        client, token, user = client_with_auth
        
        from app.models.user import User
        contact = User(
            email="charlie@example.com",
            first_name="Charlie",
            last_name="Brown",
            role="user"
        )
        db_session.add(contact)
        db_session.commit()
        
        response = client.get(
            "/api/v1/search/suggestions?q=to:charlie",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        contact_emails = [c["value"] for c in data["contacts"]]
        assert "charlie@example.com" in contact_emails

    def test_contact_suggestions_by_name(self, client_with_auth, db_session):
        """Test contact suggestions match by first/last name."""
        client, token, user = client_with_auth
        
        from app.models.user import User
        contact = User(
            email="dave@example.com",
            first_name="David",
            last_name="Wilson",
            role="user"
        )
        db_session.add(contact)
        db_session.commit()
        
        # Search by first name
        response = client.get(
            "/api/v1/search/suggestions?q=from:David",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        contact_emails = [c["value"] for c in data["contacts"]]
        assert "dave@example.com" in contact_emails

    def test_contact_suggestions_empty_partial(self, client_with_auth, db_session):
        """Test contact suggestions with empty partial returns contacts."""
        client, token, user = client_with_auth
        
        from app.models.user import User
        contact = User(
            email="eve@example.com",
            first_name="Eve",
            last_name="Johnson",
            role="user"
        )
        db_session.add(contact)
        db_session.commit()
        
        response = client.get(
            "/api/v1/search/suggestions?q=from:",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        # Should return contacts (empty partial matches all)
        assert "contacts" in data

    # === Label (label:) Suggestions ===

    def test_label_suggestions_filtered(self, client_with_auth, db_session):
        """Test label suggestions filtered by partial."""
        client, token, user = client_with_auth
        
        # Create some labels for the user
        from app.models.label import Label
        label1 = Label(name="Work", owner_id=user.id, color="#ff0000")
        label2 = Label(name="Personal", owner_id=user.id, color="#00ff00")
        label3 = Label(name="Waiting", owner_id=user.id, color="#0000ff")
        db_session.add_all([label1, label2, label3])
        db_session.commit()
        
        response = client.get(
            "/api/v1/search/suggestions?q=label:Wo",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert "labels" in data
        label_values = [l["value"] for l in data["labels"]]
        assert "Work" in label_values
        assert "Personal" not in label_values

    def test_label_suggestions_all_with_empty_partial(self, client_with_auth, db_session):
        """Test label suggestions with empty partial returns user's labels."""
        client, token, user = client_with_auth
        
        from app.models.label import Label
        label = Label(name="Important", owner_id=user.id, color="#ff0000")
        db_session.add(label)
        db_session.commit()
        
        response = client.get(
            "/api/v1/search/suggestions?q=label:",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert "labels" in data
        # Should return the user's labels
        label_values = [l["value"] for l in data["labels"]]
        assert "Important" in label_values

    def test_label_suggestions_only_user_labels(self, client_with_auth, db_session):
        """Test label suggestions only return current user's labels."""
        client, token, user = client_with_auth
        
        from app.models.label import Label
        from app.models.user import User
        
        # Create another user with a label
        other_user = User(
            email="other@example.com",
            first_name="Other",
            last_name="User",
            role="user"
        )
        db_session.add(other_user)
        db_session.flush()
        
        # Use unique prefixes to avoid collision with system labels
        other_label = Label(name="ZZOtherLabel", owner_id=other_user.id, color="#ff0000")
        user_label = Label(name="ZZMyLabel", owner_id=user.id, color="#00ff00")
        db_session.add_all([other_label, user_label])
        db_session.commit()
        
        # Search with specific partial to find our custom labels
        response = client.get(
            "/api/v1/search/suggestions?q=label:ZZ",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        label_values = [l["value"] for l in data["labels"]]
        assert "ZZMyLabel" in label_values
        assert "ZZOtherLabel" not in label_values

    # === Recent Searches ===

    def test_recent_searches_returned(self, client_with_auth, db_session):
        """Test recent searches are returned in general suggestions."""
        client, token, user = client_with_auth
        
        # Create saved searches for the user
        saved1 = SavedSearch(
            name="My Search",
            query="is:unread from:team",
            owner_id=user.id
        )
        db_session.add(saved1)
        db_session.commit()
        
        response = client.get(
            "/api/v1/search/suggestions?q=",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert "recent_searches" in data
        assert "is:unread from:team" in data["recent_searches"]

    def test_recent_searches_filtered_by_query(self, client_with_auth, db_session):
        """Test recent searches are filtered by query substring."""
        client, token, user = client_with_auth
        
        # Create saved searches
        saved1 = SavedSearch(name="Search1", query="is:unread", owner_id=user.id)
        saved2 = SavedSearch(name="Search2", query="from:boss", owner_id=user.id)
        saved3 = SavedSearch(name="Search3", query="is:starred", owner_id=user.id)
        db_session.add_all([saved1, saved2, saved3])
        db_session.commit()
        
        response = client.get(
            "/api/v1/search/suggestions?q=unread",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        # Should only include searches containing "unread"
        assert "is:unread" in data["recent_searches"]
        assert "from:boss" not in data["recent_searches"]
        assert "is:starred" not in data["recent_searches"]

    def test_recent_searches_only_user_searches(self, client_with_auth, db_session):
        """Test recent searches only return current user's saved searches."""
        client, token, user = client_with_auth
        
        from app.models.user import User
        
        # Create another user with saved search
        other_user = User(
            email="other2@example.com",
            first_name="Other",
            last_name="User",
            role="user"
        )
        db_session.add(other_user)
        db_session.flush()
        
        other_search = SavedSearch(name="Other", query="other:search", owner_id=other_user.id)
        user_search = SavedSearch(name="Mine", query="my:search", owner_id=user.id)
        db_session.add_all([other_search, user_search])
        db_session.commit()
        
        response = client.get(
            "/api/v1/search/suggestions?q=",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert "my:search" in data["recent_searches"]
        assert "other:search" not in data["recent_searches"]

    # === Limit Parameter ===

    def test_suggestions_respects_limit(self, client_with_auth):
        """Test that suggestions respect the limit parameter."""
        client, token, user = client_with_auth
        
        response = client.get(
            "/api/v1/search/suggestions?q=&limit=3",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        # Operators should be limited to 3
        assert len(data["operators"]) <= 3

    def test_folder_suggestions_respects_limit(self, client_with_auth):
        """Test folder suggestions respect limit parameter."""
        client, token, user = client_with_auth
        
        response = client.get(
            "/api/v1/search/suggestions?q=in:&limit=3",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert len(data["folders"]) <= 3

    def test_category_suggestions_respects_limit(self, client_with_auth):
        """Test category suggestions respect limit parameter."""
        client, token, user = client_with_auth
        
        response = client.get(
            "/api/v1/search/suggestions?q=category:&limit=2",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert len(data["categories"]) <= 2

    # === Authentication ===

    def test_suggestions_unauthenticated(self, client):
        """Test suggestions without authentication fails."""
        response = client.get("/api/v1/search/suggestions?q=")
        assert response.status_code == 401

    # === Response Structure ===

    def test_suggestions_response_structure(self, client_with_auth):
        """Test suggestions response has correct structure."""
        client, token, user = client_with_auth
        
        response = client.get(
            "/api/v1/search/suggestions?q=",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        # Check all expected fields are present
        assert "contacts" in data
        assert "labels" in data
        assert "folders" in data
        assert "categories" in data
        assert "recent_searches" in data
        assert "operators" in data
        # Check they are all lists
        assert isinstance(data["contacts"], list)
        assert isinstance(data["labels"], list)
        assert isinstance(data["folders"], list)
        assert isinstance(data["categories"], list)
        assert isinstance(data["recent_searches"], list)
        assert isinstance(data["operators"], list)

    def test_suggestion_item_structure(self, client_with_auth):
        """Test individual suggestion items have correct structure."""
        client, token, user = client_with_auth
        
        response = client.get(
            "/api/v1/search/suggestions?q=in:",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        # Check folder suggestion structure
        assert len(data["folders"]) > 0
        folder = data["folders"][0]
        assert "value" in folder
        assert "type" in folder
        assert "description" in folder
        assert folder["type"] == "folder"


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
        
        # Create email (perspective-aware)
        email = create_received_email_for_user(
            db_session, user,
            subject="Test Response Format",
            body="Testing response fields",
            is_read=False,
            is_starred=True,
            thread=thread
        )
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
        
        # Create email (perspective-aware)
        email = create_received_email_for_user(
            db_session, user,
            subject="Label Test",
            body="Testing labels",
            thread=thread
        )
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
        
        # Create a thread and email (perspective-aware)
        thread = Thread(subject="Timezone Test", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = create_received_email_for_user(
            db_session, user,
            subject="Timezone Test",
            body="Testing tz_offset",
            thread=thread
        )
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
        
        # Create email (perspective-aware)
        email = create_received_email_for_user(
            db_session, user,
            subject="After Test",
            body="Testing after filter with tz_offset",
            thread=thread
        )
        email.created_at = today + timedelta(hours=3)  # 03:00 UTC today
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
        
        # Create email (perspective-aware)
        email = create_received_email_for_user(
            db_session, user,
            subject="Before Test",
            body="Testing before filter with tz_offset",
            thread=thread
        )
        email.created_at = today + timedelta(hours=3)  # 03:00 UTC today
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
        
        # Create email (perspective-aware)
        email = create_received_email_for_user(
            db_session, user,
            subject="Explicit Date Test",
            body="Testing explicit date params",
            thread=thread
        )
        email.created_at = today + timedelta(hours=3)  # 03:00 UTC today
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
        
        # Create email (perspective-aware)
        email = create_received_email_for_user(
            db_session, user,
            subject="Negative Offset",
            body="Testing negative offset",
            thread=thread
        )
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
        
        # Create email (perspective-aware)
        email = create_received_email_for_user(
            db_session, user,
            subject="Zero Offset",
            body="Testing zero offset",
            thread=thread
        )
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
        
        # Create email (perspective-aware)
        email = create_received_email_for_user(
            db_session, user,
            subject="Invalid Offset",
            body="Testing invalid offset",
            thread=thread
        )
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
        
        # Create email (perspective-aware)
        email = create_received_email_for_user(
            db_session, user,
            subject="Combined Test Report",
            body="This is a test report email",
            is_starred=True,
            thread=thread
        )
        email.created_at = today + timedelta(hours=12)
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
        
        # Create email (perspective-aware)
        email = create_received_email_for_user(
            db_session, user,
            subject="Relative Date Test",
            body="Testing relative dates",
            thread=thread
        )
        email.created_at = datetime.utcnow() - timedelta(days=3)  # 3 days ago
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
        
        # Create email (perspective-aware)
        email = create_received_email_for_user(
            db_session, user,
            subject="Boundary Test",
            body="Testing boundary offsets",
            thread=thread
        )
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
        
        # Create email with "spam" in body (perspective-aware)
        thread1 = Thread(subject="Spam Email", owner_id=user.id, email_count=1)
        db_session.add(thread1)
        db_session.flush()
        
        email1 = create_received_email_for_user(
            db_session, user,
            subject="Spam Email",
            body="This is spam content",
            thread=thread1
        )
        
        # Create email without "spam"
        thread2 = Thread(subject="Normal Email", owner_id=user.id, email_count=1)
        db_session.add(thread2)
        db_session.flush()
        
        email2 = create_received_email_for_user(
            db_session, user,
            subject="Normal Email",
            body="This is regular content",
            thread=thread2
        )
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
        
        # Create emails (perspective-aware)
        email1 = create_received_email_for_user(
            db_session, user,
            subject="Newsletter Update",
            body="Weekly newsletter",
            thread=thread1
        )
        
        thread2 = Thread(subject="Important Update", owner_id=user.id, email_count=1)
        db_session.add(thread2)
        db_session.flush()
        
        email2 = create_received_email_for_user(
            db_session, user,
            subject="Important Update",
            body="Critical update",
            thread=thread2
        )
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
        
        # Create email with large attachment (perspective-aware)
        thread1 = Thread(subject="Large Email", owner_id=user.id, email_count=1)
        db_session.add(thread1)
        db_session.flush()
        
        email1 = create_received_email_for_user(
            db_session, user,
            subject="Large Email",
            body="Has large attachment",
            thread=thread1
        )
        
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
        
        email2 = create_received_email_for_user(
            db_session, user,
            subject="Small Email",
            body="Has small attachment",
            thread=thread2
        )
        
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
        
        # Create email with large attachment (perspective-aware)
        thread1 = Thread(subject="Large Email", owner_id=user.id, email_count=1)
        db_session.add(thread1)
        db_session.flush()
        
        email1 = create_received_email_for_user(
            db_session, user,
            subject="Large Email",
            body="Has large attachment",
            thread=thread1
        )
        
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
        
        email2 = create_received_email_for_user(
            db_session, user,
            subject="Small Email",
            body="Has small attachment",
            thread=thread2
        )
        
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
        
        # Create email (perspective-aware)
        email = create_received_email_for_user(
            db_session, user,
            subject="Size Test",
            body="Content",
            thread=thread
        )
        
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
        
        # Create email (perspective-aware)
        email = create_received_email_for_user(
            db_session, user,
            subject="Exact Size",
            body="Content",
            thread=thread
        )
        
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
        
        # Create email (perspective-aware)
        email = create_received_email_for_user(
            db_session, user,
            subject="CC Test",
            body="Email with CC",
            thread=thread
        )
        
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
        
        # Create email (perspective-aware)
        email = create_received_email_for_user(
            db_session, user,
            subject="BCC Test",
            body="Email with BCC",
            thread=thread
        )
        
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
        
        # Create email (perspective-aware)
        email = create_received_email_for_user(
            db_session, user,
            subject="CC Q Test",
            body="Test email",
            thread=thread
        )
        
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
        
        # Create email (perspective-aware)
        email = create_received_email_for_user(
            db_session, user,
            subject="Document Email",
            body="Please find attached",
            thread=thread
        )
        
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
        
        # Create email (perspective-aware)
        email = create_received_email_for_user(
            db_session, user,
            subject="PDF Email",
            body="PDF attached",
            thread=thread
        )
        
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
        
        # Create email (perspective-aware)
        email = create_received_email_for_user(
            db_session, user,
            subject="Filename Q Test",
            body="Doc attached",
            thread=thread
        )
        
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
        
        # Create email (perspective-aware)
        email = create_received_email_for_user(
            db_session, user,
            subject="Sale Alert",
            body="50% off everything",
            thread=thread
        )
        
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
        
        # Create email (perspective-aware)
        email = create_received_email_for_user(
            db_session, user,
            subject="Social Update",
            body="New follower",
            thread=thread
        )
        
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
        
        # Create email in spam (perspective-aware)
        thread = Thread(subject="Spam Email", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = create_received_email_for_user(
            db_session, user,
            subject="Spam Email",
            body="This is spam",
            folder=FolderType.SPAM,
            thread=thread
        )
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
        
        # Create email (perspective-aware)
        email = create_received_email_for_user(
            db_session, user,
            subject="Deleted Email",
            body="In trash",
            folder=FolderType.TRASH,
            thread=thread
        )
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
        
        # Create email (perspective-aware)
        email = create_received_email_for_user(
            db_session, user,
            subject="Archived Email",
            body="This is archived",
            thread=thread
        )
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
        
        # Create email (perspective-aware)
        email = create_received_email_for_user(
            db_session, user,
            subject="Labeled Email",
            body="Has label",
            thread=thread
        )
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
        
        # Create email without label (perspective-aware)
        thread = Thread(subject="Unlabeled Email", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = create_received_email_for_user(
            db_session, user,
            subject="Unlabeled Email",
            body="No label",
            thread=thread
        )
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
        
        # Create email (perspective-aware)
        email = create_received_email_for_user(
            db_session, user,
            subject="Delivered To Test",
            body="Test email",
            thread=thread
        )
        
        # Add additional recipient
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
        
        # Create emails (perspective-aware)
        email1 = create_received_email_for_user(
            db_session, user,
            subject="Exact Match Test",
            body="This contains exact phrase match",
            thread=thread1
        )
        
        thread2 = Thread(subject="Partial Test", owner_id=user.id, email_count=1)
        db_session.add(thread2)
        db_session.flush()
        
        email2 = create_received_email_for_user(
            db_session, user,
            subject="Partial Test",
            body="This contains exact but not phrase",
            thread=thread2
        )
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
        
        # Create emails (perspective-aware)
        email1 = create_received_email_for_user(
            db_session, user,
            subject="Apple Report",
            body="About apples",
            thread=thread1
        )
        
        thread2 = Thread(subject="Orange Report", owner_id=user.id, email_count=1)
        db_session.add(thread2)
        db_session.flush()
        
        email2 = create_received_email_for_user(
            db_session, user,
            subject="Orange Report",
            body="About oranges",
            thread=thread2
        )
        
        thread3 = Thread(subject="Banana Report", owner_id=user.id, email_count=1)
        db_session.add(thread3)
        db_session.flush()
        
        email3 = create_received_email_for_user(
            db_session, user,
            subject="Banana Report",
            body="About bananas",
            thread=thread3
        )
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
        
        # Create recent email (perspective-aware)
        thread = Thread(subject="Recent Email", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = create_received_email_for_user(
            db_session, user,
            subject="Recent Email",
            body="Created recently",
            thread=thread
        )
        email.created_at = datetime.utcnow() - timedelta(days=2)
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
        
        # Create old email (perspective-aware)
        thread = Thread(subject="Old Email", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = create_received_email_for_user(
            db_session, user,
            subject="Old Email",
            body="Created long ago",
            thread=thread
        )
        email.created_at = datetime.utcnow() - timedelta(days=60)
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
        
        # Create email (perspective-aware)
        email = create_received_email_for_user(
            db_session, user,
            subject="Weekly Email",
            body="Within a week",
            thread=thread
        )
        email.created_at = datetime.utcnow() - timedelta(days=5)
        db_session.commit()
        
        response = client.get(
            "/api/v1/search?q=newer_than:2w Weekly",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        result_ids = [r["id"] for r in data["results"]]
        assert str(email.id) in result_ids


class TestSearchByUserName:
    """Test searching by user names in from/to/cc/bcc filters and free text."""

    def test_search_from_by_first_name(self, client_with_auth, db_session):
        """Test from filter matching sender's first_name."""
        from app.models.user import User
        client, token, user = client_with_auth
        
        # Create a sender with a distinctive name
        sender = User(
            email="johndoe@company.com",
            first_name="Johnathan",
            last_name="Smith",
            role="user"
        )
        db_session.add(sender)
        db_session.flush()
        
        thread = Thread(subject="Email from Johnathan", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Email from Johnathan",
            body="Test content",
            status="received",
            sender_id=sender.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.flush()
        
        # Add current user as recipient so they can see this email
        recipient = EmailRecipient(
            email_id=email.id,
            recipient_email=user.email,
            recipient_id=user.id,
            recipient_type="to"
        )
        db_session.add(recipient)
        db_session.commit()
        
        # Search by sender's first name
        response = client.get(
            "/api/v1/search?from=Johnathan",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        result_ids = [r["id"] for r in data["results"]]
        assert str(email.id) in result_ids

    def test_search_from_by_last_name(self, client_with_auth, db_session):
        """Test from filter matching sender's last_name."""
        from app.models.user import User
        client, token, user = client_with_auth
        
        # Create a sender with a distinctive last name
        sender = User(
            email="jane@company.com",
            first_name="Jane",
            last_name="Fitzgerald",
            role="user"
        )
        db_session.add(sender)
        db_session.flush()
        
        thread = Thread(subject="Email from Fitzgerald", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Email from Fitzgerald",
            body="Test content",
            status="received",
            sender_id=sender.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.flush()
        
        # Add current user as recipient
        recipient = EmailRecipient(
            email_id=email.id,
            recipient_email=user.email,
            recipient_id=user.id,
            recipient_type="to"
        )
        db_session.add(recipient)
        db_session.commit()
        
        # Search by sender's last name
        response = client.get(
            "/api/v1/search?from=Fitzgerald",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        result_ids = [r["id"] for r in data["results"]]
        assert str(email.id) in result_ids

    def test_search_from_operator_by_name_in_q(self, client_with_auth, db_session):
        """Test from: operator in q parameter matching sender name."""
        from app.models.user import User
        client, token, user = client_with_auth
        
        sender = User(
            email="mike@company.com",
            first_name="Michael",
            last_name="Anderson",
            role="user"
        )
        db_session.add(sender)
        db_session.flush()
        
        thread = Thread(subject="Email via q operator", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Email via q operator",
            body="Test content",
            status="received",
            sender_id=sender.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.flush()
        
        recipient = EmailRecipient(
            email_id=email.id,
            recipient_email=user.email,
            recipient_id=user.id,
            recipient_type="to"
        )
        db_session.add(recipient)
        db_session.commit()
        
        # Search using from: operator in q with first name
        response = client.get(
            "/api/v1/search?q=from:Michael",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        result_ids = [r["id"] for r in data["results"]]
        assert str(email.id) in result_ids

    def test_search_to_by_recipient_name(self, client_with_auth, db_session):
        """Test to filter matching recipient_name."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Email to recipient", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Email to recipient",
            body="Test content",
            status="sent",
            sender_id=user.id,
            folder=FolderType.SENT.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.flush()
        
        # Add recipient with a name
        recipient = EmailRecipient(
            email_id=email.id,
            recipient_email="bob@example.com",
            recipient_name="Robert Williams",
            recipient_type="to"
        )
        db_session.add(recipient)
        db_session.commit()
        
        # Search by recipient name
        response = client.get(
            "/api/v1/search?to=Robert",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        result_ids = [r["id"] for r in data["results"]]
        assert str(email.id) in result_ids

    def test_search_to_operator_by_name_in_q(self, client_with_auth, db_session):
        """Test to: operator in q parameter matching recipient name."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Email to Williams", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Email to Williams",
            body="Test content",
            status="sent",
            sender_id=user.id,
            folder=FolderType.SENT.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.flush()
        
        recipient = EmailRecipient(
            email_id=email.id,
            recipient_email="sarah@example.com",
            recipient_name="Sarah Williams",
            recipient_type="to"
        )
        db_session.add(recipient)
        db_session.commit()
        
        # Search using to: operator in q with name
        response = client.get(
            "/api/v1/search?q=to:Williams",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        result_ids = [r["id"] for r in data["results"]]
        assert str(email.id) in result_ids

    def test_search_cc_by_recipient_name(self, client_with_auth, db_session):
        """Test cc filter matching recipient_name."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Email with CC", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Email with CC",
            body="Test content",
            status="sent",
            sender_id=user.id,
            folder=FolderType.SENT.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.flush()
        
        # Add CC recipient with a name
        cc_recipient = EmailRecipient(
            email_id=email.id,
            recipient_email="cc@example.com",
            recipient_name="Christopher Brown",
            recipient_type="cc"
        )
        db_session.add(cc_recipient)
        db_session.commit()
        
        # Search by CC recipient name
        response = client.get(
            "/api/v1/search?cc=Christopher",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        result_ids = [r["id"] for r in data["results"]]
        assert str(email.id) in result_ids

    def test_search_bcc_by_recipient_name(self, client_with_auth, db_session):
        """Test bcc filter matching recipient_name."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Email with BCC", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Email with BCC",
            body="Test content",
            status="sent",
            sender_id=user.id,
            folder=FolderType.SENT.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.flush()
        
        # Add BCC recipient with a name
        bcc_recipient = EmailRecipient(
            email_id=email.id,
            recipient_email="bcc@example.com",
            recipient_name="Elizabeth Taylor",
            recipient_type="bcc"
        )
        db_session.add(bcc_recipient)
        db_session.commit()
        
        # Search by BCC recipient name
        response = client.get(
            "/api/v1/search?bcc=Elizabeth",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        result_ids = [r["id"] for r in data["results"]]
        assert str(email.id) in result_ids

    def test_search_free_text_matches_sender_name(self, client_with_auth, db_session):
        """Test free text search (q without operator) matching sender name."""
        from app.models.user import User
        client, token, user = client_with_auth
        
        # Create a sender with a unique name
        sender = User(
            email="uniqueperson@company.com",
            first_name="Bartholomew",
            last_name="Johnson",
            role="user"
        )
        db_session.add(sender)
        db_session.flush()
        
        thread = Thread(subject="Generic Subject", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Generic Subject",
            body="Generic body content",
            status="received",
            sender_id=sender.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.flush()
        
        recipient = EmailRecipient(
            email_id=email.id,
            recipient_email=user.email,
            recipient_id=user.id,
            recipient_type="to"
        )
        db_session.add(recipient)
        db_session.commit()
        
        # Search by sender's name without any operator
        # Should match because "Bartholomew" is in sender's first_name
        response = client.get(
            "/api/v1/search?q=Bartholomew",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        result_ids = [r["id"] for r in data["results"]]
        assert str(email.id) in result_ids

    def test_search_free_text_matches_recipient_name(self, client_with_auth, db_session):
        """Test free text search (q without operator) matching recipient name."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Another Subject", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Another Subject",
            body="Another body content",
            status="sent",
            sender_id=user.id,
            folder=FolderType.SENT.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.flush()
        
        # Add recipient with a unique name
        recipient = EmailRecipient(
            email_id=email.id,
            recipient_email="recipient@example.com",
            recipient_name="Maximilian Theodore",
            recipient_type="to"
        )
        db_session.add(recipient)
        db_session.commit()
        
        # Search by recipient's name without any operator
        response = client.get(
            "/api/v1/search?q=Maximilian",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        result_ids = [r["id"] for r in data["results"]]
        assert str(email.id) in result_ids

    def test_search_from_with_email_and_name_combined(self, client_with_auth, db_session):
        """Test from filter: exact email match vs partial name match."""
        from app.models.user import User
        client, token, user = client_with_auth
        
        # Create sender
        sender = User(
            email="alice.wonderland@company.com",
            first_name="Alice",
            last_name="Wonderland",
            role="user"
        )
        db_session.add(sender)
        db_session.flush()
        
        thread = Thread(subject="Alice Email", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Alice Email",
            body="Content",
            status="received",
            sender_id=sender.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.flush()
        
        recipient = EmailRecipient(
            email_id=email.id,
            recipient_email=user.email,
            recipient_id=user.id,
            recipient_type="to"
        )
        db_session.add(recipient)
        db_session.commit()
        
        # Partial email should NOT find (email requires exact match)
        response1 = client.get(
            "/api/v1/search?from=wonderland@company",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response1.status_code == 200
        result_ids1 = [r["id"] for r in response1.json()["data"]["results"]]
        assert str(email.id) not in result_ids1
        
        # Exact email should find
        response2 = client.get(
            "/api/v1/search?from=alice.wonderland@company.com",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response2.status_code == 200
        result_ids2 = [r["id"] for r in response2.json()["data"]["results"]]
        assert str(email.id) in result_ids2
        
        # Partial name should find (names use partial matching)
        response3 = client.get(
            "/api/v1/search?from=Wonderland",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response3.status_code == 200
        result_ids3 = [r["id"] for r in response3.json()["data"]["results"]]
        assert str(email.id) in result_ids3

    def test_search_grouped_from_terms_by_name(self, client_with_auth, db_session):
        """Test grouped from terms like from:(john mary) matching names."""
        from app.models.user import User
        client, token, user = client_with_auth
        
        # Create two senders
        sender1 = User(
            email="sender1@company.com",
            first_name="John",
            last_name="Doe",
            role="user"
        )
        sender2 = User(
            email="sender2@company.com",
            first_name="Mary",
            last_name="Jane",
            role="user"
        )
        db_session.add(sender1)
        db_session.add(sender2)
        db_session.flush()
        
        thread1 = Thread(subject="From John", owner_id=user.id, email_count=1)
        db_session.add(thread1)
        db_session.flush()
        
        email1 = Email(
            subject="From John",
            body="Content",
            status="received",
            sender_id=sender1.id,
            folder=FolderType.INBOX.value,
            thread_id=thread1.id
        )
        db_session.add(email1)
        db_session.flush()
        
        recipient1 = EmailRecipient(
            email_id=email1.id,
            recipient_email=user.email,
            recipient_id=user.id,
            recipient_type="to"
        )
        db_session.add(recipient1)
        
        thread2 = Thread(subject="From Mary", owner_id=user.id, email_count=1)
        db_session.add(thread2)
        db_session.flush()
        
        email2 = Email(
            subject="From Mary",
            body="Content",
            status="received",
            sender_id=sender2.id,
            folder=FolderType.INBOX.value,
            thread_id=thread2.id
        )
        db_session.add(email2)
        db_session.flush()
        
        recipient2 = EmailRecipient(
            email_id=email2.id,
            recipient_email=user.email,
            recipient_id=user.id,
            recipient_type="to"
        )
        db_session.add(recipient2)
        db_session.commit()
        
        # Search with grouped from terms by name
        response = client.get(
            "/api/v1/search?q=from:(John Mary)",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        result_ids = [r["id"] for r in data["results"]]
        assert str(email1.id) in result_ids
        assert str(email2.id) in result_ids

    def test_search_multiple_from_names_comma_separated(self, client_with_auth, db_session):
        """Test comma-separated from values matching names."""
        from app.models.user import User
        client, token, user = client_with_auth
        
        # Create two senders
        sender1 = User(
            email="peter@company.com",
            first_name="Peter",
            last_name="Parker",
            role="user"
        )
        sender2 = User(
            email="bruce@company.com",
            first_name="Bruce",
            last_name="Wayne",
            role="user"
        )
        db_session.add(sender1)
        db_session.add(sender2)
        db_session.flush()
        
        thread1 = Thread(subject="From Peter", owner_id=user.id, email_count=1)
        db_session.add(thread1)
        db_session.flush()
        
        email1 = Email(
            subject="From Peter",
            body="Content",
            status="received",
            sender_id=sender1.id,
            folder=FolderType.INBOX.value,
            thread_id=thread1.id
        )
        db_session.add(email1)
        db_session.flush()
        
        recipient1 = EmailRecipient(
            email_id=email1.id,
            recipient_email=user.email,
            recipient_id=user.id,
            recipient_type="to"
        )
        db_session.add(recipient1)
        
        thread2 = Thread(subject="From Bruce", owner_id=user.id, email_count=1)
        db_session.add(thread2)
        db_session.flush()
        
        email2 = Email(
            subject="From Bruce",
            body="Content",
            status="received",
            sender_id=sender2.id,
            folder=FolderType.INBOX.value,
            thread_id=thread2.id
        )
        db_session.add(email2)
        db_session.flush()
        
        recipient2 = EmailRecipient(
            email_id=email2.id,
            recipient_email=user.email,
            recipient_id=user.id,
            recipient_type="to"
        )
        db_session.add(recipient2)
        db_session.commit()
        
        # Search with comma-separated names
        response = client.get(
            "/api/v1/search?from=Peter,Wayne",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        result_ids = [r["id"] for r in data["results"]]
        # Peter matches sender1's first_name, Wayne matches sender2's last_name
        assert str(email1.id) in result_ids
        assert str(email2.id) in result_ids

    def test_search_partial_email_does_not_match(self, client_with_auth, db_session):
        """Test that partial email does NOT match - emails require exact match."""
        from app.models.user import User
        client, token, user = client_with_auth
        
        sender = User(
            email="specific.user@company.com",
            first_name="Specific",
            last_name="User",
            role="user"
        )
        db_session.add(sender)
        db_session.flush()
        
        thread = Thread(subject="Exact Email Test", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Exact Email Test",
            body="Content",
            status="received",
            sender_id=sender.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.flush()
        
        recipient = EmailRecipient(
            email_id=email.id,
            recipient_email=user.email,
            recipient_id=user.id,
            recipient_type="to"
        )
        db_session.add(recipient)
        db_session.commit()
        
        # Partial email (without domain) should NOT match email field
        # But "Specific" name search should match via first_name
        response1 = client.get(
            "/api/v1/search?from=Specific",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response1.status_code == 200
        result_ids1 = [r["id"] for r in response1.json()["data"]["results"]]
        assert str(email.id) in result_ids1
        
        # Partial email domain should NOT match (no name contains "@company")
        response2 = client.get(
            "/api/v1/search?from=@company.com",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response2.status_code == 200
        result_ids2 = [r["id"] for r in response2.json()["data"]["results"]]
        assert str(email.id) not in result_ids2
        
        # Partial email (local part only) should NOT match
        response3 = client.get(
            "/api/v1/search?from=specific.user",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response3.status_code == 200
        result_ids3 = [r["id"] for r in response3.json()["data"]["results"]]
        # "specific.user" is not in any name field, so no match
        assert str(email.id) not in result_ids3
        
        # Exact email should match
        response4 = client.get(
            "/api/v1/search?from=specific.user@company.com",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response4.status_code == 200
        result_ids4 = [r["id"] for r in response4.json()["data"]["results"]]
        assert str(email.id) in result_ids4

    def test_search_to_partial_email_does_not_match(self, client_with_auth, db_session):
        """Test that partial recipient email does NOT match - emails require exact match."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="To Exact Test", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="To Exact Test",
            body="Content",
            status="sent",
            sender_id=user.id,
            folder=FolderType.SENT.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.flush()
        
        recipient = EmailRecipient(
            email_id=email.id,
            recipient_email="john.smith@example.org",
            recipient_name="John Smith",
            recipient_type="to"
        )
        db_session.add(recipient)
        db_session.commit()
        
        # Partial name "John" should match via recipient_name
        response1 = client.get(
            "/api/v1/search?to=John",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response1.status_code == 200
        result_ids1 = [r["id"] for r in response1.json()["data"]["results"]]
        assert str(email.id) in result_ids1
        
        # Partial email (local part only) should NOT match
        response2 = client.get(
            "/api/v1/search?to=john.smith",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response2.status_code == 200
        result_ids2 = [r["id"] for r in response2.json()["data"]["results"]]
        # "john.smith" is not in recipient_name "John Smith", so no match
        assert str(email.id) not in result_ids2
        
        # Partial domain should NOT match
        response3 = client.get(
            "/api/v1/search?to=@example.org",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response3.status_code == 200
        result_ids3 = [r["id"] for r in response3.json()["data"]["results"]]
        assert str(email.id) not in result_ids3
        
        # Exact email should match
        response4 = client.get(
            "/api/v1/search?to=john.smith@example.org",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response4.status_code == 200
        result_ids4 = [r["id"] for r in response4.json()["data"]["results"]]
        assert str(email.id) in result_ids4


class TestSearchMeKeyword:
    """Test 'me' keyword in from/to/cc/bcc filters."""

    def test_search_from_me_matches_current_user_sent(self, client_with_auth, db_session):
        """Test from:me matches emails sent by current user."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Sent by me", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Sent by me",
            body="I sent this email",
            status="sent",
            sender_id=user.id,
            folder=FolderType.SENT.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        # Search for "from:me"
        response = client.get(
            "/api/v1/search?from=me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        result_ids = [r["id"] for r in data["results"]]
        assert str(email.id) in result_ids

    def test_search_from_me_via_q_operator(self, client_with_auth, db_session):
        """Test from:me in q parameter."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Q From Me Test", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Q From Me Test",
            body="Content",
            status="sent",
            sender_id=user.id,
            folder=FolderType.SENT.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        response = client.get(
            "/api/v1/search?q=from:me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        result_ids = [r["id"] for r in data["results"]]
        assert str(email.id) in result_ids

    def test_search_to_me_matches_current_user_received(self, client_with_auth, db_session):
        """Test to:me matches emails where current user is recipient."""
        from app.models.user import User
        client, token, user = client_with_auth
        
        # Create another user as sender
        sender = User(
            email="sender@example.com",
            first_name="Another",
            last_name="Sender",
            role="user"
        )
        db_session.add(sender)
        db_session.flush()
        
        thread = Thread(subject="Received by me", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Received by me",
            body="This is for me",
            status="received",
            sender_id=sender.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.flush()
        
        # Add current user as recipient
        recipient = EmailRecipient(
            email_id=email.id,
            recipient_email=user.email,
            recipient_id=user.id,
            recipient_name=f"{user.first_name} {user.last_name}",
            recipient_type="to"
        )
        db_session.add(recipient)
        db_session.commit()
        
        # Search for "to:me"
        response = client.get(
            "/api/v1/search?to=me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        result_ids = [r["id"] for r in data["results"]]
        assert str(email.id) in result_ids

    def test_search_cc_me_matches_current_user(self, client_with_auth, db_session):
        """Test cc:me matches emails where current user is CC'd."""
        from app.models.user import User
        client, token, user = client_with_auth
        
        sender = User(
            email="sender2@example.com",
            first_name="Some",
            last_name="Sender",
            role="user"
        )
        db_session.add(sender)
        db_session.flush()
        
        thread = Thread(subject="CC Me Test", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="CC Me Test",
            body="Content",
            status="received",
            sender_id=sender.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.flush()
        
        # Add current user as CC recipient
        cc_recipient = EmailRecipient(
            email_id=email.id,
            recipient_email=user.email,
            recipient_id=user.id,
            recipient_type="cc"
        )
        db_session.add(cc_recipient)
        db_session.commit()
        
        response = client.get(
            "/api/v1/search?cc=me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        result_ids = [r["id"] for r in data["results"]]
        assert str(email.id) in result_ids

    def test_search_me_case_insensitive(self, client_with_auth, db_session):
        """Test 'me' keyword is case-insensitive (me, Me, ME all work)."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Case Test", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Case Test",
            body="Content",
            status="sent",
            sender_id=user.id,
            folder=FolderType.SENT.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        # Test lowercase "me"
        response1 = client.get(
            "/api/v1/search?from=me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response1.status_code == 200
        assert str(email.id) in [r["id"] for r in response1.json()["data"]["results"]]
        
        # Test uppercase "ME"
        response2 = client.get(
            "/api/v1/search?from=ME",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response2.status_code == 200
        assert str(email.id) in [r["id"] for r in response2.json()["data"]["results"]]
        
        # Test mixed case "Me"
        response3 = client.get(
            "/api/v1/search?from=Me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response3.status_code == 200
        assert str(email.id) in [r["id"] for r in response3.json()["data"]["results"]]

    def test_search_from_me_does_not_match_others(self, client_with_auth, db_session):
        """Test from:me does NOT match emails from other users."""
        from app.models.user import User
        client, token, user = client_with_auth
        
        # Create another user
        other_user = User(
            email="other@example.com",
            first_name="Other",
            last_name="Person",
            role="user"
        )
        db_session.add(other_user)
        db_session.flush()
        
        thread = Thread(subject="From Other", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="From Other",
            body="Not from me",
            status="received",
            sender_id=other_user.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.flush()
        
        # Add current user as recipient so they can see it
        recipient = EmailRecipient(
            email_id=email.id,
            recipient_email=user.email,
            recipient_id=user.id,
            recipient_type="to"
        )
        db_session.add(recipient)
        db_session.commit()
        
        # from:me should NOT find this email
        response = client.get(
            "/api/v1/search?from=me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        result_ids = [r["id"] for r in data["results"]]
        assert str(email.id) not in result_ids


class TestSearchResponseShowsMe:
    """Test that responses show 'me' for current user's name."""

    def test_response_shows_me_for_sender_when_current_user(self, client_with_auth, db_session):
        """Test that sender_name is 'me' when sender is the current user."""
        client, token, user = client_with_auth
        
        thread = Thread(subject="Sent by current user", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="Sent by current user",
            body="I sent this",
            status="sent",
            sender_id=user.id,
            folder=FolderType.SENT.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.commit()
        
        response = client.get(
            "/api/v1/search?folder=sent",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Find our email
        our_result = next((r for r in data["results"] if r["id"] == str(email.id)), None)
        assert our_result is not None
        # sender_name should be "me"
        assert our_result["sender_name"] == "me"

    def test_response_shows_actual_name_for_other_sender(self, client_with_auth, db_session):
        """Test that sender_name is actual name when sender is NOT current user."""
        from app.models.user import User
        client, token, user = client_with_auth
        
        # Create another user as sender
        sender = User(
            email="othersender@example.com",
            first_name="Alice",
            last_name="Johnson",
            role="user"
        )
        db_session.add(sender)
        db_session.flush()
        
        thread = Thread(subject="From Alice", owner_id=user.id, email_count=1)
        db_session.add(thread)
        db_session.flush()
        
        email = Email(
            subject="From Alice",
            body="Alice sent this",
            status="received",
            sender_id=sender.id,
            folder=FolderType.INBOX.value,
            thread_id=thread.id
        )
        db_session.add(email)
        db_session.flush()
        
        recipient = EmailRecipient(
            email_id=email.id,
            recipient_email=user.email,
            recipient_id=user.id,
            recipient_type="to"
        )
        db_session.add(recipient)
        db_session.commit()
        
        response = client.get(
            "/api/v1/search?folder=inbox",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Find our email
        our_result = next((r for r in data["results"] if r["id"] == str(email.id)), None)
        assert our_result is not None
        # sender_name should be "Alice Johnson", NOT "me"
        assert our_result["sender_name"] == "Alice Johnson"