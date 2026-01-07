# FastAPI Backend Mailg

A production-ready FastAPI mailg with JWT authentication, RBAC, and sophisticated database isolation system.

## Features

### Core Infrastructure
- **FastAPI Framework**: Modern, fast web framework for building APIs
- **JWT Authentication**: Stateless token-based authentication
- **RBAC (Role-Based Access Control)**: Two-tier permission system (admin, user)
- **Database Isolation**: Unique database per session for perfect isolation
- **PostgreSQL**: Robust relational database with connection pooling
- **Docker Support**: Complete containerized development environment
- **API Documentation**: Auto-generated OpenAPI/Swagger docs
- **Standardized Response Format**: Consistent API response wrapper for all endpoints

### Mailg includes reference implementations:
- **User Management**: Complete CRUD with role-based permissions
- **Authentication Endpoints**: Token generation and validation
- **Database Snapshots**: Admin tools for database inspection

### Email API:
- **Emails**: Compose, send, receive, read, archive, delete with threading support
- **Folders**: Inbox, Sent, Drafts, Trash, Spam, Starred
- **Labels**: User-defined tags for email organization (hierarchical/nested)
- **Attachments**: File attachments for emails
- **Search**: Advanced search with operators (`from:`, `to:`, `is:unread`, `has:attachment`, etc.)
- **Templates**: Reusable email templates with sharing support
- **Bulk Operations**: Batch actions (read, star, move, delete, label, snooze, archive, category)
- **Undo Send**: Configurable delay before emails are sent (5-30 seconds)
- **Categories**: Gmail-style tabs (Primary, Promotions, Social, Updates, Forums)
- **Snooze**: Temporarily hide emails until a specified time

## Database Isolation System

### Overview

This mailg implements a sophisticated **run_id-based database isolation** system. Each authentication token provisions a completely isolated database instance, ensuring:

- Perfect session isolation
- No cross-contamination between users/sessions
- Easy cleanup (drop database by run_id)
- Ideal for testing, demos, and multi-tenant scenarios
- Each user starts with a consistent, fresh state

### How It Works

```mermaid
graph TB
    Client[Client Request]
    Auth["POST /api/v1/auth/token"]
    SeedDB[("Seed Template DB")]
    Token["JWT with run_id"]
    API[API Request]
    Middleware[Auth Middleware]
    RunDB[("Run-Specific DB")]
    Cleanup[Cleanup Task]
    
    Client -->|"email"| Auth
    Auth -->|"1.Validate User"| SeedDB
    Auth -->|"2.Clone Template"| RunDB
    Auth -->|"3.Generate Token"| Token
    Token -->|"include run_id"| Client
    
    Client -->|"API Request + Token"| API
    API --> Middleware
    Middleware -->|"Extract run_id"| RunDB
    
    Cleanup -->|"Periodic"| RunDB
```

### Flow

1. **User authenticates** via `/api/v1/auth/token` with email
2. **Backend validates** user against seed/template database (read-only)
3. **Backend provisions** a new database by cloning the template
4. **Token generated** with unique `run_id` embedded
5. **All subsequent requests** route to the user's isolated database
6. **Cleanup task** periodically removes old databases

### Benefits

- **Testing**: Each test run gets a fresh database
- **Demos**: Every demo starts with clean, consistent data
- **Development**: No conflicts between multiple developers
- **Multi-tenancy**: True isolation between sessions
- **Reproducibility**: Consistent starting state for every session

## Standardized Response Format

All API responses are wrapped in a consistent format for predictable client-side handling:

### Success Response (2xx)

```json
{
  "success": true,
  "message": "Success",
  "statusCode": 200,
  "data": {
    "id": 1,
    "subject": "Welcome Email",
    "status": "received"
  }
}
```

### Error Response (4xx/5xx)

```json
{
  "success": false,
  "message": "Invalid credentials",
  "statusCode": 401,
  "data": null
}
```

### Validation Error (422)

