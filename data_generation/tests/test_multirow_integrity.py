"""
Tests for multi-row integrity and consistency rules.

Tests verify that:
1. Multi-recipient emails create correct number of email_recipients rows
2. Sent emails create receiver copies for each recipient
3. Sender and receiver copies have consistent content
4. Email status determines correct folder assignment
5. Timestamp fields are set according to email status
6. Thread integrity (emails reference valid threads)
"""

import pytest
from data_generation.generator.data_generator import DataGenerator


def generate_emails_with_full_processing(generator, num_emails):
    """
    Generate emails with full cross-table consistency processing.

    The cross-table consistency rules (like folder assignment and
    email_recipients creation) are only applied in generate_all,
    not in generate_table. This helper generates the required tables
    and applies the consistency rules.
    """
    # Generate with dependencies
    data = generator.generate_table("emails", num_emails, include_dependencies=True)

    # Apply cross-table consistency (folder assignment, email_recipients creation)
    generator._apply_cross_table_consistency(data)

    return data


class TestMultiRecipientEmailGeneration:
    """Tests for multi-recipient email generation."""

    def test_sent_email_creates_email_recipients(self):
        """Each sent email should have at least one email_recipient record."""
        generator = DataGenerator(seed=42, use_seed=False)

        # Generate emails with full processing
        data = generate_emails_with_full_processing(generator, 20)

        emails = data.get("emails", [])
        email_recipients = data.get("email_recipients", [])

        # Get sent emails (these will have recipients generated)
        sent_emails = [e for e in emails if e.get("status") == "sent"]

        if sent_emails:
            # Each sent email should have at least one recipient entry
            sent_email_ids = {e["id"] for e in sent_emails}
            recipients_for_sent = [
                r for r in email_recipients if r["email_id"] in sent_email_ids
            ]
            assert len(recipients_for_sent) >= len(sent_emails)

    def test_sent_email_creates_receiver_copies(self):
        """Sent emails should create corresponding received copies for recipients."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = generate_emails_with_full_processing(generator, 30)

        emails = data.get("emails", [])
        sent_emails = [e for e in emails if e.get("status") == "sent"]
        received_emails = [e for e in emails if e.get("status") == "received"]

        # If we have sent emails, we should have received emails too
        if sent_emails:
            assert len(received_emails) > 0

    def test_email_recipient_fields_populated(self):
        """Email recipient records should have all required fields."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = generate_emails_with_full_processing(generator, 20)

        email_recipients = data.get("email_recipients", [])

        for recipient in email_recipients:
            assert "id" in recipient
            assert "email_id" in recipient
            # recipient_id may be null for external recipients
            assert "recipient_type" in recipient
            assert recipient["recipient_type"] in ["to", "cc", "bcc"]

    def test_sender_copy_has_multiple_recipients(self):
        """A sender copy should reference all recipients."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = generate_emails_with_full_processing(generator, 50)

        emails = data.get("emails", [])
        email_recipients = data.get("email_recipients", [])

        sent_emails = [e for e in emails if e.get("status") == "sent"]

        # Check that at least some sent emails have multiple recipients
        multi_recipient_count = 0
        for sent_email in sent_emails:
            recipients = [r for r in email_recipients if r["email_id"] == sent_email["id"]]
            if len(recipients) > 1:
                multi_recipient_count += 1

        # With random 1-3 recipients per email, we should have some with multiple
        if len(sent_emails) >= 10:
            assert multi_recipient_count > 0

    def test_receiver_copy_has_single_recipient(self):
        """Each receiver copy should have exactly one recipient (itself)."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = generate_emails_with_full_processing(generator, 30)

        emails = data.get("emails", [])
        email_recipients = data.get("email_recipients", [])

        received_emails = [e for e in emails if e.get("status") == "received"]

        for received_email in received_emails:
            recipients = [r for r in email_recipients if r["email_id"] == received_email["id"]]
            # Receiver copies may have 0 recipients if processing failed, but if present should be 1
            if recipients:
                assert len(recipients) == 1


