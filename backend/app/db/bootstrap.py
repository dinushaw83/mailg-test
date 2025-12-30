"""Database schema and fixture initialization.

This module handles creating database tables and loading fixture data.
Separated from template.py to avoid circular imports with session.py.
"""

import json
import logging
from datetime import datetime
from pathlib import Path

from sqlalchemy.orm import sessionmaker

from app.db.session import engine
from app.db.base import Base
from app.models.user import User
from app.models.item import Item

logger = logging.getLogger(__name__)


def initialize_template_database_schema_and_fixtures():
    """Initialize database schema and load fixture data on app startup."""
    # Create all tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully")
    
    # Load fixtures
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    
    fixtures_dir = Path(__file__).parent.parent.parent / "fixtures"
    
    try:
        # Load users - single query to get existing IDs
        users_file = fixtures_dir / "users.json"
        if users_file.exists():
            with open(users_file, 'r', encoding='utf-8') as f:
                users_data = json.load(f)
            
            fixture_ids = [u['id'] for u in users_data]
            existing_ids = set(
                row[0] for row in session.query(User.id).filter(User.id.in_(fixture_ids)).all()
            )
            
            new_users = []
            for user_data in users_data:
                if user_data['id'] in existing_ids:
                    continue
                
                if 'suspended_at' in user_data and user_data['suspended_at']:
                    try:
                        user_data['suspended_at'] = datetime.fromisoformat(
                            user_data['suspended_at'].replace('Z', '+00:00')
                        )
                    except (ValueError, AttributeError):
                        user_data['suspended_at'] = None
                
                new_users.append(User(**user_data))
            
            if new_users:
                session.bulk_save_objects(new_users)
                session.commit()
            logger.info(f"Loaded {len(new_users)} new users from fixtures")
        
        # Load items - single query to get existing IDs
        items_file = fixtures_dir / "items.json"
        if items_file.exists():
            with open(items_file, 'r', encoding='utf-8') as f:
                items_data = json.load(f)
            
            fixture_ids = [i['id'] for i in items_data]
            existing_ids = set(
                row[0] for row in session.query(Item.id).filter(Item.id.in_(fixture_ids)).all()
            )
            
            new_items = [Item(**item_data) for item_data in items_data if item_data['id'] not in existing_ids]
            
            if new_items:
                session.bulk_save_objects(new_items)
                session.commit()
            logger.info(f"Loaded {len(new_items)} new items from fixtures")
        
    except Exception as e:
        logger.error(f"Error loading fixtures: {e}")
        session.rollback()
        raise
    finally:
        session.close()

