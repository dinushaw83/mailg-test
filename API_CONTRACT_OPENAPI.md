# Deskzen REST API Contract

This document describes the REST API endpoints for the Deskzen application.

**Base URL**: `/api/v1`

---

## Table of Contents

- [Auth API](#auth-api)
  - [Get Current User Info](#get-current-user-info)
  - [Create Token](#create-token)
- [Db Snapshot API](#db-snapshot-api)
  - [Drop Db For Run](#drop-db-for-run)
  - [Get Db Snapshot](#get-db-snapshot)
- [Items API](#items-api)
  - [List Items](#list-items)
  - [Create Item](#create-item)
  - [Delete Item](#delete-item)
  - [Get Item](#get-item)
  - [Update Item](#update-item)
- [Users API](#users-api)
  - [List Users](#list-users)
  - [Create User](#create-user)
  - [Delete User](#delete-user)
  - [Get User](#get-user)
  - [Update User](#update-user)
- [Common Types](#common-types)
- [Error Responses](#error-responses)

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
    "name": "string",
    "email": "string",
    "role": "string",
    "phone": "string",
    "timezone": "string"
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
the backend is the source of truth for permissions. Any role provided
in the request is ignored.

Login Flow:
1. User provides email (or user_id/name)
2. Backend looks up/validates user in the seed/template database
   (to avoid provisioning a new run DB for invalid login attempts)
3. Backend derives role from the database (user.role)
4. Backend creates a fresh run_id and provisions the isolated run DB for that login
5. Backend generates token with user_id, role, email, run_id
6. All subsequent requests use this token and the run_id-scoped database
7. Backend validates token and applies RBAC permissions

Args:
    token_request: Token request with user identifier (email preferred).
    request: FastAPI request object.
    
Returns:
    TokenResponse with access_token, user info, role (from DB), and expiration.
    
Raises:
    HTTPException: 400 if user not found or no identifier provided.
                  401 if user is deleted or suspended.

**Request Body**:

```json
{
  "user_id": 0,
  "email": "string",
  "name": "string",
  "role": "string"
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

## Items API

### List Items

**GET** `/api/v1/items`

List items with pagination and filtering.

Permissions:
- end-user: Can view only public items
- agent: Can view all items (public and private)
- admin: Can view all items including deleted (with show_deleted flag)

Args:
    db: Database session.
    page: Page number (1-indexed).
    page_size: Number of items per page.
    status: Filter by status.
    priority: Filter by priority.
    search: Search term for name/description.
    show_deleted: Include deleted items (admin only).
    
Returns:
    Paginated list of items.

**Query Parameters**:

- `page` (optional, integer): Page number
- `page_size` (optional, integer): Items per page
- `status` (optional, object): Filter by status
- `priority` (optional, object): Filter by priority
- `search` (optional, object): Search in name and description
- `show_deleted` (optional, boolean): Include deleted items (admin only)

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
        "name": null,
        "description": null,
        "status": null,
        "priority": null,
        "is_public": null,
        "id": null,
        "created_by_id": null,
        "updated_by_id": null,
        "is_deleted": null,
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

### Create Item

**POST** `/api/v1/items`

Create a new item.

Permissions:
- All authenticated users can create items
- Creator is automatically set from authenticated user

Args:
    item_data: Item creation data.
    db: Database session.
    
Returns:
    Created item with metadata.
    
Raises:
    HTTPException: 400 if validation fails.

**Request Body**:

```json
{
  "name": "string",
  "description": "string",
  "status": "string",
  "priority": "string",
  "is_public": false
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
    "description": "string",
    "status": "string",
    "priority": "string",
    "is_public": false,
    "id": 0,
    "created_by_id": 0,
    "updated_by_id": 0,
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

### Delete Item

**DELETE** `/api/v1/items/{item_id}`

Delete an item (soft delete).

Permissions:
- admin: Can delete any item
- agent/end-user: Not allowed

Args:
    item_id: Item ID.
    db: Database session.
    
Raises:
    HTTPException: 404 if item not found.

**Path Parameters**:

- `item_id` (required, integer)

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

### Get Item

**GET** `/api/v1/items/{item_id}`

Get a specific item by ID.

Permissions:
- end-user: Can view only public items
- agent/admin: Can view all items

Args:
    item_id: Item ID.
    db: Database session.
    
Returns:
    Item details.
    
Raises:
    HTTPException: 404 if item not found or insufficient permissions.

**Path Parameters**:

- `item_id` (required, integer)

**Responses**:

- `200`: Successful Response

```json
{
  "success": false,
  "message": "string",
  "statusCode": 0,
  "data": {
    "name": "string",
    "description": "string",
    "status": "string",
    "priority": "string",
    "is_public": false,
    "id": 0,
    "created_by_id": 0,
    "updated_by_id": 0,
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

### Update Item

**PUT** `/api/v1/items/{item_id}`

Update an existing item.

Permissions:
- admin: Can update any item
- agent: Can update any item
- end-user: Not allowed

Args:
    item_id: Item ID.
    item_data: Fields to update.
    db: Database session.
    
Returns:
    Updated item.
    
Raises:
    HTTPException: 404 if item not found, 400 if validation fails.

**Path Parameters**:

- `item_id` (required, integer)

**Request Body**:

```json
{
  "name": "string",
  "description": "string",
  "status": "string",
  "priority": "string",
  "is_public": false
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
    "description": "string",
    "status": "string",
    "priority": "string",
    "is_public": false,
    "id": 0,
    "created_by_id": 0,
    "updated_by_id": 0,
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

## Users API

### List Users

**GET** `/api/v1/users`

List users with pagination and filtering.

Permissions:
- end-user: Can view only active users
- agent: Can view all users (non-deleted)
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
        "name": null,
        "email": null,
        "role": null,
        "phone": null,
        "timezone": null
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
- agent/end-user: Not allowed

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
  "name": "string",
  "email": "string",
  "role": "string",
  "phone": "string",
  "timezone": "string",
  "locale": "string"
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
    "email": "string",
    "role": "string",
    "phone": "string",
    "timezone": "string"
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
- agent/end-user: Not allowed

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
    "name": "string",
    "email": "string",
    "role": "string",
    "phone": "string",
    "timezone": "string"
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
- agent/end-user: Not allowed

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
  "name": "string",
  "email": "string",
  "role": "string",
  "phone": "string",
  "timezone": "string",
  "locale": "string"
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
    "email": "string",
    "role": "string",
    "phone": "string",
    "timezone": "string"
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
