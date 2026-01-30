"""
Script to fix email subjects, reply chains, and participant consistency in fixture files.

This script ensures:
1. Email subjects match their thread subjects
2. Proper parent_email_id chains: each email links to the previous one in thread
3. Reply emails (all except first in thread) have "Re: " prefix
4. All emails in a thread use only participants from the first email

Usage:
    python -m scripts.fix_email_subjects [--dry-run]
"""

import json
import sys
import uuid
from collections import defaultdict
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


def load_json(filepath: Path) -> list:
    """Load JSON data from a file."""
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(filepath: Path, data: list) -> None:
    """Save JSON data to a file with proper formatting."""
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


def build_thread_subject_map(threads: list) -> dict:
    """Build a mapping from thread_id to subject."""
    return {thread["id"]: thread["subject"] for thread in threads}


def group_emails_by_thread(emails: list) -> dict:
    """Group emails by thread_id and sort by created_at."""
    emails_by_thread = defaultdict(list)
    for email in emails:
        thread_id = email.get("thread_id")
        if thread_id:
            emails_by_thread[thread_id].append(email)
    
    # Sort each thread's emails by created_at
    for thread_id in emails_by_thread:
        emails_by_thread[thread_id].sort(key=lambda e: e.get("created_at", ""))
    
    return emails_by_thread


def build_email_position_map(emails_by_thread: dict) -> dict:
    """
    Build a map of email_id -> (position, previous_email_id).
    
    Position 0 = first email (no parent)
    Position > 0 = reply (parent is previous email)
    """
    position_map = {}
    for thread_id, thread_emails in emails_by_thread.items():
        for i, email in enumerate(thread_emails):
            if i == 0:
                position_map[email["id"]] = (0, None)
            else:
                prev_email_id = thread_emails[i - 1]["id"]
                position_map[email["id"]] = (i, prev_email_id)
    return position_map


def sort_emails_for_insertion(emails: list) -> list:
    """
    Sort emails so parents always come before children.
    
    This ensures the fixture can be loaded without foreign key violations.
    Uses topological sort based on parent_email_id.
    """
    # Build lookup maps
    email_by_id = {e["id"]: e for e in emails}
    
    # Separate emails with and without parents
    sorted_emails = []
    pending = []
    inserted_ids = set()
    
    for email in emails:
        if email.get("parent_email_id") is None:
            sorted_emails.append(email)
            inserted_ids.add(email["id"])
        else:
            pending.append(email)
    
    # Keep inserting emails whose parent has been inserted
    max_iterations = len(pending) + 1
    iteration = 0
    
    while pending and iteration < max_iterations:
        iteration += 1
        still_pending = []
        
        for email in pending:
            parent_id = email.get("parent_email_id")
            if parent_id in inserted_ids:
                sorted_emails.append(email)
                inserted_ids.add(email["id"])
            else:
                still_pending.append(email)
        
        if len(still_pending) == len(pending):
            # No progress - some parents don't exist, add remaining anyway
            print(f"WARNING: {len(still_pending)} emails have missing parents, adding at end")
            sorted_emails.extend(still_pending)
            break
        
        pending = still_pending
    
    return sorted_emails


def group_recipients_by_email(recipients: list) -> dict:
    """Group recipients by email_id."""
    by_email = defaultdict(list)
    for r in recipients:
        by_email[r["email_id"]].append(r)
    return by_email


def build_user_map(users: list) -> dict:
    """Build a map of user_id -> user data."""
    return {u["id"]: u for u in users}


def fix_thread_participants(
    emails_by_thread: dict,
    recipients: list,
    users: dict,
    dry_run: bool = False
) -> dict:
    """
    Ensure all emails in a thread use only participants from the first email.
    
    Returns statistics about fixes made.
    """
    recipients_by_email = group_recipients_by_email(recipients)
    
    stats = {
        "sender_fixes": 0,
        "recipient_fixes": 0,
        "threads_fixed": 0,
        "emails_with_new_participants": 0
    }
    
    # Track which recipients to keep/remove/add
    recipients_to_remove = set()
    recipients_to_add = []
    
    for thread_id, thread_emails in emails_by_thread.items():
        if len(thread_emails) < 2:
            continue
        
        first_email = thread_emails[0]
        first_email_id = first_email["id"]
        
        # Get first email's participants: sender + all recipients
        first_sender = first_email["sender_id"]
        first_recipients_list = recipients_by_email.get(first_email_id, [])
        first_recipient_ids = [r["recipient_id"] for r in first_recipients_list]
        
        # All participants in the thread (sender + recipients from first email)
        thread_participants = [first_sender] + first_recipient_ids
        
        if len(thread_participants) < 2:
            # Not enough participants to have a conversation
            continue
        
        thread_had_fixes = False
        
        # Process each reply email
        for i, email in enumerate(thread_emails[1:], 1):
            email_id = email["id"]
            current_sender = email["sender_id"]
            current_recipients = recipients_by_email.get(email_id, [])
            
            # Check if sender is in thread participants
            sender_needs_fix = current_sender not in thread_participants
            
            # Check if any recipient is not in thread participants
            invalid_recipients = [
                r for r in current_recipients 
                if r["recipient_id"] not in thread_participants
            ]
            
            if sender_needs_fix or invalid_recipients:
                stats["emails_with_new_participants"] += 1
                thread_had_fixes = True
                
                if not dry_run:
                    # Only fix sender if it's not in thread participants
                    if sender_needs_fix:
                        # Pick a valid sender from participants (rotate through)
                        new_sender = thread_participants[i % len(thread_participants)]
                        email["sender_id"] = new_sender
                        stats["sender_fixes"] += 1
                    else:
                        new_sender = current_sender
                    
                    # Only fix recipients if there are invalid ones
                    if invalid_recipients:
                        # Remove only invalid recipients
                        for r in invalid_recipients:
                            recipients_to_remove.add(r["id"])
                            stats["recipient_fixes"] += 1
        
        if thread_had_fixes:
            stats["threads_fixed"] += 1
    
    # Apply recipient changes
    if not dry_run:
        # Filter out removed recipients
        new_recipients = [r for r in recipients if r["id"] not in recipients_to_remove]
        # Add new recipients
        new_recipients.extend(recipients_to_add)
        # Replace the list contents
        recipients.clear()
        recipients.extend(new_recipients)
    
    return stats


