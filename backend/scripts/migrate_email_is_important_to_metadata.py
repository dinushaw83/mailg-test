"""
Script to migrate is_important from emails.json to thread_user_metadata.json.

Since is_important is now tracked at the thread level per user,
this script:
1. Reads emails.json
2. For each email with is_important=True, creates thread_user_metadata entries
3. Creates thread_user_metadata.json with the metadata records
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

    # Load emails
    emails_file = fixtures_dir / "emails.json"
    with open(emails_file, 'r', encoding='utf-8') as f:
        emails = json.load(f)

    print(f"Loaded {len(emails)} emails")

    # Load email_recipients to know who received each email
    email_recipients_file = fixtures_dir / "email_recipients.json"
    with open(email_recipients_file, 'r', encoding='utf-8') as f:
        email_recipients = json.load(f)

    print(f"Loaded {len(email_recipients)} email recipients")

    # Build email_id -> recipients mapping
    email_to_recipients = {}
    for er in email_recipients:
        email_id = er['email_id']
        recipient_id = er.get('recipient_id')
        if recipient_id:
            if email_id not in email_to_recipients:
                email_to_recipients[email_id] = []
            email_to_recipients[email_id].append(recipient_id)

    # Create thread_user_metadata records
    seen_pairs = set()  # (thread_id, user_id) pairs to avoid duplicates
    metadata_records = []

    for email in emails:
        email_id = email['id']
        thread_id = email.get('thread_id')
        sender_id = email.get('sender_id')
        is_important = email.get('is_important', False)

        if not is_important or not thread_id:
            continue

        # Add metadata for sender
        if sender_id:
            pair = (thread_id, sender_id)
            if pair not in seen_pairs:
                seen_pairs.add(pair)
                metadata_records.append({
                    "id": str(uuid.uuid4()),
                    "thread_id": thread_id,
                    "user_id": sender_id,
                    "is_important": True,
                    "created_at": email.get('created_at', datetime.utcnow().isoformat()),
                    "updated_at": email.get('updated_at', datetime.utcnow().isoformat())
                })

        # Add metadata for recipients
        recipients = email_to_recipients.get(email_id, [])
        for recipient_id in recipients:
            pair = (thread_id, recipient_id)
            if pair not in seen_pairs:
                seen_pairs.add(pair)
                metadata_records.append({
                    "id": str(uuid.uuid4()),
                    "thread_id": thread_id,
                    "user_id": recipient_id,
                    "is_important": True,
                    "created_at": email.get('created_at', datetime.utcnow().isoformat()),
                    "updated_at": email.get('updated_at', datetime.utcnow().isoformat())
                })

    print(f"Created {len(metadata_records)} thread_user_metadata records")

    # Write thread_user_metadata.json
    output_file = fixtures_dir / "thread_user_metadata.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(metadata_records, f, indent=2)

    print(f"Written to {output_file}")

    # Remove is_important from emails.json
    for email in emails:
        if 'is_important' in email:
            del email['is_important']

    # Write updated emails.json
    with open(emails_file, 'w', encoding='utf-8') as f:
        json.dump(emails, f, indent=2)

    print(f"Removed is_important from {emails_file}")


if __name__ == "__main__":
    main()
