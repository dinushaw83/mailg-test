#!/usr/bin/env python3
"""Validate email hierarchy consistency in threads.

Checks for:
1. Parent exists: If parent_email_id is set, that email ID must exist
2. Same thread: Parent and child emails must belong to the same thread_id
3. No circular references: Following parent_email_id chain should not create loops
4. Parent is older: Parent email should have an earlier created_at than its children
5. Parent is not a draft: Draft emails should not be used as parents
"""

import json
import sys
from pathlib import Path
from datetime import datetime
from collections import defaultdict

# Set UTF-8 encoding for Windows compatibility
if sys.platform == "win32":
    import codecs
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())
    sys.stderr = codecs.getwriter("utf-8")(sys.stderr.detach())


def parse_datetime(dt_str):
    """Parse datetime string, handling various formats."""
    if not dt_str:
        return None
    # Try common formats
    for fmt in ["%Y-%m-%dT%H:%M:%S.%fZ", "%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%dT%H:%M:%S"]:
        try:
            return datetime.strptime(dt_str, fmt)
        except ValueError:
            continue
    return None


def main():
    fixtures_dir = Path(__file__).parent.parent / "fixtures"
    emails_path = fixtures_dir / "emails.json"
    
    print(f"Loading emails from {emails_path}")
    with open(emails_path, "r", encoding="utf-8") as f:
        emails = json.load(f)
    
    print(f"Loaded {len(emails)} emails\n")
    
    # Build email lookup by ID
    email_by_id = {e["id"]: e for e in emails}
    
    # Track issues
    issues = {
        "parent_not_found": [],
        "different_thread": [],
        "circular_reference": [],
        "parent_newer_than_child": [],
        "parent_is_draft": [],
    }
    
    # Emails with parent_email_id
    emails_with_parent = [e for e in emails if e.get("parent_email_id")]
    print(f"Checking {len(emails_with_parent)} emails with parent_email_id...\n")
    
    for email in emails_with_parent:
        email_id = email["id"]
        parent_id = email["parent_email_id"]
        
        # 1. Check parent exists
        if parent_id not in email_by_id:
            issues["parent_not_found"].append({
                "email_id": email_id,
                "parent_email_id": parent_id,
                "subject": email.get("subject", "")[:50]
            })
            continue  # Can't check other rules if parent doesn't exist
        
        parent = email_by_id[parent_id]
        
        # 2. Check same thread
        if email.get("thread_id") != parent.get("thread_id"):
            issues["different_thread"].append({
                "email_id": email_id,
                "email_thread": email.get("thread_id"),
                "parent_email_id": parent_id,
                "parent_thread": parent.get("thread_id"),
                "subject": email.get("subject", "")[:50]
            })
        
        # 3. Check for circular references
        visited = {email_id}
        current = parent_id
        while current:
            if current in visited:
                issues["circular_reference"].append({
                    "email_id": email_id,
                    "cycle_detected_at": current,
                    "subject": email.get("subject", "")[:50]
                })
                break
            visited.add(current)
            current_email = email_by_id.get(current)
            if current_email:
                current = current_email.get("parent_email_id")
            else:
                break
        
        # 4. Check parent is older
        email_created = parse_datetime(email.get("created_at"))
        parent_created = parse_datetime(parent.get("created_at"))
        if email_created and parent_created and parent_created > email_created:
            issues["parent_newer_than_child"].append({
                "email_id": email_id,
                "email_created": email.get("created_at"),
                "parent_email_id": parent_id,
                "parent_created": parent.get("created_at"),
                "subject": email.get("subject", "")[:50]
            })
        
        # 5. Check parent is not a draft
        if parent.get("status") == "draft":
            issues["parent_is_draft"].append({
                "email_id": email_id,
                "parent_email_id": parent_id,
                "parent_status": parent.get("status"),
                "subject": email.get("subject", "")[:50]
            })
    
    # Report results
    print("=" * 60)
    print("VALIDATION RESULTS")
    print("=" * 60)
    
    total_issues = sum(len(v) for v in issues.values())
    
    for issue_type, issue_list in issues.items():
        print(f"\n{issue_type.upper().replace('_', ' ')}: {len(issue_list)} issues")
        if issue_list:
            for issue in issue_list[:10]:  # Show first 10
                print(f"  - {issue}")
            if len(issue_list) > 10:
                print(f"  ... and {len(issue_list) - 10} more")
    
    print("\n" + "=" * 60)
    print(f"TOTAL ISSUES: {total_issues}")
    print("=" * 60)
    
    if total_issues == 0:
        print("\nAll email hierarchy validations passed!")
    else:
        print(f"\nFound {total_issues} issues that may need attention.")
    
    return total_issues


if __name__ == "__main__":
    issue_count = main()
    sys.exit(0 if issue_count == 0 else 1)
