"""
Script to add Inbox, Sent, All Mail, and Starred labels to threads so they appear correctly.

This script ensures that:
1. Threads where user is a recipient have the "Inbox" system label (for inbox Primary tab)
2. Threads where user is a sender have the "Sent" system label (for Sent folder)
3. ALL visible threads have the "All Mail" system label (for All Mail view)
4. Threads with starred emails have the "Starred" system label for users who can see them
5. Removes orphaned thread_labels for users who can no longer see the thread

Usage:
    python -m scripts.add_inbox_labels [--dry-run]
"""

import json
import sys
import uuid
from collections import defaultdict
from datetime import datetime
from pathlib import Path

# Set UTF-8 encoding for Windows compatibility
if sys.platform == "win32":
    import codecs
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())
    sys.stderr = codecs.getwriter("utf-8")(sys.stderr.detach())

# Paths to fixture files
FIXTURES_DIR = Path(__file__).parent.parent / "fixtures"
THREADS_FILE = FIXTURES_DIR / "threads.json"
EMAILS_FILE = FIXTURES_DIR / "emails.json"
RECIPIENTS_FILE = FIXTURES_DIR / "email_recipients.json"
USERS_FILE = FIXTURES_DIR / "users.json"
LABELS_FILE = FIXTURES_DIR / "labels.json"
THREAD_LABELS_FILE = FIXTURES_DIR / "thread_labels.json"


def load_json(filepath: Path) -> list:
    """Load JSON data from a file."""
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(filepath: Path, data: list) -> None:
    """Save JSON data to a file with proper formatting."""
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


def generate_uuid() -> str:
    """Generate a new UUID."""
    return str(uuid.uuid4())


def generate_timestamp() -> str:
    """Generate an ISO format timestamp."""
    return datetime.now().strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def group_recipients_by_email(recipients: list) -> dict:
    """Group recipients by email_id."""
    by_email = defaultdict(list)
    for r in recipients:
        by_email[r["email_id"]].append(r)
    return by_email


def get_user_system_labels(user_id: str, labels: list) -> dict:
    """Get system labels for a user, keyed by name."""
    user_labels = {}
    for label in labels:
        if label.get("owner_id") == user_id and label.get("is_system"):
            user_labels[label["name"]] = label
    return user_labels


def get_user_thread_labels(user_id: str, thread_labels: list) -> dict:
    """Get thread labels for a user, keyed by (thread_id, label_id)."""
    user_tls = {}
    for tl in thread_labels:
        if tl["user_id"] == user_id:
            key = (tl["thread_id"], tl["label_id"])
            user_tls[key] = tl
    return user_tls


def get_threads_visible_to_user(
    user_id: str,
    emails: list,
    recipients_by_email: dict
) -> dict:
    """
    Get threads visible to a user.
    
    Returns dict: thread_id -> {"as_sender": bool, "as_recipient": bool}
    """
    visible_threads = defaultdict(lambda: {"as_sender": False, "as_recipient": False})
    
    for email in emails:
        thread_id = email.get("thread_id")
        if not thread_id:
            continue
        
        # Check if user is sender
        if email["sender_id"] == user_id:
            visible_threads[thread_id]["as_sender"] = True
        
        # Check if user is recipient
        for r in recipients_by_email.get(email["id"], []):
            if r["recipient_id"] == user_id:
                visible_threads[thread_id]["as_recipient"] = True
                break
    
    return dict(visible_threads)


def create_thread_label(thread_id: str, label_id: str, user_id: str) -> dict:
    """Create a new thread_label record."""
    return {
        "id": generate_uuid(),
        "thread_id": thread_id,
        "label_id": label_id,
        "user_id": user_id,
        "created_at": generate_timestamp()
    }


