#!/usr/bin/env python3
"""
Reset PostgreSQL sequences for all tables.

Run this script if you encounter "duplicate key value violates unique constraint"
errors after loading seed data.

Usage:
    python scripts/reset_sequences.py
"""

import sys
from pathlib import Path

# Add backend directory to path
SCRIPT_DIR = Path(__file__).parent.resolve()
BACKEND_DIR = SCRIPT_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import _get_seed_engine


def reset_sequences():
    """Reset PostgreSQL sequences to continue from the highest existing ID."""
    print("=" * 60)
    print("PostgreSQL Sequence Reset Utility")
    print("=" * 60)

    print("\nConnecting to Postgres template database...")
    engine = _get_seed_engine()

    print("Resetting sequences...")
    db = Session(bind=engine)

    # Only include tables that have an 'id' column with a sequence
    # Exclude junction tables like ticket_labels, team_members, project_members
    # that don't have their own id column
    tables_with_id = [
        'organizations',
        'users',
        'teams',
        'projects',
        'boards',
        'board_columns',
        'sprints',
        'tickets',
        'statuses',
        'epics',
        'comments',
        'worklogs',
        'labels',
        'attachments',
        'web_links',
        'linked_work_items',
        'child_work_items',
        'forms',
        'form_submissions',
        'ticket_votes',
    ]

    reset_count = 0
    for table in tables_with_id:
        try:
            # Get the sequence name (PostgreSQL default: tablename_id_seq)
            sequence_name = f"{table}_id_seq"

            # Check if sequence exists first
            seq_exists = db.execute(text(f"""
                SELECT EXISTS (
                    SELECT 1 FROM pg_sequences
                    WHERE schemaname = 'public' AND sequencename = '{sequence_name}'
                )
            """)).scalar()

            if not seq_exists:
                print(f"  ⏭️  Skipping {sequence_name} (does not exist)")
                continue

            # Get the max ID from the table
            max_id = db.execute(text(f"SELECT MAX(id) FROM {table}")).scalar()

            if max_id is None:
                # Empty table - set sequence so next value is 1
                db.execute(text(f"SELECT setval('{sequence_name}', 1, false)"))
                print(f"  ✅ Reset {sequence_name} to start at 1 (empty table)")
            else:
                # Has data - set sequence so next value is max_id + 1
                db.execute(text(f"SELECT setval('{sequence_name}', {max_id}, true)"))
                print(f"  ✅ Reset {sequence_name} to {max_id} (next: {max_id + 1})")

            reset_count += 1
        except Exception as e:
            # Rollback this specific error and continue with next table
            db.rollback()
            print(f"  ⚠️  Could not reset {table}: {str(e)[:80]}")
            continue

    try:
        db.commit()
        print(f"\n  ✅ Successfully reset {reset_count} sequences")
    except Exception as e:
        db.rollback()
        print(f"  ⚠️  Error committing sequence resets: {e}")
    finally:
        db.close()
        engine.dispose()

    print("-" * 60)
    print(f"\n✅ Successfully reset {reset_count} sequences!")
    print("=" * 60)


if __name__ == "__main__":
    try:
        reset_sequences()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