```json
{
  "success": false,
  "message": "Validation error",
  "statusCode": 422,
  "data": {
    "errors": [
      {
        "loc": ["body", "name"],
        "msg": "field required",
        "type": "value_error.missing"
      }
    ]
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | `true` for 2xx/3xx status codes, `false` for 4xx/5xx |
| `message` | string | Human-readable message ("Success" for successful responses, error details for failures) |
| `statusCode` | integer | HTTP status code |
| `data` | object/array/null | Response payload (original endpoint response data) |

### Excluded Endpoints

The following endpoints return unwrapped responses:
- `/docs` - Swagger UI
- `/redoc` - ReDoc documentation
- `/openapi.json` - OpenAPI schema
- OPTIONS requests (CORS preflight)

### Database Isolation Flow Diagrams

#### 1) Token → Run Database Provisioning (Sequence)

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant API as FastAPI
    participant Seed as Seed_Template_DB
    participant Postgres as PostgreSQL

    Client->>API: POST /api/v1/auth/token
    API->>Seed: Validate user exists and role
    Seed-->>API: user and role
    API->>Postgres: CREATE DATABASE mailg_RUN_ID
    Postgres-->>API: OK run DB ready
    API-->>Client: JWT with run_id role exp
```

#### 2) Request Routing to the Correct Run Database (Flow)

```mermaid
flowchart TD
    A["Client Request with Bearer JWT"] --> B["Auth Middleware Parse and verify JWT"]
    B -->|"extract run_id"| C[DB Router]
    C --> D{"run_id DB exists?"}
    D -->|"yes"| E[("Connect to mailg_RUN_ID")]
    D -->|"no"| F["401 or 404 invalid or expired run_id"]
    E --> G[Endpoint Handler]
    G --> H[SQLAlchemy Session]
    H --> E
```

#### 3) Run Database Lifecycle + Cleanup (State)

```mermaid
stateDiagram-v2
    [*] --> SeedReady: mailg_seed initialized
    SeedReady --> RunProvisioned: token issued run_id created
    RunProvisioned --> Active: API traffic uses run DB
    Active --> Idle: no requests
    Idle --> Active: new request arrives
    RunProvisioned --> Expired: TTL elapsed registry marks stale
    Active --> Expired: TTL elapsed
    Expired --> Dropped: cleanup job drops run DB
    Dropped --> [*]
```

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Python 3.11+ (for local development)
- Git

### Run with Docker (Recommended)

1. **Clone the repository**

```bash
git clone <repository-url>
cd backend_mailg
```

2. **Set environment variables** (optional)

Create a `.env` file or export variables:

```bash
export JWT_SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(32))")
export DEVELOPMENT_MODE=true
```

3. **Start services**

```bash
docker-compose up -d
```

4. **Access the API** (database initializes automatically on startup)


- API: http://localhost:8766
- Swagger Docs: http://localhost:8766/docs
- Health Check: http://localhost:8766/health

### Local Development Setup

1. **Install dependencies**

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

2. **Start PostgreSQL** (via Docker)

```bash
docker-compose up -d postgres
```

3. **Run the server** (database initializes automatically on startup)

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8766
```

## Usage

### Authentication

1. **Generate a token**

```bash
curl -X POST http://localhost:8766/api/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com"}'
```

Response:
```json
{
  "success": true,
  "message": "Success",
  "statusCode": 200,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { ... },
    "role": "admin",
    "run_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "expires_in": 3600
  }
}
```

2. **Use the token** in subsequent requests

```bash
curl -X GET http://localhost:8766/api/v1/emails \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Available Users (from fixtures)

| Email                   | Name           | Role (UserRole)   | Use Case           |
|-------------------------|----------------|-------------------|--------------------|
| admin@example.com       | Admin User     | `UserRole.ADMIN`  | Full access        |
| john@example.com        | John Smith     | `UserRole.USER`   | Regular access     |
| jane@example.com        | Jane Doe       | `UserRole.USER`   | Regular access     |
| bob@example.com         | Bob Wilson     | `UserRole.USER`   | Regular access     |
| emily.davis@example.com | Emily Davis    | `UserRole.USER`   | Regular access     |
| inactive@example.com    | Inactive User  | `UserRole.USER`   | Inactive account   |