def add_inbox_labels_for_users(
    users: list,
    emails: list,
    recipients: list,
    labels: list,
    thread_labels: list,
    dry_run: bool = False
) -> dict:
    """
    Add Inbox, Sent, and All Mail labels to threads for all users.
    
    - Inbox: Added to threads where user is a recipient
    - Sent: Added to threads where user is a sender
    - All Mail: Added to ALL visible threads (sender or recipient)
    
    Returns statistics about changes made.
    """
    stats = {
        "users_processed": 0,
        "inbox_labels_added": 0,
        "sent_labels_added": 0,
        "all_mail_labels_added": 0,
        "threads_already_labeled": 0,
        "user_stats": {}
    }
    
    recipients_by_email = group_recipients_by_email(recipients)
    
    # Build existing thread_labels lookup
    existing_tls = set()
    for tl in thread_labels:
        key = (tl["thread_id"], tl["label_id"], tl["user_id"])
        existing_tls.add(key)
    
    new_thread_labels = []
    
    for user in users:
        user_id = user["id"]
        user_name = f"{user['first_name']} {user['last_name']}"
        
        # Get user's system labels
        system_labels = get_user_system_labels(user_id, labels)
        inbox_label = system_labels.get("Inbox")
        sent_label = system_labels.get("Sent")
        all_mail_label = system_labels.get("All Mail")
        
        if not inbox_label:
            print(f"  WARNING: No Inbox label found for {user_name}")
            continue
        
        if not sent_label:
            print(f"  WARNING: No Sent label found for {user_name}")
            continue
        
        if not all_mail_label:
            print(f"  WARNING: No All Mail label found for {user_name}")
            continue
        
        inbox_label_id = inbox_label["id"]
        sent_label_id = sent_label["id"]
        all_mail_label_id = all_mail_label["id"]
        
        # Get threads visible to this user
        visible_threads = get_threads_visible_to_user(user_id, emails, recipients_by_email)
        
        user_inbox_added = 0
        user_sent_added = 0
        user_all_mail_added = 0
        user_already = 0
        
        for thread_id, visibility in visible_threads.items():
            # All Mail: add to ALL visible threads (sender or recipient)
            all_mail_key = (thread_id, all_mail_label_id, user_id)
            if all_mail_key not in existing_tls:
                new_tl = create_thread_label(thread_id, all_mail_label_id, user_id)
                new_thread_labels.append(new_tl)
                existing_tls.add(all_mail_key)
                user_all_mail_added += 1
            
            # Sent: add if user is a sender
            if visibility["as_sender"]:
                sent_key = (thread_id, sent_label_id, user_id)
                if sent_key not in existing_tls:
                    new_tl = create_thread_label(thread_id, sent_label_id, user_id)
                    new_thread_labels.append(new_tl)
                    existing_tls.add(sent_key)
                    user_sent_added += 1
            
            # Inbox: only add if user is a recipient (not just sender)
            # This ensures sent-only threads don't appear in inbox
            if visibility["as_recipient"]:
                inbox_key = (thread_id, inbox_label_id, user_id)
                if inbox_key in existing_tls:
                    user_already += 1
                else:
                    new_tl = create_thread_label(thread_id, inbox_label_id, user_id)
                    new_thread_labels.append(new_tl)
                    existing_tls.add(inbox_key)
                    user_inbox_added += 1
        
        stats["user_stats"][user_name] = {
            "visible_threads": len(visible_threads),
            "sender_threads": sum(1 for v in visible_threads.values() if v["as_sender"]),
            "recipient_threads": sum(1 for v in visible_threads.values() if v["as_recipient"]),
            "inbox_labels_added": user_inbox_added,
            "sent_labels_added": user_sent_added,
            "all_mail_labels_added": user_all_mail_added,
            "already_labeled": user_already
        }
        
        stats["inbox_labels_added"] += user_inbox_added
        stats["sent_labels_added"] += user_sent_added
        stats["all_mail_labels_added"] += user_all_mail_added
        stats["threads_already_labeled"] += user_already
        stats["users_processed"] += 1
    
    if not dry_run:
        thread_labels.extend(new_thread_labels)
    
    return stats


def build_thread_visibility(emails: list, recipients_by_email: dict) -> dict:
    """
    Build a map of thread_id -> set of user_ids who can see the thread.
    
    A user can see a thread if they are sender or recipient of any email in that thread.
    """
    thread_visibility = defaultdict(set)
    for email in emails:
        thread_id = email.get("thread_id")
        if not thread_id:
            continue
        # Sender can see
        thread_visibility[thread_id].add(email["sender_id"])
        # Recipients can see
        for r in recipients_by_email.get(email["id"], []):
            thread_visibility[thread_id].add(r["recipient_id"])
    return dict(thread_visibility)


def remove_invalid_thread_labels(
    thread_labels: list,
    thread_visibility: dict,
    dry_run: bool = False
) -> dict:
    """
    Remove thread_labels where the user cannot see the thread.
    
    This cleans up orphaned labels that were left behind when recipients
    were removed for participant consistency.
    
    Returns statistics about removals.
    """
    stats = {
        "total_checked": len(thread_labels),
        "removed_invisible": 0,
        "kept": 0
    }
    
    valid_labels = []
    
    for tl in thread_labels:
        thread_id = tl["thread_id"]
        user_id = tl["user_id"]
        
        # Check if user can see this thread
        visible_users = thread_visibility.get(thread_id, set())
        
        if user_id in visible_users:
            valid_labels.append(tl)
            stats["kept"] += 1
        else:
            stats["removed_invisible"] += 1
    
    if not dry_run:
        thread_labels.clear()
        thread_labels.extend(valid_labels)
    
    return stats


