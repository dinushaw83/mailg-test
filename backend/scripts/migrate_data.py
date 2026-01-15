"""
Migrate seed data from JSON fixtures to PostgreSQL database.
"""

import sys
import json
from pathlib import Path
from datetime import datetime

# Get the script's directory and find project root
SCRIPT_DIR = Path(__file__).parent.resolve()
BACKEND_DIR = SCRIPT_DIR.parent
PROJECT_ROOT = BACKEND_DIR.parent

# Add backend directory to path
sys.path.insert(0, str(BACKEND_DIR))

from app.db.session import _get_seed_engine
from app.db.base import Base
from app.models import (
    User,
    Email,
    EmailRecipient,
    Label,
    ThreadLabel,
    Attachment,
    Thread,
    SavedSearch,
    EmailTemplate,
)
from sqlalchemy import text
from sqlalchemy.orm import Session

# Find fixtures directory
FIXTURES_DIR = BACKEND_DIR / "fixtures"


def parse_datetime(dt_str):
    """Parse datetime string to datetime object"""
    if not dt_str:
        return None
    try:
        if dt_str.endswith("Z"):
            dt_str = dt_str[:-1] + "+00:00"
        return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
    except:
        return None


def migrate_schema(db: Session):
    """Migrate database schema - ensure all tables exist"""
    print("Checking database schema...")
    try:
        engine = _get_seed_engine()
        Base.metadata.create_all(bind=engine)
        print("  ✅ All tables created/verified.")
    except Exception as e:
        db.rollback()
        print(f"  ⚠️  Schema migration warning: {e}")


def migrate_users(db: Session):
    """Migrate users from fixtures"""
    print("Migrating users...")
    fixture_file = FIXTURES_DIR / "users.json"

    if not fixture_file.exists():
        print(f"  ⚠️  Fixture file not found: {fixture_file}")
        return

    with open(fixture_file) as f:
        users_data = json.load(f)

    for user_data in users_data:
        user = User(
            id=user_data["id"],
            first_name=user_data.get("first_name", ""),
            last_name=user_data.get("last_name", ""),
            email=user_data["email"],
            email_label=user_data.get("email_label", "Home"),
            role=user_data.get("role", "user"),
            photo=user_data.get("photo"),
            company=user_data.get("company"),
            job_title=user_data.get("job_title"),
            phone=user_data.get("phone"),
            phone_country_code=user_data.get("phone_country_code"),
            phone_label=user_data.get("phone_label", "Mobile"),
            address=user_data.get("address"),
            birthday_month=user_data.get("birthday_month"),
            birthday_day=user_data.get("birthday_day"),
            birthday_year=user_data.get("birthday_year"),
            significant_dates=user_data.get("significant_dates", []),
            website=user_data.get("website"),
            related_persons=user_data.get("related_persons", []),
            labels=user_data.get("labels", []),
            custom_fields=user_data.get("custom_fields", []),
            notes=user_data.get("notes"),
            undo_send_delay_seconds=user_data.get("undo_send_delay_seconds", 10),
            active=user_data.get("active", True),
            created_at=parse_datetime(user_data.get("created_at")),
            updated_at=parse_datetime(user_data.get("updated_at")),
        )
        db.merge(user)
    db.commit()
    print(f"  ✅ Migrated {len(users_data)} users")


def migrate_labels(db: Session):
    """Migrate labels from fixtures"""
    print("Migrating labels...")
    fixture_file = FIXTURES_DIR / "labels.json"

    if not fixture_file.exists():
        print(f"  ⚠️  Fixture file not found: {fixture_file}")
        return

    with open(fixture_file) as f:
        labels_data = json.load(f)

    for label_data in labels_data:
        label = Label(
            id=label_data["id"],
            name=label_data["name"],
            color=label_data.get("color"),
            owner_id=label_data["owner_id"],
            parent_id=label_data.get("parent_id"),
            is_system=label_data.get("is_system", False),
            is_exclusive=label_data.get("is_exclusive", False),
            show_in_label_list=label_data.get("show_in_label_list", True),
            show_in_message_list=label_data.get("show_in_message_list", True),
            show_if_unread=label_data.get("show_if_unread", False),
            created_at=parse_datetime(label_data.get("created_at")),
            updated_at=parse_datetime(label_data.get("updated_at")),
        )
        db.merge(label)
    db.commit()
    print(f"  ✅ Migrated {len(labels_data)} labels")