def fix_email_subjects(dry_run: bool = False) -> dict:
    """
    Fix email subjects, parent_email_id chains, reply prefixes, and participant consistency.
    
    Args:
        dry_run: If True, only report issues without making changes.
        
    Returns:
        Dictionary with fix statistics
    """
    print("Loading fixture files...")
    threads = load_json(THREADS_FILE)
    emails = load_json(EMAILS_FILE)
    recipients = load_json(RECIPIENTS_FILE)
    users = load_json(USERS_FILE)
    
    print(f"Loaded {len(threads)} threads, {len(emails)} emails, {len(recipients)} recipients, {len(users)} users")
    
    # Build thread subject map
    thread_subjects = build_thread_subject_map(threads)
    
    # Build user map
    user_map = build_user_map(users)
    
    # Group emails by thread
    emails_by_thread = group_emails_by_thread(emails)
    
    # Build position map for proper parent chains
    position_map = build_email_position_map(emails_by_thread)
    
    # Track statistics
    stats = {
        "total_emails": len(emails),
        "total_threads": len(emails_by_thread),
        "total_recipients": len(recipients),
        "subject_fixes": 0,
        "parent_chain_fixes": 0,
        "re_prefix_added": 0,
        "subject_issues": [],
        "parent_chain_issues": [],
        "re_prefix_issues": [],
        "participant_stats": {}
    }
    
    # Process each email
    for email in emails:
        thread_id = email.get("thread_id")
        email_id = email.get("id")
        
        if not thread_id:
            continue
        
        # Get thread subject
        thread_subject = thread_subjects.get(thread_id)
        if thread_subject is None:
            print(f"WARNING: Thread {thread_id} not found for email {email_id}")
            continue
        
        # Get position info
        position_info = position_map.get(email_id)
        if position_info is None:
            continue
        
        position, expected_parent_id = position_info
        is_first_in_thread = (position == 0)
        
        # 1. Fix parent_email_id chain
        current_parent = email.get("parent_email_id")
        if current_parent != expected_parent_id:
            stats["parent_chain_issues"].append({
                "email_id": email_id,
                "thread_id": thread_id,
                "position": position,
                "current_parent": current_parent,
                "expected_parent": expected_parent_id
            })
            if not dry_run:
                email["parent_email_id"] = expected_parent_id
                stats["parent_chain_fixes"] += 1
        
        # 2. Determine expected subject (with or without "Re: " prefix)
        if is_first_in_thread:
            expected_subject = thread_subject
        else:
            expected_subject = f"Re: {thread_subject}"
        
        # 3. Fix subject if needed
        current_subject = email.get("subject", "")
        if current_subject != expected_subject:
            # Track subject base mismatch vs just Re: prefix issue
            base_current = current_subject[4:] if current_subject.startswith("Re: ") else current_subject
            
            if base_current != thread_subject:
                stats["subject_issues"].append({
                    "email_id": email_id,
                    "current": current_subject,
                    "expected": expected_subject
                })
                if not dry_run:
                    stats["subject_fixes"] += 1
            
            # Track Re: prefix additions
            if expected_subject.startswith("Re: ") and not current_subject.startswith("Re: "):
                stats["re_prefix_issues"].append({
                    "email_id": email_id,
                    "current": current_subject,
                    "expected": expected_subject
                })
                if not dry_run:
                    stats["re_prefix_added"] += 1
            
            if not dry_run:
                email["subject"] = expected_subject
    
    # Fix thread participant consistency
    print("\nFixing thread participant consistency...")
    participant_stats = fix_thread_participants(emails_by_thread, recipients, user_map, dry_run)
    stats["participant_stats"] = participant_stats
    
    # Sort emails so parents come before children (for DB insertion order)
    if not dry_run:
        print("Sorting emails for proper insertion order...")
        emails = sort_emails_for_insertion(emails)
        stats["emails_reordered"] = True
    
    # Save updated files if not dry run
    total_changes = (
        stats["parent_chain_fixes"] + 
        stats["subject_fixes"] + 
        stats["re_prefix_added"] +
        participant_stats.get("sender_fixes", 0)
    )
    if not dry_run:
        print(f"Saving changes to {EMAILS_FILE}...")
        save_json(EMAILS_FILE, emails)
        print(f"Saving changes to {RECIPIENTS_FILE}...")
        save_json(RECIPIENTS_FILE, recipients)
        print("Done!")
    
    return stats