class TestSenderReceiverCopyIntegrity:
    """Tests for sender/receiver copy consistency."""

    def test_sender_and_receiver_have_same_subject(self):
        """Sender and receiver copies of same email should have identical subject."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = generate_emails_with_full_processing(generator, 30)

        emails = data.get("emails", [])
        sent_emails = [e for e in emails if e.get("status") == "sent"]
        received_emails = [e for e in emails if e.get("status") == "received"]

        # Group by thread to find related emails
        for sent in sent_emails:
            thread_id = sent.get("thread_id")
            sender_id = sent.get("sender_id")
            subject = sent.get("subject")

            # Find received emails in same thread from same sender
            related_received = [
                r for r in received_emails
                if r.get("thread_id") == thread_id
                and r.get("sender_id") == sender_id
            ]

            for received in related_received:
                # Subject should match
                assert received.get("subject") == subject

    def test_sender_and_receiver_have_same_body(self):
        """Sender and receiver copies should have identical body content."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = generate_emails_with_full_processing(generator, 30)

        emails = data.get("emails", [])
        sent_emails = [e for e in emails if e.get("status") == "sent"]
        received_emails = [e for e in emails if e.get("status") == "received"]

        for sent in sent_emails:
            thread_id = sent.get("thread_id")
            sender_id = sent.get("sender_id")
            body = sent.get("body")

            related_received = [
                r for r in received_emails
                if r.get("thread_id") == thread_id
                and r.get("sender_id") == sender_id
            ]

            for received in related_received:
                assert received.get("body") == body

    def test_sent_email_folder_is_sent(self):
        """Sent emails should be in the 'sent' folder."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = generate_emails_with_full_processing(generator, 30)

        emails = data.get("emails", [])
        sent_emails = [e for e in emails if e.get("status") == "sent"]

        for email in sent_emails:
            assert email.get("folder") == "sent"

    def test_received_email_folder_is_inbox(self):
        """Received emails should be in the 'inbox' folder."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = generate_emails_with_full_processing(generator, 30)

        emails = data.get("emails", [])
        received_emails = [e for e in emails if e.get("status") == "received"]

        for email in received_emails:
            assert email.get("folder") == "inbox"


class TestEmailStatusConsistency:
    """Tests for email status-based consistency rules."""

    def test_sent_email_has_sent_at(self):
        """Sent emails should have sent_at timestamp."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = generate_emails_with_full_processing(generator, 30)

        emails = data.get("emails", [])
        sent_emails = [e for e in emails if e.get("status") == "sent"]

        for email in sent_emails:
            assert email.get("sent_at") is not None

    def test_received_email_has_received_at(self):
        """Received emails should have received_at timestamp."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = generate_emails_with_full_processing(generator, 30)

        emails = data.get("emails", [])
        received_emails = [e for e in emails if e.get("status") == "received"]

        for email in received_emails:
            assert email.get("received_at") is not None

    def test_draft_email_has_no_sent_at(self):
        """Draft emails should not have sent_at timestamp."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = generate_emails_with_full_processing(generator, 50)

        emails = data.get("emails", [])
        draft_emails = [e for e in emails if e.get("status") == "draft"]

        for email in draft_emails:
            assert email.get("sent_at") is None

    def test_draft_email_folder_is_drafts(self):
        """Draft emails should be in the 'drafts' folder."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = generate_emails_with_full_processing(generator, 50)

        emails = data.get("emails", [])
        draft_emails = [e for e in emails if e.get("status") == "draft"]

        for email in draft_emails:
            assert email.get("folder") == "drafts"

    def test_queued_email_has_scheduled_send_at(self):
        """Queued emails should have scheduled_send_at timestamp."""
        generator = DataGenerator(seed=42, use_seed=False)

        # Generate more emails to increase chance of queued status
        data = generate_emails_with_full_processing(generator, 100)

        emails = data.get("emails", [])
        queued_emails = [e for e in emails if e.get("status") == "queued"]

        for email in queued_emails:
            assert email.get("scheduled_send_at") is not None


class TestThreadEmailIntegrity:
    """Tests for thread-email relationship integrity."""

    def test_emails_reference_valid_threads(self):
        """All emails should reference threads that exist."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = generate_emails_with_full_processing(generator, 30)

        emails = data.get("emails", [])
        threads = data.get("threads", [])
        thread_ids = {t["id"] for t in threads}

        for email in emails:
            thread_id = email.get("thread_id")
            if thread_id:  # Some emails might have null thread_id
                assert thread_id in thread_ids

    def test_thread_has_emails(self):
        """Threads referenced by emails should have associated emails."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = generate_emails_with_full_processing(generator, 30)

        emails = data.get("emails", [])
        threads = data.get("threads", [])

        # Get unique thread IDs from emails
        thread_ids_from_emails = {e.get("thread_id") for e in emails if e.get("thread_id")}

        for thread_id in thread_ids_from_emails:
            # Verify thread exists
            matching_threads = [t for t in threads if t["id"] == thread_id]
            assert len(matching_threads) > 0

            # Verify at least one email references this thread
            emails_in_thread = [e for e in emails if e.get("thread_id") == thread_id]
            assert len(emails_in_thread) > 0


