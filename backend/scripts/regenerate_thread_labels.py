#!/usr/bin/env python3
"""
Regenerate thread_labels.json fixture to align with email folders.

This script ensures that thread labels properly reflect:
1. Folder-based labels (INBOX, SENT, DRAFTS, TRASH, SPAM, SCHEDULED)
2. ALL_MAIL for every thread/user combination
3. STARRED if any email in thread is starred for the user
4. Category labels (Purchases, Social, Updates, Forums, Promotions) randomly assigned
   to threads with received emails for recipient users
"""

import json
import uuid
import random
from datetime import datetime
from pathlib import Path
from collections import defaultdict

# Mapping from email.folder to label name
FOLDER_TO_LABEL = {
    'inbox': 'Inbox',
    'sent': 'Sent',
    'drafts': 'Drafts',
    'trash': 'Trash',
    'spam': 'Spam',
    'scheduled': 'Scheduled',
}

# Category labels that can be randomly assigned to threads with received emails
CATEGORY_LABELS = ['Purchases', 'Social', 'Updates', 'Forums', 'Promotions']

# Probability of assigning a category label to a thread with received emails
CATEGORY_ASSIGNMENT_PROBABILITY = 0.6

def load_fixture(name: str) -> list:
    """Load a fixture file from the fixtures directory."""
    fixtures_dir = Path(__file__).parent.parent / 'fixtures'
    with open(fixtures_dir / f'{name}.json', 'r') as f:
        return json.load(f)

def save_fixture(name: str, data: list) -> None:
    """Save a fixture file to the fixtures directory."""
    fixtures_dir = Path(__file__).parent.parent / 'fixtures'
    with open(fixtures_dir / f'{name}.json', 'w') as f:
        json.dump(data, f, indent=2)

