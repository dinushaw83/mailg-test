# Email Extraction Rules

This document describes how emails are extracted and displayed for different views/folders in the application.

## Overview

The API **always returns the latest email per thread** (threaded view). There is no option for simple email lists - all views are thread-based.

---

## Storage Level Summary

| Attribute | Storage Level | Model | Notes |
|-----------|---------------|-------|-------|
| `is_starred` | Email | `Email.is_starred` | Per-email, but Starred view shows threads with ANY starred email |
| `is_important` | Thread (per user) | `ThreadUserMetadata.is_important` | Thread-level, per user |
| `snooze_until` | Thread (per user) | `ThreadUserMetadata.snooze_until` | Thread-level, per user |
| `is_archived` | Thread (per user) | `ThreadUserMetadata.is_archived` | Thread-level, per user |
| `is_deleted` | Email | `Email.folder = 'trash'` | Moves email to trash folder |
| `is_read` | Email | `Email.is_read` | Per-email |
| `folder` | Email | `Email.folder` | Per-email |
| `scheduled_send_at` | Email | `Email.scheduled_send_at` | Per-email |

---

## Folder Extraction Rules

### Inbox (`folder=inbox`)

**Behavior:** Returns latest email per thread that has the INBOX label for the user.

**Filter Logic:**
- Thread must have the INBOX system label for the user
- User must be sender OR recipient of at least one email in the thread
- Returns latest email from each thread

**Category Filtering:**
- Inbox can be combined with `category` parameter to filter by tab
- Example: `folder=inbox&category=primary` shows only Primary inbox emails
- Available categories: `primary`, `promotions`, `social`, `updates`, `forums`

**Label Behavior:**
- Removing the INBOX label from a thread hides it from inbox (similar to archive)
- The thread will still appear in All Mail view
- Archiving adds this behavior automatically

**Use Case:** Shows active conversations the user wants to track.

```bash
GET /api/v1/emails?folder=inbox                     # All inbox
GET /api/v1/emails?folder=inbox&category=primary    # Primary tab
GET /api/v1/emails?folder=inbox&category=promotions # Promotions tab
GET /api/v1/emails?folder=inbox&category=social     # Social tab
```

---

### Sent (`folder=sent`)

**Behavior:** Returns latest email SENT BY the current user from each thread.

**Filter Logic:**
- `Email.sender_id == current_user.id`
- `Email.folder == 'sent'`
- Returns latest sent email per thread

**Use Case:** Shows conversations where user has sent messages.

---

### Scheduled (`folder=scheduled`)

**Behavior:** Returns latest scheduled email per thread (user is sender).

**Filter Logic:**
- `Email.sender_id == current_user.id`
- `Email.folder == 'scheduled'`
- Returns latest scheduled email per thread

**Use Case:** Shows emails scheduled for future sending.

---

### Drafts (`folder=drafts`)

**Behavior:** Returns latest draft per thread (user is sender).

**Filter Logic:**
- `Email.sender_id == current_user.id`
- `Email.folder == 'drafts'`
- Returns latest draft per thread

**Use Case:** Shows draft emails and reply drafts within thread context.

---

### Trash (`folder=trash`)

**Behavior:** Shows emails in trash folder.

**Filter Logic:**
- `Email.folder == 'trash'`
- User must be sender or recipient
- Returns latest email per thread

**Use Case:** Shows deleted emails.

---

### Spam (`folder=spam`)

**Behavior:** Shows emails marked as spam (similar to trash).

**Filter Logic:**
- `Email.folder == 'spam'`
- User must be sender or recipient
- Returns latest email per thread

**Label Behavior:**
- Marking as spam adds the SPAM system label to thread
- Removing the SPAM label restores all spam emails in thread back to inbox

**Use Case:** Shows emails marked as spam/junk.

---

### All Mail (no folder filter)

**Behavior:** Shows all emails the user is part of, regardless of labels.

**Filter Logic:**
- No folder filter - call API without `folder` parameter
- User must be sender OR recipient
- Returns latest email from each thread
- Includes emails that have been "removed from inbox" (INBOX label removed)
- Excludes archived threads unless `include_archived=true`

**Use Case:** Shows every conversation, including ones removed from inbox.

```bash
GET /api/v1/emails  # All mail (no folder param)
GET /api/v1/emails?include_archived=true  # Including archived
```

---

## Filter Extraction Rules

### Starred (`is_starred=true`)

**Behavior:** Returns latest email from threads where ANY email is starred.

**Filter Logic:**
1. Find all threads where at least one email is starred by the user
2. Return the latest email from each of those threads
3. The returned email may NOT be the starred one - it's the latest in thread

**Marking:** Star is stored on `Email.is_starred` (email-level).

**Use Case:** Shows threads that have been marked important via star.

---

### Important (`is_important=true`)

**Behavior:** Returns latest email from threads marked as important.

**Filter Logic:**
- Thread must have `ThreadUserMetadata.is_important = True` for the user
- Returns latest email per important thread

**Marking:** Stored in `ThreadUserMetadata.is_important` (thread-level per user).

---

### Snoozed (`is_snoozed=true`)