Note: This mailg uses email-based authentication without passwords. Roles correspond to `UserRole` enum in `app.core.constants`. Extend as needed for production.

### API Endpoints

#### Authentication
- `POST /api/v1/auth/token` - Generate access token
- `GET /api/v1/auth/me` - Get current user info

#### Users
- `GET /api/v1/users` - List users (paginated)
- `GET /api/v1/users/{id}` - Get user by ID
- `POST /api/v1/users` - Create user (admin only)
- `PUT /api/v1/users/{id}` - Update user (admin only)
- `DELETE /api/v1/users/{id}` - Delete user (admin only)

#### Admin Tools
- `GET /api/v1/db-snapshot/tables` - List database tables
- `GET /api/v1/db-snapshot/snapshot` - Get full database snapshot

#### Emails
- `GET /api/v1/emails` - List emails (paginated, filtered by folder/status/read/category)
- `POST /api/v1/emails` - Create email (draft or send, with optional scheduled_send_at)
- `GET /api/v1/emails/{id}` - Get email by ID
- `PUT /api/v1/emails/{id}` - Update email (drafts only for content)
- `DELETE /api/v1/emails/{id}` - Delete email (soft delete to trash)
- `POST /api/v1/emails/{id}/send` - Send a draft email (queued if undo_send enabled)
- `POST /api/v1/emails/{id}/cancel-send` - Cancel queued email (undo send)
- `POST /api/v1/emails/{id}/confirm-send` - Send queued email immediately
- `POST /api/v1/emails/{id}/reply` - Reply to email
- `POST /api/v1/emails/{id}/forward` - Forward email
- `PATCH /api/v1/emails/{id}/read` - Mark as read/unread
- `PATCH /api/v1/emails/{id}/star` - Star/unstar email
- `PATCH /api/v1/emails/{id}/category` - Update category (primary/promotions/social/updates/forums)
- `POST /api/v1/emails/{id}/move` - Move to folder
- `POST /api/v1/emails/{id}/snooze` - Snooze until specified time
- `POST /api/v1/emails/{id}/unsnooze` - Unsnooze email
- `POST /api/v1/emails/{id}/archive` - Archive email
- `POST /api/v1/emails/{id}/labels` - Add label to email
- `DELETE /api/v1/emails/{id}/labels/{label_id}` - Remove label

#### Labels (Hierarchical/Nested)
- `GET /api/v1/labels` - List user's labels (flat or tree structure)
- `GET /api/v1/labels/tree` - List labels as hierarchical tree
- `POST /api/v1/labels` - Create label (with optional parent_id for nesting)
- `GET /api/v1/labels/{id}` - Get label by ID
- `PUT /api/v1/labels/{id}` - Update label (move between parents via parent_id)
- `DELETE /api/v1/labels/{id}` - Delete label (cascade or orphan children)
- `GET /api/v1/labels/{id}/emails` - List emails with label

#### Attachments
- `GET /api/v1/emails/{id}/attachments` - List email attachments
- `POST /api/v1/emails/{id}/attachments` - Upload attachment
- `GET /api/v1/attachments/{id}` - Get attachment details
- `DELETE /api/v1/attachments/{id}` - Delete attachment
- `GET /api/v1/attachments/{id}/download` - Download attachment

#### Search
- `GET /api/v1/search` - Search emails with advanced operators
- `GET /api/v1/search/suggestions` - Get search suggestions/autocomplete
- `POST /api/v1/search/saved` - Save a search query
- `GET /api/v1/search/saved` - List saved searches
- `DELETE /api/v1/search/saved/{id}` - Delete saved search

