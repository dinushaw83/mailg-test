"""
Script to add more emails and recipients to increase user visibility.

This script:
1. Adds more recipients to existing threads' first emails
2. Creates new threads where seed users are participants

Usage:
    python -m scripts.add_more_emails [--dry-run]
"""

import json
import random
import sys
import uuid
from collections import defaultdict
from datetime import datetime, timedelta
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

# Email subjects for new threads
NEW_THREAD_SUBJECTS = [
    "Budget Review for Q2",
    "Client Feedback Summary",
    "New Hire Onboarding Process",
    "Marketing Campaign Results",
    "Server Maintenance Schedule",
    "Annual Performance Reviews",
    "Product Launch Timeline",
    "Customer Support Escalation",
    "Vendor Contract Renewal",
    "Team Building Event Planning",
    "Security Audit Findings",
    "Monthly Revenue Report",
    "Training Session Schedule",
    "Office Renovation Plans",
    "Holiday Schedule Announcement",
    "Project Milestone Update",
    "IT Infrastructure Upgrade",
    "Staff Meeting Agenda",
    "Compliance Requirements Update",
    "Partnership Opportunity Discussion",
    "Employee Wellness Program",
    "Quarterly Business Review",
    "Software License Renewals",
    "Travel Policy Changes",
    "Emergency Contact Updates",
    "Benefits Enrollment Period",
    "Departmental Budget Allocation",
    "Website Redesign Feedback",
    "Mobile App Development Update",
    "Data Migration Status",
    "Weekly Sprint Planning",
    "Code Review Guidelines",
    "API Documentation Update",
    "Database Optimization Plan",
    "Cloud Migration Strategy",
    "User Research Findings",
    "Design System Updates",
    "Accessibility Improvements",
    "Performance Metrics Review",
    "Security Patch Deployment",
    "Feature Flag Configuration",
    "Load Testing Results",
    "Incident Post-Mortem",
    "Release Notes Draft",
    "Integration Testing Status",
    "Mobile App Beta Testing",
    "Customer Journey Mapping",
    "Competitive Analysis Report",
    "Pricing Strategy Discussion",
    "Content Calendar Planning",
    "Social Media Analytics",
    "Email Marketing Campaign",
    "SEO Strategy Review",
    "Brand Guidelines Update",
    "Press Release Draft",
    "Partner Onboarding Process",
    "Contract Negotiation Update",
    "Legal Review Required",
    "Compliance Training Schedule",
    "Risk Assessment Report",
    "Disaster Recovery Planning",
    "Network Infrastructure Update",
    "Hardware Inventory Review",
    "Software Asset Management",
    "Vendor Performance Review",
    "Budget Forecast Q3",
    "Resource Allocation Planning",
    "Hiring Pipeline Update",
    "Interview Feedback Summary",
    "Onboarding Checklist Update",
    "Employee Satisfaction Survey",
    "Remote Work Policy Update",
    "Office Space Planning",
    "Equipment Request Approval",
    "Expense Report Review",
    "Invoice Processing Update",
    "Payment Terms Discussion",
    "Credit Line Extension Request",
    "Financial Audit Preparation",
    "Tax Planning Strategy",
]

# Email body templates
BODY_TEMPLATES = [
    "I wanted to follow up on our previous discussion. {content}\n\nPlease let me know your thoughts.",
    "Here's an update on the matter we discussed. {content}\n\nLooking forward to your feedback.",
    "Just checking in regarding {topic}. {content}\n\nLet me know if you need any clarification.",
    "Following up on {topic}. {content}\n\nPlease review and share your input.",
    "I've been looking into {topic} and wanted to share my findings. {content}",
    "Quick update: {content}\n\nWe can discuss this further in our next meeting.",
    "As we discussed, here's the information about {topic}. {content}",
    "I wanted to bring {topic} to your attention. {content}\n\nWhat are your thoughts?",
    "Here's what I've gathered so far: {content}\n\nLet me know if you have any questions.",
    "Regarding our conversation about {topic}: {content}\n\nPlease advise on next steps.",
]