def main():
    print("Loading fixtures...")
    
    # Load all required fixtures
    emails = load_fixture('emails')
    labels = load_fixture('labels')
    email_recipients = load_fixture('email_recipients')
    threads = load_fixture('threads')
    
    # Load existing thread_labels to preserve custom (non-system) labels
    existing_thread_labels = load_fixture('thread_labels')
    
    print(f"  Emails: {len(emails)}")
    print(f"  Labels: {len(labels)}")
    print(f"  Email Recipients: {len(email_recipients)}")
    print(f"  Threads: {len(threads)}")
    print(f"  Existing Thread Labels: {len(existing_thread_labels)}")
    
    # Build lookup: (user_id, label_name) -> label_id (for system labels only)
    user_label_lookup = {}
    system_label_ids = set()
    for label in labels:
        if label.get('is_system'):
            key = (label['owner_id'], label['name'])
            user_label_lookup[key] = label['id']
            system_label_ids.add(label['id'])
    
    print(f"\nBuilt label lookup with {len(user_label_lookup)} system labels")
    
    # Build lookup: email_id -> list of recipient_ids
    email_recipient_lookup = defaultdict(list)
    for er in email_recipients:
        if er.get('recipient_id'):
            email_recipient_lookup[er['email_id']].append(er['recipient_id'])
    
    print(f"Built email recipient lookup with {len(email_recipient_lookup)} email->recipients mappings")
    
    # Build lookup: thread_id -> list of emails
    thread_emails = defaultdict(list)
    for email in emails:
        if email.get('thread_id'):
            thread_emails[email['thread_id']].append(email)
    
    print(f"Built thread->emails lookup with {len(thread_emails)} threads")
    
    # Build lookup: (thread_id, user_id) -> list of (email, is_owner) tuples
    # is_owner indicates if this user is the "owner" of this email record
    # (i.e., the folder value applies to them)
    thread_user_emails = defaultdict(list)
    for email in emails:
        thread_id = email.get('thread_id')
        if not thread_id:
            continue
        
        status = email.get('status', '')
        sender_id = email.get('sender_id')
        recipient_ids = email_recipient_lookup.get(email['id'], [])
        
        # Determine who "owns" this email record (folder applies to them)
        # - sent/draft emails: sender owns it
        # - received emails: recipients own it
        if status in ('sent', 'draft', 'queued'):
            # Sender is the owner - folder applies to them
            if sender_id:
                thread_user_emails[(thread_id, sender_id)].append((email, True))
            # Recipients can see it but folder doesn't apply to them
            for recipient_id in recipient_ids:
                thread_user_emails[(thread_id, recipient_id)].append((email, False))
        elif status == 'received':
            # Recipients are the owners - folder applies to them
            for recipient_id in recipient_ids:
                thread_user_emails[(thread_id, recipient_id)].append((email, True))
            # Sender can see it but folder doesn't apply to them
            if sender_id:
                thread_user_emails[(thread_id, sender_id)].append((email, False))
        else:
            # Unknown status - treat sender as owner
            if sender_id:
                thread_user_emails[(thread_id, sender_id)].append((email, True))
            for recipient_id in recipient_ids:
                thread_user_emails[(thread_id, recipient_id)].append((email, False))
    
    print(f"Built thread/user->emails lookup with {len(thread_user_emails)} thread/user combinations")
    
    # Collect non-system thread labels to preserve
    preserved_labels = []
    for tl in existing_thread_labels:
        if tl['label_id'] not in system_label_ids:
            preserved_labels.append(tl)
    
    print(f"\nPreserving {len(preserved_labels)} non-system thread labels")
    
    # Generate new system thread labels
    new_thread_labels = []
    # Track: (thread_id, label_id, user_id) to avoid duplicates
    seen = set()
    
    timestamp = datetime.now().isoformat() + 'Z'
    
    for (thread_id, user_id), user_email_tuples in thread_user_emails.items():
        # Determine which labels to add based on folders
        labels_to_add = set()
        
        # Folder-based labels - only use folder if user is the owner of that email
        for email, is_owner in user_email_tuples:
            if is_owner:
                folder = email.get('folder')
                if folder and folder in FOLDER_TO_LABEL:
                    labels_to_add.add(FOLDER_TO_LABEL[folder])
        
        # Always add ALL_MAIL
        labels_to_add.add('All Mail')
        
        # Add STARRED if any email (that user owns) is starred
        if any(email.get('is_starred') for email, is_owner in user_email_tuples if is_owner):
            labels_to_add.add('Starred')
        
        # Create thread_label entries
        for label_name in labels_to_add:
            label_id = user_label_lookup.get((user_id, label_name))
            if not label_id:
                # Skip if user doesn't have this system label
                continue
            
            key = (thread_id, label_id, user_id)
            if key in seen:
                continue
            seen.add(key)
            
            new_thread_labels.append({
                'id': str(uuid.uuid4()),
                'thread_id': thread_id,
                'label_id': label_id,
                'user_id': user_id,
                'created_at': timestamp
            })
    
    print(f"\nGenerated {len(new_thread_labels)} system thread labels (folder-based)")
    
    # Randomly assign category labels to threads with received emails
    category_labels_added = 0
    for (thread_id, user_id), user_email_tuples in thread_user_emails.items():
        # Check if user has any received emails in this thread (they own it)
        has_received_emails = any(
            email.get('status') == 'received' and is_owner
            for email, is_owner in user_email_tuples
        )
        
        if has_received_emails and random.random() < CATEGORY_ASSIGNMENT_PROBABILITY:
            # Randomly select a category label
            category = random.choice(CATEGORY_LABELS)
            label_id = user_label_lookup.get((user_id, category))
            
            if label_id:
                key = (thread_id, label_id, user_id)
                if key not in seen:
                    seen.add(key)
                    new_thread_labels.append({
                        'id': str(uuid.uuid4()),
                        'thread_id': thread_id,
                        'label_id': label_id,
                        'user_id': user_id,
                        'created_at': timestamp
                    })
                    category_labels_added += 1
    
    print(f"Added {category_labels_added} category labels to threads with received emails")
    print(f"Total system thread labels: {len(new_thread_labels)}")
    
    # Combine preserved custom labels with new system labels
    all_thread_labels = preserved_labels + new_thread_labels
    
    print(f"Total thread labels (including preserved): {len(all_thread_labels)}")
    
    # Save the updated thread_labels
    save_fixture('thread_labels', all_thread_labels)
    
    print(f"\nSaved thread_labels.json with {len(all_thread_labels)} entries")
    
    # Print summary stats
    folder_counts = defaultdict(int)
    for tl in new_thread_labels:
        # Find label name
        for label in labels:
            if label['id'] == tl['label_id']:
                folder_counts[label['name']] += 1
                break
    
    print("\nLabel distribution in new system labels:")
    for name, count in sorted(folder_counts.items(), key=lambda x: -x[1]):
        print(f"  {name}: {count}")


if __name__ == '__main__':
    main()