#### Templates
- `GET /api/v1/templates` - List templates (own + shared)
- `POST /api/v1/templates` - Create template
- `GET /api/v1/templates/{id}` - Get template by ID
- `PUT /api/v1/templates/{id}` - Update template
- `DELETE /api/v1/templates/{id}` - Delete template
- `POST /api/v1/templates/{id}/apply` - Apply template to create draft

#### Bulk Operations
- `POST /api/v1/bulk/read` - Bulk mark read/unread
- `POST /api/v1/bulk/star` - Bulk star/unstar
- `POST /api/v1/bulk/move` - Bulk move to folder
- `POST /api/v1/bulk/delete` - Bulk delete
- `POST /api/v1/bulk/labels/add` - Bulk add labels
- `POST /api/v1/bulk/labels/remove` - Bulk remove labels
- `POST /api/v1/bulk/snooze` - Bulk snooze
- `POST /api/v1/bulk/unsnooze` - Bulk unsnooze
- `POST /api/v1/bulk/archive` - Bulk archive
- `POST /api/v1/bulk/category` - Bulk update category

### Search Operators

The search API supports advanced operators in the `q` parameter:

| Operator | Example | Description |
|----------|---------|-------------|
| `from:` | `from:john@example.com` | Filter by sender email |
| `to:` | `to:team@example.com` | Filter by recipient |
| `subject:` | `subject:meeting` | Search in subject only |
| `has:attachment` | `has:attachment` | Emails with attachments |
| `is:starred` | `is:starred` | Starred emails |
| `is:unread` | `is:unread` | Unread emails |
| `is:read` | `is:read` | Read emails |
| `is:important` | `is:important` | Important emails |
| `in:` | `in:inbox` | Filter by folder type |
| `label:` | `label:work` | Filter by label name |
| `before:` | `before:2024-12-31` | Emails before date |
| `after:` | `after:2024-01-01` | Emails after date |
| `newer_than:` | `newer_than:7d` | Relative date (d/w/m/y) |
| `older_than:` | `older_than:30d` | Relative date (d/w/m/y) |

**Combined search example:**
```bash
curl -X GET "http://localhost:8766/api/v1/search?q=from:john%20is:unread%20has:attachment" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Nested Labels

Labels support hierarchical organization (parent-child relationships) for organizing emails:

```
Labels
├── Newsletters
├── Personal
│   ├── Receipts
│   └── Travel
├── Projects
│   └── 2025
│       ├── App Launch
│       └── Website Redesign
└── Work
    ├── Clients
    ├── Invoices
    └── Reports
```

**Create nested label:**
```bash
# First create parent
curl -X POST "http://localhost:8766/api/v1/labels" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Projects", "color": "#4285f4"}'

# Then create child under parent (use parent's ID)
curl -X POST "http://localhost:8766/api/v1/labels" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "2025", "color": "#34a853", "parent_id": 5}'
```

**Get hierarchical tree:**
```bash
curl -X GET "http://localhost:8766/api/v1/labels/tree" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:
```json
[
  {
    "id": 1,
    "name": "Projects",
    "color": "#4285f4",
    "parent_id": null,
    "email_count": 0,
    "children": [
      {
        "id": 5,
        "name": "2025",
        "color": "#34a853",
        "parent_id": 1,
        "email_count": 3,
        "children": [
          {"id": 6, "name": "App Launch", "children": []},
          {"id": 7, "name": "Website Redesign", "children": []}
        ]
      }
    ]
  }
]
```

**Move label to different parent:**
```bash
# Move label ID 7 under a new parent (ID 3)
curl -X PUT "http://localhost:8766/api/v1/labels/7" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"parent_id": 3}'

# Move label to root level
curl -X PUT "http://localhost:8766/api/v1/labels/7" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"parent_id": null}'
```

