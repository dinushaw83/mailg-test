# FastAPI Backend Boilerplate

A production-ready FastAPI boilerplate with JWT authentication, RBAC, and sophisticated database isolation system.

## Features

### Core Infrastructure
- **FastAPI Framework**: Modern, fast web framework for building APIs
- **JWT Authentication**: Stateless token-based authentication
- **RBAC (Role-Based Access Control)**: Three-tier permission system (admin, agent, end-user)
- **Database Isolation**: Unique database per session for perfect isolation
- **PostgreSQL**: Robust relational database with connection pooling
- **Docker Support**: Complete containerized development environment
- **API Documentation**: Auto-generated OpenAPI/Swagger docs
- **Standardized Response Format**: Consistent API response wrapper for all endpoints

### Boilerplate includes reference implementations:
- **User Management**: Complete CRUD with role-based permissions
- **Items CRUD**: Generic resource demonstrating best practices
- **Authentication Endpoints**: Token generation and validation
- **Database Snapshots**: Admin tools for database inspection

## Database Isolation System

### Overview

This boilerplate implements a sophisticated **run_id-based database isolation** system. Each authentication token provisions a completely isolated database instance, ensuring:

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
    "name": "Example Item",
    "status": "active"
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
    API->>Postgres: CREATE DATABASE boiler_plate_RUN_ID
    Postgres-->>API: OK run DB ready
    API-->>Client: JWT with run_id role exp
```

#### 2) Request Routing to the Correct Run Database (Flow)

```mermaid
flowchart TD
    A["Client Request with Bearer JWT"] --> B["Auth Middleware Parse and verify JWT"]
    B -->|"extract run_id"| C[DB Router]
    C --> D{"run_id DB exists?"}
    D -->|"yes"| E[("Connect to boiler_plate_RUN_ID")]
    D -->|"no"| F["401 or 404 invalid or expired run_id"]
    E --> G[Endpoint Handler]
    G --> H[SQLAlchemy Session]
    H --> E
```

#### 3) Run Database Lifecycle + Cleanup (State)

```mermaid
stateDiagram-v2
    [*] --> SeedReady: boiler_plate_seed initialized
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
cd Backend_Boiler_Plate
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
curl -X GET http://localhost:8766/api/v1/items \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Available Users (from fixtures)

| Email                | Role (UserRole)        | Password | Use Case           |
|----------------------|------------------------|----------|--------------------|
| admin@example.com    | `UserRole.ADMIN`       | N/A      | Full access        |
| agent@example.com    | `UserRole.AGENT`       | N/A      | Elevated access    |
| user@example.com     | `UserRole.END_USER`    | N/A      | Standard access    |

Note: This boilerplate uses email-based authentication without passwords. Roles correspond to `UserRole` enum in `app.core.constants`. Extend as needed for production.

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

#### Items (Generic CRUD Example)
- `GET /api/v1/items` - List items (paginated, filtered)
- `GET /api/v1/items/{id}` - Get item by ID
- `POST /api/v1/items` - Create item
- `PUT /api/v1/items/{id}` - Update item (admin/agent only)
- `DELETE /api/v1/items/{id}` - Delete item (admin only)

#### Admin Tools
- `GET /api/v1/db-snapshot/tables` - List database tables
- `GET /api/v1/db-snapshot/snapshot` - Get full database snapshot

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
│   │   └── cleanup.py           # Automatic database cleanup
│   │
│   ├── api/                     # API endpoints
│   │   └── v1/
│   │       ├── router.py        # Central v1 router
│   │       └── endpoints/       # Endpoint modules
│   │           ├── auth.py      # Authentication endpoints
│   │           ├── users.py     # User management
│   │           ├── items.py     # Generic CRUD example
│   │           └── db_snapshot.py  # Database inspection tools
│   │
│   ├── auth/                    # Authentication & Authorization
│   │   ├── token_manager.py     # JWT token generation
│   │   ├── rbac.py              # Role-based access control
│   │   ├── dependencies.py      # FastAPI auth dependencies
│   │   ├── token_dependency.py  # Token extraction utilities
│   │   └── context.py           # Request context management
│   │
│   ├── models/                  # SQLAlchemy models
│   │   ├── user.py              # User model
│   │   ├── item.py              # Generic item model
│   │   └── log.py               # Log model
│   │
│   ├── schemas/                 # Pydantic schemas
│   │   ├── user.py              # User request/response schemas
│   │   ├── item.py              # Item request/response schemas
│   │   └── pagination.py        # Generic PaginatedListResponse[T] (paginated list results)
│   │
│   └── utils/                   # Utilities
│       └── logger.py            # Logging configuration
│
├── fixtures/                    # Seed data
│   ├── users.json               # Example users
│   └── items.json               # Example items
│
├── tests/                       # Test suite
│   ├── conftest.py              # Pytest configuration
│   ├── test_auth_security.py    # Authentication tests
│   ├── test_db_router.py        # Database isolation tests
│   ├── test_rbac_edge_cases.py  # RBAC permission tests
│   ├── test_items_api.py        # Item endpoint tests
│   └── test_token_manager.py    # Token management tests
│
├── Dockerfile                   # Container image definition
├── requirements.txt             # Python dependencies
├── gunicorn_config.py           # Production server config
└── run.py                       # Development server entry point

