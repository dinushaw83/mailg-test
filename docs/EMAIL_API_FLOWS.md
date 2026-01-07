# 📧 Email API Flows - Sender & Receiver Handling

This document explains how the backend API handles sender and receiver users simultaneously, with complete ready-to-use API request examples.

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Authentication Flow](#authentication-flow)
3. [Email Lifecycle](#email-lifecycle)
4. [API Endpoints Reference](#api-endpoints-reference)
5. [Complete Request Examples](#complete-request-examples)
6. [Sender/Receiver Flow Diagrams](#senderreceiver-flow-diagrams)

---

## 🏗️ Architecture Overview

### Key Design Principles

| Aspect | Implementation |
|--------|----------------|
| **Storage Model** | Copy-per-user (separate email records for sender & recipients) |
| **Recipient Types** | `to`, `cc`, `bcc` supported via `EmailRecipient` table |
| **External Recipients** | `recipient_id = NULL`, only `recipient_email` stored |
| **Folders** | User-specific (each user has own Inbox, Sent, Drafts, etc.) |
| **Status Tracking** | `draft` → `queued` → `sent` (sender) / `received` (recipient) |
| **Thread Support** | Same `thread_id` links conversations across users |
| **Access Control** | Users can only see emails where they're sender OR recipient |

### Email Status Values

| Status | Description |
|--------|-------------|
| `draft` | Email saved but not sent |
| `queued` | Email scheduled for sending (undo window active) |
| `sent` | Email delivered by sender |
| `received` | Email copy in recipient's inbox |
| `archived` | Email archived |
| `cancelled` | Queued email cancelled before sending |

---

## 🔐 Authentication Flow

### Base URL
```
http://localhost:8766/api/v1
```

### Response Wrapper Format
All API responses are wrapped in a standard format:
```json
{
  "success": true,
  "message": "Success",
  "statusCode": 200,
  "data": { /* actual response data */ }
}
```

> **Note:** When extracting data from responses, access `.data` property (e.g., `response.data.access_token`)

### 1. Login and Get Access Token

**Request:**
```bash
curl -X POST "http://localhost:8766/api/v1/auth/token" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Success",
  "statusCode": 200,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "00000000-0000-0000-0000-000000000002",
      "first_name": "John",
      "last_name": "Smith",
      "email": "john@example.com",
      "role": "user"
    },
    "role": "user",
    "run_id": "d489f60a-2052-45b3-aa61-0bbd02e31a04",
    "expires_in": 86400
  }
}
```

### Available Test Users
| Email | Name | Role |
|-------|------|------|
| `admin@example.com` | Admin User | admin |
| `john@example.com` | John Smith | user |
| `jane@example.com` | Jane Doe | user |
| `bob@example.com` | Bob Wilson | user |
| `emily.davis@example.com` | Emily Davis | user |
```

### 2. Use Token in Subsequent Requests

All authenticated endpoints require the `Authorization` header:
```
Authorization: Bearer <access_token>
```

### 3. Get Current User Info

**Request:**
```bash
curl -X GET "http://localhost:8766/api/v1/auth/me" \
  -H "Authorization: Bearer <access_token>"
```

---

## 📬 Email Lifecycle

---

## 🧭 Inbox Categories (Primary / Promotions / Social / Updates / Forums)

MailG’s **frontend** distributes emails into inbox tabs using the email/thread **`labels`** array.

### How categorization works in the UI
- **Promotions/Social/Updates/Forums tabs**: an item is shown when it has:
  - `labels` includes `"Inbox"` **and**
  - `labels` includes the tab name (e.g. `"Promotions"`)
- **Primary tab**: an item is shown when it has:
  - `labels` includes `"Inbox"` **and**
  - it does **not** include any of: `"Promotions"`, `"Social"`, `"Updates"`, `"Forums"`

### What the API should return
For the frontend to place emails into these tabs, each returned email (or thread) should include a `labels` array containing:
- `"Inbox"` (for inbox items)
- plus exactly one of the category labels when applicable:
  - `"Primary"` (optional; Primary is derived by exclusion in the UI)
  - `"Promotions"`
  - `"Social"`
  - `"Updates"`
  - `"Forums"`

> **Note:** Even if your backend supports a `category` field (e.g. `primary` / `promotions`), the current UI logic uses `labels` to render tabs. If you return `category`, also return the corresponding label(s) in `labels` for the best UX.

### Sender → Receiver Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EMAIL SENDING FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────┘

User A (Sender)                                          User B (Recipient)
      │                                                        │
      │  1. Create Email (POST /emails)                        │
      │  ─────────────────────────────►                        │
      │  Creates: Email(status=draft/sent/queued)              │
      │           in User A's Sent folder                      │
      │                                                        │
      │  2. If immediate send or undo timer expires:           │
      │  ─────────────────────────────►                        │
      │                                Creates: Email(status=received)
      │                                         in User B's Inbox
      │                                                        │
      │  3. User B sees email in Inbox                         │
      │  ◄─────────────────────────────                        │
      │                                                        │
      │  4. User B can: Read, Star, Move,                      │
      │     Reply, Forward, Delete                             │
      │                                                        │
```

### Detailed Database Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  POST /api/v1/emails                                                         │
│  Body: { subject, body, recipients: [{email, type}], is_draft: false }       │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  DATABASE OPERATIONS                                                         │
│                                                                              │
│  1. Create Email record for SENDER:                                          │
│     ┌─────────────────────────────────────────────────────────────────────┐  │
│     │ Email {                                                             │  │
│     │   id: uuid-sender-email,                                            │  │
│     │   sender_id: sender_user_id,                                        │  │
│     │   folder_id: sender's SENT folder,                                  │  │
│     │   status: "sent" or "queued",                                       │  │
│     │   sent_at: now(),                                                   │  │
│     │   is_read: true  // Sender has read their own email                 │  │
│     │ }                                                                   │  │
│     └─────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  2. Create EmailRecipient records:                                           │
│     ┌─────────────────────────────────────────────────────────────────────┐  │
│     │ EmailRecipient {                                                    │  │
│     │   email_id: uuid-sender-email,                                      │  │
│     │   recipient_id: recipient_user_id (or NULL if external),            │  │
│     │   recipient_email: "bob@example.com",                               │  │
│     │   recipient_type: "to" | "cc" | "bcc"                               │  │
│     │ }                                                                   │  │
│     └─────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  3. For EACH recipient who is a system user:                                 │
│     ┌─────────────────────────────────────────────────────────────────────┐  │
│     │ Email {                                                             │  │
│     │   id: uuid-recipient-email (NEW ID),                                │  │
│     │   sender_id: sender_user_id (for display),                          │  │
│     │   folder_id: recipient's INBOX folder,                              │  │
│     │   status: "received",                                               │  │
│     │   received_at: now(),                                               │  │
│     │   thread_id: same as sender's email,                                │  │
│     │   is_read: false  // Recipient hasn't read yet                      │  │
│     │ }                                                                   │  │
│     └─────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│     ┌─────────────────────────────────────────────────────────────────────┐  │
│     │ EmailRecipient {                                                    │  │
│     │   email_id: uuid-recipient-email,                                   │  │
│     │   recipient_id: recipient_user_id,                                  │  │
│     │   recipient_email: "bob@example.com",                               │  │
│     │   recipient_type: "to"                                              │  │
│     │ }                                                                   │  │
│     └─────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 📚 API Endpoints Reference

### Email Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/emails` | Create new email (draft or send) |
| `GET` | `/api/v1/emails` | List emails with filters |
| `GET` | `/api/v1/emails/{id}` | Get single email |
| `PATCH` | `/api/v1/emails/{id}` | Update email |
| `DELETE` | `/api/v1/emails/{id}` | Delete email |
| `POST` | `/api/v1/emails/{id}/send` | Send a draft email |
| `POST` | `/api/v1/emails/{id}/cancel-send` | Cancel queued email (undo send) |
| `POST` | `/api/v1/emails/{id}/confirm-send` | Immediately send queued email |
| `PATCH` | `/api/v1/emails/{id}/read` | Mark as read/unread |
| `PATCH` | `/api/v1/emails/{id}/star` | Star/unstar email |
| `POST` | `/api/v1/emails/{id}/move` | Move to folder |
| `POST` | `/api/v1/emails/{id}/reply` | Reply to email |
| `POST` | `/api/v1/emails/{id}/forward` | Forward email |
| `POST` | `/api/v1/emails/{id}/snooze` | Snooze email |
| `POST` | `/api/v1/emails/{id}/unsnooze` | Unsnooze email |
| `POST` | `/api/v1/emails/{id}/archive` | Archive email |

### Folder Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/folders` | Create custom folder |
| `GET` | `/api/v1/folders` | List user's folders |
| `GET` | `/api/v1/folders/{id}` | Get folder details |
| `PATCH` | `/api/v1/folders/{id}` | Update folder |
| `DELETE` | `/api/v1/folders/{id}` | Delete folder |
| `GET` | `/api/v1/folders/{id}/emails` | List emails in folder |

### Label Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/labels` | List all labels for current user |
| `POST` | `/api/v1/labels` | Create new label |
| `PATCH` | `/api/v1/labels/{id}` | Update label (name, color, parent) |
| `DELETE` | `/api/v1/labels/{id}` | Delete label (cascade deletes children) |

---

## 🏷️ Labels System

### Label Architecture

The labels system uses a **UUID-based backend** with **composite key frontend** mapping:

- **Backend Format**: Labels are stored with UUID `id`, `parent_id` (UUID), `name`, `color` (hex), and `email_count`
- **Frontend Format**: Labels use composite keys (e.g., `"Work::Clients"`) derived from parent hierarchy
- **Storage**: Labels are stored in Redux by UUID, with mappings (`labelIdToKeyMap`, `keyToLabelIdMap`) for conversion
- **Tree Building**: Composite keys are built on-the-fly from parent_id relationships

### Label Data Structure

**Backend Response:**
```json
{
  "success": true,
  "message": "Success",
  "statusCode": 200,
  "data": [
    {
      "id": "40000000-0000-0000-0000-000000000001",
      "name": "Important",
      "color": "#FF0000",
      "parent_id": "e34c843e-9e5f-45f9-9007-0a8e9197c40e",
      "email_count": 8
    },
    {
      "id": "40000000-0000-0000-0000-000000000002",
      "name": "Work",
      "color": "#0000FF",
      "parent_id": null,
      "email_count": 12
    },
    {
      "id": "0370742d-3a74-4493-969e-94548696baa2",
      "name": "reason",
      "color": "#65a278",
      "parent_id": null,
      "email_count": 11
    }
  ]
}
```

**Frontend Mapping:**
- UUID `40000000-0000-0000-0000-000000000002` → Composite key `"Work"`
- UUID `0370742d-3a74-4493-969e-94548696baa2` → Composite key `"reason"`
- If "Work" has a child "Clients", composite key becomes `"Work::Clients"`

### Label Hierarchy

- **Root Labels**: `parent_id = null` → Composite key is just the name (e.g., `"Work"`)
- **Nested Labels**: `parent_id = <parent-uuid>` → Composite key is `"Parent::Child"` (e.g., `"Work::Clients"`)
- **Cascade Delete**: Deleting a parent label also deletes all child labels
- **Color Storage**: Colors stored as hex strings (e.g., `"#FF0000"`), converted to `{rgb, text}` format during rendering

### Email Label Operations

- **Add/Remove Labels**: Emails reference labels by UUID in backend, composite keys in frontend
- **Label Filtering**: Filter emails by label using composite key in URL (e.g., `/label/Work::Clients`)
- **Category Labels**: Labels like `"Promotions"`, `"Social"`, `"Updates"`, `"Forums"` determine inbox tab placement

---

## 🧪 Complete Request Examples

### Set Up Variables (PowerShell)
```powershell
$BASE_URL = "http://localhost:8766/api/v1"
$TOKEN = ""  # Will be set after login
```

### Set Up Variables (Bash)
```bash
BASE_URL="http://localhost:8766/api/v1"
TOKEN=""  # Will be set after login
```

---

### 1️⃣ Authentication

#### Login as User A (Sender)
```bash
curl -X POST "${BASE_URL}/auth/token" \
  -H "Content-Type: application/json" \
  -d '{"email": "john@example.com"}'
```

**PowerShell:**
```powershell
$response = Invoke-RestMethod -Uri "$BASE_URL/auth/token" -Method POST `
  -ContentType "application/json" `
  -Body '{"email": "john@example.com"}'
$TOKEN = $response.data.access_token
```

---

### 2️⃣ List User's Folders

```bash
curl -X GET "${BASE_URL}/folders" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Response:**
```json
[
  {
    "id": "folder-uuid-1",
    "name": "Inbox",
    "folder_type": "inbox",
    "is_system": true,
    "email_count": 15,
    "unread_count": 3
  },
  {
    "id": "folder-uuid-2",
    "name": "Sent",
    "folder_type": "sent",
    "is_system": true,
    "email_count": 25,
    "unread_count": 0
  }
]
```

---

### 3️⃣ Create & Send Email

#### Create and Send Immediately
```bash
curl -X POST "${BASE_URL}/emails" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Hello from John!",
    "body": "Hi Jane, this is a test email.",
    "html_body": "<p>Hi Jane, this is a <strong>test email</strong>.</p>",
    "recipients": [
      {"email": "jane@example.com", "name": "Jane Doe", "type": "to"},
      {"email": "bob@example.com", "name": "Bob Wilson", "type": "cc"}
    ],
    "category": "primary",
    "is_draft": false
  }'
```

**Response:**
```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "id": "8844d456-b3bb-485d-bfcb-f1e0c0ec4407",
    "subject": "Hello from John!",
    "body": "Hi Jane, this is a test email.",
    "status": "sent",
    "is_read": true,
    "sender_id": "00000000-0000-0000-0000-000000000002",
    "sender_name": "John Smith",
    "sender_email": "john@example.com",
    "recipients": [
      {"id": "rec-1", "email": "jane@example.com", "name": "Jane Doe", "type": "to"},
      {"id": "rec-2", "email": "bob@example.com", "name": "Bob Wilson", "type": "cc"}
    ],
    "folder_id": "sent-folder-id",
    "sent_at": "2026-01-03T16:39:04.907986",
    "can_undo_send": false
  }
}
```

#### Create as Draft
```bash
curl -X POST "${BASE_URL}/emails" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Draft Email",
    "body": "This is a draft I am working on...",
    "recipients": [
      {"email": "bob@example.com", "type": "to"}
    ],
    "is_draft": true
  }'
```

---

### 4️⃣ Send a Draft Email (With Undo Window)

```bash
curl -X POST "${BASE_URL}/emails/{email_id}/send" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Response (if user has undo_send_delay_seconds > 0):**
```json
{
  "id": "email-uuid-1",
  "status": "queued",
  "scheduled_send_at": "2026-01-03T15:30:10Z",
  "can_undo_send": true
}
```

---

### 5️⃣ Cancel Send (Undo) - Within Undo Window

```bash
curl -X POST "${BASE_URL}/emails/{email_id}/cancel-send" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Response:**
```json
{
  "id": "email-uuid-1",
  "status": "draft",
  "scheduled_send_at": null,
  "can_undo_send": false,
  "folder_id": "drafts-folder-id"
}
```

---

### 6️⃣ Confirm Send Immediately (Skip Undo Window)

```bash
curl -X POST "${BASE_URL}/emails/{email_id}/confirm-send" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

### 7️⃣ List Emails (Sender or Recipient)

#### List All Emails
```bash
curl -X GET "${BASE_URL}/emails" \
  -H "Authorization: Bearer ${TOKEN}"
```

#### Filter by Folder Type (e.g., Inbox)
```bash
curl -X GET "${BASE_URL}/emails?folder_type=inbox" \
  -H "Authorization: Bearer ${TOKEN}"
```

#### Filter by Status
```bash
curl -X GET "${BASE_URL}/emails?status=received" \
  -H "Authorization: Bearer ${TOKEN}"
```

#### Filter by Read Status
```bash
curl -X GET "${BASE_URL}/emails?is_read=false" \
  -H "Authorization: Bearer ${TOKEN}"
```

#### Filter by Category
```bash
curl -X GET "${BASE_URL}/emails?category=primary" \
  -H "Authorization: Bearer ${TOKEN}"
```

#### Search Emails
```bash
curl -X GET "${BASE_URL}/emails?search=meeting" \
  -H "Authorization: Bearer ${TOKEN}"
```

#### Pagination
```bash
curl -X GET "${BASE_URL}/emails?page=1&page_size=20" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Response:**
```json
{
  "results": [
    {
      "id": "email-uuid-1",
      "subject": "Hello from Alice!",
      "snippet": "Hi Bob, this is a test email...",
      "status": "received",
      "is_read": false,
      "is_starred": false,
      "sender_name": "Alice Smith",
      "sender_email": "alice@example.com",
      "created_at": "2026-01-03T15:30:00Z",
      "has_attachments": false,
      "labels": []
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 20,
  "total_pages": 1
}
```

---

### 8️⃣ Get Single Email

```bash
curl -X GET "${BASE_URL}/emails/{email_id}" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

### 9️⃣ Mark Email as Read/Unread

```bash
curl -X PATCH "${BASE_URL}/emails/{email_id}/read" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"is_read": true}'
```

---

### 🔟 Star/Unstar Email

```bash
curl -X PATCH "${BASE_URL}/emails/{email_id}/star" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"is_starred": true}'
```

---

### 1️⃣1️⃣ Move Email to Folder

```bash
curl -X POST "${BASE_URL}/emails/{email_id}/move" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"folder_id": "target-folder-uuid"}'
```

---

### 1️⃣2️⃣ Reply to Email

```bash
curl -X POST "${BASE_URL}/emails/{email_id}/reply" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "body": "Thank you for your email!",
    "html_body": "<p>Thank you for your email!</p>",
    "reply_all": false
  }'
```

---

### 1️⃣3️⃣ Forward Email

```bash
curl -X POST "${BASE_URL}/emails/{email_id}/forward" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {"email": "dave@example.com", "name": "Dave Wilson", "type": "to"}
    ],
    "body": "FYI - See the email below.",
    "html_body": "<p>FYI - See the email below.</p>"
  }'
```

---

### 1️⃣4️⃣ Snooze Email

```bash
curl -X POST "${BASE_URL}/emails/{email_id}/snooze" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"snooze_until": "2026-01-04T09:00:00Z"}'
```

---

### 1️⃣5️⃣ Unsnooze Email

```bash
curl -X POST "${BASE_URL}/emails/{email_id}/unsnooze" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

### 1️⃣6️⃣ Archive Email

```bash
curl -X POST "${BASE_URL}/emails/{email_id}/archive" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "id": "email-uuid-1",
    "subject": "Meeting tomorrow",
    "status": "archived",
    "is_read": true,
    "is_starred": false
  }
}
```

---

### 1️⃣7️⃣ Delete Email

#### Soft Delete (Move to Trash)
```bash
curl -X DELETE "${BASE_URL}/emails/{email_id}" \
  -H "Authorization: Bearer ${TOKEN}"
```

#### Permanent Delete
```bash
curl -X DELETE "${BASE_URL}/emails/{email_id}?permanent=true" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## 🏷️ Label Operations

### 1️⃣8️⃣ List All Labels

```bash
curl -X GET "${BASE_URL}/labels" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "message": "Success",
  "statusCode": 200,
  "data": [
    {
      "id": "40000000-0000-0000-0000-000000000001",
      "name": "Important",
      "color": "#FF0000",
      "parent_id": null,
      "email_count": 8
    },
    {
      "id": "40000000-0000-0000-0000-000000000002",
      "name": "Work",
      "color": "#0000FF",
      "parent_id": null,
      "email_count": 12
    },
    {
      "id": "0370742d-3a74-4493-969e-94548696baa2",
      "name": "Clients",
      "color": "#65a278",
      "parent_id": "40000000-0000-0000-0000-000000000002",
      "email_count": 5
    }
  ]
}
```

### 1️⃣9️⃣ Create Label

#### Create Root Label
```bash
curl -X POST "${BASE_URL}/labels" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Important",
    "color": "#FF0000"
  }'
```

#### Create Nested Label (Sublabel)
```bash
curl -X POST "${BASE_URL}/labels" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Clients",
    "color": "#65a278",
    "parent_id": "40000000-0000-0000-0000-000000000002"
  }'
```

**Response:**
```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "id": "0370742d-3a74-4493-969e-94548696baa2",
    "name": "Clients",
    "color": "#65a278",
    "parent_id": "40000000-0000-0000-0000-000000000002",
    "email_count": 0
  }
}
```

### 2️⃣0️⃣ Update Label

#### Update Label Name
```bash
curl -X PATCH "${BASE_URL}/labels/{label_id}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Important Tasks"
  }'
```

#### Update Label Color
```bash
curl -X PATCH "${BASE_URL}/labels/{label_id}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "color": "#00FF00"
  }'
```

#### Move Label to Different Parent
```bash
curl -X PATCH "${BASE_URL}/labels/{label_id}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "parent_id": "new-parent-uuid"
  }'
```

### 2️⃣1️⃣ Delete Label

```bash
curl -X DELETE "${BASE_URL}/labels/{label_id}" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Note:** Deleting a label will cascade delete all child labels as well.

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Label deleted successfully"
}
```

### 2️⃣2️⃣ Update Email Labels

```bash
curl -X POST "${BASE_URL}/emails/labels" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "emailIds": ["email-uuid-1", "email-uuid-2"],
    "labels": {
      "add": ["label-uuid-1", "label-uuid-2"],
      "remove": ["label-uuid-3"]
    }
  }'
```

**Note:** Labels are referenced by UUID in the API request. The frontend converts composite keys to UUIDs before sending.

---

## 📧 Email Listing with Category Filters

### Category-Based Email Listing

The frontend uses `category` query parameter to filter emails into inbox tabs:

#### List Primary Emails
```bash
curl -X GET "${BASE_URL}/emails?category=primary" \
  -H "Authorization: Bearer ${TOKEN}"
```

#### List Promotions
```bash
curl -X GET "${BASE_URL}/emails?category=promotions" \
  -H "Authorization: Bearer ${TOKEN}"
```

#### List Social Emails
```bash
curl -X GET "${BASE_URL}/emails?category=social" \
  -H "Authorization: Bearer ${TOKEN}"
```

#### List Updates
```bash
curl -X GET "${BASE_URL}/emails?category=updates" \
  -H "Authorization: Bearer ${TOKEN}"
```

### Combined Filters

```bash
# List unread primary emails with pagination
curl -X GET "${BASE_URL}/emails?category=primary&is_read=false&page=1&page_size=20" \
  -H "Authorization: Bearer ${TOKEN}"
```

### Email Response with Labels

**Response:**
```json
{
  "results": [
    {
      "id": "email-uuid-1",
      "subject": "Hello from Alice!",
      "snippet": "Hi Bob, this is a test email...",
      "status": "received",
      "is_read": false,
      "is_starred": false,
      "sender_name": "Alice Smith",
      "sender_email": "alice@example.com",
      "created_at": "2026-01-03T15:30:00Z",
      "has_attachments": false,
      "labels": [
        {
          "id": "label-uuid-1",
          "name": "Inbox",
          "color": null
        },
        {
          "id": "label-uuid-2",
          "name": "Promotions",
          "color": "#FF0000"
        }
      ]
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 20,
  "total_pages": 1
}
```

**Important:** The `labels` array in email responses should include:
- Label objects with `id` (UUID), `name`, and `color` (hex string)
- Category labels like `"Promotions"`, `"Social"`, `"Updates"`, `"Forums"` for inbox tab filtering
- System label `"Inbox"` for inbox items

---

## 🔄 Sender/Receiver Flow Diagrams

### Complete Multi-User Email Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MULTI-USER EMAIL SYSTEM                               │
└─────────────────────────────────────────────────────────────────────────────┘

                     ┌──────────────────────────────────────────┐
                     │              DATABASE                     │
                     │                                          │
                     │  ┌──────────────────────────────────┐   │
                     │  │         users table               │   │
                     │  │  - Alice (sender)                 │   │
                     │  │  - Bob (recipient)                │   │
                     │  │  - Carol (cc recipient)           │   │
                     │  └──────────────────────────────────┘   │
                     │                                          │
                     │  ┌──────────────────────────────────┐   │
                     │  │        folders table              │   │
                     │  │  - Alice: Inbox, Sent, Drafts...  │   │
                     │  │  - Bob: Inbox, Sent, Drafts...    │   │
                     │  │  - Carol: Inbox, Sent, Drafts...  │   │
                     │  └──────────────────────────────────┘   │
                     │                                          │
                     │  ┌──────────────────────────────────┐   │
                     │  │         emails table              │   │
                     │  │  - Email #1 (Alice's sent copy)   │   │
                     │  │  - Email #2 (Bob's received copy) │   │
                     │  │  - Email #3 (Carol's received)    │   │
                     │  └──────────────────────────────────┘   │
                     └──────────────────────────────────────────┘

  USER A (Alice)                                            USER B (Bob)
  ══════════════                                            ═════════════
       │                                                         │
       │  POST /auth/token {email: alice@example.com}            │
       ├──────────────────────────────────────►                  │
       │  ◄── Token A                                            │
       │                                                         │
       │  POST /emails                                           │
       │  {                                                      │
       │    subject: "Meeting tomorrow",                         │
       │    recipients: [                                        │
       │      {email: bob@example.com, type: to},                │
       │      {email: carol@example.com, type: cc}               │
       │    ]                                                    │
       │  }                                                      │
       ├──────────────────────────────────────►                  │
       │                                                         │
       │  ┌─────────────────────────────────────────────────┐    │
       │  │  DB: Creates 3 email records:                   │    │
       │  │   1. Alice's SENT copy (status=sent)            │    │
       │  │   2. Bob's INBOX copy (status=received)         │    │
       │  │   3. Carol's INBOX copy (status=received)       │    │
       │  └─────────────────────────────────────────────────┘    │
       │                                                         │
       │                                                         │
       │                                    POST /auth/token     │
       │                                    {email: bob@example.com}
       │                                   ◄──────────────────────┤
       │                                    Token B ──►           │
       │                                                         │
       │                                    GET /emails?folder_type=inbox
       │                                   ◄──────────────────────┤
       │                                    Returns: Bob's received emails
       │                                                         │
       │                                    GET /emails/{id}     │
       │                                   ◄──────────────────────┤
       │                                    Returns: Email details │
       │                                                         │
       │                                    PATCH /emails/{id}/read
       │                                    {is_read: true}       │
       │                                   ◄──────────────────────┤
       │                                    Bob marks as read     │
       │                                                         │
       │                                    POST /emails/{id}/reply
       │                                    {body: "Sure!"}       │
       │                                   ◄──────────────────────┤
       │                                                         │
       │  ┌─────────────────────────────────────────────────┐    │
       │  │  DB: Creates new email records:                 │    │
       │  │   4. Bob's SENT copy (reply)                    │    │
       │  │   5. Alice's INBOX copy (received reply)        │    │
       │  └─────────────────────────────────────────────────┘    │
       │                                                         │
       │  GET /emails?folder_type=inbox                          │
       ├──────────────────────────────────────►                  │
       │  ◄── Returns: Alice's received emails (includes reply)  │
       │                                                         │
```

### Undo Send Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           UNDO SEND FEATURE                                  │
└─────────────────────────────────────────────────────────────────────────────┘

  User (undo_send_delay_seconds = 10)
       │
       │  POST /emails (is_draft: false)
       ├──────────────────────────────────────►
       │  Creates email with status="queued"
       │  scheduled_send_at = now + 10 seconds
       │  can_undo_send: true
       │
       │  Within 10 seconds:
       │  ┌──────────────────────────────────────────────────────────────────┐
       │  │ Option A: Cancel Send                                           │
       │  │   POST /emails/{id}/cancel-send                                 │
       │  │   Result: status → "draft", moved to Drafts folder              │
       │  └──────────────────────────────────────────────────────────────────┘
       │  ┌──────────────────────────────────────────────────────────────────┐
       │  │ Option B: Confirm Send Immediately                              │
       │  │   POST /emails/{id}/confirm-send                                │
       │  │   Result: status → "sent", delivered to recipients now          │
       │  └──────────────────────────────────────────────────────────────────┘
       │  ┌──────────────────────────────────────────────────────────────────┐
       │  │ Option C: Wait (do nothing)                                     │
       │  │   Background task processes after scheduled_send_at             │
       │  │   Result: status → "sent", delivered to recipients              │
       │  └──────────────────────────────────────────────────────────────────┘
       │
       │  After 10 seconds (if not cancelled):
       │  ┌──────────────────────────────────────────────────────────────────┐
       │  │ Background Scheduled Sender Task:                               │
       │  │   1. Finds queued emails where scheduled_send_at <= now         │
       │  │   2. Updates status to "sent"                                   │
       │  │   3. Creates received copies for all system user recipients     │
       │  │   4. Sets scheduled_send_at to NULL                             │
       │  └──────────────────────────────────────────────────────────────────┘
```

---

## 🔑 Key Points Summary

1. **Each user has their own email copy** - Sender gets a "sent" copy, recipients get "received" copies.

2. **Folders are user-specific** - Each user has their own Inbox, Sent, Drafts, Trash folders.

3. **External recipients** - Recipients not in the system have `recipient_id = NULL`, only their email is stored.

4. **Thread linking** - All copies share the same `thread_id` for conversation threading.

5. **Independent actions** - Recipients can read, star, delete their copy without affecting sender's copy.

6. **Undo send** - Emails can be queued with a delay (5-30 seconds) allowing cancellation before delivery.

7. **Access control** - Users can only access emails where they are sender OR recipient.

8. **Labels system** - UUID-based backend with composite key frontend mapping for hierarchical labels.

9. **Category filtering** - Use `category` query parameter (`primary`, `promotions`, `social`, `updates`) to filter emails for inbox tabs.

10. **Label operations** - Labels support nested hierarchy (parent/child relationships), colors, and cascade deletion.

---

## 📝 Sample Test Scenario

### Complete Flow: John sends to Jane

```bash
# 1. John logs in
JOHN_TOKEN=$(curl -s -X POST "${BASE_URL}/auth/token" \
  -H "Content-Type: application/json" \
  -d '{"email": "john@example.com"}' | jq -r '.data.access_token')

# 2. John sends email to Jane
EMAIL_RESPONSE=$(curl -s -X POST "${BASE_URL}/emails" \
  -H "Authorization: Bearer ${JOHN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Important: Project Update",
    "body": "Hi Jane, please review the attached document.",
    "recipients": [{"email": "jane@example.com", "type": "to"}],
    "is_draft": false
  }')
echo "Sent email: $EMAIL_RESPONSE"

# 3. Jane logs in (Note: Creates new isolated database for testing)
JANE_TOKEN=$(curl -s -X POST "${BASE_URL}/auth/token" \
  -H "Content-Type: application/json" \
  -d '{"email": "jane@example.com"}' | jq -r '.data.access_token')

# 4. Jane checks inbox
curl -s -X GET "${BASE_URL}/emails?folder_type=inbox" \
  -H "Authorization: Bearer ${JANE_TOKEN}" | jq

# 5. Jane marks email as read
EMAIL_ID=$(curl -s -X GET "${BASE_URL}/emails?folder_type=inbox" \
  -H "Authorization: Bearer ${JANE_TOKEN}" | jq -r '.data.results[0].id')

curl -X PATCH "${BASE_URL}/emails/${EMAIL_ID}/read" \
  -H "Authorization: Bearer ${JANE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"is_read": true}'

# 6. Jane replies
curl -X POST "${BASE_URL}/emails/${EMAIL_ID}/reply" \
  -H "Authorization: Bearer ${JANE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "body": "Thanks John, I will review it today!",
    "reply_all": false
  }'

# 7. John checks for replies (Note: Requires same run_id/session)
curl -s -X GET "${BASE_URL}/emails?folder_type=inbox" \
  -H "Authorization: Bearer ${JOHN_TOKEN}" | jq
```

### PowerShell Complete Flow Example (Verified Working)

```powershell
$BASE_URL = "http://localhost:8766/api/v1"

# 1. John logs in
$johnResponse = Invoke-RestMethod -Uri "$BASE_URL/auth/token" -Method POST `
  -ContentType "application/json" -Body '{"email": "john@example.com"}'
$JOHN_TOKEN = $johnResponse.data.access_token
$headers = @{ "Authorization" = "Bearer $JOHN_TOKEN"; "Content-Type" = "application/json" }

# 2. List John's folders
$folders = Invoke-RestMethod -Uri "$BASE_URL/folders" -Method GET -Headers $headers
$folders.data | Format-Table name, folder_type, email_count, unread_count

# 3. Send email to Jane
$emailBody = @{
    subject = "API Test: Meeting Tomorrow"
    body = "Hi Jane, just confirming our meeting tomorrow at 10am."
    recipients = @(@{ email = "jane@example.com"; name = "Jane Doe"; type = "to" })
    is_draft = $false
} | ConvertTo-Json -Depth 3
$newEmail = Invoke-RestMethod -Uri "$BASE_URL/emails" -Method POST -Headers $headers -Body $emailBody
Write-Host "Email sent! ID: $($newEmail.data.id), Status: $($newEmail.data.status)"

# 4. List John's sent folder
$sentEmails = Invoke-RestMethod -Uri "$BASE_URL/emails?folder_type=sent" -Method GET -Headers $headers
$sentEmails.data.results | Select-Object id, subject, status, sent_at | Format-Table

# 5. Star an email
$emailId = $sentEmails.data.results[0].id
$starResult = Invoke-RestMethod -Uri "$BASE_URL/emails/$emailId/star" -Method PATCH `
  -Headers $headers -Body '{"is_starred": true}'
Write-Host "Starred: $($starResult.data.is_starred)"
```

---

## ⚠️ Error Responses

| Status Code | Meaning |
|-------------|---------|
| `400` | Bad request (validation error, invalid parameters) |
| `401` | Unauthorized (missing/invalid token) |
| `403` | Forbidden (insufficient permissions) |
| `404` | Resource not found |
| `500` | Internal server error |

**Example Error Response:**
```json
{
  "detail": "Email not found"
}
```

