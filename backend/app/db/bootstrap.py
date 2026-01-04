"""Database schema and fixture initialization.

This module handles creating database tables and loading fixture data.
Separated from template.py to avoid circular imports with session.py.
"""

import json
import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from sqlalchemy.orm import sessionmaker

from app.db.session import engine
from app.db.base import Base
from app.models.user import User
from app.models.folder import Folder
from app.models.label import Label
from app.models.thread import Thread
from app.models.email import Email
from app.models.email_recipient import EmailRecipient
from app.models.email_label import EmailLabel
from app.models.attachment import Attachment
from app.models.email_template import EmailTemplate

logger = logging.getLogger(__name__)


# Define UUID fields for each model to enable automatic parsing
UUID_FIELDS = {
    'User': ['id'],
    'Folder': ['id', 'owner_id', 'parent_folder_id'],
    'Label': ['id', 'owner_id', 'parent_id'],
    'Thread': ['id', 'owner_id'],
    'Email': ['id', 'sender_id', 'thread_id', 'folder_id', 'parent_email_id'],
    'EmailRecipient': ['id', 'email_id', 'recipient_id'],
    'EmailLabel': ['id', 'email_id', 'label_id'],
    'Attachment': ['id', 'email_id'],
    'EmailTemplate': ['id', 'owner_id'],
}


def parse_uuid(value: Optional[str]) -> Optional[uuid.UUID]:
    """Parse a string UUID value, returning None for null/empty values."""
    if value is None or value == '':
        return None
    return uuid.UUID(value)


def load_fixture(session, model_class, fixture_file, date_fields=None, uuid_fields=None):
    """Generic fixture loader for any model.
    
    Args:
        session: Database session
        model_class: SQLAlchemy model class
        fixture_file: Path to JSON fixture file
        date_fields: List of field names that should be parsed as dates
        uuid_fields: List of field names that should be parsed as UUIDs
    """
    if not fixture_file.exists():
        return 0
    
    with open(fixture_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Get UUID fields for this model if not explicitly provided
    if uuid_fields is None:
        model_name = model_class.__name__
        uuid_fields = UUID_FIELDS.get(model_name, ['id'])
    
    # Parse UUIDs from fixture data for comparison
    fixture_ids = [parse_uuid(item['id']) for item in data]
    existing_ids = set(
        row[0] for row in session.query(model_class.id).filter(
            model_class.id.in_(fixture_ids)
        ).all()
    )
    
    new_items = []
    for item_data in data:
        # Parse UUID fields
        for field in uuid_fields:
            if field in item_data:
                item_data[field] = parse_uuid(item_data[field])
        
        # Skip if already exists
        if item_data['id'] in existing_ids:
            continue
        
        # Parse date fields if specified
        if date_fields:
            for field in date_fields:
                if field in item_data and item_data[field]:
                    try:
                        item_data[field] = datetime.fromisoformat(
                            item_data[field].replace('Z', '+00:00')
                        )
                    except (ValueError, AttributeError):
                        item_data[field] = None
        
        new_items.append(model_class(**item_data))
    
    if new_items:
        session.bulk_save_objects(new_items)
        session.commit()
    
    return len(new_items)


def initialize_template_database_schema_and_fixtures():
    """Initialize database schema and load fixture data on app startup.
    
    Drops all existing tables and recreates them with fresh fixtures
    to ensure schema is always up to date.
    """
    # Drop all existing tables first to ensure fresh schema
    logger.info("Dropping all existing tables for fresh schema...")
    Base.metadata.drop_all(bind=engine)
    logger.info("All tables dropped successfully")
    
    # Create all tables fresh
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully")
    
    # Load fixtures
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    
    fixtures_dir = Path(__file__).parent.parent.parent / "fixtures"
    
    try:
        # Load users first (other fixtures depend on them)
        count = load_fixture(session, User, fixtures_dir / "users.json")
        logger.info(f"Loaded {count} new users from fixtures")
        
        # Load folders (depends on users)
        count = load_fixture(session, Folder, fixtures_dir / "folders.json")
        logger.info(f"Loaded {count} new folders from fixtures")
        
        # Load labels (depends on users)
        count = load_fixture(session, Label, fixtures_dir / "labels.json")
        logger.info(f"Loaded {count} new labels from fixtures")
        
        # Load threads (depends on users)
        count = load_fixture(
            session, Thread,
            fixtures_dir / "threads.json",
            date_fields=['last_email_at']
        )
        logger.info(f"Loaded {count} new threads from fixtures")
        
        # Load emails (depends on users, folders, threads)
        count = load_fixture(
            session, Email,
            fixtures_dir / "emails.json",
            date_fields=['sent_at', 'received_at']
        )
        logger.info(f"Loaded {count} new emails from fixtures")
        
        # Load email recipients (depends on emails, users)
        count = load_fixture(
            session, EmailRecipient,
            fixtures_dir / "email_recipients.json"
        )
        logger.info(f"Loaded {count} new email recipients from fixtures")
        
        # Load email labels (depends on emails, labels)
        count = load_fixture(
            session, EmailLabel,
            fixtures_dir / "email_labels.json"
        )
        logger.info(f"Loaded {count} new email labels from fixtures")
        
        # Load attachments (depends on emails)
        count = load_fixture(
            session, Attachment,
            fixtures_dir / "attachments.json"
        )
        logger.info(f"Loaded {count} new attachments from fixtures")
        
        # Load email templates (depends on users)
        count = load_fixture(
            session, EmailTemplate,
            fixtures_dir / "email_templates.json"
        )
        logger.info(f"Loaded {count} new email templates from fixtures")
        
        # No need to reset sequences with UUIDs - they are generated automatically
        
    except Exception as e:
        logger.error(f"Error loading fixtures: {e}")
        session.rollback()
        raise
    finally:
        session.close()
