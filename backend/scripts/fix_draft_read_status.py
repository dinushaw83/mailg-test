#!/usr/bin/env python3
"""Fix is_read status for emails in threads where user has drafts.

Logic: If a user has a draft email in a thread, they must have opened/read
the thread to compose that draft. Therefore, all received emails in that
thread should be marked as is_read=true for that user.
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
    
    # Load data
    emails_path = fixtures_dir / "emails.json"
    recipients_path = fixtures_dir / "email_recipients.json"
    
    print(f"Loading emails from {emails_path}")
    with open(emails_path, "r", encoding="utf-8") as f:
        emails = json.load(f)
    
    print(f"Loading recipients from {recipients_path}")
    with open(recipients_path, "r", encoding="utf-8") as f:
        recipients = json.load(f)
    
    print(f"Loaded {len(emails)} emails and {len(recipients)} recipients")
    
    # Build recipient lookup: email_id -> set of recipient_ids
    email_recipients_map = {}
    for r in recipients:
        email_id = r["email_id"]
        recipient_id = r.get("recipient_id")
        if recipient_id:
            if email_id not in email_recipients_map:
                email_recipients_map[email_id] = set()
            email_recipients_map[email_id].add(recipient_id)
    
    # Find all drafts and their thread_id + sender_id (user who created the draft)
    drafts = [e for e in emails if e["status"] == "draft"]
    print(f"Found {len(drafts)} draft emails")
    
    # Build set of (thread_id, user_id) pairs where user has a draft
    threads_with_user_drafts = set()
    for draft in drafts:
        thread_id = draft.get("thread_id")
        sender_id = draft.get("sender_id")
        if thread_id and sender_id:
            threads_with_user_drafts.add((thread_id, sender_id))
    
    print(f"Found {len(threads_with_user_drafts)} unique (thread, user) pairs with drafts")
    
    # Build email lookup by id for quick access
    email_by_id = {e["id"]: e for e in emails}
    
    # Find emails to update:
    # For each (thread_id, user_id) with a draft, find emails where:
    # - Same thread_id
    # - User is a recipient (user_id in email's recipients)
    # - is_read is currently false
    updated_count = 0
    
    for email in emails:
        thread_id = email.get("thread_id")
        email_id = email["id"]
        
        if not thread_id:
            continue
        
        # Skip drafts themselves (they're already read)
        if email["status"] == "draft":
            continue
        
        # Check if this email's recipients include any user who has a draft in this thread
        email_recipient_ids = email_recipients_map.get(email_id, set())
        
        for recipient_id in email_recipient_ids:
            if (thread_id, recipient_id) in threads_with_user_drafts:
                # This recipient has a draft in this thread, so they must have read this email
                if not email["is_read"]:
                    email["is_read"] = True
                    updated_count += 1
                    print(f"  Updated email {email_id[:8]}... in thread {thread_id[:8]}... for user {recipient_id[:8]}...")
                break
    
    print(f"\nUpdated {updated_count} emails to is_read=true")
    
    # Save updated emails
    if updated_count > 0:
        print(f"Saving updated emails to {emails_path}")
        with open(emails_path, "w", encoding="utf-8") as f:
            json.dump(emails, f, indent=2, ensure_ascii=False)
        print("Done!")
    else:
        print("No updates needed.")


if __name__ == "__main__":
    main()