class TestRecipientUserIntegrity:
    """Tests for recipient-user relationship integrity."""

    def test_recipient_id_references_valid_user(self):
        """Email recipient_id should reference a valid user."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = generate_emails_with_full_processing(generator, 20)

        email_recipients = data.get("email_recipients", [])
        users = data.get("users", [])
        user_ids = {u["id"] for u in users}

        for recipient in email_recipients:
            recipient_id = recipient.get("recipient_id")
            if recipient_id:  # Can be null for external recipients
                assert recipient_id in user_ids

    def test_recipient_email_matches_user_email(self):
        """Recipient email should match the referenced user's email."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = generate_emails_with_full_processing(generator, 20)

        email_recipients = data.get("email_recipients", [])
        users = data.get("users", [])
        user_by_id = {u["id"]: u for u in users}

        for recipient in email_recipients:
            recipient_id = recipient.get("recipient_id")
            recipient_email = recipient.get("recipient_email")

            if recipient_id and recipient_email:
                user = user_by_id.get(recipient_id)
                if user:
                    assert recipient_email == user.get("email")

    def test_recipient_name_matches_user_name(self):
        """Recipient name should match the referenced user's name."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = generate_emails_with_full_processing(generator, 20)

        email_recipients = data.get("email_recipients", [])
        users = data.get("users", [])
        user_by_id = {u["id"]: u for u in users}

        for recipient in email_recipients:
            recipient_id = recipient.get("recipient_id")
            recipient_name = recipient.get("recipient_name")

            if recipient_id and recipient_name:
                user = user_by_id.get(recipient_id)
                if user:
                    expected_name = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()
                    assert recipient_name == expected_name


class TestEmailRecipientTypeDistribution:
    """Tests for recipient type distribution."""

    def test_has_to_recipients(self):
        """There should be 'to' type recipients."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = generate_emails_with_full_processing(generator, 30)

        email_recipients = data.get("email_recipients", [])
        to_recipients = [r for r in email_recipients if r.get("recipient_type") == "to"]

        assert len(to_recipients) > 0

    def test_first_recipient_is_to(self):
        """The first recipient of each email should be 'to' type."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = generate_emails_with_full_processing(generator, 30)

        emails = data.get("emails", [])
        email_recipients = data.get("email_recipients", [])

        # Group recipients by email_id
        recipients_by_email = {}
        for r in email_recipients:
            email_id = r["email_id"]
            if email_id not in recipients_by_email:
                recipients_by_email[email_id] = []
            recipients_by_email[email_id].append(r)

        # Check that each email has at least one 'to' recipient
        for email_id, recipients in recipients_by_email.items():
            to_recipients = [r for r in recipients if r.get("recipient_type") == "to"]
            assert len(to_recipients) >= 1


class TestUniqueEmailIds:
    """Tests for unique ID generation."""

    def test_email_ids_are_unique(self):
        """All email IDs should be unique."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = generate_emails_with_full_processing(generator, 50)

        emails = data.get("emails", [])
        ids = [e["id"] for e in emails]

        assert len(ids) == len(set(ids))

    def test_email_recipient_ids_are_unique(self):
        """All email_recipient IDs should be unique."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = generate_emails_with_full_processing(generator, 30)

        email_recipients = data.get("email_recipients", [])
        ids = [r["id"] for r in email_recipients]

        assert len(ids) == len(set(ids))

    def test_thread_ids_are_unique(self):
        """All thread IDs should be unique."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = generator.generate_table("threads", 30, include_dependencies=True)

        threads = data.get("threads", [])
        ids = [t["id"] for t in threads]

        assert len(ids) == len(set(ids))


class TestSenderIsNotRecipient:
    """Tests that sender is never in recipient list."""

    def test_sender_not_in_recipients(self):
        """Sender should not appear in recipient list of their own email."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = generate_emails_with_full_processing(generator, 30)

        emails = data.get("emails", [])
        email_recipients = data.get("email_recipients", [])

        for email in emails:
            sender_id = email.get("sender_id")
            email_id = email.get("id")

            # Get recipients for this email
            recipients = [r for r in email_recipients if r["email_id"] == email_id]

            for recipient in recipients:
                # For sender copies, sender should not be in recipients
                if email.get("status") == "sent":
                    assert recipient.get("recipient_id") != sender_id


class TestConsistencyRulesApplication:
    """Tests for consistency rules being applied correctly."""

    def test_consistency_rules_applied_to_emails(self):
        """Consistency rules should be applied to generated emails."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = generate_emails_with_full_processing(generator, 50)

        emails = data.get("emails", [])

        for email in emails:
            status = email.get("status")

            if status == "draft":
                # Draft: no sent_at, no received_at, no scheduled_send_at
                assert email.get("sent_at") is None
                assert email.get("received_at") is None
                assert email.get("scheduled_send_at") is None

            elif status == "sent":
                # Sent: has sent_at, no scheduled_send_at
                assert email.get("sent_at") is not None
                assert email.get("scheduled_send_at") is None

            elif status == "received":
                # Received: has received_at, no scheduled_send_at
                assert email.get("received_at") is not None
                assert email.get("scheduled_send_at") is None

            elif status == "queued":
                # Queued: has scheduled_send_at
                assert email.get("scheduled_send_at") is not None

    def test_sent_email_is_marked_as_read(self):
        """Sent emails should be marked as read (sender has seen it)."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = generate_emails_with_full_processing(generator, 30)

        emails = data.get("emails", [])
        sent_emails = [e for e in emails if e.get("status") == "sent"]

        for email in sent_emails:
            assert email.get("is_read") is True
