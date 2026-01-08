"""
Script to migrate email_labels.json to thread_labels.json.

Since labels are now linked to threads instead of emails, this script:
1. Reads email_labels.json and emails.json
2. Maps each email_id to its thread_id
3. Creates thread_labels.json with deduplicated thread-label pairs
"""

import json
import uuid
import sys
from pathlib import Path
from datetime import datetime

# Set UTF-8 encoding for Windows compatibility
if sys.platform == "win32":
    import codecs
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())
    sys.stderr = codecs.getwriter("utf-8")(sys.stderr.detach())


def main():
    fixtures_dir = Path(__file__).parent.parent / "fixtures"
    
    # Load emails to get email_id -> thread_id mapping
    emails_file = fixtures_dir / "emails.json"
    with open(emails_file, 'r', encoding='utf-8') as f:
        emails = json.load(f)
    
    email_to_thread = {}
    for email in emails:
        email_id = email['id']
        thread_id = email.get('thread_id')
        if thread_id:
            email_to_thread[email_id] = thread_id
    
    print(f"Loaded {len(emails)} emails, {len(email_to_thread)} have thread_ids")
    
    # Load email_labels
    email_labels_file = fixtures_dir / "email_labels.json"
    with open(email_labels_file, 'r', encoding='utf-8') as f:
        email_labels = json.load(f)
    
    print(f"Loaded {len(email_labels)} email_labels")
    
    # Convert to thread_labels (deduplicate by thread_id + label_id)
    seen_pairs = set()
    thread_labels = []
    skipped = 0
    
    for el in email_labels:
        email_id = el['email_id']
        label_id = el['label_id']
        
        thread_id = email_to_thread.get(email_id)
        if not thread_id:
            skipped += 1
            continue
        
        pair = (thread_id, label_id)
        if pair in seen_pairs:
            continue
        
        seen_pairs.add(pair)
        thread_labels.append({
            "id": str(uuid.uuid4()),
            "thread_id": thread_id,
            "label_id": label_id,
            "created_at": el['created_at']
        })
    
    print(f"Created {len(thread_labels)} thread_labels (skipped {skipped} without thread_id)")
    
    # Write thread_labels.json
    thread_labels_file = fixtures_dir / "thread_labels.json"
    with open(thread_labels_file, 'w', encoding='utf-8') as f:
        json.dump(thread_labels, f, indent=2)
    
    print(f"Written to {thread_labels_file}")


if __name__ == "__main__":
    main()