def print_report(stats: dict, dry_run: bool) -> None:
    """Print a summary report of the findings."""
    print("\n" + "=" * 60)
    print("EMAIL FIX REPORT")
    print("=" * 60)
    print(f"Total emails analyzed: {stats['total_emails']}")
    print(f"Total threads: {stats['total_threads']}")
    print(f"Total recipients: {stats.get('total_recipients', 'N/A')}")
    
    if dry_run:
        print("Mode: DRY RUN (no changes made)")
    
    print("\n--- Parent Email Chain ---")
    print(f"Parent chain issues found: {len(stats['parent_chain_issues'])}")
    if not dry_run:
        print(f"Parent chains fixed: {stats['parent_chain_fixes']}")
    
    print("\n--- Subject Consistency ---")
    print(f"Subject mismatches found: {len(stats['subject_issues'])}")
    if not dry_run:
        print(f"Subjects fixed: {stats['subject_fixes']}")
    
    print("\n--- Reply Prefix ---")
    print(f"Replies needing 'Re: ' prefix: {len(stats['re_prefix_issues'])}")
    if not dry_run:
        print(f"'Re: ' prefixes added: {stats['re_prefix_added']}")
    
    # Participant consistency stats
    p_stats = stats.get("participant_stats", {})
    print("\n--- Participant Consistency ---")
    print(f"Emails with new participants: {p_stats.get('emails_with_new_participants', 0)}")
    print(f"Threads with participant issues: {p_stats.get('threads_fixed', 0)}")
    if not dry_run:
        print(f"Sender IDs fixed: {p_stats.get('sender_fixes', 0)}")
        print(f"Recipients updated: {p_stats.get('recipient_fixes', 0)}")
    
    # Show sample issues
    if stats["parent_chain_issues"]:
        print("\n" + "-" * 60)
        print("SAMPLE: Parent chain issues (first 5):")
        print("-" * 60)
        for item in stats["parent_chain_issues"][:5]:
            print(f"  Email: {item['email_id'][:36]}...")
            print(f"  Thread: {item['thread_id'][:36]}...")
            print(f"  Position: {item['position']}")
            current = item['current_parent'][:36] + "..." if item['current_parent'] else "null"
            expected = item['expected_parent'][:36] + "..." if item['expected_parent'] else "null"
            print(f"  Current parent: {current}")
            print(f"  Expected parent: {expected}")
            print()
    
    if stats["re_prefix_issues"]:
        print("\n" + "-" * 60)
        print("SAMPLE: Replies needing 'Re: ' prefix (first 5):")
        print("-" * 60)
        for item in stats["re_prefix_issues"][:5]:
            print(f"  Email: {item['email_id'][:36]}...")
            print(f"  Current: {item['current'][:40]}...")
            print(f"  Fixed to: {item['expected'][:40]}...")
            print()
    
    total_issues = (
        len(stats["parent_chain_issues"]) + 
        len(stats["subject_issues"]) + 
        len(stats["re_prefix_issues"]) +
        p_stats.get("emails_with_new_participants", 0)
    )
    if total_issues == 0:
        print("\nAll emails are correctly configured!")
    
    print("\n" + "=" * 60)


def main():
    """Main entry point."""
    # Check for dry-run flag
    dry_run = "--dry-run" in sys.argv
    
    if dry_run:
        print("Running in DRY RUN mode - no changes will be made\n")
    
    # Verify fixture files exist
    if not THREADS_FILE.exists():
        print(f"ERROR: Threads file not found: {THREADS_FILE}")
        sys.exit(1)
    
    if not EMAILS_FILE.exists():
        print(f"ERROR: Emails file not found: {EMAILS_FILE}")
        sys.exit(1)
    
    if not RECIPIENTS_FILE.exists():
        print(f"ERROR: Recipients file not found: {RECIPIENTS_FILE}")
        sys.exit(1)
    
    if not USERS_FILE.exists():
        print(f"ERROR: Users file not found: {USERS_FILE}")
        sys.exit(1)
    
    # Run the fix
    stats = fix_email_subjects(dry_run)
    
    # Print report
    print_report(stats, dry_run)
    
    # Exit with appropriate code
    p_stats = stats.get("participant_stats", {})
    total_issues = (
        len(stats["parent_chain_issues"]) + 
        len(stats["subject_issues"]) + 
        len(stats["re_prefix_issues"]) +
        p_stats.get("emails_with_new_participants", 0)
    )
    if total_issues > 0 and dry_run:
        sys.exit(1)  # Indicate issues found in dry-run
    sys.exit(0)


if __name__ == "__main__":
    main()