def migrate_threads(db: Session):
    """Migrate threads from fixtures"""
    print("Migrating threads...")
    fixture_file = FIXTURES_DIR / "threads.json"

    if not fixture_file.exists():
        print(f"  ⚠️  Fixture file not found: {fixture_file}")
        return

    with open(fixture_file) as f:
        threads_data = json.load(f)

    for thread_data in threads_data:
        thread = Thread(
            id=thread_data["id"],
            owner_id=thread_data["owner_id"],
            subject=thread_data.get("subject", ""),
            participant_count=thread_data.get("participant_count", 1),
            email_count=thread_data.get("email_count", 0),
            last_email_at=parse_datetime(thread_data.get("last_email_at")),
            created_at=parse_datetime(thread_data.get("created_at")),
            updated_at=parse_datetime(thread_data.get("updated_at")),
        )
        db.merge(thread)
    db.commit()
    print(f"  ✅ Migrated {len(threads_data)} threads")


def migrate_emails(db: Session):
    """Migrate emails from fixtures"""
    print("Migrating emails...")
    fixture_file = FIXTURES_DIR / "emails.json"

    if not fixture_file.exists():
        print(f"  ⚠️  Fixture file not found: {fixture_file}")
        return

    with open(fixture_file) as f:
        emails_data = json.load(f)

    for email_data in emails_data:
        email = Email(
            id=email_data["id"],
            thread_id=email_data.get("thread_id"),
            sender_id=email_data.get("sender_id") or email_data.get("owner_id"),
            subject=email_data.get("subject", ""),
            body=email_data.get("body"),
            html_body=email_data.get("html_body"),
            status=email_data.get("status", "draft"),
            folder=email_data.get("folder", "inbox"),
            is_read=email_data.get("is_read", False),
            is_starred=email_data.get("is_starred", False),
            # snooze_until=parse_datetime(email_data.get("snooze_until")),
            scheduled_send_at=parse_datetime(email_data.get("scheduled_send_at")),
            parent_email_id=email_data.get("parent_email_id"),
            sent_at=parse_datetime(email_data.get("sent_at")),
            received_at=parse_datetime(email_data.get("received_at")),
            created_at=parse_datetime(email_data.get("created_at")),
            updated_at=parse_datetime(email_data.get("updated_at")),
        )
        db.merge(email)
    db.commit()
    print(f"  ✅ Migrated {len(emails_data)} emails")


def migrate_email_recipients(db: Session):
    """Migrate email recipients from fixtures"""
    print("Migrating email recipients...")
    fixture_file = FIXTURES_DIR / "email_recipients.json"

    if not fixture_file.exists():
        print(f"  ⚠️  Fixture file not found: {fixture_file}")
        return

    with open(fixture_file) as f:
        recipients_data = json.load(f)

    for recipient_data in recipients_data:
        recipient = EmailRecipient(
            id=recipient_data["id"],
            email_id=recipient_data["email_id"],
            recipient_id=recipient_data.get("recipient_id") or recipient_data.get("user_id"),
            recipient_type=recipient_data.get("recipient_type", "to"),
            recipient_email=recipient_data.get("recipient_email") or recipient_data.get("email_address", ""),
            recipient_name=recipient_data.get("recipient_name") or recipient_data.get("display_name"),
        )
        db.merge(recipient)
    db.commit()
    print(f"  ✅ Migrated {len(recipients_data)} email recipients")


def migrate_thread_labels(db: Session):
    """Migrate thread labels from fixtures"""
    print("Migrating thread labels...")
    fixture_file = FIXTURES_DIR / "thread_labels.json"

    if not fixture_file.exists():
        print(f"  ⚠️  Fixture file not found: {fixture_file}")
        return

    with open(fixture_file) as f:
        thread_labels_data = json.load(f)

    for tl_data in thread_labels_data:
        thread_label = ThreadLabel(
            id=tl_data["id"],
            thread_id=tl_data["thread_id"],
            label_id=tl_data["label_id"],
            user_id=tl_data["user_id"],
        )
        db.merge(thread_label)
    db.commit()
    print(f"  ✅ Migrated {len(thread_labels_data)} thread labels")


