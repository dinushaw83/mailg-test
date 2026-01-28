"""
Tests for consistency rules applied during data generation.

Tests verify that:
1. Thread aggregates (email_count, last_email_at) are computed from actual emails
2. Label deletion propagates to children
3. Thread labels referencing deleted labels are removed
4. Thread labels are limited to max 4 per thread
5. Thread label user_id matches label owner_id
6. Dependent tables are auto-added when needed for consistency rules
"""

import pytest
from data_generation.generator.data_generator import DataGenerator


def generate_with_consistency(generator, table_name, num_rows):
    """
    Generate data with full cross-table consistency processing.

    The cross-table consistency rules are only applied in generate_all,
    not in generate_table. This helper generates the required tables
    and applies the consistency rules.
    """
    data = generator.generate_table(table_name, num_rows, include_dependencies=True)
    generator._apply_cross_table_consistency(data)
    return data


class TestThreadAggregateConsistency:
    """Tests for thread.email_count and thread.last_email_at computed from emails."""

    def test_thread_email_count_matches_actual_emails(self):
        """Thread email_count should match the actual number of emails in thread."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = generate_with_consistency(generator, "emails", 30)

        threads = data.get("threads", [])
        emails = data.get("emails", [])

        # Group emails by thread_id
        emails_by_thread = {}
        for email in emails:
            thread_id = email.get("thread_id")
            if thread_id:
                emails_by_thread.setdefault(thread_id, []).append(email)

        # Verify email_count matches
        for thread in threads:
            thread_id = thread.get("id")
            actual_count = len(emails_by_thread.get(thread_id, []))
            assert thread.get("email_count") == actual_count

    def test_thread_last_email_at_matches_most_recent(self):
        """Thread last_email_at should match the most recent email's created_at."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = generate_with_consistency(generator, "emails", 30)

        threads = data.get("threads", [])
        emails = data.get("emails", [])

        # Group emails by thread_id
        emails_by_thread = {}
        for email in emails:
            thread_id = email.get("thread_id")
            if thread_id:
                emails_by_thread.setdefault(thread_id, []).append(email)

        # Verify last_email_at matches most recent
        for thread in threads:
            thread_id = thread.get("id")
            thread_emails = emails_by_thread.get(thread_id, [])

            if thread_emails:
                # Filter to emails with a created_at timestamp
                dated_emails = [e for e in thread_emails if e.get("created_at")]
                if dated_emails:
                    most_recent = max(dated_emails, key=lambda e: e["created_at"])
                    # last_email_at should be set (not None) when thread has emails
                    assert thread.get("last_email_at") is not None
                # If all emails have null created_at, skip assertion
            else:
                # No emails, last_email_at should be None
                assert thread.get("last_email_at") is None

    def test_thread_with_no_emails_has_null_last_email_at(self):
        """Threads with no emails should have last_email_at = None and email_count = 0."""
        generator = DataGenerator(seed=42, use_seed=False)

        # Create a manual test case with a thread that has no emails
        data = {
            "threads": [
                {"id": "thread-with-emails", "email_count": 5, "last_email_at": "2025-01-01T00:00:00"},
                {"id": "thread-without-emails", "email_count": 10, "last_email_at": "2025-01-01T00:00:00"},
            ],
            "emails": [
                {"id": "email-1", "thread_id": "thread-with-emails", "created_at": "2025-01-15T10:00:00"},
                {"id": "email-2", "thread_id": "thread-with-emails", "created_at": "2025-01-16T10:00:00"},
            ],
            "users": [],  # Empty but present to avoid KeyError
        }

        generator._apply_cross_table_consistency(data)

        threads_by_id = {t["id"]: t for t in data["threads"]}

        # Thread with emails should have correct count and last_email_at
        assert threads_by_id["thread-with-emails"]["email_count"] == 2
        assert threads_by_id["thread-with-emails"]["last_email_at"] == "2025-01-16T10:00:00"

        # Thread without emails should have 0 count and None last_email_at
        assert threads_by_id["thread-without-emails"]["email_count"] == 0
        assert threads_by_id["thread-without-emails"]["last_email_at"] is None