CONTENT_SNIPPETS = [
    "We've made significant progress on this front.",
    "There are a few items that need immediate attention.",
    "The team has been working diligently on this.",
    "We need to align on the priorities before moving forward.",
    "I've identified some potential risks we should address.",
    "The initial results are promising and we should continue this approach.",
    "Based on the data, I recommend we proceed with the proposed plan.",
    "There are some concerns that have been raised by stakeholders.",
    "We're on track to meet the deadline as planned.",
    "Additional resources may be required to complete this on time.",
]

TOPICS = [
    "this project", "the initiative", "our goals", "the upcoming changes",
    "the recent developments", "the proposed solution", "the feedback received",
    "the current situation", "our progress", "the next steps",
]


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


def generate_timestamp(base: datetime = None, offset_hours: int = 0) -> str:
    """Generate an ISO format timestamp."""
    if base is None:
        base = datetime.now()
    ts = base + timedelta(hours=offset_hours)
    return ts.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def generate_body() -> tuple:
    """Generate email body and HTML body."""
    template = random.choice(BODY_TEMPLATES)
    content = random.choice(CONTENT_SNIPPETS)
    topic = random.choice(TOPICS)
    
    body = template.format(content=content, topic=topic)
    html_body = f"<p>{body.replace(chr(10), '</p><p>')}</p>"
    
    return body, html_body


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


def group_recipients_by_email(recipients: list) -> dict:
    """Group recipients by email_id."""
    by_email = defaultdict(list)
    for r in recipients:
        by_email[r["email_id"]].append(r)
    return by_email


def get_participants(email: dict, recipients_by_email: dict) -> set:
    """Get all participant IDs for an email (sender + recipients)."""
    participants = {email["sender_id"]}
    for r in recipients_by_email.get(email["id"], []):
        participants.add(r["recipient_id"])
    return participants


def build_user_map(users: list) -> dict:
    """Build a map of user_id -> user data."""
    return {u["id"]: u for u in users}


def create_recipient(email_id: str, user: dict, recipient_type: str = "to") -> dict:
    """Create a new recipient record."""
    return {
        "id": generate_uuid(),
        "email_id": email_id,
        "recipient_id": user["id"],
        "recipient_email": user["email"],
        "recipient_name": f"{user['first_name']} {user['last_name']}",
        "recipient_type": recipient_type
    }


def add_recipients_to_threads(
    emails_by_thread: dict,
    recipients: list,
    recipients_by_email: dict,
    users: list,
    user_map: dict,
    dry_run: bool = False
) -> dict:
    """
    Add more recipients to first emails of existing threads.
    
    This makes threads visible to more users.
    """
    stats = {
        "threads_modified": 0,
        "recipients_added": 0,
    }
    
    new_recipients = []
    
    for thread_id, thread_emails in emails_by_thread.items():
        if not thread_emails:
            continue
        
        first_email = thread_emails[0]
        first_email_id = first_email["id"]
        
        # Get current participants
        current_participants = get_participants(first_email, recipients_by_email)
        
        # Find available users to add (not already participants)
        available_users = [u for u in users if u["id"] not in current_participants]
        
        if not available_users:
            continue
        
        # Add 5-10 random users as new recipients to maximize visibility
        num_to_add = min(random.randint(5, 10), len(available_users))
        users_to_add = random.sample(available_users, num_to_add)
        
        for user in users_to_add:
            recipient = create_recipient(first_email_id, user, "to")
            new_recipients.append(recipient)
            stats["recipients_added"] += 1
        
        stats["threads_modified"] += 1
    
    if not dry_run:
        recipients.extend(new_recipients)
    
    return stats