**Delete with cascade options:**
```bash
# Delete label and all children (default)
curl -X DELETE "http://localhost:8766/api/v1/labels/5?cascade=true" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Delete label but move children to grandparent
curl -X DELETE "http://localhost:8766/api/v1/labels/5?cascade=false" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## API Contract Generation

Generate a Markdown API contract document directly from the FastAPI backend:

```bash
# Set development mode (required if DB is running)
$env:DEVELOPMENT_MODE="true"  # PowerShell
export DEVELOPMENT_MODE=true   # Bash

# Generate the contract
python scripts/generate_openapi.py
```

This creates `API_CONTRACT_OPENAPI.md` containing:
- All API endpoints organized by tag
- Request/response examples with JSON bodies
- Path, query, and header parameters
- Common types (enums)
- Error response formats

**Environment Variables:**
| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAPI_MD_OUT` | `API_CONTRACT_OPENAPI.md` | Output file path |

## Project Structure

```
backend/
├── app/
│   ├── main.py                  # FastAPI application entry point (simplified)
│   │
│   ├── core/                    # Application foundation
│   │   ├── config.py            # Configuration and environment variables
│   │   ├── constants.py         # Application-wide constants and enums
│   │   ├── openapi.py           # OpenAPI/Swagger customization
│   │   ├── exceptions.py        # Global exception handlers
│   │   ├── telemetry.py         # Telemetry configuration
│   │   └── middleware/          # HTTP middleware
│   │       ├── cors.py          # CORS configuration
│   │       ├── auth.py          # JWT parsing and validation
│   │       └── response_wrapper.py  # Standardized response format
│   │
│   ├── db/                      # Database infrastructure
│   │   ├── base.py              # SQLAlchemy declarative base
│   │   ├── session.py           # Database session management
│   │   ├── run_router.py        # Run-id based database routing
│   │   ├── template.py          # Template database creation
│   │   ├── bootstrap.py         # Schema creation and fixture loading
│   │   └── registry.py          # Track active run databases
│   │
│   ├── tasks/                   # Background services
│   │   ├── cleanup.py           # Automatic database cleanup
│   │   └── scheduled_sender.py  # Process queued emails (undo send)
│   │
│   ├── api/                     # API endpoints
│   │   └── v1/
│   │       ├── router.py        # Central v1 router
│   │       └── endpoints/       # Endpoint modules
│   │           ├── auth.py      # Authentication endpoints
│   │           ├── users.py     # User management
│   │           ├── db_snapshot.py  # Database inspection tools
│   │           ├── emails.py    # Email CRUD, snooze, undo-send
│   │           ├── labels.py    # Label management (hierarchical)
│   │           ├── metrics.py   # Metrics endpoint
│   │           ├── attachments.py  # Attachment handling
│   │           ├── search.py    # Email search with operators
│   │           ├── bulk.py      # Bulk email operations
│   │           └── templates.py # Email template CRUD
│   │
│   ├── auth/                    # Authentication & Authorization
│   │   ├── token_manager.py     # JWT token generation
│   │   ├── rbac.py              # Role-based access control
│   │   ├── dependencies.py      # FastAPI auth dependencies
│   │   ├── token_dependency.py  # Token extraction utilities
│   │   └── context.py           # Request context management
│   │
│   ├── models/                  # SQLAlchemy models
│   │   ├── user.py              # User model (with contact fields)
│   │   ├── log.py               # Log model
│   │   ├── email.py             # Email model
│   │   ├── email_recipient.py   # Email recipient (to/cc/bcc)
│   │   ├── email_template.py    # Email template model
│   │   ├── label.py             # Email label model
│   │   ├── email_label.py       # Email-label association
│   │   ├── attachment.py        # Email attachment model
│   │   ├── thread.py            # Email thread model
│   │   └── saved_search.py      # Saved search model
│   │
│   ├── schemas/                 # Pydantic schemas
│   │   ├── user.py              # User request/response schemas
│   │   ├── pagination.py        # Generic PaginatedListResponse[T]
│   │   ├── email.py             # Email request/response schemas
│   │   ├── email_template.py    # Template schemas
│   │   ├── bulk.py              # Bulk operation schemas
│   │   ├── db_snapshot.py       # Database snapshot schemas
│   │   ├── label.py             # Label schemas
│   │   ├── attachment.py        # Attachment schemas
│   │   ├── thread.py            # Thread schemas
│   │   └── search.py            # Search query/result schemas
│   │
│   └── utils/                   # Utilities
│       └── logger.py            # Logging configuration
│
├── fixtures/                    # Seed data
│   ├── users.json               # Example users (with contact info)
│   ├── labels.json              # User labels
│   ├── threads.json             # Email threads
│   ├── emails.json              # Sample emails
│   ├── email_recipients.json    # Email recipients
│   ├── email_labels.json        # Email-label associations
│   ├── email_templates.json     # Email templates
│   ├── attachments.json         # Sample attachments
│   └── saved_searches.json      # Saved search queries
│
├── tests/                       # Test suite
│   ├── conftest.py              # Pytest configuration
│   ├── test_auth_security.py    # Authentication tests
│   ├── test_db_router.py        # Database isolation tests
│   ├── test_rbac_edge_cases.py  # RBAC permission tests
│   ├── test_token_manager.py    # Token management tests
│   ├── test_response_wrapper.py # Response format wrapper tests
│   ├── test_emails_api.py       # Email endpoint tests
│   ├── test_labels_api.py       # Label endpoint tests
│   ├── test_attachments_api.py  # Attachment endpoint tests
│   ├── test_bulk_api.py         # Bulk operations tests
│   ├── test_templates_api.py    # Template endpoint tests
│   ├── test_undo_send_api.py    # Undo send feature tests
│   └── test_search_api.py       # Search endpoint tests
│
├── Dockerfile                   # Container image definition
├── requirements.txt             # Python dependencies
├── gunicorn_config.py           # Production server config
└── run.py                       # Development server entry point

scripts/
└── generate_openapi.py          # Generate API contract markdown

docker-compose.yaml              # Service orchestration
```