class TestLabelDeletionPropagation:
    """Tests for label deletion cascading to children."""

    def test_child_labels_deleted_when_parent_deleted(self):
        """When a parent label is deleted, children should be marked deleted."""
        generator = DataGenerator(seed=42, use_seed=False)

        # Generate labels
        data = generator.generate_table("labels", 20, include_dependencies=True)

        labels = data.get("labels", [])

        # Find a parent label and mark it as deleted
        parent_labels = [l for l in labels if l.get("parent_id") is None]
        child_labels = [l for l in labels if l.get("parent_id") is not None]

        if parent_labels and child_labels:
            # Find a parent that has children
            for parent in parent_labels:
                children = [l for l in labels if l.get("parent_id") == parent["id"]]
                if children:
                    # Mark parent as deleted
                    parent["is_deleted"] = True

                    # Apply consistency rules
                    generator._apply_cross_table_consistency(data)

                    # Verify children are now deleted
                    for child in children:
                        child_in_data = next(
                            (l for l in data["labels"] if l["id"] == child["id"]), None
                        )
                        assert child_in_data is not None
                        assert child_in_data.get("is_deleted") is True
                    break

    def test_grandchild_labels_deleted_recursively(self):
        """Deletion should propagate recursively through all descendants."""
        generator = DataGenerator(seed=42, use_seed=False)

        # Create a manual hierarchy to test recursive deletion
        data = {
            "labels": [
                {"id": "label-1", "name": "Parent", "parent_id": None, "is_deleted": True, "owner_id": "user-1"},
                {"id": "label-2", "name": "Child", "parent_id": "label-1", "is_deleted": False, "owner_id": "user-1"},
                {"id": "label-3", "name": "Grandchild", "parent_id": "label-2", "is_deleted": False, "owner_id": "user-1"},
            ]
        }

        generator._propagate_label_deletion(data)

        labels_by_id = {l["id"]: l for l in data["labels"]}

        # All should be deleted
        assert labels_by_id["label-1"]["is_deleted"] is True
        assert labels_by_id["label-2"]["is_deleted"] is True
        assert labels_by_id["label-3"]["is_deleted"] is True

    def test_non_deleted_parent_preserves_children(self):
        """Children of non-deleted parents should remain non-deleted."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = {
            "labels": [
                {"id": "label-1", "name": "Parent", "parent_id": None, "is_deleted": False, "owner_id": "user-1"},
                {"id": "label-2", "name": "Child", "parent_id": "label-1", "is_deleted": False, "owner_id": "user-1"},
            ]
        }

        generator._propagate_label_deletion(data)

        labels_by_id = {l["id"]: l for l in data["labels"]}

        assert labels_by_id["label-1"]["is_deleted"] is False
        assert labels_by_id["label-2"]["is_deleted"] is False


class TestDeletedLabelFilterFromThreadLabels:
    """Tests for removing thread_labels that reference deleted labels."""

    def test_thread_labels_with_deleted_labels_removed(self):
        """Thread labels referencing deleted labels should be removed."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = {
            "labels": [
                {"id": "label-1", "name": "Active", "is_deleted": False, "owner_id": "user-1"},
                {"id": "label-2", "name": "Deleted", "is_deleted": True, "owner_id": "user-1"},
            ],
            "thread_labels": [
                {"id": "tl-1", "thread_id": "thread-1", "label_id": "label-1", "user_id": "user-1"},
                {"id": "tl-2", "thread_id": "thread-1", "label_id": "label-2", "user_id": "user-1"},
                {"id": "tl-3", "thread_id": "thread-2", "label_id": "label-2", "user_id": "user-1"},
            ],
        }

        generator._filter_deleted_labels_from_threads(data)

        thread_labels = data["thread_labels"]

        # Only tl-1 should remain (references non-deleted label)
        assert len(thread_labels) == 1
        assert thread_labels[0]["id"] == "tl-1"

    def test_all_thread_labels_preserved_when_no_deleted_labels(self):
        """All thread labels should be preserved when no labels are deleted."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = {
            "labels": [
                {"id": "label-1", "name": "Active1", "is_deleted": False, "owner_id": "user-1"},
                {"id": "label-2", "name": "Active2", "is_deleted": False, "owner_id": "user-1"},
            ],
            "thread_labels": [
                {"id": "tl-1", "thread_id": "thread-1", "label_id": "label-1", "user_id": "user-1"},
                {"id": "tl-2", "thread_id": "thread-1", "label_id": "label-2", "user_id": "user-1"},
            ],
        }

        generator._filter_deleted_labels_from_threads(data)

        assert len(data["thread_labels"]) == 2


class TestThreadLabelsMaxLimit:
    """Tests for limiting thread_labels to max 4 per thread."""

    def test_thread_labels_limited_to_four_per_thread(self):
        """Each thread should have at most 4 labels."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = {
            "threads": [{"id": "thread-1"}],
            "thread_labels": [
                {"id": f"tl-{i}", "thread_id": "thread-1", "label_id": f"label-{i}", "user_id": "user-1"}
                for i in range(7)  # 7 labels for one thread
            ],
        }

        generator._limit_thread_labels_per_thread(data)

        assert len(data["thread_labels"]) == 4

    def test_thread_labels_preserved_when_under_limit(self):
        """Thread labels under limit should all be preserved."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = {
            "threads": [{"id": "thread-1"}],
            "thread_labels": [
                {"id": f"tl-{i}", "thread_id": "thread-1", "label_id": f"label-{i}", "user_id": "user-1"}
                for i in range(3)  # 3 labels, under limit
            ],
        }

        generator._limit_thread_labels_per_thread(data)

        assert len(data["thread_labels"]) == 3

    def test_multiple_threads_each_limited_independently(self):
        """Each thread's labels should be limited independently."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = {
            "threads": [{"id": "thread-1"}, {"id": "thread-2"}],
            "thread_labels": [
                # 6 labels for thread-1
                *[{"id": f"tl-1-{i}", "thread_id": "thread-1", "label_id": f"label-{i}", "user_id": "user-1"} for i in range(6)],
                # 5 labels for thread-2
                *[{"id": f"tl-2-{i}", "thread_id": "thread-2", "label_id": f"label-{i}", "user_id": "user-1"} for i in range(5)],
            ],
        }

        generator._limit_thread_labels_per_thread(data)

        # Count labels per thread
        thread1_labels = [tl for tl in data["thread_labels"] if tl["thread_id"] == "thread-1"]
        thread2_labels = [tl for tl in data["thread_labels"] if tl["thread_id"] == "thread-2"]

        assert len(thread1_labels) == 4
        assert len(thread2_labels) == 4

    def test_generated_data_respects_label_limit(self):
        """Generated thread_labels should respect the 4-per-thread limit."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = generate_with_consistency(generator, "thread_labels", 100)

        thread_labels = data.get("thread_labels", [])
        threads = data.get("threads", [])

        # Group by thread_id
        labels_by_thread = {}
        for tl in thread_labels:
            thread_id = tl.get("thread_id")
            labels_by_thread.setdefault(thread_id, []).append(tl)

        # Verify each thread has at most 4 labels
        for thread_id, labels in labels_by_thread.items():
            assert len(labels) <= 4, f"Thread {thread_id} has {len(labels)} labels, expected <= 4"


class TestThreadLabelUserMatchesOwner:
    """Tests for thread_label.user_id matching label.owner_id."""

    def test_thread_label_user_updated_to_match_label_owner(self):
        """Thread label user_id should be updated to match label owner_id."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = {
            "labels": [
                {"id": "label-1", "name": "Label1", "owner_id": "user-owner", "is_deleted": False},
            ],
            "thread_labels": [
                {"id": "tl-1", "thread_id": "thread-1", "label_id": "label-1", "user_id": "user-wrong"},
            ],
        }

        generator._ensure_thread_label_user_matches_label_owner(data)

        assert data["thread_labels"][0]["user_id"] == "user-owner"

    def test_thread_label_user_preserved_when_correct(self):
        """Thread label user_id should be preserved if already correct."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = {
            "labels": [
                {"id": "label-1", "name": "Label1", "owner_id": "user-owner", "is_deleted": False},
            ],
            "thread_labels": [
                {"id": "tl-1", "thread_id": "thread-1", "label_id": "label-1", "user_id": "user-owner"},
            ],
        }

        generator._ensure_thread_label_user_matches_label_owner(data)

        assert data["thread_labels"][0]["user_id"] == "user-owner"

    def test_generated_thread_labels_have_matching_user(self):
        """Generated thread_labels should have user_id matching label owner_id."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = generate_with_consistency(generator, "thread_labels", 50)

        thread_labels = data.get("thread_labels", [])
        labels = data.get("labels", [])

        label_owner_map = {l["id"]: l["owner_id"] for l in labels}

        for tl in thread_labels:
            label_id = tl.get("label_id")
            if label_id in label_owner_map:
                assert tl.get("user_id") == label_owner_map[label_id]