def create_email(
    thread: dict,
    sender: dict,
    position: int,
    parent_email_id: str = None,
    base_time: datetime = None
) -> dict:
    """Create a new email record."""
    subject = thread["subject"]
    if position > 0:
        subject = f"Re: {thread['subject']}"
    
    body, html_body = generate_body()
    
    if base_time is None:
        base_time = datetime.now() - timedelta(days=random.randint(1, 30))
    
    created_at = generate_timestamp(base_time, offset_hours=position * random.randint(1, 24))
    sent_at = generate_timestamp(base_time, offset_hours=position * random.randint(1, 24) + 1)
    received_at = generate_timestamp(base_time, offset_hours=position * random.randint(1, 24) + 1)
    
    is_sent = random.choice([True, False])
    
    return {
        "id": generate_uuid(),
        "subject": subject,
        "body": body,
        "html_body": html_body,
        "status": "sent" if is_sent else "received",
        "is_read": random.choice([True, False]),
        "is_starred": random.random() < 0.1,
        "folder": "sent" if is_sent else "inbox",
        "scheduled_send_at": None,
        "sender_id": sender["id"],
        "thread_id": thread["id"],
        "parent_email_id": parent_email_id,
        "sent_at": sent_at,
        "received_at": None if is_sent else received_at,
        "created_at": created_at,
        "updated_at": created_at
    }


def create_thread(owner: dict, subject: str) -> dict:
    """Create a new thread record."""
    created_at = generate_timestamp(datetime.now() - timedelta(days=random.randint(1, 60)))
    
    return {
        "id": generate_uuid(),
        "subject": subject,
        "owner_id": owner["id"],
        "email_count": 0,  # Will be updated later
        "last_email_at": None,  # Will be updated later
        "created_at": created_at,
        "updated_at": created_at
    }


def create_new_threads(
    users: list,
    user_map: dict,
    threads: list,
    emails: list,
    recipients: list,
    dry_run: bool = False
) -> dict:
    """
    Create new threads where seed users are participants.
    """
    stats = {
        "threads_created": 0,
        "emails_created": 0,
        "recipients_created": 0,
    }
    
    # First 10 users are seed users
    seed_users = users[:10]
    other_users = users[10:] if len(users) > 10 else users
    
    # Shuffle subjects
    subjects = NEW_THREAD_SUBJECTS.copy()
    random.shuffle(subjects)
    
    new_threads = []
    new_emails = []
    new_recipients = []
    
    for i, subject in enumerate(subjects):
        # Pick 3-5 participants including at least one seed user
        num_participants = random.randint(3, 5)
        
        # Always include a seed user
        seed_user = seed_users[i % len(seed_users)]
        
        # Add other participants
        available_users = [u for u in users if u["id"] != seed_user["id"]]
        other_participants = random.sample(available_users, min(num_participants - 1, len(available_users)))
        
        participants = [seed_user] + other_participants
        
        # Create thread
        thread = create_thread(participants[0], subject)
        
        # Create 3-8 emails in the thread
        num_emails = random.randint(3, 8)
        base_time = datetime.now() - timedelta(days=random.randint(5, 45))
        
        thread_emails = []
        for j in range(num_emails):
            sender = participants[j % len(participants)]
            parent_id = thread_emails[-1]["id"] if thread_emails else None
            
            email = create_email(thread, sender, j, parent_id, base_time)
            thread_emails.append(email)
            
            # Add recipients (other participants who are not sender)
            for p in participants:
                if p["id"] != email["sender_id"]:
                    recipient = create_recipient(email["id"], p, "to")
                    new_recipients.append(recipient)
                    stats["recipients_created"] += 1
        
        # Update thread metadata
        thread["email_count"] = len(thread_emails)
        thread["last_email_at"] = thread_emails[-1]["created_at"]
        
        new_threads.append(thread)
        new_emails.extend(thread_emails)
        stats["threads_created"] += 1
        stats["emails_created"] += len(thread_emails)
    
    if not dry_run:
        threads.extend(new_threads)
        emails.extend(new_emails)
        recipients.extend(new_recipients)
    
    return stats