## Extending the Mailg

### Best Practices

When extending the mailg, follow these best practices:

1. **Use Constants**: Always use enums and constants from `app.core.constants` instead of hardcoded strings
2. **Type Safety**: Import and use `UserRole`, `EmailStatus` enums for type hints
3. **Validation**: Use `VALID_*` lists for input validation
4. **Consistency**: Follow the established patterns in existing endpoints (emails, users)

### Adding a New Resource

Use the `Email` model as a reference template:

1. **Create model** in `backend/app/models/your_resource.py`

```python
from sqlalchemy import Column, BigInteger, String, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from app.db.base import Base

class YourResource(Base):
    __tablename__ = "your_resources"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    name = Column(String, nullable=False)
    status = Column(String, default="draft")  # Use with EmailStatus enum
    owner_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
```

2. **Create schemas** in `backend/app/schemas/your_resource.py`

```python
from pydantic import BaseModel, Field
from typing import Optional
from app.core.constants import EmailStatus

class YourResourceCreate(BaseModel):
    name: str
    status: Optional[str] = Field(default=EmailStatus.DRAFT.value)

class YourResourceUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None

class YourResourceResponse(BaseModel):
    id: int
    name: str
    status: str
    owner_id: int
    is_deleted: bool
    
    class Config:
        from_attributes = True
```

3. **Create endpoint** in `backend/app/api/v1/endpoints/your_resources.py`

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.auth.rbac import authorized
from app.auth.dependencies import auth
from app.core.constants import UserRole, EmailStatus, VALID_EMAIL_STATUSES
from app.models.your_resource import YourResource
from app.schemas.your_resource import YourResourceCreate, YourResourceResponse
from app.schemas.pagination import PaginatedListResponse

router = APIRouter()

