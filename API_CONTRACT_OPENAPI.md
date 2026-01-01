# Deskzen REST API Contract

This document describes the REST API endpoints for the Deskzen application.

**Base URL**: `/api/v1`

---

## Table of Contents

- [Attachments API](#attachments-api)
  - [Delete Attachment](#delete-attachment)
  - [Get Attachment](#get-attachment)
  - [Download Attachment](#download-attachment)
  - [List Email Attachments](#list-email-attachments)
  - [Upload Attachment](#upload-attachment)
- [Auth API](#auth-api)
  - [Get Current User Info](#get-current-user-info)
  - [Create Token](#create-token)
- [Db Snapshot API](#db-snapshot-api)
  - [Drop Db For Run](#drop-db-for-run)
  - [Get Db Snapshot](#get-db-snapshot)
- [Emails API](#emails-api)
  - [List Emails](#list-emails)
  - [Create Email](#create-email)
  - [Delete Email](#delete-email)
  - [Get Email](#get-email)
  - [Update Email](#update-email)
  - [Forward Email](#forward-email)
  - [Add Label To Email](#add-label-to-email)
  - [Remove Label From Email](#remove-label-from-email)
  - [Move Email](#move-email)
  - [Mark Email Read](#mark-email-read)
  - [Reply To Email](#reply-to-email)
  - [Send Email](#send-email)
  - [Snooze Email](#snooze-email)
  - [Star Email](#star-email)
  - [Unsnooze Email](#unsnooze-email)
- [Folders API](#folders-api)
  - [List Folders](#list-folders)
  - [Create Folder](#create-folder)
  - [Delete Folder](#delete-folder)
  - [Get Folder](#get-folder)
  - [Update Folder](#update-folder)
  - [List Folder Emails](#list-folder-emails)
- [Labels API](#labels-api)
  - [List Labels](#list-labels)
  - [Create Label](#create-label)
  - [List Labels Tree](#list-labels-tree)
  - [Delete Label](#delete-label)
  - [Get Label](#get-label)
  - [Update Label](#update-label)
  - [List Label Emails](#list-label-emails)
- [Search API](#search-api)
  - [Search Emails](#search-emails)
  - [List Saved Searches](#list-saved-searches)
  - [Save Search](#save-search)
  - [Delete Saved Search](#delete-saved-search)
  - [Get Search Suggestions](#get-search-suggestions)
- [Users API](#users-api)
  - [List Users](#list-users)
  - [Create User](#create-user)
  - [Delete User](#delete-user)
  - [Get User](#get-user)
  - [Update User](#update-user)
- [Common Types](#common-types)
- [Error Responses](#error-responses)

---

## Attachments API

### Delete Attachment

**DELETE** `/api/v1/attachments/{attachment_id}`

Delete an attachment.

Permissions:
- Users can only delete attachments on their own draft emails

**Path Parameters**:

- `attachment_id` (required, integer)

**Responses**:

- `204`: Successful Response

- `422`: Validation Error

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "errors": [
      {
        "loc": null,
        "msg": null,
        "type": null
      }
    ]
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

### Get Attachment

**GET** `/api/v1/attachments/{attachment_id}`

Get attachment details.

Permissions:
- Users can only access attachments on emails they have access to

**Path Parameters**:

- `attachment_id` (required, integer)

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "id": 0,
    "email_id": 0,
    "filename": "string",
    "content_type": "string",
    "size_bytes": 0,
    "attachment_type": "string",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

- `422`: Validation Error

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "errors": [
      {
        "loc": null,
        "msg": null,
        "type": null
      }
    ]
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

### Download Attachment

**GET** `/api/v1/attachments/{attachment_id}/download`

Download an attachment.

Permissions:
- Users can only download attachments on emails they have access to

**Path Parameters**:

- `attachment_id` (required, integer)

**Responses**:

- `200`: Successful Response

- `422`: Validation Error

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "errors": [
      {
        "loc": null,
        "msg": null,
        "type": null
      }
    ]
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

### List Email Attachments

**GET** `/api/v1/emails/{email_id}/attachments`

List attachments for an email.

Permissions:
- Users can only access attachments on emails they have access to

**Path Parameters**:

- `email_id` (required, integer)

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": [
    {
      "id": 0,
      "filename": "string",
      "content_type": "string",
      "size_bytes": 0,
      "attachment_type": "string"
    }
  ]
}
```

- `422`: Validation Error

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "errors": [
      {
        "loc": null,
        "msg": null,
        "type": null
      }
    ]
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

### Upload Attachment

**POST** `/api/v1/emails/{email_id}/attachments`

Upload an attachment to an email.

Permissions:
- Users can only add attachments to their own draft emails

**Path Parameters**:

- `email_id` (required, integer)

**Request Body**:

```json
{
  "file": "string"
}
```

**Responses**:

- `201`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "id": 0,
    "email_id": 0,
    "filename": "string",
    "content_type": "string",
    "size_bytes": 0,
    "attachment_type": "string",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

- `422`: Validation Error

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "errors": [
      {
        "loc": null,
        "msg": null,
        "type": null
      }
    ]
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

## Auth API

### Get Current User Info

**GET** `/api/v1/auth/me`

Get current authenticated user information.

Uses the access token from request headers to identify the user.

Args:
    current_user: Current authenticated user (from dependency).
    request: FastAPI request object.
    db: Database session.
    
Returns:
    User information with role.

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "id": 0,
    "first_name": "string",
    "last_name": "string",
    "email": "string",
    "email_label": "string",
    "role": "string",
    "name": "string"
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

### Create Token

**POST** `/api/v1/auth/token`

Generate an access token for a user based on email-based login.

This endpoint authenticates users by looking them up in the database.
The role is ALWAYS derived from the database (user.role), ensuring
the backend is the source of truth for permissions.

Login Flow:
1. User provides email
2. Backend looks up/validates user in the seed/template database
   (to avoid provisioning a new run DB for invalid login attempts)
3. Backend derives role from the database (user.role)
4. Backend creates a fresh run_id and provisions the isolated run DB for that login
5. Backend generates token with user_id, role, email, run_id
6. All subsequent requests use this token and the run_id-scoped database
7. Backend validates token and applies RBAC permissions

Args:
    token_request: Token request with user email.
    request: FastAPI request object.
    
Returns:
    TokenResponse with access_token, user info, role (from DB), and expiration.
    
Raises:
    HTTPException: 400 if user not found.
                  401 if user is deleted or inactive.

**Request Body**:

```json
{
  "email": "string"
}
```

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "access_token": "string",
    "user": {},
    "role": "string",
    "run_id": "string",
    "expires_in": 0
  }
}
```

- `422`: Validation Error

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "errors": [
      {
        "loc": null,
        "msg": null,
        "type": null
      }
    ]
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

## Db Snapshot API

### Drop Db For Run

**DELETE** `/api/v1/db_drop`

Drop/delete the run database for a run_id.

Safety:
- Never drops the Postgres template database.
- Never drops the default run database.

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "success": false,
    "run_id": "string",
    "result": {
      "dropped": false,
      "database": "string",
      "reason": "string"
    }
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

### Get Db Snapshot

**GET** `/api/v1/db_snapshot`

Capture a snapshot of the current database state for a specific run_id.

This endpoint queries all tables in the gym's database and returns their contents as JSON. The run_id is determined based on the authenticated user's token, ensuring we're querying the correct isolated database instance for that user.

Returns:
    JSON object with:
    - run_id: The run ID used for this snapshot
    - captured_at: ISO timestamp of when snapshot was captured
    - tables: Dictionary mapping table names to arrays of row objects
    - summary: Summary statistics (total_tables, total_rows, tables_with_errors)
    
Example response:
{
    "run_id": "run_abc123",
    "captured_at": "2025-12-10T10:30:45.123456",
    "tables": {
        "users": [{"id": 1, "username": "admin"}],
        "tickets": [{"id": 1, "subject": "Test"}]
    },
    "summary": {
        "total_tables": 2,
        "total_rows": 2,
        "tables_with_errors": 0
    }
}

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "run_id": "string",
    "captured_at": "string",
    "tables": {},
    "summary": {
      "total_tables": 0,
      "total_rows": 0,
      "tables_with_errors": 0
    }
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

## Emails API

### List Emails

**GET** `/api/v1/emails`

List emails with pagination and filtering.

Permissions:
- Users can only see their own emails (sent or received)

**Query Parameters**:

- `page` (optional, integer): Page number
- `page_size` (optional, integer): Items per page
- `folder_id` (optional, object): Filter by folder ID
- `folder_type` (optional, object): Filter by folder type
- `status` (optional, object): Filter by status
- `is_read` (optional, object): Filter by read status
- `is_starred` (optional, object): Filter by starred
- `is_snoozed` (optional, object): Filter by snoozed status (True=snoozed, False=not snoozed)
- `search` (optional, object): Search in subject and body

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "results": [
      {
        "id": null,
        "subject": null,
        "snippet": null,
        "status": null,
        "is_read": null,
        "is_starred": null,
        "is_important": null,
        "sender_id": null,
        "created_at": null
      }
    ],
    "total": 0,
    "page": 0,
    "page_size": 0,
    "total_pages": 0
  }
}
```

- `422`: Validation Error

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "errors": [
      {
        "loc": null,
        "msg": null,
        "type": null
      }
    ]
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

### Create Email

**POST** `/api/v1/emails`

Create a new email (draft or send immediately).

Permissions:
- All authenticated users can create emails

**Request Body**:

```json
{
  "subject": "string",
  "body": "string",
  "html_body": "string",
  "recipients": [
    {
      "email": "string",
      "name": "string",
      "type": "string"
    }
  ],
  "folder_id": 0,
  "is_draft": false
}
```

**Responses**:

- `201`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "id": 0,
    "subject": "string",
    "body": "string",
    "html_body": "string",
    "status": "string",
    "is_read": false,
    "is_starred": false,
    "is_important": false,
    "sender_id": 0,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

- `422`: Validation Error

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "errors": [
      {
        "loc": null,
        "msg": null,
        "type": null
      }
    ]
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

### Delete Email

**DELETE** `/api/v1/emails/{email_id}`

Delete an email (soft delete - moves to trash first, then permanent delete).

**Path Parameters**:

- `email_id` (required, integer)

**Responses**:

- `204`: Successful Response

- `422`: Validation Error

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "errors": [
      {
        "loc": null,
        "msg": null,
        "type": null
      }
    ]
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

### Get Email

**GET** `/api/v1/emails/{email_id}`

Get a specific email by ID.

Permissions:
- Users can only access their own emails

**Path Parameters**:

- `email_id` (required, integer)

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "id": 0,
    "subject": "string",
    "body": "string",
    "html_body": "string",
    "status": "string",
    "is_read": false,
    "is_starred": false,
    "is_important": false,
    "sender_id": 0,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

- `422`: Validation Error

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "errors": [
      {
        "loc": null,
        "msg": null,
        "type": null
      }
    ]
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

### Update Email

**PUT** `/api/v1/emails/{email_id}`

Update an email (draft only for content changes).

Permissions:
- Users can only update their own drafts

**Path Parameters**:

- `email_id` (required, integer)

**Request Body**:

```json
{
  "subject": "string",
  "body": "string",
  "html_body": "string",
  "is_read": false,
  "is_starred": false,
  "is_important": false
}
```

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "id": 0,
    "subject": "string",
    "body": "string",
    "html_body": "string",
    "status": "string",
    "is_read": false,
    "is_starred": false,
    "is_important": false,
    "sender_id": 0,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

- `422`: Validation Error

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "errors": [
      {
        "loc": null,
        "msg": null,
        "type": null
      }
    ]
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

### Forward Email

**POST** `/api/v1/emails/{email_id}/forward`

Forward an email.

**Path Parameters**:

- `email_id` (required, integer)

**Request Body**:

```json
{
  "recipients": [
    {
      "email": "string",
      "name": "string",
      "type": "string"
    }
  ],
  "body": "string",
  "html_body": "string"
}
```

**Responses**:

- `201`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "id": 0,
    "subject": "string",
    "body": "string",
    "html_body": "string",
    "status": "string",
    "is_read": false,
    "is_starred": false,
    "is_important": false,
    "sender_id": 0,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

- `422`: Validation Error

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "errors": [
      {
        "loc": null,
        "msg": null,
        "type": null
      }
    ]
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

### Add Label To Email

**POST** `/api/v1/emails/{email_id}/labels`

Add a label to an email.

**Path Parameters**:

- `email_id` (required, integer)

**Request Body**:

```json
{
  "label_id": 0
}
```

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "id": 0,
    "subject": "string",
    "body": "string",
    "html_body": "string",
    "status": "string",
    "is_read": false,
    "is_starred": false,
    "is_important": false,
    "sender_id": 0,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

- `422`: Validation Error

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "errors": [
      {
        "loc": null,
        "msg": null,
        "type": null
      }
    ]
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

### Remove Label From Email

**DELETE** `/api/v1/emails/{email_id}/labels/{label_id}`

Remove a label from an email.

**Path Parameters**:

- `email_id` (required, integer)
- `label_id` (required, integer)

**Responses**:

- `204`: Successful Response

- `422`: Validation Error

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "errors": [
      {
        "loc": null,
        "msg": null,
        "type": null
      }
    ]
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

### Move Email

**POST** `/api/v1/emails/{email_id}/move`

Move an email to a different folder.

**Path Parameters**:

- `email_id` (required, integer)

**Request Body**:

```json
{
  "folder_id": 0
}
```

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "id": 0,
    "subject": "string",
    "body": "string",
    "html_body": "string",
    "status": "string",
    "is_read": false,
    "is_starred": false,
    "is_important": false,
    "sender_id": 0,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

- `422`: Validation Error

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "errors": [
      {
        "loc": null,
        "msg": null,
        "type": null
      }
    ]
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

### Mark Email Read

**PATCH** `/api/v1/emails/{email_id}/read`

Mark an email as read or unread.

**Path Parameters**:

- `email_id` (required, integer)

**Request Body**:

```json
{
  "is_read": false
}
```

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "id": 0,
    "subject": "string",
    "body": "string",
    "html_body": "string",
    "status": "string",
    "is_read": false,
    "is_starred": false,
    "is_important": false,
    "sender_id": 0,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

- `422`: Validation Error

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "errors": [
      {
        "loc": null,
        "msg": null,
        "type": null
      }
    ]
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

### Reply To Email

**POST** `/api/v1/emails/{email_id}/reply`

Reply to an email.

**Path Parameters**:

- `email_id` (required, integer)

**Request Body**:

```json
{
  "body": "string",
  "html_body": "string",
  "reply_all": false
}
```

**Responses**:

- `201`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "id": 0,
    "subject": "string",
    "body": "string",
    "html_body": "string",
    "status": "string",
    "is_read": false,
    "is_starred": false,
    "is_important": false,
    "sender_id": 0,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

- `422`: Validation Error

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "errors": [
      {
        "loc": null,
        "msg": null,
        "type": null
      }
    ]
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

### Send Email

**POST** `/api/v1/emails/{email_id}/send`

Send a draft email.

**Path Parameters**:

- `email_id` (required, integer)

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "id": 0,
    "subject": "string",
    "body": "string",
    "html_body": "string",
    "status": "string",
    "is_read": false,
    "is_starred": false,
    "is_important": false,
    "sender_id": 0,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

- `422`: Validation Error

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "errors": [
      {
        "loc": null,
        "msg": null,
        "type": null
      }
    ]
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

### Snooze Email

**POST** `/api/v1/emails/{email_id}/snooze`

Snooze an email until a specific date and time.

When snoozed, the email is temporarily hidden from the inbox and will
reappear at the specified snooze_until time.

Permissions:
- Users can only snooze their own emails (sent or received)

**Path Parameters**:

- `email_id` (required, integer)

**Request Body**:

```json
{
  "snooze_until": "2024-01-01T00:00:00Z"
}
```

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "id": 0,
    "subject": "string",
    "body": "string",
    "html_body": "string",
    "status": "string",
    "is_read": false,
    "is_starred": false,
    "is_important": false,
    "sender_id": 0,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

- `422`: Validation Error

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "errors": [
      {
        "loc": null,
        "msg": null,
        "type": null
      }
    ]
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

### Star Email

**PATCH** `/api/v1/emails/{email_id}/star`

Star or unstar an email.

**Path Parameters**:

- `email_id` (required, integer)

**Request Body**:

```json
{
  "is_starred": false
}
```

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "id": 0,
    "subject": "string",
    "body": "string",
    "html_body": "string",
    "status": "string",
    "is_read": false,
    "is_starred": false,
    "is_important": false,
    "sender_id": 0,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

- `422`: Validation Error

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "errors": [
      {
        "loc": null,
        "msg": null,
        "type": null
      }
    ]
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

### Unsnooze Email

**POST** `/api/v1/emails/{email_id}/unsnooze`

Unsnooze an email, making it immediately visible again.

Permissions:
- Users can only unsnooze their own emails (sent or received)

**Path Parameters**:

- `email_id` (required, integer)

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "id": 0,
    "subject": "string",
    "body": "string",
    "html_body": "string",
    "status": "string",
    "is_read": false,
    "is_starred": false,
    "is_important": false,
    "sender_id": 0,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

- `422`: Validation Error

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "errors": [
      {
        "loc": null,
        "msg": null,
        "type": null
      }
    ]
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

## Folders API

### List Folders

**GET** `/api/v1/folders`

List user's folders with email counts.

Permissions:
- Users can only see their own folders

**Query Parameters**:

- `include_counts` (optional, boolean): Include email counts

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": [
    {
      "id": 0,
      "name": "string",
      "folder_type": "string",
      "color": "string",
      "icon": "string",
      "is_system": false
    }
  ]
}
```

- `422`: Validation Error

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "errors": [
      {
        "loc": null,
        "msg": null,
        "type": null
      }
    ]
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

### Create Folder

**POST** `/api/v1/folders`

Create a new custom folder.

Permissions:
- All authenticated users can create folders

**Request Body**:

```json
{
  "name": "string",
  "folder_type": "custom",
  "color": "string",
  "icon": "string",
  "parent_folder_id": 0
}
```

**Responses**:

- `201`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "id": 0,
    "name": "string",
    "folder_type": "string",
    "color": "string",
    "icon": "string",
    "owner_id": 0,
    "is_system": false,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

- `422`: Validation Error

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "errors": [
      {
        "loc": null,
        "msg": null,
        "type": null
      }
    ]
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

### Delete Folder

**DELETE** `/api/v1/folders/{folder_id}`

Delete a folder (custom folders only).

Permissions:
- Users can only delete their own custom folders
- System folders cannot be deleted

**Path Parameters**:

- `folder_id` (required, integer)

**Responses**:

- `204`: Successful Response

- `422`: Validation Error

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "errors": [
      {
        "loc": null,
        "msg": null,
        "type": null
      }
    ]
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

### Get Folder

**GET** `/api/v1/folders/{folder_id}`

Get a specific folder by ID.

Permissions:
- Users can only access their own folders

**Path Parameters**:

- `folder_id` (required, integer)

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "id": 0,
    "name": "string",
    "folder_type": "string",
    "color": "string",
    "icon": "string",
    "owner_id": 0,
    "is_system": false,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

- `422`: Validation Error

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "errors": [
      {
        "loc": null,
        "msg": null,
        "type": null
      }
    ]
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

### Update Folder

**PUT** `/api/v1/folders/{folder_id}`

Update a folder (custom folders only for name changes).

Permissions:
- Users can only update their own folders
- System folders can only have color/icon updated

**Path Parameters**:

- `folder_id` (required, integer)

**Request Body**:

```json
{
  "name": "string",
  "color": "string",
  "icon": "string"
}
```

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "id": 0,
    "name": "string",
    "folder_type": "string",
    "color": "string",
    "icon": "string",
    "owner_id": 0,
    "is_system": false,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

- `422`: Validation Error

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "errors": [
      {
        "loc": null,
        "msg": null,
        "type": null
      }
    ]
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

### List Folder Emails

**GET** `/api/v1/folders/{folder_id}/emails`

List emails in a specific folder.

Permissions:
- Users can only access their own folders

**Path Parameters**:

- `folder_id` (required, integer)

**Query Parameters**:

- `page` (optional, integer): Page number
- `page_size` (optional, integer): Items per page
- `is_read` (optional, object): Filter by read status
- `is_starred` (optional, object): Filter by starred

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "results": [
      {
        "id": null,
        "subject": null,
        "snippet": null,
        "status": null,
        "is_read": null,
        "is_starred": null,
        "is_important": null,
        "sender_id": null,
        "created_at": null
      }
    ],
    "total": 0,
    "page": 0,
    "page_size": 0,
    "total_pages": 0
  }
}
```

- `422`: Validation Error

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "errors": [
      {
        "loc": null,
        "msg": null,
        "type": null
      }
    ]
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

## Labels API

### List Labels

**GET** `/api/v1/labels`

List user's labels with email counts.

Args:
    include_counts: Include email counts for each label
    flat: If True, returns flat list. If False, returns hierarchical tree structure.

Permissions:
- Users can only see their own labels

**Query Parameters**:

- `include_counts` (optional, boolean): Include email counts
- `flat` (optional, boolean): Return flat list (True) or hierarchical tree (False)

**Responses**:

- `200`: Successful Response

- `422`: Validation Error

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "errors": [
      {
        "loc": null,
        "msg": null,
        "type": null
      }
    ]
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

### Create Label

**POST** `/api/v1/labels`

Create a new label.

Labels can be nested by specifying a parent_id.

Permissions:
- All authenticated users can create labels

**Request Body**:

```json
{
  "name": "string",
  "color": "string",
  "parent_id": 0
}
```

**Responses**:

- `201`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "id": 0,
    "name": "string",
    "color": "string",
    "owner_id": 0,
    "parent_id": 0,
    "is_deleted": false,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

- `422`: Validation Error

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "errors": [
      {
        "loc": null,
        "msg": null,
        "type": null
      }
    ]
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

### List Labels Tree

**GET** `/api/v1/labels/tree`

List user's labels as hierarchical tree structure.

Returns labels organized in parent-child hierarchy with nested children arrays.

Permissions:
- Users can only see their own labels

**Query Parameters**:

- `include_counts` (optional, boolean): Include email counts

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": [
    {
      "id": 0,
      "name": "string",
      "color": "string",
      "parent_id": 0,
      "email_count": 0,
      "children": []
    }
  ]
}
```

- `422`: Validation Error

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "errors": [
      {
        "loc": null,
        "msg": null,
        "type": null
      }
    ]
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

### Delete Label

**DELETE** `/api/v1/labels/{label_id}`

Delete a label.

Args:
    cascade: If True, deletes all child labels recursively.
             If False, moves child labels to the deleted label's parent.

Permissions:
- Users can only delete their own labels

**Path Parameters**:

- `label_id` (required, integer)

**Query Parameters**:

- `cascade` (optional, boolean): Delete child labels (True) or move them to parent level (False)

**Responses**:

- `204`: Successful Response

- `422`: Validation Error

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "errors": [
      {
        "loc": null,
        "msg": null,
        "type": null
      }
    ]
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

### Get Label

**GET** `/api/v1/labels/{label_id}`

Get a specific label by ID.

Permissions:
- Users can only access their own labels

**Path Parameters**:

- `label_id` (required, integer)

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "id": 0,
    "name": "string",
    "color": "string",
    "owner_id": 0,
    "parent_id": 0,
    "is_deleted": false,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

- `422`: Validation Error

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "errors": [
      {
        "loc": null,
        "msg": null,
        "type": null
      }
    ]
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

### Update Label

**PUT** `/api/v1/labels/{label_id}`

Update a label.

Labels can be moved to a different parent by updating parent_id.
Use parent_id=null or parent_id=0 to move to root level.

Permissions:
- Users can only update their own labels

**Path Parameters**:

- `label_id` (required, integer)

**Request Body**:

```json
{
  "name": "string",
  "color": "string",
  "parent_id": 0
}
```

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "id": 0,
    "name": "string",
    "color": "string",
    "owner_id": 0,
    "parent_id": 0,
    "is_deleted": false,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

- `422`: Validation Error

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "errors": [
      {
        "loc": null,
        "msg": null,
        "type": null
      }
    ]
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

### List Label Emails

**GET** `/api/v1/labels/{label_id}/emails`

List emails with a specific label.

Permissions:
- Users can only access their own labels

**Path Parameters**:

- `label_id` (required, integer)

**Query Parameters**:

- `page` (optional, integer): Page number
- `page_size` (optional, integer): Items per page

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "results": [
      {
        "id": null,
        "subject": null,
        "snippet": null,
        "status": null,
        "is_read": null,
        "is_starred": null,
        "is_important": null,
        "sender_id": null,
        "created_at": null
      }
    ],
    "total": 0,
    "page": 0,
    "page_size": 0,
    "total_pages": 0
  }
}
```

- `422`: Validation Error

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "errors": [
      {
        "loc": null,
        "msg": null,
        "type": null
      }
    ]
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

## Search API

### Search Emails

**GET** `/api/v1/search`

Search emails with comprehensive filtering.

Supports Gmail-like search operators in the 'q' parameter:
- from:sender@example.com
- to:recipient@example.com
- subject:meeting
- has:attachment
- is:starred
- is:unread
- in:inbox
- label:important
- before:2024-12-31
- after:2024-01-01

These can be combined: q="from:john subject:report has:attachment"

**Query Parameters**:

- `q` (optional, object): Search query with operators
- `from` (optional, object): Filter by sender
- `to` (optional, object): Filter by recipient
- `subject` (optional, object): Search in subject
- `folder_id` (optional, object): Filter by folder
- `folder_type` (optional, object): Filter by folder type
- `label_id` (optional, object): Filter by label
- `label_name` (optional, object): Filter by label name
- `is_read` (optional, object): Filter by read status
- `is_starred` (optional, object): Filter by starred
- `is_important` (optional, object): Filter by important
- `has_attachment` (optional, object): Has attachments
- `date_from` (optional, object): Emails after date (YYYY-MM-DD)
- `date_to` (optional, object): Emails before date (YYYY-MM-DD)
- `page` (optional, integer)
- `page_size` (optional, integer)
- `sort_by` (optional, string): Sort by: date, subject, sender
- `sort_order` (optional, string): asc or desc

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "results": [
      {
        "id": null,
        "subject": null,
        "snippet": null,
        "sender_email": null,
        "sender_name": null,
        "recipients": null,
        "is_read": null,
        "is_starred": null,
        "has_attachment": null,
        "created_at": null
      }
    ],
    "total": 0,
    "page": 0,
    "page_size": 0,
    "total_pages": 0,
    "query": "string"
  }
}
```

- `422`: Validation Error

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "errors": [
      {
        "loc": null,
        "msg": null,
        "type": null
      }
    ]
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

### List Saved Searches

**GET** `/api/v1/search/saved`

List user's saved searches.

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": [
    {
      "id": 0,
      "name": "string",
      "query": "string",
      "filters": {},
      "owner_id": 0,
      "use_count": 0,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

### Save Search

**POST** `/api/v1/search/saved`

Save a search query for later use.

**Request Body**:

```json
{
  "name": "string",
  "query": "string"
}
```

**Responses**:

- `201`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "id": 0,
    "name": "string",
    "query": "string",
    "filters": {},
    "owner_id": 0,
    "use_count": 0,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

- `422`: Validation Error

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "errors": [
      {
        "loc": null,
        "msg": null,
        "type": null
      }
    ]
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

### Delete Saved Search

**DELETE** `/api/v1/search/saved/{search_id}`

Delete a saved search.

**Path Parameters**:

- `search_id` (required, integer)

**Responses**:

- `204`: Successful Response

- `422`: Validation Error

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "errors": [
      {
        "loc": null,
        "msg": null,
        "type": null
      }
    ]
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

### Get Search Suggestions

**GET** `/api/v1/search/suggestions`

Get search suggestions based on partial query.

Returns:
- Recent searches matching the query
- Contact suggestions (for from:/to: operators)
- Label suggestions
- Folder suggestions

**Query Parameters**:

- `q` (required, string): Partial query for suggestions
- `limit` (optional, integer)

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "contacts": [],
    "labels": [],
    "folders": [],
    "recent_searches": [],
    "operators": []
  }
}
```

- `422`: Validation Error

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "errors": [
      {
        "loc": null,
        "msg": null,
        "type": null
      }
    ]
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

## Users API

### List Users

**GET** `/api/v1/users`

List users with pagination and filtering.

Permissions:
- user: Can view only active users
- admin: Can view all users including deleted (with show_deleted flag)

Args:
    db: Database session.
    page: Page number (1-indexed).
    page_size: Number of users per page.
    role: Filter by role.
    search: Search term for name/email.
    show_deleted: Include deleted users (admin only).
    
Returns:
    Paginated list of users.

**Query Parameters**:

- `page` (optional, integer): Page number
- `page_size` (optional, integer): Items per page
- `role` (optional, object): Filter by role
- `search` (optional, object): Search in name and email
- `show_deleted` (optional, boolean): Include deleted users (admin only)

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "results": [
      {
        "id": null,
        "first_name": null,
        "last_name": null,
        "email": null,
        "email_label": null,
        "role": null,
        "name": null
      }
    ],
    "total": 0,
    "page": 0,
    "page_size": 0,
    "total_pages": 0
  }
}
```

- `422`: Validation Error

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "errors": [
      {
        "loc": null,
        "msg": null,
        "type": null
      }
    ]
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

### Create User

**POST** `/api/v1/users`

Create a new user.

Permissions:
- admin: Can create users
- user: Not allowed

Args:
    user_data: User creation data.
    db: Database session.
    
Returns:
    Created user.
    
Raises:
    HTTPException: 400 if email already exists or validation fails.

**Request Body**:

```json
{
  "first_name": "string",
  "last_name": "string",
  "email": "string",
  "email_label": "string",
  "role": "user",
  "photo": "string"
}
```

**Responses**:

- `201`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "id": 0,
    "first_name": "string",
    "last_name": "string",
    "email": "string",
    "email_label": "string",
    "role": "string",
    "name": "string"
  }
}
```

- `422`: Validation Error

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "errors": [
      {
        "loc": null,
        "msg": null,
        "type": null
      }
    ]
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

### Delete User

**DELETE** `/api/v1/users/{user_id}`

Delete a user (soft delete).

Permissions:
- admin: Can delete any user
- user: Not allowed

Args:
    user_id: User ID.
    db: Database session.
    
Raises:
    HTTPException: 404 if user not found.

**Path Parameters**:

- `user_id` (required, integer)

**Responses**:

- `204`: Successful Response

- `422`: Validation Error

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "errors": [
      {
        "loc": null,
        "msg": null,
        "type": null
      }
    ]
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

### Get User

**GET** `/api/v1/users/{user_id}`

Get a specific user by ID.

Args:
    user_id: User ID.
    db: Database session.
    
Returns:
    User details.
    
Raises:
    HTTPException: 404 if user not found.

**Path Parameters**:

- `user_id` (required, integer)

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "id": 0,
    "first_name": "string",
    "last_name": "string",
    "email": "string",
    "email_label": "string",
    "role": "string",
    "name": "string"
  }
}
```

- `422`: Validation Error

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "errors": [
      {
        "loc": null,
        "msg": null,
        "type": null
      }
    ]
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

### Update User

**PUT** `/api/v1/users/{user_id}`

Update an existing user.

Permissions:
- admin: Can update any user
- user: Not allowed

Args:
    user_id: User ID.
    user_data: Fields to update.
    db: Database session.
    
Returns:
    Updated user.
    
Raises:
    HTTPException: 404 if user not found, 400 if validation fails.

**Path Parameters**:

- `user_id` (required, integer)

**Request Body**:

```json
{
  "first_name": "string",
  "last_name": "string",
  "email": "string",
  "email_label": "string",
  "role": "string",
  "photo": "string"
}
```

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "id": 0,
    "first_name": "string",
    "last_name": "string",
    "email": "string",
    "email_label": "string",
    "role": "string",
    "name": "string"
  }
}
```

- `422`: Validation Error

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "errors": [
      {
        "loc": null,
        "msg": null,
        "type": null
      }
    ]
  }
}
```

- `401`: Unauthorized

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
}
```

---

## Common Types

_No enum-style common types were found in the OpenAPI components._

---

## Error Responses

### 422 Unprocessable Entity

```json
{
  "detail": [
    {
      "loc": [
        null
      ],
      "msg": "string",
      "type": "string"
    }
  ]
}
```

### 400 Bad Request

```json
{
  "detail": [
    {
      "loc": [
        null
      ],
      "msg": "string",
      "type": "string"
    }
  ]
}
```

### 500 Internal Server Error

```json
{
  "detail": [
    {
      "loc": [
        null
      ],
      "msg": "string",
      "type": "string"
    }
  ]
}
```