def migrate_attachments(db: Session):
    """Migrate attachments from fixtures"""
    print("Migrating attachments...")
    fixture_file = FIXTURES_DIR / "attachments.json"

    if not fixture_file.exists():
        print(f"  ⚠️  Fixture file not found: {fixture_file}")
        return

    with open(fixture_file) as f:
        attachments_data = json.load(f)

    for attachment_data in attachments_data:
        attachment = Attachment(
            id=attachment_data["id"],
            email_id=attachment_data["email_id"],
            filename=attachment_data["filename"],
            content_type=attachment_data.get("content_type"),
            size_bytes=attachment_data.get("size_bytes") or attachment_data.get("size"),
            storage_path=attachment_data.get("storage_path"),
            attachment_type=attachment_data.get("attachment_type", "file"),
            created_at=parse_datetime(attachment_data.get("created_at")),
        )
        db.merge(attachment)
    db.commit()
    print(f"  ✅ Migrated {len(attachments_data)} attachments")


def migrate_saved_searches(db: Session):
    """Migrate saved searches from fixtures"""
    print("Migrating saved searches...")
    fixture_file = FIXTURES_DIR / "saved_searches.json"

    if not fixture_file.exists():
        print(f"  ⚠️  Fixture file not found: {fixture_file}")
        return

    with open(fixture_file) as f:
        searches_data = json.load(f)

    for search_data in searches_data:
        saved_search = SavedSearch(
            id=search_data["id"],
            owner_id=search_data.get("owner_id") or search_data.get("user_id"),
            name=search_data["name"],
            query=search_data["query"],
            filters=search_data.get("filters"),
            use_count=search_data.get("use_count", 0),
            last_used_at=parse_datetime(search_data.get("last_used_at")),
            created_at=parse_datetime(search_data.get("created_at")),
            updated_at=parse_datetime(search_data.get("updated_at")),
        )
        db.merge(saved_search)
    db.commit()
    print(f"  ✅ Migrated {len(searches_data)} saved searches")


def migrate_email_templates(db: Session):
    """Migrate email templates from fixtures"""
    print("Migrating email templates...")
    fixture_file = FIXTURES_DIR / "email_templates.json"

    if not fixture_file.exists():
        print(f"  ⚠️  Fixture file not found: {fixture_file}")
        return

    with open(fixture_file) as f:
        templates_data = json.load(f)

    for template_data in templates_data:
        template = EmailTemplate(
            id=template_data["id"],
            owner_id=template_data.get("owner_id") or template_data.get("user_id"),
            name=template_data["name"],
            # description=template_data.get("description"),
            # subject=template_data.get("subject"),
            body=template_data.get("body"),
            html_body=template_data.get("html_body"),
            is_shared=template_data.get("is_shared", False),
            created_at=parse_datetime(template_data.get("created_at")),
            updated_at=parse_datetime(template_data.get("updated_at")),
        )
        db.merge(template)
    db.commit()
    print(f"  ✅ Migrated {len(templates_data)} email templates")


def main():
    """Main migration function"""
    print("=" * 60)
    print("Mailg Backend - Data Migration (PostgreSQL)")
    print("=" * 60)

    print("\nConnecting to Postgres template database...")
    engine = _get_seed_engine()

    print("Ensuring database tables exist...")
    Base.metadata.create_all(bind=engine)
    print("  ✅ All tables verified/created")

    db = Session(bind=engine)
    try:
        migrate_schema(db)

        print("\nStarting data migration from fixtures...")
        print("-" * 60)

        # Migrate in order of dependencies
        migrate_users(db)
        migrate_labels(db)
        migrate_threads(db)
        migrate_emails(db)
        migrate_email_recipients(db)
        migrate_thread_labels(db)
        migrate_attachments(db)
        migrate_saved_searches(db)
        migrate_email_templates(db)

        print("-" * 60)
        print("\n✅ Migration completed successfully!")
        print("=" * 60)
    except Exception as e:
        print(f"\n❌ Error during migration: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise
    finally:
        db.close()
        engine.dispose()


if __name__ == "__main__":
    main()