@router.post(
    "/your-resources",
    response_model=YourResourceResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(authorized())]
)
def create_resource(
    resource_data: YourResourceCreate,
    db: Session = Depends(get_db)
):
    """Create a new resource."""
    current_user = auth.user
    
    # Validate status using constants
    if resource_data.status not in VALID_EMAIL_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(VALID_EMAIL_STATUSES)}"
        )
    
    resource = YourResource(
        name=resource_data.name,
        status=resource_data.status or EmailStatus.DRAFT.value,
        owner_id=current_user.id
    )
    
    db.add(resource)
    db.commit()
    db.refresh(resource)
    
    return resource

@router.get(
    "/your-resources",
    response_model=PaginatedListResponse[YourResourceResponse],
    dependencies=[Depends(authorized())],
)
def list_resources(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Emails per page"),
):
    """List resources (paginated).

    Standard list shape: {"results": [...], "total": ..., "page": ..., "page_size": ..., "total_pages": ...}
    """
    query = db.query(YourResource).filter(YourResource.is_deleted == False)
    total = query.count()

    total_pages = (total + page_size - 1) // page_size
    offset = (page - 1) * page_size

    resources = query.offset(offset).limit(page_size).all()

    return PaginatedListResponse[YourResourceResponse](
        results=resources,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )
```

4. **Register router** in `backend/app/api/v1/router.py`

```python
from app.api.v1.endpoints import your_resources

# Add to the existing router includes
router.include_router(your_resources.router, tags=["your-resources"])
```

5. **Add constants** (optional) in `backend/app/core/constants.py`

```python
class YourResourceStatus(str, Enum):
    """Your resource status enumeration."""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

# Add validation list
VALID_YOUR_RESOURCE_STATUSES = [s.value for s in YourResourceStatus]
```

6. **Add fixtures** (optional)

Add your resource fixtures to `backend/fixtures/your_resources.json` - they'll be loaded automatically on app startup.

## RBAC (Role-Based Access Control)

### Roles

The application uses role constants defined in `app.core.constants`:

- **UserRole.ADMIN** (`"admin"`): Full access to all resources and operations
- **UserRole.USER** (`"user"`): Regular access (read-only for most resources)

### Available Constants

```python
from app.core.constants import (
    # User constants
    UserRole,           # Enum: ADMIN, USER
    VALID_USER_ROLES,   # List of valid role strings
    
    # Email constants
    EmailStatus,        # Enum: DRAFT, QUEUED, SENT, RECEIVED, ARCHIVED, CANCELLED
    EmailCategory,      # Enum: PRIMARY, PROMOTIONS, SOCIAL, UPDATES, FORUMS
    FolderType,         # Enum: INBOX, SENT, DRAFTS, TRASH, SPAM
    RecipientType,      # Enum: TO, CC, BCC
    AttachmentType,     # Enum: FILE, IMAGE, DOCUMENT
    VALID_EMAIL_STATUSES,   # List of valid email status strings
    VALID_EMAIL_CATEGORIES, # List of valid category strings
    VALID_FOLDER_TYPES,     # List of valid folder type strings
    VALID_RECIPIENT_TYPES,  # List of valid recipient type strings
    VALID_ATTACHMENT_TYPES, # List of valid attachment type strings
)
```

### Using RBAC in Endpoints

```python
from fastapi import APIRouter, Depends
from app.auth.rbac import authorized
from app.core.constants import UserRole

router = APIRouter()

# Allow all authenticated users
@router.get("/emails", dependencies=[Depends(authorized())])
def list_emails():
    pass

# Require specific roles using constants
@router.delete("/emails/{id}", dependencies=[Depends(authorized([UserRole.ADMIN]))])
def delete_email(id: int):
    pass

# Admin-only actions
@router.put("/users/{id}", dependencies=[Depends(authorized([UserRole.ADMIN]))])
def update_user(id: int):
    pass
```

### Accessing Current User

```python
from app.auth.dependencies import auth
from app.core.constants import UserRole

