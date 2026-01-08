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
  - [Create Attachment](#create-attachment)
- [Auth API](#auth-api)
  - [Get Current User Info](#get-current-user-info)
  - [Create Token](#create-token)
- [Bulk API](#bulk-api)
  - [Bulk Archive](#bulk-archive)
  - [Bulk Update Category](#bulk-update-category)
  - [Bulk Delete](#bulk-delete)
  - [Bulk Add Labels](#bulk-add-labels)
  - [Bulk Remove Labels](#bulk-remove-labels)
  - [Bulk Move](#bulk-move)
  - [Bulk Mark Read](#bulk-mark-read)
  - [Bulk Snooze](#bulk-snooze)
  - [Bulk Spam](#bulk-spam)
  - [Bulk Star](#bulk-star)
  - [Bulk Unarchive](#bulk-unarchive)
  - [Bulk Unsnooze](#bulk-unsnooze)
  - [Bulk Unspam](#bulk-unspam)
- [Db Snapshot API](#db-snapshot-api)
  - [Drop Db For Run](#drop-db-for-run)
  - [Get Db Schema](#get-db-schema)
  - [Get Db Snapshot](#get-db-snapshot)
- [Emails API](#emails-api)
  - [List Emails](#list-emails)
  - [Create Email](#create-email)
  - [Get Email Category Counts](#get-email-category-counts)
  - [Get Emails By Thread](#get-emails-by-thread)
  - [Delete Email](#delete-email)
  - [Get Email](#get-email)
  - [Update Email](#update-email)
  - [Archive Email](#archive-email)
  - [Cancel Send](#cancel-send)
  - [Update Email Category](#update-email-category)
  - [Confirm Send](#confirm-send)
  - [Forward Email](#forward-email)
  - [Add Label To Email](#add-label-to-email)
  - [Remove Label From Email](#remove-label-from-email)
  - [Move Email](#move-email)
  - [Mark Email Read](#mark-email-read)
  - [Reply To Email](#reply-to-email)
  - [Restore Email From Trash](#restore-email-from-trash)
  - [Send Email](#send-email)
  - [Snooze Email](#snooze-email)
  - [Mark Email Spam](#mark-email-spam)
  - [Star Email](#star-email)
  - [Unarchive Email](#unarchive-email)
  - [Unsnooze Email](#unsnooze-email)
  - [Unmark Email Spam](#unmark-email-spam)
- [Labels API](#labels-api)
  - [List Labels](#list-labels)
  - [Create Label](#create-label)
  - [List Labels Tree](#list-labels-tree)
  - [Delete Label](#delete-label)
  - [Get Label](#get-label)
  - [Update Label](#update-label)
  - [List Label Emails](#list-label-emails)
- [Metrics API](#metrics-api)
  - [Metrics Health](#metrics-health)
  - [Get Label Values](#get-label-values)
  - [Get Labels](#get-labels)
  - [Query Instant](#query-instant)
  - [Query Range](#query-range)
- [Search API](#search-api)
  - [Search Emails](#search-emails)
  - [List Saved Searches](#list-saved-searches)
  - [Save Search](#save-search)
  - [Delete Saved Search](#delete-saved-search)
  - [Get Search Suggestions](#get-search-suggestions)
- [Templates API](#templates-api)
  - [List Templates](#list-templates)
  - [Create Template](#create-template)
  - [Delete Template](#delete-template)
  - [Get Template](#get-template)
  - [Update Template](#update-template)
  - [Apply Template](#apply-template)
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

Args:
    permanent: If True, permanently removes from database. If False (default), soft deletes.

Permissions:
- Users can only delete attachments on their own draft emails

**Path Parameters**:

- `attachment_id` (required, string)

**Query Parameters**:

- `permanent` (optional, boolean): Permanently delete instead of soft delete

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

- `attachment_id` (required, string)

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "id": "00000000-0000-0000-0000-000000000000",
    "email_id": "00000000-0000-0000-0000-000000000000",
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

Get download URL for an attachment (mock - returns placeholder info).

In a production system, this would return a pre-signed URL for direct download.
Since this is a mock system without actual file storage, it returns metadata.

Permissions:
- Users can only access attachments on emails they have access to

**Path Parameters**:

- `attachment_id` (required, string)

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
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

### List Email Attachments

**GET** `/api/v1/emails/{email_id}/attachments`

List attachments for an email.

Permissions:
- Users can only access attachments on emails they have access to

**Path Parameters**:

- `email_id` (required, string)

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": [
    {
      "id": "00000000-0000-0000-0000-000000000000",
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

### Create Attachment

**POST** `/api/v1/emails/{email_id}/attachments`

Create attachment metadata for an email (mock - no actual file storage).

This endpoint accepts attachment metadata only. In a production system,
actual file upload would be handled separately via pre-signed URLs or similar.

Permissions:
- Users can only add attachments to their own draft emails

**Path Parameters**:

- `email_id` (required, string)

**Request Body**:

```json
{
  "filename": "string",
  "content_type": "string",
  "size_bytes": 0
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
    "id": "00000000-0000-0000-0000-000000000000",
    "email_id": "00000000-0000-0000-0000-000000000000",
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
    "id": "00000000-0000-0000-0000-000000000000",
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

## Bulk API

### Bulk Archive

**POST** `/api/v1/bulk/archive`

Archive multiple emails.

Archives emails by setting their status to 'archived'.

Permissions:
- Users can only archive their own emails

**Request Body**:

```json
{
  "email_ids": [
    "00000000-0000-0000-0000-000000000000"
  ]
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
    "total_requested": 0,
    "successful": 0,
    "failed": 0,
    "results": [
      {
        "id": null,
        "success": null,
        "error": null
      }
    ]
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

### Bulk Update Category

**POST** `/api/v1/bulk/category`

Update category for multiple emails.

Categories: primary, promotions, social, updates, forums (Gmail-style tabs).

Permissions:
- Users can only update category on their own emails

**Request Body**:

```json
{
  "email_ids": [
    "00000000-0000-0000-0000-000000000000"
  ],
  "category": "string"
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
    "total_requested": 0,
    "successful": 0,
    "failed": 0,
    "results": [
      {
        "id": null,
        "success": null,
        "error": null
      }
    ]
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

### Bulk Delete

**POST** `/api/v1/bulk/delete`

Delete multiple emails.

If permanent=False (default), moves emails to trash.
If permanent=True or already in trash, permanently deletes (soft delete).

Permissions:
- Users can only delete their own emails

**Request Body**:

```json
{
  "email_ids": [
    "00000000-0000-0000-0000-000000000000"
  ],
  "permanent": false
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
    "total_requested": 0,
    "successful": 0,
    "failed": 0,
    "results": [
      {
        "id": null,
        "success": null,
        "error": null
      }
    ]
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

### Bulk Add Labels

**POST** `/api/v1/bulk/labels/add`

Add labels to multiple emails.

Permissions:
- Users can only modify their own emails
- Labels must belong to the user

**Request Body**:

```json
{
  "email_ids": [
    "00000000-0000-0000-0000-000000000000"
  ],
  "label_ids": [
    "00000000-0000-0000-0000-000000000000"
  ]
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
    "total_requested": 0,
    "successful": 0,
    "failed": 0,
    "results": [
      {
        "id": null,
        "success": null,
        "error": null
      }
    ]
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

### Bulk Remove Labels

**POST** `/api/v1/bulk/labels/remove`

Remove labels from multiple emails.

Permissions:
- Users can only modify their own emails

**Request Body**:

```json
{
  "email_ids": [
    "00000000-0000-0000-0000-000000000000"
  ],
  "label_ids": [
    "00000000-0000-0000-0000-000000000000"
  ]
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
    "total_requested": 0,
    "successful": 0,
    "failed": 0,
    "results": [
      {
        "id": null,
        "success": null,
        "error": null
      }
    ]
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

### Bulk Move

**POST** `/api/v1/bulk/move`

Move multiple emails to a folder.

Permissions:
- Users can only move their own emails

**Request Body**:

```json
{
  "email_ids": [
    "00000000-0000-0000-0000-000000000000"
  ],
  "folder": "string"
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
    "total_requested": 0,
    "successful": 0,
    "failed": 0,
    "results": [
      {
        "id": null,
        "success": null,
        "error": null
      }
    ]
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

### Bulk Mark Read

**POST** `/api/v1/bulk/read`

Mark multiple emails as read or unread.

Permissions:
- Users can only modify their own emails (sent or received)

**Request Body**:

```json
{
  "email_ids": [
    "00000000-0000-0000-0000-000000000000"
  ],
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
    "total_requested": 0,
    "successful": 0,
    "failed": 0,
    "results": [
      {
        "id": null,
        "success": null,
        "error": null
      }
    ]
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

### Bulk Snooze

**POST** `/api/v1/bulk/snooze`

Snooze multiple emails until a specific date/time.

Permissions:
- Users can only snooze their own emails

**Request Body**:

```json
{
  "email_ids": [
    "00000000-0000-0000-0000-000000000000"
  ],
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
    "total_requested": 0,
    "successful": 0,
    "failed": 0,
    "results": [
      {
        "id": null,
        "success": null,
        "error": null
      }
    ]
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

### Bulk Spam

**POST** `/api/v1/bulk/spam`

Mark multiple emails as spam.

Moves emails to the spam folder.

Permissions:
- Users can only mark their own emails as spam

**Request Body**:

```json
{
  "email_ids": [
    "00000000-0000-0000-0000-000000000000"
  ]
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
    "total_requested": 0,
    "successful": 0,
    "failed": 0,
    "results": [
      {
        "id": null,
        "success": null,
        "error": null
      }
    ]
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

### Bulk Star

**POST** `/api/v1/bulk/star`

Star or unstar multiple emails.

Permissions:
- Users can only modify their own emails

**Request Body**:

```json
{
  "email_ids": [
    "00000000-0000-0000-0000-000000000000"
  ],
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
    "total_requested": 0,
    "successful": 0,
    "failed": 0,
    "results": [
      {
        "id": null,
        "success": null,
        "error": null
      }
    ]
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

### Bulk Unarchive

**POST** `/api/v1/bulk/unarchive`

Unarchive multiple emails.

Restores archived emails back to their original status (sent or received).

Permissions:
- Users can only unarchive their own emails

**Request Body**:

```json
{
  "email_ids": [
    "00000000-0000-0000-0000-000000000000"
  ]
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
    "total_requested": 0,
    "successful": 0,
    "failed": 0,
    "results": [
      {
        "id": null,
        "success": null,
        "error": null
      }
    ]
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

### Bulk Unsnooze

**POST** `/api/v1/bulk/unsnooze`

Unsnooze multiple emails.

Permissions:
- Users can only unsnooze their own emails

**Request Body**:

```json
{
  "email_ids": [
    "00000000-0000-0000-0000-000000000000"
  ]
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
    "total_requested": 0,
    "successful": 0,
    "failed": 0,
    "results": [
      {
        "id": null,
        "success": null,
        "error": null
      }
    ]
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

### Bulk Unspam

**POST** `/api/v1/bulk/unspam`

Remove spam mark from multiple emails.

Moves emails from spam folder back to inbox.

Permissions:
- Users can only unmark their own emails from spam

**Request Body**:

```json
{
  "email_ids": [
    "00000000-0000-0000-0000-000000000000"
  ]
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
    "total_requested": 0,
    "successful": 0,
    "failed": 0,
    "results": [
      {
        "id": null,
        "success": null,
        "error": null
      }
    ]
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

### Get Db Schema

**GET** `/api/v1/db_schema`

Return the database schema from the seed database.

This endpoint inspects the seed database and returns the schema in a
JSON schema-like format. No authentication required since this is
static metadata used for verification configuration.

Returns:
    JSON object with database schema in the format:
    {
        "properties": {
            "tables": {
                "properties": {
                    "table_name": {
                        "properties": {
                            "column_name": {"type": "json_type"}
                        }
                    }
                }
            }
        }
    }

**Responses**:

- `200`: Successful Response

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
- `folder` (optional, object): Filter by folder
- `thread_id` (optional, object): Filter by thread ID to get all emails in a conversation
- `category` (optional, object): Filter by category
- `is_read` (optional, object): Filter by read status
- `is_starred` (optional, object): Filter by starred
- `is_snoozed` (optional, object): Filter by snoozed status (True=snoozed, False=not snoozed)
- `is_important` (optional, object): Filter by important
- `include_archived` (optional, object): Include archived emails
- `search` (optional, object): Search in subject and body
- `threaded` (optional, boolean): Group by thread and return only latest email from each thread

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
        "folder": null,
        "category": null,
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
  "is_draft": false,
  "scheduled_send_at": "2024-01-01T00:00:00Z"
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
    "id": "00000000-0000-0000-0000-000000000000",
    "subject": "string",
    "body": "string",
    "html_body": "string",
    "folder": "string",
    "category": "string",
    "is_read": false,
    "is_starred": false,
    "is_important": false,
    "sender_id": "00000000-0000-0000-0000-000000000000",
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

### Get Email Category Counts

**GET** `/api/v1/emails/stats/category-counts`

Get count of emails in each category (primary, promotions, social, updates, forums).

Returns the number of emails in each category for the current user.
Optionally filter by folder, read status, or starred status.

Permissions:
- Users can only see counts for their own emails (sent or received)

**Query Parameters**:

- `folder` (optional, object): Filter by folder
- `is_read` (optional, object): Filter by read status
- `is_starred` (optional, object): Filter by starred

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {}
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

### Get Emails By Thread

**GET** `/api/v1/emails/thread/{thread_id}`

Get all emails in a thread/conversation.

Returns all emails belonging to the specified thread, ordered by sent_at/created_at.
Emails are automatically marked as read in the background.

Permissions:
- Users can only access threads containing their own emails (sent or received)

**Path Parameters**:

- `thread_id` (required, string)

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": [
    {
      "id": "00000000-0000-0000-0000-000000000000",
      "subject": "string",
      "body": "string",
      "html_body": "string",
      "folder": "string",
      "category": "string",
      "is_read": false,
      "is_starred": false,
      "is_important": false,
      "sender_id": "00000000-0000-0000-0000-000000000000",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
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

### Delete Email

**DELETE** `/api/v1/emails/{email_id}`

Delete an email.

Args:
    permanent: If True, permanently removes from database. 
               If False (default), moves to trash or soft deletes if already in trash.

**Path Parameters**:

- `email_id` (required, string)

**Query Parameters**:

- `permanent` (optional, boolean): Permanently delete instead of soft delete

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

- `email_id` (required, string)

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "id": "00000000-0000-0000-0000-000000000000",
    "subject": "string",
    "body": "string",
    "html_body": "string",
    "folder": "string",
    "category": "string",
    "is_read": false,
    "is_starred": false,
    "is_important": false,
    "sender_id": "00000000-0000-0000-0000-000000000000",
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

- `email_id` (required, string)

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
    "id": "00000000-0000-0000-0000-000000000000",
    "subject": "string",
    "body": "string",
    "html_body": "string",
    "folder": "string",
    "category": "string",
    "is_read": false,
    "is_starred": false,
    "is_important": false,
    "sender_id": "00000000-0000-0000-0000-000000000000",
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

### Archive Email

**POST** `/api/v1/emails/{email_id}/archive`

Archive an email.

Sets the email status to 'archived'.

Permissions:
- Users can only archive their own emails (sent or received)

**Path Parameters**:

- `email_id` (required, string)

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "id": "00000000-0000-0000-0000-000000000000",
    "subject": "string",
    "body": "string",
    "html_body": "string",
    "folder": "string",
    "category": "string",
    "is_read": false,
    "is_starred": false,
    "is_important": false,
    "sender_id": "00000000-0000-0000-0000-000000000000",
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

### Cancel Send

**POST** `/api/v1/emails/{email_id}/cancel-send`

Cancel a queued email before it's sent (undo send).

Only works for emails in 'queued' status before their scheduled_send_at time.
The email will be moved back to draft status so it can be edited or re-sent.

**Path Parameters**:

- `email_id` (required, string)

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "id": "00000000-0000-0000-0000-000000000000",
    "subject": "string",
    "body": "string",
    "html_body": "string",
    "folder": "string",
    "category": "string",
    "is_read": false,
    "is_starred": false,
    "is_important": false,
    "sender_id": "00000000-0000-0000-0000-000000000000",
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

### Update Email Category

**PATCH** `/api/v1/emails/{email_id}/category`

Update an email's category (Primary, Promotions, Social, Updates, Forums).

Categories help organize inbox similar to Gmail tabs.

Permissions:
- Users can only update categories on their own emails (sent or received)

**Path Parameters**:

- `email_id` (required, string)

**Request Body**:

```json
{
  "category": "string"
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
    "id": "00000000-0000-0000-0000-000000000000",
    "subject": "string",
    "body": "string",
    "html_body": "string",
    "folder": "string",
    "category": "string",
    "is_read": false,
    "is_starred": false,
    "is_important": false,
    "sender_id": "00000000-0000-0000-0000-000000000000",
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

### Confirm Send

**POST** `/api/v1/emails/{email_id}/confirm-send`

Immediately send a queued email without waiting for the scheduled time.

Use this if you want to skip the undo send waiting period.

**Path Parameters**:

- `email_id` (required, string)

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "id": "00000000-0000-0000-0000-000000000000",
    "subject": "string",
    "body": "string",
    "html_body": "string",
    "folder": "string",
    "category": "string",
    "is_read": false,
    "is_starred": false,
    "is_important": false,
    "sender_id": "00000000-0000-0000-0000-000000000000",
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

- `email_id` (required, string)

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
    "id": "00000000-0000-0000-0000-000000000000",
    "subject": "string",
    "body": "string",
    "html_body": "string",
    "folder": "string",
    "category": "string",
    "is_read": false,
    "is_starred": false,
    "is_important": false,
    "sender_id": "00000000-0000-0000-0000-000000000000",
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

- `email_id` (required, string)

**Request Body**:

```json
{
  "label_id": "00000000-0000-0000-0000-000000000000"
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
    "id": "00000000-0000-0000-0000-000000000000",
    "subject": "string",
    "body": "string",
    "html_body": "string",
    "folder": "string",
    "category": "string",
    "is_read": false,
    "is_starred": false,
    "is_important": false,
    "sender_id": "00000000-0000-0000-0000-000000000000",
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

- `email_id` (required, string)
- `label_id` (required, string)

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

- `email_id` (required, string)

**Request Body**:

```json
{
  "folder": "string"
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
    "id": "00000000-0000-0000-0000-000000000000",
    "subject": "string",
    "body": "string",
    "html_body": "string",
    "folder": "string",
    "category": "string",
    "is_read": false,
    "is_starred": false,
    "is_important": false,
    "sender_id": "00000000-0000-0000-0000-000000000000",
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

- `email_id` (required, string)

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
    "id": "00000000-0000-0000-0000-000000000000",
    "subject": "string",
    "body": "string",
    "html_body": "string",
    "folder": "string",
    "category": "string",
    "is_read": false,
    "is_starred": false,
    "is_important": false,
    "sender_id": "00000000-0000-0000-0000-000000000000",
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

- `email_id` (required, string)

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
    "id": "00000000-0000-0000-0000-000000000000",
    "subject": "string",
    "body": "string",
    "html_body": "string",
    "folder": "string",
    "category": "string",
    "is_read": false,
    "is_starred": false,
    "is_important": false,
    "sender_id": "00000000-0000-0000-0000-000000000000",
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

### Restore Email From Trash

**POST** `/api/v1/emails/{email_id}/restore`

Restore an email from trash.

Moves the email from trash folder back to its appropriate folder:
- Sent emails are restored to the 'sent' folder
- Scheduled/queued emails are restored to the 'scheduled' folder
- Received emails are restored to the 'inbox' folder
- Draft emails are restored to the 'drafts' folder

Permissions:
- Users can only restore their own emails (sent or received)

**Path Parameters**:

- `email_id` (required, string)

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "id": "00000000-0000-0000-0000-000000000000",
    "subject": "string",
    "body": "string",
    "html_body": "string",
    "folder": "string",
    "category": "string",
    "is_read": false,
    "is_starred": false,
    "is_important": false,
    "sender_id": "00000000-0000-0000-0000-000000000000",
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

If the user has undo_send_delay_seconds > 0 configured, the email will be
queued with a scheduled send time. During this window, the user can cancel
the send using the /emails/{email_id}/cancel-send endpoint.

If undo_send_delay_seconds is 0 or not set, the email is sent immediately.

**Path Parameters**:

- `email_id` (required, string)

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "id": "00000000-0000-0000-0000-000000000000",
    "subject": "string",
    "body": "string",
    "html_body": "string",
    "folder": "string",
    "category": "string",
    "is_read": false,
    "is_starred": false,
    "is_important": false,
    "sender_id": "00000000-0000-0000-0000-000000000000",
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

- `email_id` (required, string)

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
    "id": "00000000-0000-0000-0000-000000000000",
    "subject": "string",
    "body": "string",
    "html_body": "string",
    "folder": "string",
    "category": "string",
    "is_read": false,
    "is_starred": false,
    "is_important": false,
    "sender_id": "00000000-0000-0000-0000-000000000000",
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

### Mark Email Spam

**POST** `/api/v1/emails/{email_id}/spam`

Mark an email as spam.

Moves the email to the spam folder.

Permissions:
- Users can only mark their own emails as spam (sent or received)

**Path Parameters**:

- `email_id` (required, string)

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "id": "00000000-0000-0000-0000-000000000000",
    "subject": "string",
    "body": "string",
    "html_body": "string",
    "folder": "string",
    "category": "string",
    "is_read": false,
    "is_starred": false,
    "is_important": false,
    "sender_id": "00000000-0000-0000-0000-000000000000",
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

- `email_id` (required, string)

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
    "id": "00000000-0000-0000-0000-000000000000",
    "subject": "string",
    "body": "string",
    "html_body": "string",
    "folder": "string",
    "category": "string",
    "is_read": false,
    "is_starred": false,
    "is_important": false,
    "sender_id": "00000000-0000-0000-0000-000000000000",
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

### Unarchive Email

**POST** `/api/v1/emails/{email_id}/unarchive`

Unarchive an email.

Restores an archived email back to its original folder (inbox for received, sent for sent emails).

Permissions:
- Users can only unarchive their own emails (sent or received)

**Path Parameters**:

- `email_id` (required, string)

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "id": "00000000-0000-0000-0000-000000000000",
    "subject": "string",
    "body": "string",
    "html_body": "string",
    "folder": "string",
    "category": "string",
    "is_read": false,
    "is_starred": false,
    "is_important": false,
    "sender_id": "00000000-0000-0000-0000-000000000000",
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

- `email_id` (required, string)

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "id": "00000000-0000-0000-0000-000000000000",
    "subject": "string",
    "body": "string",
    "html_body": "string",
    "folder": "string",
    "category": "string",
    "is_read": false,
    "is_starred": false,
    "is_important": false,
    "sender_id": "00000000-0000-0000-0000-000000000000",
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

### Unmark Email Spam

**POST** `/api/v1/emails/{email_id}/unspam`

Remove spam mark from an email.

Moves the email from spam folder back to inbox.

Permissions:
- Users can only unmark their own emails from spam (sent or received)

**Path Parameters**:

- `email_id` (required, string)

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "id": "00000000-0000-0000-0000-000000000000",
    "subject": "string",
    "body": "string",
    "html_body": "string",
    "folder": "string",
    "category": "string",
    "is_read": false,
    "is_starred": false,
    "is_important": false,
    "sender_id": "00000000-0000-0000-0000-000000000000",
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
  "parent_id": "00000000-0000-0000-0000-000000000000"
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
    "id": "00000000-0000-0000-0000-000000000000",
    "name": "string",
    "color": "string",
    "owner_id": "00000000-0000-0000-0000-000000000000",
    "parent_id": "00000000-0000-0000-0000-000000000000",
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
      "id": "00000000-0000-0000-0000-000000000000",
      "name": "string",
      "color": "string",
      "parent_id": "00000000-0000-0000-0000-000000000000",
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

Delete a label and all its child labels.

When a label is deleted, all descendant labels (children, grandchildren, etc.)
are also deleted along with their email associations.

Args:
    permanent: If True, permanently removes from database. If False (default), soft deletes.

Permissions:
- Users can only delete their own labels

**Path Parameters**:

- `label_id` (required, string)

**Query Parameters**:

- `permanent` (optional, boolean): Permanently delete instead of soft delete

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

- `label_id` (required, string)

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "id": "00000000-0000-0000-0000-000000000000",
    "name": "string",
    "color": "string",
    "owner_id": "00000000-0000-0000-0000-000000000000",
    "parent_id": "00000000-0000-0000-0000-000000000000",
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
Use parent_id=null to move to root level.

Permissions:
- Users can only update their own labels

**Path Parameters**:

- `label_id` (required, string)

**Request Body**:

```json
{
  "name": "string",
  "parent_id": "00000000-0000-0000-0000-000000000000"
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
    "id": "00000000-0000-0000-0000-000000000000",
    "name": "string",
    "color": "string",
    "owner_id": "00000000-0000-0000-0000-000000000000",
    "parent_id": "00000000-0000-0000-0000-000000000000",
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

- `label_id` (required, string)

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
        "folder": null,
        "category": null,
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

## Metrics API

### Metrics Health

**GET** `/api/v1/metrics/health`

Check Prometheus connectivity.

Returns:
    HealthResponse with Prometheus status and connectivity info.

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "status": "string",
    "prometheus_url": "string",
    "ready": false,
    "message": "string"
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

### Get Label Values

**GET** `/api/v1/metrics/label/{label_name}/values`

Get all values for a specific label.

Args:
    label_name: Name of the label to query values for.

Returns:
    List of all values for the specified label.

**Path Parameters**:

- `label_name` (required, string)

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

### Get Labels

**GET** `/api/v1/metrics/labels`

Get all label names from Prometheus.

Returns:
    List of all label names present in the metrics.

**Responses**:

- `200`: Successful Response

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

### Query Instant

**GET** `/api/v1/metrics/query`

Execute an instant query against Prometheus.

Args:
    query: PromQL query expression (e.g., 'up', 'http_server_duration_milliseconds_count')
    time: Optional evaluation timestamp. If omitted, current server time is used.

Returns:
    PrometheusResponse with query results.

Example queries:
    - `up` - Check if targets are up
    - `sum(http_server_duration_milliseconds_count)` - Total request count
    - `histogram_quantile(0.95, sum(rate(http_server_duration_milliseconds_bucket[5m])) by (le))` - P95 latency

**Query Parameters**:

- `query` (required, string): PromQL query expression
- `time` (optional, object): Evaluation timestamp (RFC3339 or Unix timestamp)

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "status": "string",
    "data": {},
    "errorType": "string",
    "error": "string"
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

### Query Range

**GET** `/api/v1/metrics/query_range`

Execute a range query against Prometheus.

Args:
    query: PromQL query expression
    start: Start timestamp (RFC3339 or Unix timestamp)
    end: End timestamp (RFC3339 or Unix timestamp)
    step: Query resolution step width (duration format, e.g., '15s', '1m')

Returns:
    PrometheusResponse with time-series data.

Example:
    GET /api/v1/metrics/query_range?query=rate(http_server_duration_milliseconds_count[1m])&start=2024-01-01T00:00:00Z&end=2024-01-01T01:00:00Z&step=1m

**Query Parameters**:

- `query` (required, string): PromQL query expression
- `start` (required, string): Start timestamp (RFC3339 or Unix timestamp)
- `end` (required, string): End timestamp (RFC3339 or Unix timestamp)
- `step` (required, string): Query resolution step (e.g., '15s', '1m', '5m')

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "status": "string",
    "data": {},
    "errorType": "string",
    "error": "string"
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
- `folder` (optional, object): Filter by folder: inbox, sent, drafts, trash, spam, starred
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
      "id": "00000000-0000-0000-0000-000000000000",
      "name": "string",
      "query": "string",
      "filters": {},
      "owner_id": "00000000-0000-0000-0000-000000000000",
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
    "id": "00000000-0000-0000-0000-000000000000",
    "name": "string",
    "query": "string",
    "filters": {},
    "owner_id": "00000000-0000-0000-0000-000000000000",
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

Args:
    permanent: If True, permanently removes from database. If False (default), soft deletes.

**Path Parameters**:

- `search_id` (required, string)

**Query Parameters**:

- `permanent` (optional, boolean): Permanently delete instead of soft delete

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

## Templates API

### List Templates

**GET** `/api/v1/templates`

List email templates with pagination and filtering.

Returns user's own templates and optionally shared templates from others.

Permissions:
- Users can see their own templates and shared templates

**Query Parameters**:

- `page` (optional, integer): Page number
- `page_size` (optional, integer): Items per page
- `include_shared` (optional, boolean): Include shared templates from others
- `search` (optional, object): Search in name and description

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
        "name": null,
        "description": null,
        "subject": null,
        "is_shared": null,
        "owner_id": null,
        "created_at": null,
        "updated_at": null
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

### Create Template

**POST** `/api/v1/templates`

Create a new email template.

Permissions:
- All authenticated users can create templates

**Request Body**:

```json
{
  "name": "string",
  "description": "string",
  "subject": "string",
  "body": "string",
  "html_body": "string",
  "is_shared": false
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
    "id": "00000000-0000-0000-0000-000000000000",
    "name": "string",
    "description": "string",
    "subject": "string",
    "body": "string",
    "html_body": "string",
    "is_shared": false,
    "owner_id": "00000000-0000-0000-0000-000000000000",
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

### Delete Template

**DELETE** `/api/v1/templates/{template_id}`

Delete an email template.

Args:
    permanent: If True, permanently removes from database. If False (default), soft deletes.

Permissions:
- Users can only delete their own templates
- Admins can delete any template

**Path Parameters**:

- `template_id` (required, string)

**Query Parameters**:

- `permanent` (optional, boolean): Permanently delete instead of soft delete

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

### Get Template

**GET** `/api/v1/templates/{template_id}`

Get a specific template by ID.

Permissions:
- Users can access their own templates and shared templates

**Path Parameters**:

- `template_id` (required, string)

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "id": "00000000-0000-0000-0000-000000000000",
    "name": "string",
    "description": "string",
    "subject": "string",
    "body": "string",
    "html_body": "string",
    "is_shared": false,
    "owner_id": "00000000-0000-0000-0000-000000000000",
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

### Update Template

**PUT** `/api/v1/templates/{template_id}`

Update an email template.

Permissions:
- Users can only update their own templates
- Admins can update any template

**Path Parameters**:

- `template_id` (required, string)

**Request Body**:

```json
{
  "name": "string",
  "description": "string",
  "subject": "string",
  "body": "string",
  "html_body": "string",
  "is_shared": false
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
    "id": "00000000-0000-0000-0000-000000000000",
    "name": "string",
    "description": "string",
    "subject": "string",
    "body": "string",
    "html_body": "string",
    "is_shared": false,
    "owner_id": "00000000-0000-0000-0000-000000000000",
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

### Apply Template

**POST** `/api/v1/templates/{template_id}/apply`

Apply a template to create a new email draft.

Creates a new email draft using the template content.
Increments the template's usage count.

Permissions:
- Users can apply their own templates and shared templates

**Path Parameters**:

- `template_id` (required, string)

**Request Body**:

```json
{
  "template_id": "00000000-0000-0000-0000-000000000000",
  "recipients": [
    {}
  ],
  "additional_body": "string",
  "save_as_draft": true
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
    "id": "00000000-0000-0000-0000-000000000000",
    "subject": "string",
    "body": "string",
    "html_body": "string",
    "folder": "string",
    "category": "string",
    "is_read": false,
    "is_starred": false,
    "is_important": false,
    "sender_id": "00000000-0000-0000-0000-000000000000",
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
    "id": "00000000-0000-0000-0000-000000000000",
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

Delete a user.

Permissions:
- admin: Can delete any user
- user: Not allowed

Args:
    user_id: User ID.
    permanent: If True, permanently removes from database. If False (default), soft deletes.
    
Raises:
    HTTPException: 404 if user not found.

**Path Parameters**:

- `user_id` (required, string)

**Query Parameters**:

- `permanent` (optional, boolean): Permanently delete instead of soft delete

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

- `user_id` (required, string)

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "id": "00000000-0000-0000-0000-000000000000",
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

- `user_id` (required, string)

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
    "id": "00000000-0000-0000-0000-000000000000",
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

### EmailCategory

- `primary`
- `promotions`
- `social`
- `updates`
- `forums`

### FolderType

- `inbox`
- `sent`
- `drafts`
- `trash`
- `spam`
- `scheduled`

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
