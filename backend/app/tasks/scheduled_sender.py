"""Background task to process scheduled/queued emails.

This task periodically checks for emails in 'queued' status whose
scheduled_send_at time has passed and sends them (updates status to 'sent'
and delivers copies to recipients).

This is part of the Undo Send feature - emails can be queued with a delay
allowing users to cancel before they're actually sent.
"""

from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker, selectinload
from sqlalchemy.pool import NullPool

from app.core.config import DATABASE_URL, POSTGRES_ADMIN_DB, POSTGRES_RUN_DB_PREFIX
from app.core.constants import EmailStatus, FolderType
from app.models.email import Email
from app.utils.email_utils import deliver_email_to_recipients

logger = logging.getLogger(__name__)

# Configuration
_SCHEDULED_SENDER_STARTUP_DELAY_SECONDS = int(os.getenv("SCHEDULED_SENDER_STARTUP_DELAY_SECONDS", "5"))
_SCHEDULED_SENDER_INTERVAL_SECONDS = int(os.getenv("SCHEDULED_SENDER_INTERVAL_SECONDS", "5"))

# Advisory lock to ensure only one worker processes at a time
_SCHEDULED_SENDER_ADVISORY_LOCK_KEY = int(os.getenv("SCHEDULED_SENDER_ADVISORY_LOCK_KEY", "99887755"))


def _admin_engine():
    """Create an engine connected to the admin database."""
    url = make_url(DATABASE_URL).set(database=POSTGRES_ADMIN_DB)
    return create_engine(url, isolation_level="AUTOCOMMIT", pool_pre_ping=True, poolclass=NullPool)


def _get_active_run_databases() -> list[str]:
    """Get list of all active run database names."""
    engine = _admin_engine()
    try:
        with engine.connect() as conn:
            result = conn.execute(
                text(
                    """
                    SELECT datname FROM pg_database
                    WHERE datname LIKE :prefix
                    AND datistemplate = false
                    """
                ),
                {"prefix": f"{POSTGRES_RUN_DB_PREFIX}%"},
            )
            return [row[0] for row in result.fetchall()]
    finally:
        engine.dispose()


def process_scheduled_emails_for_database(db_name: str) -> int:
    """Process all due scheduled emails in a specific run database.
    
    Args:
        db_name: The database name to process.
        
    Returns:
        Number of emails sent.
    """
    url = make_url(DATABASE_URL).set(database=db_name)
    engine = create_engine(url, pool_pre_ping=True, poolclass=NullPool)
    SessionLocal = sessionmaker(bind=engine)
    
    sent_count = 0
    
    try:
        db = SessionLocal()
        try:
            # Find all queued emails whose scheduled_send_at has passed
            now = datetime.utcnow()
            queued_emails = db.query(Email).options(
                selectinload(Email.recipients),
            ).filter(
                Email.status == EmailStatus.QUEUED.value,
                Email.scheduled_send_at <= now
            ).all()
            
            for email in queued_emails:
                try:
                    # Update email status to sent
                    email.status = EmailStatus.SENT.value
                    email.sent_at = datetime.utcnow()
                    email.scheduled_send_at = None
                    
                    # Deliver to recipients (uses shared function from email_utils)
                    deliver_email_to_recipients(db, email, email.sender_id)
                    
                    db.commit()
                    sent_count += 1
                    logger.info(f"Scheduled email {email.id} sent in database {db_name}")
                    
                except Exception as e:
                    db.rollback()
                    logger.error(f"Failed to send scheduled email {email.id} in {db_name}: {e}")
                    
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Failed to connect to database {db_name}: {e}")
    finally:
        engine.dispose()
    
    return sent_count


def process_all_scheduled_emails_sync() -> int:
    """Process scheduled emails across all run databases.
    
    Returns:
        Total number of emails sent.
    """
    admin_engine = _admin_engine()
    total_sent = 0
    
    try:
        # Try to acquire advisory lock - only one worker should process at a time
        with admin_engine.connect() as conn:
            lock_result = conn.execute(
                text("SELECT pg_try_advisory_lock(:key)"),
                {"key": _SCHEDULED_SENDER_ADVISORY_LOCK_KEY},
            ).scalar()
            
            if not lock_result:
                # Another worker is already processing
                return 0
            
            try:
                # Get all active run databases
                db_names = _get_active_run_databases()
                
                for db_name in db_names:
                    try:
                        sent = process_scheduled_emails_for_database(db_name)
                        total_sent += sent
                    except Exception as e:
                        logger.error(f"Error processing database {db_name}: {e}")
                        
            finally:
                # Release the advisory lock
                conn.execute(
                    text("SELECT pg_advisory_unlock(:key)"),
                    {"key": _SCHEDULED_SENDER_ADVISORY_LOCK_KEY},
                )
                
    except Exception as e:
        logger.error(f"Scheduled sender task failed: {e}", exc_info=True)
    finally:
        admin_engine.dispose()
    
    return total_sent


async def process_scheduled_emails() -> None:
    """Background task to periodically process scheduled/queued emails."""
    if _SCHEDULED_SENDER_STARTUP_DELAY_SECONDS > 0:
        await asyncio.sleep(_SCHEDULED_SENDER_STARTUP_DELAY_SECONDS)
    
    logger.info("Scheduled email sender task started")
    
    while True:
        try:
            sent = process_all_scheduled_emails_sync()
            if sent:
                logger.info(f"Scheduled sender processed {sent} email(s)")
        except Exception as e:
            logger.error(f"Scheduled sender task error: {e}", exc_info=True)
        
        await asyncio.sleep(max(1, _SCHEDULED_SENDER_INTERVAL_SECONDS))

