"""Tests for Snooze Processor functionality.

Tests cover:
1. Snooze processor cron job - processing expired snoozes
2. Unsnooze endpoint - clearing snooze status
3. User isolation for snooze functionality
"""

import pytest
from datetime import datetime, timedelta, UTC

from app.models.email import Email
from app.models.thread import Thread
from app.models.thread_user_metadata import ThreadUserMetadata
from app.models.user import User
from app.core.constants import FolderType, EmailStatus
from app.utils.label_utils import sync_thread_labels
from tests.conftest import create_received_email_for_user


class TestSnoozeProcessorFunction:
    """Test the snooze processor core functionality."""

    def test_process_expired_snooze_clears_snooze_until(self, db_session):
        """Test that expired snooze clears the snooze_until field."""
        # Create user
        user = User(
            first_name="Test",
            last_name="User",
            email="snooze_test@example.com",
            role="user"
        )
        db_session.add(user)
        db_session.commit()

        # Create thread with email
        thread = Thread(
            subject="Snoozed Thread",
            owner_id=user.id,
            email_count=1,
            last_email_at=datetime.now(UTC)
        )
        db_session.add(thread)
        db_session.commit()

        email = create_received_email_for_user(
            db_session, user,
            subject="Snoozed Email",
            body="Content",
            thread=thread
        )
        db_session.commit()

        # Create expired snooze metadata (snooze time in the past)
        expired_time = datetime.now(UTC) - timedelta(hours=1)
        metadata = ThreadUserMetadata(
            thread_id=thread.id,
            user_id=user.id,
            snooze_until=expired_time
        )
        db_session.add(metadata)
        db_session.commit()

        # Verify snooze is set
        assert metadata.snooze_until is not None

        # Process expired snoozes manually (simulating what cron does)
        now = datetime.now(UTC)
        expired_snoozes = db_session.query(ThreadUserMetadata).filter(
            ThreadUserMetadata.snooze_until.isnot(None),
            ThreadUserMetadata.snooze_until <= now
        ).all()

        assert len(expired_snoozes) == 1

        # Clear the snooze and sync labels
        for m in expired_snoozes:
            m.snooze_until = None
            sync_thread_labels(db_session, m.thread_id, m.user_id, commit=False)
        db_session.commit()

        # Verify snooze is cleared
        db_session.refresh(metadata)
        assert metadata.snooze_until is None

    def test_non_expired_snooze_not_processed(self, db_session):
        """Test that snoozes with future snooze_until are not processed."""
        # Create user
        user = User(
            first_name="Test",
            last_name="User",
            email="future_snooze@example.com",
            role="user"
        )
        db_session.add(user)
        db_session.commit()

        # Create thread
        thread = Thread(
            subject="Future Snoozed Thread",
            owner_id=user.id,
            email_count=1,
            last_email_at=datetime.now(UTC)
        )
        db_session.add(thread)
        db_session.commit()

        email = create_received_email_for_user(
            db_session, user,
            subject="Future Snoozed Email",
            body="Content",
            thread=thread
        )
        db_session.commit()

        # Create future snooze metadata (snooze time in the future)
        future_time = datetime.now(UTC) + timedelta(hours=24)
        metadata = ThreadUserMetadata(
            thread_id=thread.id,
            user_id=user.id,
            snooze_until=future_time
        )
        db_session.add(metadata)
        db_session.commit()

        # Query for expired snoozes
        now = datetime.now(UTC)
        expired_snoozes = db_session.query(ThreadUserMetadata).filter(
            ThreadUserMetadata.snooze_until.isnot(None),
            ThreadUserMetadata.snooze_until <= now
        ).all()

        # Should not find any expired snoozes
        assert len(expired_snoozes) == 0

        # Original snooze should still be set
        db_session.refresh(metadata)
        assert metadata.snooze_until is not None
        assert metadata.snooze_until > datetime.now(UTC)

    def test_multiple_expired_snoozes_processed(self, db_session):
        """Test that multiple expired snoozes are all processed."""
        # Create users
        users = []
        for i in range(3):
            user = User(
                first_name=f"User{i}",
                last_name="Test",
                email=f"multi_snooze_{i}@example.com",
                role="user"
            )
            db_session.add(user)
            users.append(user)
        db_session.commit()

        # Create threads and snooze metadata for each user
        metadatas = []
        for i, user in enumerate(users):
            thread = Thread(
                subject=f"Thread {i}",
                owner_id=user.id,
                email_count=1,
                last_email_at=datetime.now(UTC)
            )
            db_session.add(thread)
            db_session.flush()

            create_received_email_for_user(
                db_session, user,
                subject=f"Email {i}",
                body="Content",
                thread=thread
            )

            # All with expired snooze
            metadata = ThreadUserMetadata(
                thread_id=thread.id,
                user_id=user.id,
                snooze_until=datetime.now(UTC) - timedelta(hours=1)
            )
            db_session.add(metadata)
            metadatas.append(metadata)

        db_session.commit()

        # Query for expired snoozes
        now = datetime.now(UTC)
        expired_snoozes = db_session.query(ThreadUserMetadata).filter(
            ThreadUserMetadata.snooze_until.isnot(None),
            ThreadUserMetadata.snooze_until <= now
        ).all()

        # Should find all 3
        assert len(expired_snoozes) == 3

        # Clear all
        for m in expired_snoozes:
            m.snooze_until = None
            sync_thread_labels(db_session, m.thread_id, m.user_id, commit=False)
        db_session.commit()

        # Verify all cleared
        for metadata in metadatas:
            db_session.refresh(metadata)
            assert metadata.snooze_until is None