def add_starred_labels(
    emails: list,
    recipients: list,
    labels: list,
    thread_labels: list,
    dry_run: bool = False
) -> dict:
    """
    Add Starred label to threads for users who can see starred emails.
    
    Rule: If an email has is_starred=true, all users who can see that email
    should have the "Starred" system label on that thread.
    
    Returns statistics about changes made.
    """
    stats = {
        "starred_emails": 0,
        "starred_labels_added": 0,
        "already_labeled": 0
    }
    
    recipients_by_email = group_recipients_by_email(recipients)
    
    # Build existing thread_labels lookup
    existing_tls = set()
    for tl in thread_labels:
        key = (tl["thread_id"], tl["label_id"], tl["user_id"])
        existing_tls.add(key)
    
    # Build user -> Starred label map
    user_starred_labels = {}
    for label in labels:
        if label.get("is_system") and label.get("name") == "Starred":
            user_starred_labels[label["owner_id"]] = label["id"]
    
    new_thread_labels = []
    
    # Find all starred emails
    starred_emails = [e for e in emails if e.get("is_starred")]
    stats["starred_emails"] = len(starred_emails)
    
    for email in starred_emails:
        thread_id = email["thread_id"]
        
        # Get users who can see this email (sender + recipients)
        visible_users = {email["sender_id"]}
        for r in recipients_by_email.get(email["id"], []):
            visible_users.add(r["recipient_id"])
        
        # Add Starred label for each visible user
        for user_id in visible_users:
            starred_label_id = user_starred_labels.get(user_id)
            if not starred_label_id:
                continue
            
            key = (thread_id, starred_label_id, user_id)
            if key in existing_tls:
                stats["already_labeled"] += 1
            else:
                new_tl = create_thread_label(thread_id, starred_label_id, user_id)
                new_thread_labels.append(new_tl)
                existing_tls.add(key)
                stats["starred_labels_added"] += 1
    
    if not dry_run:
        thread_labels.extend(new_thread_labels)
    
    return stats


def main():
    """Main entry point."""
    dry_run = "--dry-run" in sys.argv
    
    if dry_run:
        print("Running in DRY RUN mode - no changes will be made\n")
    
    # Verify fixture files exist
    for filepath in [THREADS_FILE, EMAILS_FILE, RECIPIENTS_FILE, USERS_FILE, LABELS_FILE, THREAD_LABELS_FILE]:
        if not filepath.exists():
            print(f"ERROR: File not found: {filepath}")
            sys.exit(1)
    
    # Load fixture files
    print("Loading fixture files...")
    threads = load_json(THREADS_FILE)
    emails = load_json(EMAILS_FILE)
    recipients = load_json(RECIPIENTS_FILE)
    users = load_json(USERS_FILE)
    labels = load_json(LABELS_FILE)
    thread_labels = load_json(THREAD_LABELS_FILE)
    
    print(f"Loaded: {len(threads)} threads, {len(emails)} emails, {len(recipients)} recipients")
    print(f"        {len(users)} users, {len(labels)} labels, {len(thread_labels)} thread_labels")
    
    # Build thread visibility map
    recipients_by_email = group_recipients_by_email(recipients)
    thread_visibility = build_thread_visibility(emails, recipients_by_email)
    
    # First, remove invalid/orphaned thread_labels
    print("\n--- Removing Invalid Thread Labels ---")
    cleanup_stats = remove_invalid_thread_labels(thread_labels, thread_visibility, dry_run)
    print(f"Total checked: {cleanup_stats['total_checked']}")
    print(f"Removed (invisible): {cleanup_stats['removed_invisible']}")
    print(f"Kept: {cleanup_stats['kept']}")
    
    # Add inbox, sent, and all mail labels
    print("\n--- Adding Inbox, Sent, and All Mail Labels ---")
    stats = add_inbox_labels_for_users(
        users, emails, recipients, labels, thread_labels, dry_run
    )
    
    print(f"\nProcessed {stats['users_processed']} users")
    print(f"Inbox labels added: {stats['inbox_labels_added']}")
    print(f"Sent labels added: {stats['sent_labels_added']}")
    print(f"All Mail labels added: {stats['all_mail_labels_added']}")
    print(f"Already labeled: {stats['threads_already_labeled']}")
    
    # Add starred labels
    print("\n--- Adding Starred Labels ---")
    starred_stats = add_starred_labels(
        emails, recipients, labels, thread_labels, dry_run
    )
    
    print(f"Starred emails found: {starred_stats['starred_emails']}")
    print(f"Starred labels added: {starred_stats['starred_labels_added']}")
    print(f"Already labeled: {starred_stats['already_labeled']}")
    
    # Show stats for seed users (first 10)
    print("\n--- Seed User Statistics ---")
    seed_users = list(stats["user_stats"].items())[:10]
    for user_name, user_stat in seed_users:
        print(f"  {user_name}:")
        print(f"    Visible threads: {user_stat['visible_threads']}")
        print(f"    Sender threads: {user_stat['sender_threads']}")
        print(f"    Recipient threads: {user_stat['recipient_threads']}")
        print(f"    Inbox labels added: {user_stat['inbox_labels_added']}")
        print(f"    Sent labels added: {user_stat['sent_labels_added']}")
        print(f"    All Mail labels added: {user_stat['all_mail_labels_added']}")
        print(f"    Already labeled: {user_stat['already_labeled']}")
    
    if not dry_run:
        # Save updated thread_labels
        print(f"\n--- Saving Updated Fixtures ---")
        save_json(THREAD_LABELS_FILE, thread_labels)
        print(f"Saved: {THREAD_LABELS_FILE}")
        print(f"Total thread_labels: {len(thread_labels)}")
    else:
        print("\n--- DRY RUN COMPLETE ---")
        print("No files were modified. Run without --dry-run to apply changes.")
    
    sys.exit(0)


if __name__ == "__main__":
    main()