scripts/
└── generate_openapi.py          # Generate API contract markdown

docker-compose.yaml              # Service orchestration
```

## Extending the Boilerplate

### Best Practices

When extending the boilerplate, follow these best practices:

1. **Use Constants**: Always use enums and constants from `app.core.constants` instead of hardcoded strings
2. **Type Safety**: Import and use `UserRole`, `ItemStatus`, `ItemPriority` enums for type hints
3. **Validation**: Use `VALID_*` lists for input validation
4. **Consistency**: Follow the established patterns in existing endpoints (items, users)

### Adding a New Resource

Use the `Item` model as a reference template:

1. **Create model** in `backend/app/models/your_resource.py`

```python
from sqlalchemy import Column, BigInteger, String, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from app.db.base import Base

class YourResource(Base):
    __tablename__ = "your_resources"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    name = Column(String, nullable=False)
    status = Column(String, default="active")  # Use with ItemStatus enum
    created_by_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
```

2. **Create schemas** in `backend/app/schemas/your_resource.py`

```python
from pydantic import BaseModel, Field
from typing import Optional
from app.core.constants import ItemStatus

class YourResourceCreate(BaseModel):
    name: str
    status: Optional[str] = Field(default=ItemStatus.ACTIVE.value)

class YourResourceUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None

class YourResourceResponse(BaseModel):
    id: int
    name: str
    status: str
    created_by_id: int
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
from app.core.constants import UserRole, ItemStatus, VALID_ITEM_STATUSES
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
    if resource_data.status not in VALID_ITEM_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(VALID_ITEM_STATUSES)}"
        )
    
    resource = YourResource(
        name=resource_data.name,
        status=resource_data.status or ItemStatus.ACTIVE.value,
        created_by_id=current_user.id
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
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
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
- **UserRole.AGENT** (`"agent"`): Elevated access (can create/update most resources)
- **UserRole.END_USER** (`"end-user"`): Limited access (read-only for most resources)

### Available Constants

```python
from app.core.constants import (
    UserRole,           # Enum: ADMIN, AGENT, END_USER
    ItemStatus,         # Enum: ACTIVE, INACTIVE, ARCHIVED
    ItemPriority,       # Enum: LOW, MEDIUM, HIGH
    VALID_USER_ROLES,   # List of valid role strings
    VALID_ITEM_STATUSES,    # List of valid status strings
    VALID_ITEM_PRIORITIES,  # List of valid priority strings
)
```

### Using RBAC in Endpoints

```python
from fastapi import APIRouter, Depends
from app.auth.rbac import authorized
from app.core.constants import UserRole

router = APIRouter()

# Allow all authenticated users
@router.get("/items", dependencies=[Depends(authorized())])
def list_items():
    pass

# Require specific roles using constants
@router.delete("/items/{id}", dependencies=[Depends(authorized([UserRole.ADMIN]))])
def delete_item(id: int):
    pass

# Multiple allowed roles using constants
@router.put("/items/{id}", dependencies=[Depends(authorized([UserRole.ADMIN, UserRole.AGENT]))])
def update_item(id: int):
    pass
```

### Accessing Current User

```python
from app.auth.dependencies import auth
from app.core.constants import UserRole

@router.post("/items")
def create_item():
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
| `DATABASE_URL` | `postgresql+psycopg2://boiler_plate:boiler_plate@localhost:5433/postgres` | Database connection string |
| `POSTGRES_TEMPLATE_DB` | `boiler_plate_seed` | Template database name |
| `POSTGRES_RUN_DB_PREFIX` | `boiler_plate_` | Prefix for run databases |
| `JWT_SECRET_KEY` | (required in prod) | Secret key for JWT signing |
| `JWT_ALGORITHM` | `HS256` | JWT signing algorithm |
| `JWT_ISSUER` | `boilerplate` | JWT issuer claim |
| `JWT_ACCESS_TOKEN_TTL_SECONDS` | `3600` | Token expiration (seconds) |
| `DEVELOPMENT_MODE` | `false` | Enable development features |

### Database Configuration

The docker-compose.yaml configures PostgreSQL with:
- Port: 5434 (host) → 5432 (container)
- User/Password: `boiler_plate/boiler_plate`
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
- `test_items_api.py`: Item endpoint tests
- `test_token_manager.py`: Token generation/validation tests
- `test_response_wrapper.py`: Response format wrapper tests

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
docker exec -it boiler_plate-postgres psql -U boiler_plate -d postgres -c "\l"
```

### Backup Template Database

```bash
docker exec boiler_plate-postgres pg_dump -U boiler_plate boiler_plate_seed > backup.sql
```

## TODO / Roadmap

- [ ] **ACL integration**: Add fine-grained, resource-level access control (ACLs) in addition to RBAC, including middleware/dependencies, schema changes, and tests.

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
docker exec -it boiler_plate-postgres psql -U boiler_plate -d postgres -c "SELECT 1"
```

### Token Issues

```bash
# Verify JWT_SECRET_KEY is set
docker exec boiler_plate-backend env | grep JWT_SECRET_KEY

# Check token in JWT debugger: https://jwt.io
```

### Import Errors

```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```