**Behavior:** Returns latest email from snoozed threads.

**Filter Logic:**
- Thread must have `ThreadUserMetadata.snooze_until > now()` for the user
- Returns latest email per snoozed thread

**Marking:** Stored in `ThreadUserMetadata.snooze_until` (thread-level per user).

---

### Archived

**Behavior:** By default, archived threads are excluded from all views.

**Filter Logic:**
- If `include_archived=false` (default): Exclude threads where `ThreadUserMetadata.is_archived = True`
- If `include_archived=true`: Include archived threads

**Marking:** Stored in `ThreadUserMetadata.is_archived` (thread-level per user).

---

## API Endpoints

### List Emails

```
GET /api/v1/emails
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `folder` | string | Filter by folder (inbox, sent, drafts, scheduled, trash, spam) |
| `category` | string | Filter by category (primary, promotions, social, updates, forums) |
| `is_read` | boolean | Filter by read status |
| `is_starred` | boolean | Filter by starred (shows threads with any starred email) |
| `is_snoozed` | boolean | Filter by snoozed status |
| `is_important` | boolean | Filter by important |
| `include_archived` | boolean | Include archived threads (default: false) |
| `search` | string | Search in subject and body |
| `page` | integer | Page number |
| `page_size` | integer | Items per page (max 100) |

**Response:** Always returns latest email per thread.

---

### Thread Operations

All thread operations are in the `/api/v1/threads` controller.

#### Get Thread Emails
```
GET /api/v1/threads/{thread_id}/emails
```
Returns all emails in a thread, ordered by sent_at/created_at.
Emails are automatically marked as read in the background.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `only_trashed` | boolean | If true, returns only emails in trash folder (default: false) |

#### Delete Thread
```
DELETE /api/v1/threads/{thread_id}
```
- `permanent=false`: Moves all user's emails in the thread to trash folder
- `permanent=true`: Permanently deletes all user's emails in thread

#### Restore Thread
```
POST /api/v1/threads/{thread_id}/restore
```
Moves all user's emails in the thread from trash back to inbox.

#### Remove TRASH/SPAM Label (Alternative Restore)
```
DELETE /api/v1/emails/{email_id}/labels/{trash_label_id}
DELETE /api/v1/emails/{email_id}/labels/{spam_label_id}
```
When the TRASH or SPAM system label is removed from a thread, all corresponding emails in that thread are automatically moved back to inbox.

---

### Email Operations

#### Snooze Email (Thread)
```
POST /api/v1/emails/{email_id}/snooze
Body: { "snooze_until": "2024-01-15T09:00:00Z" }
```
Snoozes the entire thread until specified time.

#### Unsnooze Email (Thread)
```
POST /api/v1/emails/{email_id}/unsnooze
```
Removes snooze from the thread.

#### Archive Email (Thread)
```
POST /api/v1/emails/{email_id}/archive
```
Archives the entire thread.

#### Unarchive Email (Thread)
```
POST /api/v1/emails/{email_id}/unarchive
```
Unarchives the thread.

---

## ThreadUserMetadata Model

Stores user-specific thread metadata:

```python
class ThreadUserMetadata:
    id: UUID
    thread_id: UUID
    user_id: UUID
    is_important: bool = False
    snooze_until: DateTime = None
    is_archived: bool = False
    created_at: DateTime
    updated_at: DateTime
```

Each record is unique per `(thread_id, user_id)` combination, allowing different users to have different metadata on shared threads.

---

## Response Fields

### EmailResponse / EmailListResponse

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `is_starred` | bool | `Email.is_starred` | Email-level star |
| `is_important` | bool | `ThreadUserMetadata.is_important` | Thread-level important |
| `is_archived` | bool | `ThreadUserMetadata.is_archived` | Thread-level archive |
| `snooze_until` | datetime | `ThreadUserMetadata.snooze_until` | Thread-level snooze |
| `folder` | string | `Email.folder` | Email folder (inbox, sent, trash, etc.) |

---

## Examples

### Get Inbox (Latest per Thread)
```bash
GET /api/v1/emails?folder=inbox
```

### Get Inbox by Category (Tabs)
```bash
GET /api/v1/emails?folder=inbox&category=primary     # Primary tab
GET /api/v1/emails?folder=inbox&category=promotions  # Promotions tab
GET /api/v1/emails?folder=inbox&category=social      # Social tab
GET /api/v1/emails?folder=inbox&category=updates     # Updates tab
GET /api/v1/emails?folder=inbox&category=forums      # Forums tab
```

### Get Starred Threads
```bash
GET /api/v1/emails?is_starred=true
```

### Get Snoozed Threads
```bash
GET /api/v1/emails?is_snoozed=true
```

### Get Important Threads
```bash
GET /api/v1/emails?is_important=true
```

### Include Archived in Inbox
```bash
GET /api/v1/emails?folder=inbox&include_archived=true
```

### Delete Thread (Soft)
```bash
DELETE /api/v1/threads/{thread_id}
```

### Delete Thread (Permanent)
```bash
DELETE /api/v1/threads/{thread_id}?permanent=true
```
