"""Database schema and fixture initialization.

This module handles creating database tables and loading fixture data.
Separated from template.py to avoid circular imports with session.py.
"""

import json
import logging
from datetime import datetime
from pathlib import Path

from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

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


def reset_sequences(session):
    """Reset all PostgreSQL sequences to max ID values after fixture loading.
    
    When fixtures with explicit IDs are loaded, PostgreSQL sequences don't
    automatically update. This causes IntegrityError on subsequent inserts.
    
    This function auto-discovers all sequences from PostgreSQL system catalogs,
    so no manual updates are needed when adding new tables.
    """
    try:
        # Auto-discover all sequences and their associated tables from PostgreSQL
        # This query finds sequences tied to table columns (typically 'id' columns)
        result = session.execute(text("""
            SELECT 
                t.relname AS table_name,
                s.relname AS sequence_name,
                a.attname AS column_name
            FROM pg_class s
            JOIN pg_depend d ON d.objid = s.oid
            JOIN pg_class t ON d.refobjid = t.oid
            JOIN pg_attribute a ON (a.attrelid = t.oid AND a.attnum = d.refobjsubid)
            WHERE s.relkind = 'S'  -- 'S' = sequence
              AND t.relkind = 'r'  -- 'r' = ordinary table
            ORDER BY t.relname
        """))
        
        sequences = result.fetchall()
        reset_count = 0
        
        for table_name, seq_name, col_name in sequences:
            try:
                # Get the max value from the column
                max_result = session.execute(
                    text(f'SELECT COALESCE(MAX("{col_name}"), 0) FROM "{table_name}"')
                )
                max_id = max_result.scalar()
                
                # Only reset if there's data in the table
                if max_id and max_id > 0:
                    session.execute(
                        text(f"SELECT setval('{seq_name}', {max_id})")
                    )
                    logger.debug(f"Reset sequence {seq_name} to {max_id} for {table_name}.{col_name}")
                    reset_count += 1
            except Exception as e:
                logger.warning(f"Could not reset sequence {seq_name} for {table_name}: {e}")
        
        session.commit()
        logger.info(f"PostgreSQL sequences reset: {reset_count} sequences updated")
        
    except Exception as e:
        logger.error(f"Failed to auto-discover sequences: {e}")
        session.rollback()


def load_fixture(session, model_class, fixture_file, date_fields=None):
    """Generic fixture loader for any model.
    
    Args:
        session: Database session
        model_class: SQLAlchemy model class
        fixture_file: Path to JSON fixture file
        date_fields: List of field names that should be parsed as dates
    """
    if not fixture_file.exists():
        return 0
    
    with open(fixture_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    fixture_ids = [item['id'] for item in data]
    existing_ids = set(
        row[0] for row in session.query(model_class.id).filter(
            model_class.id.in_(fixture_ids)
        ).all()
    )
    
    new_items = []
    for item_data in data:
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
            fixtures_dir / "email_templates.json",
            date_fields=['last_used_at']
        )
        logger.info(f"Loaded {count} new email templates from fixtures")
        
        # Reset PostgreSQL sequences to avoid ID conflicts on new inserts
        reset_sequences(session)
        
    except Exception as e:
        logger.error(f"Error loading fixtures: {e}")
        session.rollback()
        raise
    finally:
        session.close()