class TestUnsnoozeEndpoint:
    """Test the unsnooze endpoint functionality."""

    def test_unsnooze_clears_snooze_until(self, client_with_auth, db_session):
        """Test that unsnoozing a thread clears the snooze_until field."""
        client, token, user = client_with_auth

        # Create thread with email
        thread = Thread(
            subject="Unsnooze Test",
            owner_id=user.id,
            email_count=1,
            last_email_at=datetime.now(UTC)
        )
        db_session.add(thread)
        db_session.commit()

        email = create_received_email_for_user(
            db_session, user,
            subject="Test Email",
            body="Content",
            thread=thread
        )
        db_session.commit()

        # Create snooze metadata
        metadata = ThreadUserMetadata(
            thread_id=thread.id,
            user_id=user.id,
            snooze_until=datetime.now(UTC) + timedelta(days=1)
        )
        db_session.add(metadata)
        db_session.commit()

        # Verify snooze is set
        assert metadata.snooze_until is not None

        # Call unsnooze endpoint
        response = client.post(
            f"/api/v1/threads/{thread.id}/unsnooze",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200

        # Verify snooze is cleared
        db_session.refresh(metadata)
        assert metadata.snooze_until is None

    def test_unsnooze_response_shows_snooze_cleared(self, client_with_auth, db_session):
        """Test that unsnooze response shows snooze_until as null."""
        client, token, user = client_with_auth

        # Create thread with email
        thread = Thread(
            subject="Unsnooze Response Test",
            owner_id=user.id,
            email_count=1,
            last_email_at=datetime.now(UTC)
        )
        db_session.add(thread)
        db_session.commit()

        email = create_received_email_for_user(
            db_session, user,
            subject="Test Email",
            body="Content",
            thread=thread
        )
        db_session.commit()

        # Create snooze metadata
        metadata = ThreadUserMetadata(
            thread_id=thread.id,
            user_id=user.id,
            snooze_until=datetime.now(UTC) + timedelta(days=1)
        )
        db_session.add(metadata)
        db_session.commit()

        # Call unsnooze endpoint
        response = client.post(
            f"/api/v1/threads/{thread.id}/unsnooze",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        data = response.json()["data"]
        
        # snooze_until should be null in response
        assert data["snooze_until"] is None

    def test_unsnooze_not_snoozed_thread_fails(self, client_with_auth, db_session):
        """Test that unsnoozing a non-snoozed thread returns error."""
        client, token, user = client_with_auth

        # Create thread with email (no snooze)
        thread = Thread(
            subject="Not Snoozed Thread",
            owner_id=user.id,
            email_count=1,
            last_email_at=datetime.now(UTC)
        )
        db_session.add(thread)
        db_session.commit()

        email = create_received_email_for_user(
            db_session, user,
            subject="Test Email",
            body="Content",
            thread=thread
        )
        db_session.commit()

        # Call unsnooze endpoint without snooze metadata
        response = client.post(
            f"/api/v1/threads/{thread.id}/unsnooze",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 400
        assert "not snoozed" in response.json()["message"].lower()


class TestSnoozeProcessorUserIsolation:
    """Test that snooze processor respects user isolation."""

    def test_snooze_expiry_only_affects_snoozed_user(self, db_session):
        """Test that snooze expiry only affects the user who snoozed, not others."""
        # Create two users
        user1 = User(
            first_name="User",
            last_name="One",
            email="user1_snooze@example.com",
            role="user"
        )
        user2 = User(
            first_name="User",
            last_name="Two",
            email="user2_snooze@example.com",
            role="user"
        )
        db_session.add_all([user1, user2])
        db_session.commit()

        # Create a shared thread
        thread = Thread(
            subject="Shared Thread",
            owner_id=user1.id,
            email_count=2,
            last_email_at=datetime.now(UTC)
        )
        db_session.add(thread)
        db_session.commit()

        # Create received emails for both users
        email1 = create_received_email_for_user(
            db_session, user1,
            subject="Email for User1",
            body="Content",
            thread=thread
        )
        email2 = create_received_email_for_user(
            db_session, user2,
            subject="Email for User2",
            body="Content",
            thread=thread
        )
        db_session.commit()

        # Only user1 has expired snooze metadata
        metadata1 = ThreadUserMetadata(
            thread_id=thread.id,
            user_id=user1.id,
            snooze_until=datetime.now(UTC) - timedelta(hours=1)  # expired
        )
        db_session.add(metadata1)
        db_session.commit()

        # Query expired snoozes (should only find user1's)
        now = datetime.now(UTC)
        expired = db_session.query(ThreadUserMetadata).filter(
            ThreadUserMetadata.snooze_until.isnot(None),
            ThreadUserMetadata.snooze_until <= now
        ).all()

        assert len(expired) == 1
        assert expired[0].user_id == user1.id

        # Process for user1 only
        for m in expired:
            m.snooze_until = None
            sync_thread_labels(db_session, m.thread_id, m.user_id, commit=False)
        
        db_session.commit()

        # Verify user1's snooze is cleared
        db_session.refresh(metadata1)
        assert metadata1.snooze_until is None

        # Verify user2 has no snooze metadata (wasn't affected)
        user2_metadata = db_session.query(ThreadUserMetadata).filter(
            ThreadUserMetadata.thread_id == thread.id,
            ThreadUserMetadata.user_id == user2.id
        ).first()
        assert user2_metadata is None

    def test_both_users_can_snooze_same_thread_independently(self, db_session):
        """Test that two users can snooze the same thread with different times."""
        # Create two users
        user1 = User(
            first_name="User",
            last_name="One",
            email="user1_dual@example.com",
            role="user"
        )
        user2 = User(
            first_name="User",
            last_name="Two",
            email="user2_dual@example.com",
            role="user"
        )
        db_session.add_all([user1, user2])
        db_session.commit()

        # Create a shared thread
        thread = Thread(
            subject="Dual Snooze Thread",
            owner_id=user1.id,
            email_count=2,
            last_email_at=datetime.now(UTC)
        )
        db_session.add(thread)
        db_session.commit()

        # Create emails
        create_received_email_for_user(db_session, user1, subject="Email 1", thread=thread)
        create_received_email_for_user(db_session, user2, subject="Email 2", thread=thread)
        db_session.commit()

        # User1 snoozes for 1 hour (expired)
        metadata1 = ThreadUserMetadata(
            thread_id=thread.id,
            user_id=user1.id,
            snooze_until=datetime.now(UTC) - timedelta(hours=1)
        )
        # User2 snoozes for 1 day (not expired)
        metadata2 = ThreadUserMetadata(
            thread_id=thread.id,
            user_id=user2.id,
            snooze_until=datetime.now(UTC) + timedelta(days=1)
        )
        db_session.add_all([metadata1, metadata2])
        db_session.commit()

        # Query expired snoozes
        now = datetime.now(UTC)
        expired = db_session.query(ThreadUserMetadata).filter(
            ThreadUserMetadata.snooze_until.isnot(None),
            ThreadUserMetadata.snooze_until <= now
        ).all()

        # Only user1's snooze should be expired
        assert len(expired) == 1
        assert expired[0].user_id == user1.id

        # Clear user1's expired snooze
        for m in expired:
            m.snooze_until = None
        db_session.commit()

        # Verify user1's snooze cleared, user2's still active
        db_session.refresh(metadata1)
        db_session.refresh(metadata2)
        
        assert metadata1.snooze_until is None
        assert metadata2.snooze_until is not None
        assert metadata2.snooze_until > datetime.now(UTC)
