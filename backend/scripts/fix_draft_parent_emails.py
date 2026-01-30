#!/usr/bin/env python3
"""Fix parent_email_id references that point to draft emails.

Logic: Draft emails should not be used as parent_email_id because:
- Drafts are unsent and may be edited or deleted at any time
- Only finalized (sent/received) emails should be valid parents for replies/forwards

This script finds any emails where parent_email_id references a draft email
and sets those parent_email_id values to null.
"""

import json
import sys
from pathlib import Path

# Set UTF-8 encoding for Windows compatibility
if sys.platform == "win32":
    import codecs
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())
    sys.stderr = codecs.getwriter("utf-8")(sys.stderr.detach())


def main():
    fixtures_dir = Path(__file__).parent.parent / "fixtures"
    emails_path = fixtures_dir / "emails.json"
    
    print(f"Loading emails from {emails_path}")
    with open(emails_path, "r", encoding="utf-8") as f:
        emails = json.load(f)
    
    print(f"Loaded {len(emails)} emails")
    
    # Collect all draft email IDs
    draft_ids = {e["id"] for e in emails if e["status"] == "draft"}
    print(f"Found {len(draft_ids)} draft emails")
    
    # Find emails where parent_email_id references a draft
    updated_count = 0
    for email in emails:
        parent_id = email.get("parent_email_id")
        if parent_id and parent_id in draft_ids:
            print(f"  Found email {email['id'][:8]}... with parent_email_id pointing to draft {parent_id[:8]}...")
            email["parent_email_id"] = None
            updated_count += 1
    
    print(f"\nFound {updated_count} emails with parent_email_id referencing drafts")
    
    # Save updated emails
    if updated_count > 0:
        print(f"Saving updated emails to {emails_path}")
        with open(emails_path, "w", encoding="utf-8") as f:
            json.dump(emails, f, indent=2, ensure_ascii=False)
        print("Done!")
    else:
        print("No issues found - no updates needed.")


if __name__ == "__main__":
    main()
