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
  - [Bulk Delete](#bulk-delete)
  - [Bulk Important](#bulk-important)
  - [Bulk Update Labels](#bulk-update-labels)
  - [Bulk Move](#bulk-move)
  - [Bulk Mark Read](#bulk-mark-read)
  - [Bulk Snooze](#bulk-snooze)
  - [Bulk Spam](#bulk-spam)
  - [Bulk Star](#bulk-star)
  - [Bulk Thread Read](#bulk-thread-read)
  - [Bulk Thread Unstar](#bulk-thread-unstar)
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
  - [Delete Email](#delete-email)
  - [Get Email](#get-email)
  - [Update Email](#update-email)
  - [Cancel Send](#cancel-send)
  - [Confirm Send](#confirm-send)
  - [Forward Email](#forward-email)
  - [Add Label To Email](#add-label-to-email)
  - [Remove Label From Email](#remove-label-from-email)
  - [Move Email](#move-email)
  - [Mark Email Read](#mark-email-read)
  - [Reply To Email](#reply-to-email)
  - [Restore Email From Trash](#restore-email-from-trash)
  - [Send Email](#send-email)
  - [Mark Email Spam](#mark-email-spam)
  - [Star Email](#star-email)
  - [Unmark Email Spam](#unmark-email-spam)
- [Labels API](#labels-api)
  - [List Labels](#list-labels)
  - [Create Label](#create-label)
  - [List Labels Tree](#list-labels-tree)
  - [Delete Label](#delete-label)
  - [Get Label](#get-label)
  - [Update Label](#update-label)
  - [List Label Threads](#list-label-threads)
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
- [Threads API](#threads-api)
  - [Delete Thread](#delete-thread)
  - [Archive Thread](#archive-thread)
  - [Get Thread Emails](#get-thread-emails)
  - [Mark Thread Important Endpoint](#mark-thread-important-endpoint)
  - [Mark Thread Read](#mark-thread-read)
  - [Restore Thread](#restore-thread)
  - [Snooze Thread](#snooze-thread)
  - [Mark Thread Spam Endpoint](#mark-thread-spam-endpoint)
  - [Unarchive Thread](#unarchive-thread)
  - [Unsnooze Thread](#unsnooze-thread)
  - [Unmark Thread Spam Endpoint](#unmark-thread-spam-endpoint)
  - [Unstar Thread](#unstar-thread)
- [User Settings API](#user-settings-api)
  - [Get User Settings](#get-user-settings)
  - [Update User Settings](#update-user-settings)
  - [Get Advanced Settings](#get-advanced-settings)
  - [Update Advanced Settings](#update-advanced-settings)
  - [Get General Settings](#get-general-settings)
  - [Update General Settings](#update-general-settings)
  - [List Signatures](#list-signatures)
  - [Create Signature](#create-signature)
  - [Delete Signature](#delete-signature)
  - [Get Signature](#get-signature)
  - [Update Signature](#update-signature)
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
    attachment_id: ID of the attachment to delete.

Permissions:
- Users can only delete attachments on their own draft emails

**Path Parameters**:

- `attachment_id` (required, string)

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

Get current authenticated user information with settings.

Uses the access token from request headers to identify the user.

Args:
    db: Database session.
    
Returns:
    User information with all settings.

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
    "settings": {
      "general": {
        "language": null,
        "input_tools_enabled": null,
        "right_to_left_editing": null,
        "max_page_size": null,
        "undo_send_delay_seconds": null,
        "default_reply_behavior": null,
        "id": null,
        "user_id": null
      },
      "advanced": {
        "auto_advance_enabled": null,
        "templates_enabled": null,
        "custom_keyboard_shortcuts_enabled": null,
        "unread_message_icon_enabled": null,
        "id": null,
        "user_id": null
      },
      "labels": []
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
    "settings": {
      "general": {
        "language": null,
        "input_tools_enabled": null,
        "right_to_left_editing": null,
        "max_page_size": null,
        "undo_send_delay_seconds": null,
        "default_reply_behavior": null,
        "id": null,
        "user_id": null
      },
      "advanced": {
        "auto_advance_enabled": null,
        "templates_enabled": null,
        "custom_keyboard_shortcuts_enabled": null,
        "unread_message_icon_enabled": null,
        "id": null,
        "user_id": null
      },
      "labels": []
    },
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

Archive multiple threads.

Since archive is thread-level and user-specific, this operation updates
ThreadUserMetadata for the provided threads.

Optimized to use bulk upsert operations.

Permissions:
- Users can only archive their own threads

**Request Body**:

```json
{
  "thread_ids": [
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

### Bulk Delete

**POST** `/api/v1/bulk/delete`

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

### Bulk Important

**POST** `/api/v1/bulk/important`

Mark or unmark multiple threads as important.

Since is_important is thread-level and user-specific, this operation
updates ThreadUserMetadata for the provided threads.

Permissions:
- Users can only modify their own threads

**Request Body**:

```json
{
  "thread_ids": [
    "00000000-0000-0000-0000-000000000000"
  ],
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

### Bulk Update Labels

**POST** `/api/v1/bulk/labels/update`

Update labels on multiple threads by adding and/or removing labels.

This endpoint allows you to add and remove labels in a single operation.
You can specify which labels to add and which to remove.

Permissions:
- Users can only modify their own threads
- Labels must belong to the user

Example request:
{
    "thread_ids": ["uuid1", "uuid2"],
    "labels": {
        "add": ["label_uuid1", "label_uuid2"],
        "remove": ["label_uuid3"]
    }
}

**Request Body**:

```json
{
  "thread_ids": [
    "00000000-0000-0000-0000-000000000000"
  ],
  "labels": {
    "add": [
      "00000000-0000-0000-0000-000000000000"
    ],
    "remove": [
      "00000000-0000-0000-0000-000000000000"
    ]
  }
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

Snooze multiple threads until a specific date/time.

Since snooze is thread-level and user-specific, this operation updates
ThreadUserMetadata for the provided threads.

Optimized to use bulk upsert operations.

Permissions:
- Users can only snooze their own threads

**Request Body**:

```json
{
  "thread_ids": [
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

Optimized to use generic bulk update helper with single UPDATE query.

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

### Bulk Thread Read

**POST** `/api/v1/bulk/threads/read`

Mark all emails in multiple threads as read or unread.

Sets is_read for all emails in the specified threads where the user
is either the sender or recipient.

Optimized to use a single bulk UPDATE query for all emails across all threads.

Permissions:
- Users can only mark emails in threads they have access to

**Request Body**:

```json
{
  "thread_ids": [
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

### Bulk Thread Unstar

**POST** `/api/v1/bulk/threads/unstar`

Unstar all emails in multiple threads.

Sets is_starred=False for all emails in the specified threads where the user
is either the sender or recipient.

Optimized to use a single bulk UPDATE query for all emails across all threads.

Permissions:
- Users can only unstar emails in threads they have access to

**Request Body**:

```json
{
  "thread_ids": [
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

### Bulk Unarchive

**POST** `/api/v1/bulk/unarchive`

Unarchive multiple threads.

Since archive is thread-level and user-specific, this operation updates
ThreadUserMetadata for the provided threads.

Optimized to use bulk operations.

Permissions:
- Users can only unarchive their own threads

**Request Body**:

```json
{
  "thread_ids": [
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

Unsnooze multiple threads.

Since snooze is thread-level and user-specific, this operation updates
ThreadUserMetadata for the provided threads.

Optimized to use bulk operations.

Permissions:
- Users can only unsnooze their own threads

**Request Body**:

```json
{
  "thread_ids": [
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

Moves emails from spam folder back to their appropriate folder:
- Sent emails are restored to the 'sent' folder
- Scheduled/queued emails are restored to the 'scheduled' folder
- Received emails are restored to the 'inbox' folder
- Draft emails are restored to the 'drafts' folder

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
- `folder` (optional, object): Filter by folder (case insensitive) e.g. 'Inbox', 'Starred', 'Snoozed', 'Important', 'Sent', 'Scheduled', 'Drafts', 'All Mail', 'Spam', 'Trash'
- `category` (optional, object): Filter by category

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

Create a new draft email.

This endpoint only creates drafts. Use POST /emails/{id}/send to send the email
(either immediately or scheduled for a specific time).

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
  ]
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

### Delete Email

**DELETE** `/api/v1/emails/{email_id}`

Delete an email.

Delete behavior:
- If permanent=False (default): Moves email to trash folder
- If permanent=True: Permanently removes email from database

To permanently delete an email from trash, call this endpoint with permanent=True.

Permissions:
- Users can only delete their own emails (sent or received)
- Admins can delete any email

**Path Parameters**:

- `email_id` (required, string)

**Query Parameters**:

- `permanent` (optional, boolean): Permanently delete from database

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
  "recipients": [
    {
      "email": "string",
      "name": "string",
      "type": "string"
    }
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
    "id": "00000000-0000-0000-0000-000000000000",
    "subject": "string",
    "body": "string",
    "html_body": "string",
    "folder": "string",
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
Email delivery to recipients is processed in the background for better performance.

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

If the user has undo_send_delay_seconds configured, the forwarded email will be
queued with a scheduled send time. During this window, the user can cancel
the send using the /emails/{email_id}/cancel-send endpoint.

Email delivery to recipients is processed in the background for better performance.

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

Add a label to an email's thread.

Labels are now linked to threads, not individual emails.
Adding a label to an email will add it to the email's thread.

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

Remove a label from an email's thread for the current user.

Labels are user-specific on shared threads. Removing a label only affects
the current user's view of the thread.

Special behavior for TRASH/SPAM labels:
- When removing the TRASH label, all trashed emails in the thread are moved back to inbox.
- When removing the SPAM label, all spam emails in the thread are moved back to inbox.

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

Permissions:
- Users can only move their own emails (sent or received)

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

Permissions:
- Users can only mark their own emails (sent or received)

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

This endpoint creates a draft reply. Use POST /emails/{id}/send to send the reply
(either immediately or scheduled for a specific time).

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

If scheduled_send_at is provided in the request body, the email will be
scheduled for that specific time, overriding the user's undo_send_delay_seconds.

If scheduled_send_at is not provided:
- If the user has undo_send_delay_seconds > 0 configured, the email will be
  queued with a scheduled send time. During this window, the user can cancel
  the send using the /emails/{email_id}/cancel-send endpoint.
- If undo_send_delay_seconds is 0 or not set, the email is sent immediately.

Email delivery to recipients is processed in the background for better performance.

**Path Parameters**:

- `email_id` (required, string)

**Request Body**:

```json
{
  "scheduled_send_at": "2024-01-01T00:00:00Z"
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

Permissions:
- Users can only star their own emails (sent or received)

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

Moves the email from spam folder back to its appropriate folder:
- Sent emails are restored to the 'sent' folder
- Scheduled/queued emails are restored to the 'scheduled' folder
- Received emails are restored to the 'inbox' folder
- Draft emails are restored to the 'drafts' folder

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

List user's labels with thread and unread counts.

Args:
    include_counts: Include thread counts and unread counts for each label
    flat: If True, returns flat list. If False, returns hierarchical tree structure.

Permissions:
- Users can only see their own labels

**Query Parameters**:

- `include_counts` (optional, boolean): Include thread and unread counts
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
  "parent_id": "00000000-0000-0000-0000-000000000000",
  "show_in_label_list": true,
  "show_in_message_list": true,
  "show_if_unread": false
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

### List Labels Tree

**GET** `/api/v1/labels/tree`

List user's labels as hierarchical tree structure.

Returns labels organized in parent-child hierarchy with nested children arrays.

Permissions:
- Users can only see their own labels

**Query Parameters**:

- `include_counts` (optional, boolean): Include thread and unread counts

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
      "owner_id": "00000000-0000-0000-0000-000000000000",
      "parent_id": "00000000-0000-0000-0000-000000000000",
      "is_system": false,
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

### Delete Label

**DELETE** `/api/v1/labels/{label_id}`

Delete a label and all its child labels.

When a label is deleted, all descendant labels (children, grandchildren, etc.)
are also deleted along with their email associations.

Permissions:
- Users can only delete their own labels

**Path Parameters**:

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

### Get Label

**GET** `/api/v1/labels/{label_id}`

Get a specific label by ID with thread and unread counts.

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
  "parent_id": "00000000-0000-0000-0000-000000000000",
  "show_in_label_list": false,
  "show_in_message_list": false,
  "show_if_unread": false
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

### List Label Threads

**GET** `/api/v1/labels/{label_id}/threads`

List threads with a specific label.

Returns the latest email from each thread that has this label.

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
- from:sender@example.com (comma-separated for multiple)
- to:recipient@example.com (comma-separated for multiple)
- cc:user@example.com, bcc:user@example.com
- subject:meeting, subject:(dinner movie) for grouping
- has:attachment, has:userlabels, has:nouserlabels
- is:starred, is:unread, is:read, is:important
- in:inbox, in:anywhere, in:archive, in:snoozed
- label:important, category:primary
- before:2024-12-31, after:2024-01-01
- size:1000000, larger:10M, smaller:5K
- filename:report.pdf, filename:pdf
- deliveredto:user@example.com
- -term (exclude), +term (exact match), "exact phrase"
- term1 OR term2, {term1 term2}

These can be combined: q="from:john subject:report has:attachment -spam"

**Query Parameters**:

- `q` (optional, object): Search query with operators
- `from` (optional, object): Filter by sender (comma-separated for multiple)
- `to` (optional, object): Filter by recipient (comma-separated for multiple)
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
- `hasnot` (optional, object): Exclude emails containing this text
- `size` (optional, object): Filter by exact size in bytes
- `larger` (optional, object): Emails larger than size in bytes
- `smaller` (optional, object): Emails smaller than size in bytes
- `cc` (optional, object): Filter by CC recipients (comma-separated)
- `bcc` (optional, object): Filter by BCC recipients (comma-separated)
- `filename` (optional, object): Filter by attachment filename or extension
- `category` (optional, object): Filter by category: primary, promotions, social, updates, forums
- `deliveredto` (optional, object): Filter by delivered-to address
- `is_snoozed` (optional, object): Filter snoozed emails
- `has_userlabels` (optional, object): Filter emails with/without user labels
- `in_anywhere` (optional, object): Search all folders including spam/trash
- `in_archive` (optional, object): Search archived messages
- `page` (optional, integer)
- `page_size` (optional, integer)
- `sort_by` (optional, string): Sort by: date, subject, sender
- `sort_order` (optional, string): asc or desc
- `tz_offset` (optional, object): UTC offset in minutes from browser's getTimezoneOffset() for date interpretation in q

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
    search_id: ID of the saved search to delete.
Permissions:
- Users can only delete their own saved searches

**Path Parameters**:

- `search_id` (required, string)

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
- `search` (optional, object): Search in name

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
        "is_shared": null,
        "owner_id": null,
        "owner_name": null,
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

Permissions:
- Users can only delete their own templates
- Admins can delete any template

**Path Parameters**:

- `template_id` (required, string)

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

## Threads API

### Delete Thread

**DELETE** `/api/v1/threads/{thread_id}`

Delete an entire thread for the current user.

Delete behavior:
- If permanent=False (default): Moves all user's emails in the thread to trash folder
- If permanent=True: Permanently deletes all user's emails in the thread

Permissions:
- Users can only delete threads they have access to

**Path Parameters**:

- `thread_id` (required, string)

**Query Parameters**:

- `permanent` (optional, boolean): Permanently delete all emails in thread

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

### Archive Thread

**POST** `/api/v1/threads/{thread_id}/archive`

Archive a thread.

Sets is_archived=True in ThreadUserMetadata for the thread.
Removes the INBOX label so thread doesn't appear in inbox.

Permissions:
- Users can only archive threads they have access to (sent or received)

**Path Parameters**:

- `thread_id` (required, string)

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

### Get Thread Emails

**GET** `/api/v1/threads/{thread_id}/emails`

Get all emails in a thread/conversation.

Returns all emails belonging to the specified thread, ordered by sent_at/created_at.
Emails are automatically marked as read in the background.

Query Parameters:
- only_trashed: If true, returns only emails in trash folder

Permissions:
- Users can only access threads containing their own emails (sent or received)

**Path Parameters**:

- `thread_id` (required, string)

**Query Parameters**:

- `only_trashed` (optional, boolean): Include only trashed emails

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

### Mark Thread Important Endpoint

**PATCH** `/api/v1/threads/{thread_id}/important`

Mark a thread as important or unimportant for the current user.

This updates the thread-level is_important flag for the current user only.
Other users' important status for the same thread is not affected.

**Path Parameters**:

- `thread_id` (required, string)

**Request Body**:

```json
{
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

### Mark Thread Read

**PATCH** `/api/v1/threads/{thread_id}/read`

Mark all emails in a thread as read or unread for the current user.

Updates the is_read flag for all emails in the thread where the user
is either the sender or recipient.

Permissions:
- Users can only mark emails in threads they have access to

**Path Parameters**:

- `thread_id` (required, string)

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
    "success": true,
    "message": "string",
    "thread_id": "00000000-0000-0000-0000-000000000000",
    "emails_count": 0
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

### Restore Thread

**POST** `/api/v1/threads/{thread_id}/restore`

Restore a deleted thread for the current user.

Moves all user's emails in the thread from trash back to their appropriate folders:
- Sent emails are restored to the 'sent' folder
- Scheduled/queued emails are restored to the 'scheduled' folder
- Received emails are restored to the 'inbox' folder
- Draft emails are restored to the 'drafts' folder

Permissions:
- Users can only restore threads they have access to

**Path Parameters**:

- `thread_id` (required, string)

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

### Snooze Thread

**POST** `/api/v1/threads/{thread_id}/snooze`

Snooze a thread until a specific date and time.

When snoozed, the thread is temporarily hidden from the inbox and will
reappear at the specified snooze_until time.

Permissions:
- Users can only snooze threads they have access to (sent or received)

**Path Parameters**:

- `thread_id` (required, string)

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

### Mark Thread Spam Endpoint

**PATCH** `/api/v1/threads/{thread_id}/spam`

Mark a thread as spam for the current user.

This updates the folder of all user's emails in the thread to SPAM.
Also adds the Spam system label accordingly.

**Path Parameters**:

- `thread_id` (required, string)

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "success": true,
    "message": "string",
    "thread_id": "00000000-0000-0000-0000-000000000000",
    "emails_count": 0
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

### Unarchive Thread

**POST** `/api/v1/threads/{thread_id}/unarchive`

Unarchive a thread.

Sets is_archived=False in ThreadUserMetadata and restores Inbox/Sent label.

Permissions:
- Users can only unarchive threads they have access to (sent or received)

**Path Parameters**:

- `thread_id` (required, string)

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

### Unsnooze Thread

**POST** `/api/v1/threads/{thread_id}/unsnooze`

Unsnooze a thread, making it immediately visible again.

Permissions:
- Users can only unsnooze threads they have access to (sent or received)

**Path Parameters**:

- `thread_id` (required, string)

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

### Unmark Thread Spam Endpoint

**PATCH** `/api/v1/threads/{thread_id}/unspam`

Unmark a thread as spam for the current user.

This updates the folder of all user's emails in the thread to their appropriate folder:
- Sent emails are restored to the 'sent' folder
- Scheduled/queued emails are restored to the 'scheduled' folder
- Received emails are restored to the 'inbox' folder
- Draft emails are restored to the 'drafts' folder

Also replaces the Spam system label with the appropriate label.

**Path Parameters**:

- `thread_id` (required, string)

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "success": true,
    "message": "string",
    "thread_id": "00000000-0000-0000-0000-000000000000",
    "emails_count": 0
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

### Unstar Thread

**POST** `/api/v1/threads/{thread_id}/unstar`

Unstar all emails in a thread for the current user.

Removes the starred flag from all emails in the thread where the user
is either the sender or recipient.

Permissions:
- Users can only unstar emails in threads they have access to

**Path Parameters**:

- `thread_id` (required, string)

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

## User Settings API

### Get User Settings

**GET** `/api/v1/users/{user_id}/settings`

Get all settings for a user.

Permissions:
- user: Can only access their own settings
- admin: Can access any user's settings

Args:
    user_id: User ID.
    db: Database session.
    
Returns:
    All user settings (general, advanced).

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
    "general": {
      "language": "en",
      "input_tools_enabled": false,
      "right_to_left_editing": false,
      "max_page_size": 50,
      "undo_send_delay_seconds": 5,
      "default_reply_behavior": "reply",
      "id": "00000000-0000-0000-0000-000000000000",
      "user_id": "00000000-0000-0000-0000-000000000000"
    },
    "advanced": {
      "auto_advance_enabled": false,
      "templates_enabled": true,
      "custom_keyboard_shortcuts_enabled": false,
      "unread_message_icon_enabled": true,
      "id": "00000000-0000-0000-0000-000000000000",
      "user_id": "00000000-0000-0000-0000-000000000000"
    },
    "labels": []
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

### Update User Settings

**PUT** `/api/v1/users/{user_id}/settings`

Update all settings for a user.

Permissions:
- user: Can only update their own settings
- admin: Can update any user's settings

Args:
    user_id: User ID.
    settings_data: Settings data to update.
    db: Database session.
    
Returns:
    Updated settings.

**Path Parameters**:

- `user_id` (required, string)

**Request Body**:

```json
{
  "general": {
    "language": "string",
    "input_tools_enabled": false,
    "right_to_left_editing": false,
    "max_page_size": 0,
    "undo_send_delay_seconds": 0,
    "default_reply_behavior": "string"
  },
  "advanced": {
    "auto_advance_enabled": false,
    "templates_enabled": false,
    "custom_keyboard_shortcuts_enabled": false,
    "unread_message_icon_enabled": false
  }
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
    "general": {
      "language": "en",
      "input_tools_enabled": false,
      "right_to_left_editing": false,
      "max_page_size": 50,
      "undo_send_delay_seconds": 5,
      "default_reply_behavior": "reply",
      "id": "00000000-0000-0000-0000-000000000000",
      "user_id": "00000000-0000-0000-0000-000000000000"
    },
    "advanced": {
      "auto_advance_enabled": false,
      "templates_enabled": true,
      "custom_keyboard_shortcuts_enabled": false,
      "unread_message_icon_enabled": true,
      "id": "00000000-0000-0000-0000-000000000000",
      "user_id": "00000000-0000-0000-0000-000000000000"
    },
    "labels": []
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

### Get Advanced Settings

**GET** `/api/v1/users/{user_id}/settings/advanced`

Get advanced settings for a user.

Args:
    user_id: User ID.
    db: Database session.
    
Returns:
    Advanced settings.

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
    "auto_advance_enabled": false,
    "templates_enabled": true,
    "custom_keyboard_shortcuts_enabled": false,
    "unread_message_icon_enabled": true,
    "id": "00000000-0000-0000-0000-000000000000",
    "user_id": "00000000-0000-0000-0000-000000000000"
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

### Update Advanced Settings

**PATCH** `/api/v1/users/{user_id}/settings/advanced`

Update advanced settings for a user.

Args:
    user_id: User ID.
    settings_data: Settings data to update.
    db: Database session.
    
Returns:
    Updated advanced settings.

**Path Parameters**:

- `user_id` (required, string)

**Request Body**:

```json
{
  "auto_advance_enabled": false,
  "templates_enabled": false,
  "custom_keyboard_shortcuts_enabled": false,
  "unread_message_icon_enabled": false
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
    "auto_advance_enabled": false,
    "templates_enabled": true,
    "custom_keyboard_shortcuts_enabled": false,
    "unread_message_icon_enabled": true,
    "id": "00000000-0000-0000-0000-000000000000",
    "user_id": "00000000-0000-0000-0000-000000000000"
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

### Get General Settings

**GET** `/api/v1/users/{user_id}/settings/general`

Get general settings for a user.

Args:
    user_id: User ID.
    db: Database session.
    
Returns:
    General settings.

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
    "language": "en",
    "input_tools_enabled": false,
    "right_to_left_editing": false,
    "max_page_size": 50,
    "undo_send_delay_seconds": 5,
    "default_reply_behavior": "reply",
    "id": "00000000-0000-0000-0000-000000000000",
    "user_id": "00000000-0000-0000-0000-000000000000"
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

### Update General Settings

**PATCH** `/api/v1/users/{user_id}/settings/general`

Update general settings for a user.

Args:
    user_id: User ID.
    settings_data: Settings data to update.
    db: Database session.
    
Returns:
    Updated general settings.

**Path Parameters**:

- `user_id` (required, string)

**Request Body**:

```json
{
  "language": "string",
  "input_tools_enabled": false,
  "right_to_left_editing": false,
  "max_page_size": 0,
  "undo_send_delay_seconds": 0,
  "default_reply_behavior": "string"
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
    "language": "en",
    "input_tools_enabled": false,
    "right_to_left_editing": false,
    "max_page_size": 50,
    "undo_send_delay_seconds": 5,
    "default_reply_behavior": "reply",
    "id": "00000000-0000-0000-0000-000000000000",
    "user_id": "00000000-0000-0000-0000-000000000000"
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

### List Signatures

**GET** `/api/v1/users/{user_id}/settings/signatures`

List all signatures for a user.

Args:
    user_id: User ID.
    db: Database session.
    
Returns:
    List of signatures.

**Path Parameters**:

- `user_id` (required, string)

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": [
    {
      "name": "string",
      "content": "",
      "is_default_for_new": false,
      "is_default_for_reply": false,
      "insert_before_quoted": true,
      "id": "00000000-0000-0000-0000-000000000000"
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

### Create Signature

**POST** `/api/v1/users/{user_id}/settings/signatures`

Create a new signature for a user.

Args:
    user_id: User ID.
    signature_data: Signature data.
    db: Database session.
    
Returns:
    Created signature.

**Path Parameters**:

- `user_id` (required, string)

**Request Body**:

```json
{
  "name": "string",
  "content": "",
  "is_default_for_new": false,
  "is_default_for_reply": false,
  "insert_before_quoted": true
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
    "name": "string",
    "content": "",
    "is_default_for_new": false,
    "is_default_for_reply": false,
    "insert_before_quoted": true,
    "id": "00000000-0000-0000-0000-000000000000"
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

### Delete Signature

**DELETE** `/api/v1/users/{user_id}/settings/signatures/{signature_id}`

Delete a signature.

Args:
    user_id: User ID.
    signature_id: Signature ID.
    db: Database session.

**Path Parameters**:

- `user_id` (required, string)
- `signature_id` (required, string)

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

### Get Signature

**GET** `/api/v1/users/{user_id}/settings/signatures/{signature_id}`

Get a specific signature.

Args:
    user_id: User ID.
    signature_id: Signature ID.
    db: Database session.
    
Returns:
    Signature.

**Path Parameters**:

- `user_id` (required, string)
- `signature_id` (required, string)

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "name": "string",
    "content": "",
    "is_default_for_new": false,
    "is_default_for_reply": false,
    "insert_before_quoted": true,
    "id": "00000000-0000-0000-0000-000000000000"
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

### Update Signature

**PUT** `/api/v1/users/{user_id}/settings/signatures/{signature_id}`

Update a signature.

Args:
    user_id: User ID.
    signature_id: Signature ID.
    signature_data: Signature data to update.
    db: Database session.
    
Returns:
    Updated signature.

**Path Parameters**:

- `user_id` (required, string)
- `signature_id` (required, string)

**Request Body**:

```json
{
  "name": "string",
  "content": "string",
  "is_default_for_new": false,
  "is_default_for_reply": false,
  "insert_before_quoted": false
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
    "name": "string",
    "content": "",
    "is_default_for_new": false,
    "is_default_for_reply": false,
    "insert_before_quoted": true,
    "id": "00000000-0000-0000-0000-000000000000"
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
    
Returns:
    Paginated list of users.

**Query Parameters**:

- `page` (optional, integer): Page number
- `page_size` (optional, integer): Items per page
- `role` (optional, object): Filter by role
- `search` (optional, object): Search in name and email

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
    
Raises:
    HTTPException: 404 if user not found.

**Path Parameters**:

- `user_id` (required, string)

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

Permissions:
- user: Can only view active users
- admin: Can view all users including inactive

Args:
    user_id: User ID.
    db: Database session.
    
Returns:
    User details.
    
Raises:
    HTTPException: 404 if user not found or inactive (for non-admin users).

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
- `purchases`

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
