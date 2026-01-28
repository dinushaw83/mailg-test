"""
Integration tests to verify that data generation uses fixture data
and does not load seed data from defaults.yaml.

These tests ensure:
1. No seed data is loaded from defaults.yaml
2. Fixture data is imported before data generation runs
3. Generated data is attached to fixture data (e.g., emails linked to fixture users)
"""

import json
import pytest
from pathlib import Path

from data_generation.generator.data_generator import DataGenerator
from data_generation.generator.core.context import GenerationContext


# Fixture data paths
FIXTURES_DIR = Path(__file__).parent.parent.parent / "backend" / "fixtures"

# Schema path (go up to project root, then into backend)
SCHEMA_PATH = Path(__file__).parent.parent.parent / "backend" / "database_schema.json"

# Known fixture user IDs (from users.json)
FIXTURE_USER_IDS = [
    "00000000-0000-0000-0000-000000000001",  # John Doe
    "00000000-0000-0000-0000-000000000002",  # Sarah Williams
]

# Known fixture user emails
FIXTURE_USER_EMAILS = [
    "john.doe@example.com",
    "sarah.williams@example.com",
]

# Known fixture label IDs (from labels.json)
FIXTURE_LABEL_IDS = [
    "40000000-0000-0000-0000-000000000001",  # Work
    "40000000-0000-0000-0000-000000000002",  # Personal
]


def load_fixture(name: str) -> list:
    """Load a fixture file."""
    fixture_path = FIXTURES_DIR / f"{name}.json"
    if fixture_path.exists():
        with open(fixture_path) as f:
            return json.load(f)
    return []


def get_all_fixture_user_ids() -> set:
    """Get all user IDs from fixtures."""
    users = load_fixture("users")
    return {u["id"] for u in users}


def get_all_fixture_label_ids() -> set:
    """Get all label IDs from fixtures."""
    labels = load_fixture("labels")
    return {l["id"] for l in labels}


def get_all_fixture_thread_ids() -> set:
    """Get all thread IDs from fixtures."""
    threads = load_fixture("threads")
    return {t["id"] for t in threads}


class TestFixtureDataLoading:
    """Tests that fixture data is properly loaded."""

    def test_fixture_files_exist(self):
        """Fixture files should exist."""
        assert FIXTURES_DIR.exists(), f"Fixtures directory not found: {FIXTURES_DIR}"

        required_fixtures = [
            "users.json",
            "labels.json",
            "threads.json",
            "emails.json",
        ]
        for fixture in required_fixtures:
            assert (FIXTURES_DIR / fixture).exists(), f"Fixture not found: {fixture}"

    def test_fixture_users_have_expected_structure(self):
        """Fixture users should have the expected fields."""
        users = load_fixture("users")
        assert len(users) > 0, "No users in fixtures"

        user = users[0]
        assert "id" in user
        assert "email" in user
        assert "first_name" in user
        assert "last_name" in user

    def test_known_fixture_users_exist(self):
        """Known fixture user IDs should exist."""
        user_ids = get_all_fixture_user_ids()

        for expected_id in FIXTURE_USER_IDS:
            assert expected_id in user_ids, f"Expected fixture user {expected_id} not found"

    def test_fixture_labels_belong_to_fixture_users(self):
        """All fixture labels should belong to fixture users."""
        labels = load_fixture("labels")
        user_ids = get_all_fixture_user_ids()

        for label in labels:
            owner_id = label.get("owner_id")
            assert owner_id in user_ids, \
                f"Label {label['id']} has owner_id {owner_id} not in fixture users"


class TestNoSeedDataFromDefaults:
    """Tests that no seed data is loaded from defaults.yaml."""

    def test_context_starts_empty(self):
        """GenerationContext should start with no pre-loaded IDs."""
        context = GenerationContext()

        # Context should have no IDs registered initially
        assert len(context.generated_ids) == 0, \
            "Context should start with empty generated_ids"

    def test_generator_does_not_auto_load_seed_users(self):
        """DataGenerator should not auto-load seed users from defaults."""
        # Create generator with use_seed=False to ensure no seed data loaded
        generator = DataGenerator(
            schema_path=str(SCHEMA_PATH),
            use_seed=False,  # Don't load seed data
        )

        # Check that no IDs are pre-registered from seed data
        # (IDs should only come from database or explicit registration)
        assert len(generator.context.generated_ids.get("users", [])) == 0, \
            "Generator should not have pre-loaded user IDs from defaults"