def calculate_user_visibility(users: list, emails: list, recipients: list) -> dict:
    """Calculate how many threads each user can see."""
    recipients_by_email = group_recipients_by_email(recipients)
    emails_by_thread = group_emails_by_thread(emails)
    
    user_threads = defaultdict(set)
    
    for thread_id, thread_emails in emails_by_thread.items():
        for email in thread_emails:
            # Sender can see the thread
            user_threads[email["sender_id"]].add(thread_id)
            
            # Recipients can see the thread
            for r in recipients_by_email.get(email["id"], []):
                user_threads[r["recipient_id"]].add(thread_id)
    
    # Build visibility stats
    visibility = {}
    for user in users[:10]:  # Check seed users
        user_id = user["id"]
        name = f"{user['first_name']} {user['last_name']}"
        visibility[name] = len(user_threads.get(user_id, set()))
    
    return visibility


def main():
    """Main entry point."""
    dry_run = "--dry-run" in sys.argv
    
    if dry_run:
        print("Running in DRY RUN mode - no changes will be made\n")
    
    # Verify fixture files exist
    for filepath in [THREADS_FILE, EMAILS_FILE, RECIPIENTS_FILE, USERS_FILE]:
        if not filepath.exists():
            print(f"ERROR: File not found: {filepath}")
            sys.exit(1)
    
    # Load fixture files
    print("Loading fixture files...")
    threads = load_json(THREADS_FILE)
    emails = load_json(EMAILS_FILE)
    recipients = load_json(RECIPIENTS_FILE)
    users = load_json(USERS_FILE)
    
    print(f"Loaded: {len(threads)} threads, {len(emails)} emails, {len(recipients)} recipients, {len(users)} users")
    
    # Build helper structures
    user_map = build_user_map(users)
    emails_by_thread = group_emails_by_thread(emails)
    recipients_by_email = group_recipients_by_email(recipients)
    
    # Calculate initial visibility
    print("\n--- Initial User Visibility ---")
    initial_visibility = calculate_user_visibility(users, emails, recipients)
    for name, count in initial_visibility.items():
        print(f"  {name}: {count} threads")
    
    # Part 1: Add recipients to existing threads
    print("\n--- Part 1: Adding recipients to existing threads ---")
    part1_stats = add_recipients_to_threads(
        emails_by_thread, recipients, recipients_by_email, users, user_map, dry_run
    )
    print(f"Threads modified: {part1_stats['threads_modified']}")
    print(f"Recipients added: {part1_stats['recipients_added']}")
    
    # Part 2: Create new threads for seed users
    print("\n--- Part 2: Creating new threads for seed users ---")
    part2_stats = create_new_threads(users, user_map, threads, emails, recipients, dry_run)
    print(f"Threads created: {part2_stats['threads_created']}")
    print(f"Emails created: {part2_stats['emails_created']}")
    print(f"Recipients created: {part2_stats['recipients_created']}")
    
    if not dry_run:
        # Save updated fixture files
        print("\n--- Saving updated fixture files ---")
        save_json(THREADS_FILE, threads)
        print(f"Saved: {THREADS_FILE}")
        
        save_json(EMAILS_FILE, emails)
        print(f"Saved: {EMAILS_FILE}")
        
        save_json(RECIPIENTS_FILE, recipients)
        print(f"Saved: {RECIPIENTS_FILE}")
        
        # Calculate final visibility
        print("\n--- Final User Visibility ---")
        final_visibility = calculate_user_visibility(users, emails, recipients)
        for name, count in final_visibility.items():
            print(f"  {name}: {count} threads")
        
        # Summary
        print("\n--- Summary ---")
        print(f"Total threads: {len(threads)}")
        print(f"Total emails: {len(emails)}")
        print(f"Total recipients: {len(recipients)}")
        
        print("\n--- IMPORTANT ---")
        print("Run the fix_email_subjects.py script to ensure proper insertion order:")
        print("  python -m scripts.fix_email_subjects")
    else:
        print("\n--- DRY RUN COMPLETE ---")
        print("No files were modified. Run without --dry-run to apply changes.")
    
    sys.exit(0)


if __name__ == "__main__":
    main()