@router.post("/emails")
def create_email():
    current_user = auth.user  # Access current authenticated user
    
    # Use current_user properties
    user_id = current_user.id
    user_role = current_user.role
    
    # Check role using constants
    if current_user.role == UserRole.ADMIN.value:
        # Admin-specific logic
        pass
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql+psycopg2://mailg:mailg@localhost:5433/postgres` | Database connection string |
| `POSTGRES_TEMPLATE_DB` | `mailg_seed` | Template database name |
| `POSTGRES_RUN_DB_PREFIX` | `mailg_` | Prefix for run databases |
| `JWT_SECRET_KEY` | (required in prod) | Secret key for JWT signing |
| `JWT_ALGORITHM` | `HS256` | JWT signing algorithm |
| `JWT_ISSUER` | `mailg` | JWT issuer claim |
| `JWT_ACCESS_TOKEN_TTL_SECONDS` | `3600` | Token expiration (seconds) |
| `DEVELOPMENT_MODE` | `false` | Enable development features |

### Database Configuration

The docker-compose.yaml configures PostgreSQL with:
- Port: 5434 (host) → 5432 (container)
- User/Password: `mailg/mailg`
- Database: `postgres` (admin database)

## Testing

### Run Tests

```bash
cd backend
pytest
```

### Run Specific Test File

```bash
pytest tests/test_auth_security.py -v
```

### Run with Coverage

```bash
pytest --cov=app --cov-report=html
```

### Test Structure

- `conftest.py`: Shared fixtures and test configuration
- `test_auth_security.py`: JWT and authentication tests
- `test_db_router.py`: Database isolation verification
- `test_rbac_edge_cases.py`: Permission system tests
- `test_token_manager.py`: Token generation/validation tests
- `test_response_wrapper.py`: Response format wrapper tests
- `test_emails_api.py`: Email CRUD, send/reply/forward tests
- `test_labels_api.py`: Label CRUD and email-label association tests
- `test_attachments_api.py`: Attachment upload/download tests
- `test_search_api.py`: Search operators, filters, and saved search tests
- `test_bulk_api.py`: Bulk operations tests
- `test_templates_api.py`: Email template CRUD tests
- `test_undo_send_api.py`: Undo send and scheduled email tests

## Maintenance

### Cleanup Old Databases

Databases are automatically cleaned up after 24 hours (configurable).

Manual cleanup is available via the admin API (drops the current run database for your authenticated `run_id`):
- `DELETE /api/v1/db-snapshot/db_drop` (admin-only)

```bash
# Example (adjust host + auth headers as needed)
curl -X DELETE http://localhost:8766/api/v1/db-snapshot/db_drop
```

### View Active Databases

```bash
docker exec -it mailg-postgres psql -U mailg -d postgres -c "\l"
```

### Backup Template Database

```bash
docker exec mailg-postgres pg_dump -U mailg mailg_seed > backup.sql
```

## Production Deployment

### Security Checklist

- [ ] Set strong `JWT_SECRET_KEY` (32+ bytes, random)
- [ ] Set `DEVELOPMENT_MODE=false`
- [ ] Use HTTPS/TLS for all connections
- [ ] Configure CORS for specific origins
- [ ] Use strong database credentials
- [ ] Enable rate limiting
- [ ] Set up monitoring and logging
- [ ] Configure firewall rules
- [ ] Regular security updates

### Performance Tuning

- Adjust PostgreSQL connection pool size in `db/run_router.py`
- Configure Gunicorn workers in `gunicorn_config.py`
- Set appropriate cleanup intervals in `tasks/cleanup.py`
- Enable database query logging for optimization
- Consider read replicas for high-traffic scenarios

### Monitoring

- Health check endpoint: `/health`
- Database snapshots: `/api/v1/db-snapshot/snapshot` (admin only)
- Application logs: `backend/logs/api.log`

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check connection
docker exec -it mailg-postgres psql -U mailg -d postgres -c "SELECT 1"
```

### Token Issues

```bash
# Verify JWT_SECRET_KEY is set
docker exec mailg-backend env | grep JWT_SECRET_KEY

# Check token in JWT debugger: https://jwt.io
```

### Import Errors

```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```