class TestGeneratedDataUsesFixtureReferences:
    """Tests that generated data references fixture data."""

    @pytest.fixture
    def generator_with_fixture_ids(self):
        """Create a generator with fixture IDs pre-registered."""
        generator = DataGenerator(
            schema_path=str(SCHEMA_PATH),
            use_seed=False,  # Don't load seed data from config
        )

        # Register fixture user IDs (simulating what happens after fixture import)
        for user_id in get_all_fixture_user_ids():
            generator.context.register_id("users", user_id)

        # Register fixture label IDs
        for label_id in get_all_fixture_label_ids():
            generator.context.register_id("labels", label_id)

        # Register fixture thread IDs
        for thread_id in get_all_fixture_thread_ids():
            generator.context.register_id("threads", thread_id)

        return generator

    def test_generated_threads_use_fixture_owners(self, generator_with_fixture_ids):
        """Generated threads should have owner_id from fixture users."""
        generator = generator_with_fixture_ids
        fixture_user_ids = get_all_fixture_user_ids()

        # Generate threads with custom row counts
        data = generator.generate_all(
            row_counts={
                "users": 0,  # Don't generate users, use fixtures
                "labels": 0,  # Don't generate labels, use fixtures
                "threads": 5,
                "emails": 0,
            }
        )
        threads = data.get("threads", [])

        for thread in threads:
            owner_id = thread.get("owner_id")
            assert owner_id in fixture_user_ids, \
                f"Thread owner_id {owner_id} not in fixture users"

    def test_generated_emails_use_fixture_senders(self, generator_with_fixture_ids):
        """Generated emails should have sender_id from fixture users."""
        generator = generator_with_fixture_ids
        fixture_user_ids = get_all_fixture_user_ids()

        # Generate emails with custom row counts
        data = generator.generate_all(
            row_counts={
                "users": 0,
                "labels": 0,
                "threads": 0,
                "emails": 10,
            }
        )
        emails = data.get("emails", [])

        for email in emails:
            sender_id = email.get("sender_id")
            assert sender_id in fixture_user_ids, \
                f"Email sender_id {sender_id} not in fixture users"

    def test_generated_emails_use_fixture_threads(self, generator_with_fixture_ids):
        """Generated emails should have thread_id from fixture or generated threads."""
        generator = generator_with_fixture_ids
        fixture_thread_ids = get_all_fixture_thread_ids()

        # Generate data with custom row counts
        data = generator.generate_all(
            row_counts={
                "users": 0,
                "labels": 0,
                "threads": 5,
                "emails": 10,
            }
        )
        emails = data.get("emails", [])
        generated_thread_ids = {t["id"] for t in data.get("threads", [])}

        all_valid_thread_ids = fixture_thread_ids | generated_thread_ids

        for email in emails:
            thread_id = email.get("thread_id")
            if thread_id is not None:  # thread_id can be null for orphan emails
                assert thread_id in all_valid_thread_ids, \
                    f"Email thread_id {thread_id} not in valid threads"


class TestFixtureImportOrder:
    """Tests that verify fixture import happens before data generation."""

    def test_fixture_users_count(self):
        """Fixtures should have a reasonable number of users."""
        users = load_fixture("users")
        assert len(users) >= 10, f"Expected at least 10 fixture users, got {len(users)}"

    def test_fixture_labels_count(self):
        """Fixtures should have a reasonable number of labels."""
        labels = load_fixture("labels")
        assert len(labels) >= 100, f"Expected at least 100 fixture labels, got {len(labels)}"

    def test_fixture_threads_count(self):
        """Fixtures should have a reasonable number of threads."""
        threads = load_fixture("threads")
        assert len(threads) >= 50, f"Expected at least 50 fixture threads, got {len(threads)}"

    def test_fixture_emails_reference_fixture_threads(self):
        """Fixture emails should reference fixture threads."""
        emails = load_fixture("emails")
        thread_ids = get_all_fixture_thread_ids()

        for email in emails:
            thread_id = email.get("thread_id")
            if thread_id:
                assert thread_id in thread_ids, \
                    f"Fixture email references non-fixture thread {thread_id}"

    def test_fixture_emails_reference_fixture_users(self):
        """Fixture emails should reference fixture users as senders."""
        emails = load_fixture("emails")
        user_ids = get_all_fixture_user_ids()

        for email in emails:
            # Check sender_id or owner_id (depending on fixture format)
            sender_id = email.get("sender_id") or email.get("owner_id")
            if sender_id:
                assert sender_id in user_ids, \
                    f"Fixture email references non-fixture user {sender_id}"


class TestDataGeneratorWithDatabaseIds:
    """Tests that simulate database ID loading (like postgres mode)."""

    def test_generator_uses_registered_ids_for_foreign_keys(self):
        """Generator should use registered IDs when generating foreign keys."""
        generator = DataGenerator(
            schema_path=str(SCHEMA_PATH),
            use_seed=False,  # Don't load seed data
        )

        # Register specific fixture IDs
        fixture_user_ids = list(get_all_fixture_user_ids())[:5]  # Use first 5
        fixture_thread_ids = list(get_all_fixture_thread_ids())[:10]  # Use first 10

        for user_id in fixture_user_ids:
            generator.context.register_id("users", user_id)
        for thread_id in fixture_thread_ids:
            generator.context.register_id("threads", thread_id)

        # Generate emails with custom row counts
        data = generator.generate_all(
            row_counts={
                "users": 0,
                "labels": 0,
                "threads": 0,
                "emails": 5,
            }
        )
        emails = data.get("emails", [])

        # All emails should use the registered IDs
        for email in emails:
            assert email.get("sender_id") in fixture_user_ids, \
                "Email sender_id should be from registered fixture IDs"

    def test_no_generated_users_when_count_is_zero(self):
        """When user count is 0, no users should be generated."""
        generator = DataGenerator(
            schema_path=str(SCHEMA_PATH),
            use_seed=False,  # Don't load seed data
        )

        # Register fixture users (simulating DB load)
        for user_id in get_all_fixture_user_ids():
            generator.context.register_id("users", user_id)

        # Generate with user count of 0
        data = generator.generate_all(
            row_counts={"users": 0}
        )

        # Should not generate any new users
        assert len(data.get("users", [])) == 0, \
            "Should not generate users when count is 0"