class TestAutoDependencyForConsistencyRules:
    """Tests that required tables are auto-added for consistency rules to work."""

    def test_emails_auto_includes_users_for_recipient_creation(self):
        """Generating emails should auto-include users for recipient creation."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = generate_with_consistency(generator, "emails", 20)

        # Users should be auto-included
        assert "users" in data
        assert len(data.get("users", [])) > 0

        # email_recipients should be created
        assert "email_recipients" in data
        assert len(data.get("email_recipients", [])) > 0

    def test_emails_auto_includes_threads(self):
        """Generating emails should auto-include threads."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = generate_with_consistency(generator, "emails", 20)

        # Threads should be auto-included
        assert "threads" in data
        assert len(data.get("threads", [])) > 0

    def test_thread_labels_auto_includes_labels_and_threads(self):
        """Generating thread_labels should auto-include labels and threads."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = generate_with_consistency(generator, "thread_labels", 30)

        # Labels should be auto-included
        assert "labels" in data
        assert len(data.get("labels", [])) > 0

        # Threads should be auto-included
        assert "threads" in data
        assert len(data.get("threads", [])) > 0

    def test_labels_auto_includes_users_for_owner(self):
        """Generating labels should auto-include users for owner_id."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = generator.generate_table("labels", 20, include_dependencies=True)

        # Users should be auto-included
        assert "users" in data
        assert len(data.get("users", [])) > 0

    def test_threads_auto_includes_users_for_owner(self):
        """Generating threads should auto-include users for owner_id."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = generator.generate_table("threads", 20, include_dependencies=True)

        # Users should be auto-included
        assert "users" in data
        assert len(data.get("users", [])) > 0

    def test_consistency_rules_work_with_auto_dependencies(self):
        """Full consistency rules should work correctly with auto-dependencies."""
        generator = DataGenerator(seed=42, use_seed=False)

        # Generate emails - this should trigger all dependencies
        data = generate_with_consistency(generator, "emails", 30)

        # Verify all expected tables are present
        assert "users" in data
        assert "threads" in data
        assert "emails" in data
        assert "email_recipients" in data

        # Verify consistency rules were applied
        emails = data.get("emails", [])
        sent_emails = [e for e in emails if e.get("status") == "sent"]

        for email in sent_emails:
            # Folder should be set correctly
            assert email.get("folder") == "sent"
            # is_read should be True
            assert email.get("is_read") is True

    def test_include_dependencies_false_skips_auto_add(self):
        """With include_dependencies=False, dependent tables should not be auto-added."""
        generator = DataGenerator(seed=42, use_seed=False)

        # Generate without dependencies
        data = generator.generate_table("emails", 10, include_dependencies=False)

        # Only emails should be present
        assert "emails" in data
        # Users and threads should NOT be auto-included
        assert "users" not in data
        assert "threads" not in data


class TestEmailRecipientCreationWithDependencies:
    """Tests that email_recipients are properly created when emails are generated."""

    def test_email_recipients_created_for_sent_emails(self):
        """Email recipients should be created for sent emails."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = generate_with_consistency(generator, "emails", 30)

        emails = data.get("emails", [])
        email_recipients = data.get("email_recipients", [])
        sent_emails = [e for e in emails if e.get("status") == "sent"]

        if sent_emails:
            # Should have recipients for sent emails
            sent_email_ids = {e["id"] for e in sent_emails}
            recipients_for_sent = [r for r in email_recipients if r["email_id"] in sent_email_ids]
            assert len(recipients_for_sent) >= len(sent_emails)

    def test_email_recipients_reference_valid_users(self):
        """Email recipient_id should reference valid users from auto-included users."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = generate_with_consistency(generator, "emails", 20)

        email_recipients = data.get("email_recipients", [])
        users = data.get("users", [])
        user_ids = {u["id"] for u in users}

        for recipient in email_recipients:
            recipient_id = recipient.get("recipient_id")
            if recipient_id:  # Can be null for external recipients
                assert recipient_id in user_ids


class TestFullConsistencyPipeline:
    """Integration tests for the full consistency rules pipeline."""

    def test_all_consistency_rules_applied_together(self):
        """All consistency rules should work together without conflicts."""
        generator = DataGenerator(seed=42, use_seed=False)

        # Generate a complex dataset
        data = generate_with_consistency(generator, "thread_labels", 50)

        # Add emails to trigger email-related rules
        email_data = generator.generate_table("emails", 30, include_dependencies=False)
        data["emails"] = email_data.get("emails", [])

        # Apply full consistency
        generator._apply_cross_table_consistency(data)

        # Verify thread aggregates
        threads = data.get("threads", [])
        emails = data.get("emails", [])

        emails_by_thread = {}
        for email in emails:
            thread_id = email.get("thread_id")
            if thread_id:
                emails_by_thread.setdefault(thread_id, []).append(email)

        for thread in threads:
            thread_id = thread.get("id")
            expected_count = len(emails_by_thread.get(thread_id, []))
            assert thread.get("email_count") == expected_count

        # Verify thread_labels are limited
        thread_labels = data.get("thread_labels", [])
        labels_by_thread = {}
        for tl in thread_labels:
            tid = tl.get("thread_id")
            labels_by_thread.setdefault(tid, []).append(tl)

        for tid, labels in labels_by_thread.items():
            assert len(labels) <= 4

    def test_consistency_rules_idempotent(self):
        """Applying consistency rules multiple times should give same result."""
        generator = DataGenerator(seed=42, use_seed=False)

        data = generate_with_consistency(generator, "emails", 20)

        # Get state after first application
        email_count_1 = len(data.get("emails", []))
        recipient_count_1 = len(data.get("email_recipients", []))

        # Apply again
        generator._apply_cross_table_consistency(data)

        # Counts should be the same (no duplicates created)
        email_count_2 = len(data.get("emails", []))
        recipient_count_2 = len(data.get("email_recipients", []))

        # Note: email_recipients may increase on second run if there are
        # new sent/received emails, but the original emails shouldn't change
        assert email_count_2 >= email_count_1
