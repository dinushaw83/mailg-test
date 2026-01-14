# Python Test Suite Analysis

## Overview

This document provides a comprehensive analysis of all Python test files in the backend, including test types, dependencies, execution methods, and usage patterns.

## Test Files Summary

| Test File | Test Count (Est.) | Primary Focus | Test Type |
|-----------|------------------|---------------|-----------|
| `test_auth_security.py` | ~15 | JWT security hardening | Unit/Integration |
| `test_db_router.py` | ~12 | Database isolation & routing | Unit/Documentation |
| `test_rbac_edge_cases.py` | ~15 | Role-based access control | Unit |
| `test_token_manager.py` | ~20 | JWT token lifecycle | Unit |
| `test_response_wrapper.py` | ~20 | API response formatting | Integration |
| `test_emails_api.py` | ~50+ | Email CRUD & operations | Integration |
| `test_folders_api.py` | ~15 | Folder management | Integration |
| `test_labels_api.py` | ~30 | Hierarchical labels | Integration |
| `test_attachments_api.py` | ~8 | Attachment handling | Integration |
| `test_search_api.py` | ~20 | Search functionality | Integration |
| `test_templates_api.py` | ~25 | Email templates | Integration |
| `test_undo_send_api.py` | ~20 | Undo send feature | Integration |
| `test_bulk_api.py` | ~50+ | Bulk operations | Integration |

**Total Test Files:** 13  
**Estimated Total Tests:** ~300+

---

## Test Types Breakdown

### 1. Unit Tests
- **Purpose:** Test individual components in isolation
- **Files:**
  - `test_auth_security.py` - JWT validation logic
  - `test_token_manager.py` - Token creation/validation
  - `test_rbac_edge_cases.py` - Permission checks
  - `test_db_router.py` - Database routing logic

### 2. Integration Tests
- **Purpose:** Test API endpoints with database interactions
- **Files:**
  - `test_emails_api.py` - Email endpoints
  - `test_folders_api.py` - Folder endpoints
  - `test_labels_api.py` - Label endpoints
  - `test_attachments_api.py` - Attachment endpoints
  - `test_search_api.py` - Search endpoints
  - `test_templates_api.py` - Template endpoints
  - `test_undo_send_api.py` - Undo send endpoints
  - `test_bulk_api.py` - Bulk operation endpoints
  - `test_response_wrapper.py` - Response formatting

### 3. Security Tests
- **Purpose:** Test security vulnerabilities and edge cases
- **Files:**
  - `test_auth_security.py` - JWT security issues (#91, #118, #95, #122, #119, #121)
  - `test_rbac_edge_cases.py` - RBAC edge cases (#93, #117, #94, #115, #82, #116)

### 4. Documentation Tests
- **Purpose:** Document expected behavior and prevent regressions
- **Files:**
  - `test_db_router.py` - Database isolation behavior

---

## Dependencies

### Core Testing Dependencies

```python
# From requirements.txt
pytest>=7.4.0              # Test framework
pytest-asyncio>=0.23.0     # Async test support
pytest-cov>=4.1.0          # Coverage reporting
httpx>=0.26,<0.28          # HTTP client for TestClient
```

### Application Dependencies (Required for Tests)

```python
fastapi>=0.109.1           # Web framework
sqlalchemy>=2.0.36         # ORM
pydantic>=2.9.0            # Data validation
PyJWT>=2.10.1              # JWT handling
```

### Test-Specific Imports

```python
# Common imports across test files
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta, timezone
import pytest
import jwt
```

### Test Fixtures (from conftest.py)

**Database Fixtures:**
- `db_engine` - In-memory SQLite database engine
- `db_session` - Database session for tests
- `client` - FastAPI TestClient with database override

**User Fixtures:**
- `sample_user` - Regular user (role: "user")
- `sample_admin` - Admin user (role: "admin")
- `client_with_auth` - Authenticated client (regular user)
- `client_with_admin_auth` - Authenticated client (admin)
- `client_with_user_auth` - Authenticated client (regular user)

**Email-Related Fixtures:**
- `sample_folder` - Test inbox folder
- `sample_drafts_folder` - Test drafts folder
- `sample_sent_folder` - Test sent folder
- `sample_trash_folder` - Test trash folder
- `sample_email` - Sample received email
- `sample_draft_email` - Sample draft email
- `sample_label` - Sample label
- `sample_attachment` - Sample attachment

**Other Fixtures:**
- `mock_request` - Mock FastAPI request object

---

## Test Configuration

### Pytest Configuration (pytest.ini)

The `pytest.ini` file configures pytest to:
- Add the backend directory to Python path (`pythonpath = .`) so the `app` module can be imported
- Set test discovery patterns
- Configure output options
- Define test markers

**Important:** The `pythonpath = .` setting ensures that when running `pytest` from the `backend` directory, Python can find the `app` module.

### Environment Variables (Set in conftest.py)

```python
os.environ.setdefault("DEVELOPMENT_MODE", "true")
os.environ.setdefault("JWT_SECRET_KEY", "unit-test-secret-key-please-change-123456")
os.environ.setdefault("DATABASE_URL", "postgresql+psycopg2://mailg:mailg@127.0.0.1:5436/postgres")
```

### Database Configuration

- **Test Database:** In-memory SQLite (`sqlite:///:memory:`)
- **UUID Support:** Custom SQLite adapter for UUID columns
- **Isolation:** Each test function gets a fresh database (function-scoped fixtures)

### Test Client Setup

```python
# From conftest.py
@pytest.fixture(scope="function")
def client(db_session):
    """Create a test client with database dependency override."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()
```

---

## How to Run Tests

### Basic Commands

```bash
# Run all tests
cd backend
pytest

# Run with verbose output
pytest -v

# Run specific test file
pytest tests/test_emails_api.py

# Run specific test class
pytest tests/test_emails_api.py::TestEmailCreate

# Run specific test method
pytest tests/test_emails_api.py::TestEmailCreate::test_create_email_draft_authenticated

# Run tests matching pattern
pytest -k "test_create"

# Run tests with coverage
pytest --cov=app --cov-report=html

# Run tests with coverage (terminal output)
pytest --cov=app --cov-report=term

# Run tests with coverage (XML for CI)
pytest --cov=app --cov-report=xml
```

### CI/CD Execution (GitHub Actions)

The tests run automatically on:
- Pull requests to `main`/`master`
- Pushes to `main`/`master`/`develop`
- Manual workflow dispatch

**Command used in CI:**
```bash
pytest tests/ -v --cov=app --cov-report=xml --cov-report=term
```

### Running Tests in Docker

```bash
# Start services
docker-compose up -d

# Run tests in container
docker-compose exec backend pytest

# Or run from host
docker-compose exec backend pytest tests/ -v
```

---

## Test Patterns & Usage

### 1. Authentication Pattern

```python
def test_protected_endpoint(client_with_auth):
    client, token, user = client_with_auth
    
    response = client.get(
        "/api/v1/emails",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
```

### 2. Database Setup Pattern

```python
def test_with_data(client_with_auth, db_session, sample_folder):
    client, token, user = client_with_auth
    
    # Create test data
    email = Email(
        subject="Test",
        body="Content",
        status="received",
        sender_id=user.id,
        folder_id=sample_folder.id
    )
    db_session.add(email)
    db_session.commit()
    
    # Test endpoint
    response = client.get(
        f"/api/v1/emails/{email.id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
```

### 3. Response Wrapper Pattern

All API responses are wrapped in a consistent format:

```python
{
    "success": true/false,
    "message": "...",
    "statusCode": 200,
    "data": {...}
}
```

**Test assertion:**
```python
response = client.get("/api/v1/emails", headers={"Authorization": f"Bearer {token}"})
data = response.json()

assert data["success"] is True
assert data["statusCode"] == 200
assert "results" in data["data"]
```

### 4. Error Testing Pattern

```python
def test_404_not_found(client_with_auth):
    client, token, user = client_with_auth
    
    response = client.get(
        "/api/v1/emails/99999",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert data["statusCode"] == 404
```

### 5. Validation Error Pattern

```python
def test_validation_error(client_with_auth):
    client, token, user = client_with_auth
    
    response = client.post(
        "/api/v1/emails",
        json={},  # Missing required fields
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 422
    data = response.json()
    assert data["success"] is False
    assert "errors" in data["data"]
```

### 6. Pagination Pattern

```python
def test_pagination(client_with_auth, db_session, sample_folder):
    client, token, user = client_with_auth
    
    # Create multiple items
    for i in range(25):
        email = Email(...)
        db_session.add(email)
    db_session.commit()
    
    # Test pagination
    response = client.get(
        "/api/v1/emails?page=1&page_size=10",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    data = response.json()["data"]
    assert len(data["results"]) == 10
    assert data["page"] == 1
    assert data["total"] >= 25
```

### 7. Soft Delete Pattern

```python
def test_soft_delete(client_with_auth, db_session, sample_email):
    client, token, user = client_with_auth
    email_id = sample_email.id
    
    # Delete (soft delete by default)
    response = client.delete(
        f"/api/v1/emails/{email_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 204
    
    # Verify soft delete
    db_session.expire_all()
    email_check = db_session.query(Email).filter(Email.id == email_id).first()
    assert email_check is not None
    assert email_check.is_deleted == True
```

### 8. Permanent Delete Pattern

```python
def test_permanent_delete(client_with_auth, db_session, sample_email):
    client, token, user = client_with_auth
    email_id = sample_email.id
    
    # Permanent delete
    response = client.delete(
        f"/api/v1/emails/{email_id}?permanent=true",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 204
    
    # Verify completely gone
    db_session.expire_all()
    email_check = db_session.query(Email).filter(Email.id == email_id).first()
    assert email_check is None
```

---

## Test Coverage Areas

### Authentication & Security
- ✅ JWT token creation and validation
- ✅ Token expiration handling
- ✅ Token revocation
- ✅ User ID validation (reject 0)
- ✅ Timing attack resistance
- ✅ None/empty token handling
- ✅ RBAC permission checks
- ✅ Token role vs DB role precedence
- ✅ Case-insensitive role matching

### Database & Isolation
- ✅ Run ID database isolation
- ✅ Engine caching behavior
- ✅ Database cleanup configuration
- ✅ Template database cloning
- ✅ Run database lifecycle

### Email Operations
- ✅ Create draft/send emails
- ✅ List emails with pagination
- ✅ Filter by folder, status, read, category
- ✅ Mark read/unread
- ✅ Star/unstar
- ✅ Move to folder
- ✅ Delete (soft/permanent)
- ✅ Reply/forward
- ✅ Snooze/unsnooze
- ✅ Archive
- ✅ Category management
- ✅ Thread filtering

### Folders
- ✅ Create custom folders
- ✅ List user folders
- ✅ Update folders
- ✅ Delete folders (soft/permanent)
- ✅ System folder protection
- ✅ List emails in folder

### Labels (Hierarchical)
- ✅ Create root labels
- ✅ Create nested labels
- ✅ List labels (flat/tree)
- ✅ Update labels
- ✅ Move labels between parents
- ✅ Delete labels (cascade)
- ✅ Prevent circular references
- ✅ Hierarchical name display

### Attachments
- ✅ List attachments
- ✅ Get attachment details
- ✅ Delete attachments (soft/permanent)

### Search
- ✅ Basic text search
- ✅ Search operators (from:, to:, subject:, is:unread, etc.)
- ✅ Pagination
- ✅ Saved searches
- ✅ Hierarchical label names in results

### Templates
- ✅ Create templates
- ✅ List templates (own + shared)
- ✅ Update templates
- ✅ Delete templates
- ✅ Apply templates to create drafts
- ✅ Template sharing

### Bulk Operations
- ✅ Bulk mark read/unread
- ✅ Bulk star/unstar
- ✅ Bulk move to folder
- ✅ Bulk delete
- ✅ Bulk add/remove labels
- ✅ Bulk snooze/unsnooze
- ✅ Bulk archive
- ✅ Bulk category update
- ✅ Partial success handling

### Undo Send
- ✅ Configuration (delay settings)
- ✅ Queue emails when enabled
- ✅ Immediate send when disabled
- ✅ Cancel queued emails
- ✅ Confirm immediate send
- ✅ Expired window handling

### Response Formatting
- ✅ Success response wrapping
- ✅ Error response wrapping
- ✅ Validation error wrapping
- ✅ Status code mapping
- ✅ Success flag setting
- ✅ Documentation endpoints excluded

---

## Test Execution Best Practices

### 1. Isolation
- Each test function gets a fresh database (function-scoped fixtures)
- Tests should not depend on execution order
- Use fixtures for test data setup

### 2. Cleanup
- Database is automatically cleaned up after each test
- No manual cleanup needed for in-memory SQLite

### 3. Assertions
- Always check HTTP status codes
- Verify response structure matches expected format
- Check database state when testing mutations

### 4. Test Data
- Use fixtures for common test data
- Create minimal data needed for each test
- Use descriptive test data (e.g., "Test Email" not "Email 1")

### 5. Error Cases
- Test both success and failure paths
- Test authentication failures (401)
- Test authorization failures (403)
- Test validation errors (422)
- Test not found errors (404)

---

## Common Issues & Solutions

### Issue: ModuleNotFoundError: No module named 'app.main'
**Error:** `ImportError while loading conftest: ModuleNotFoundError: No module named 'app.main'`

**Solution:** 
- Ensure you're running pytest from the `backend` directory
- The `pytest.ini` file should be present with `pythonpath = .` setting
- If the issue persists, you can manually set PYTHONPATH:
  ```bash
  PYTHONPATH=. pytest
  ```
- Or install the package in development mode (if setup.py exists):
  ```bash
  pip install -e .
  ```

### Issue: Database Session Conflicts
**Solution:** Use function-scoped fixtures, each test gets its own session

### Issue: Authentication Required
**Solution:** Use `client_with_auth` or `client_with_admin_auth` fixtures

### Issue: Missing Test Data
**Solution:** Use provided fixtures (`sample_email`, `sample_folder`, etc.) or create in test

### Issue: UUID Format
**Solution:** Use string UUIDs in API calls: `str(email.id)` or predefined constants

### Issue: Response Format
**Solution:** Always access data via `response.json()["data"]` due to response wrapper

---

## Performance Considerations

- **Test Database:** In-memory SQLite is fast but limited
- **Fixture Scope:** Function-scoped ensures isolation but creates overhead
- **Test Execution:** Tests can run in parallel with `pytest-xdist`

### Running Tests in Parallel

```bash
# Install pytest-xdist
pip install pytest-xdist

# Run tests in parallel
pytest -n auto  # Auto-detect CPU count
pytest -n 4     # Use 4 workers
```

---

## Coverage Goals

Current coverage reporting is configured in CI/CD:
- **Format:** XML (for Codecov) + Terminal output
- **Target:** Aim for >80% coverage
- **Command:** `pytest --cov=app --cov-report=xml --cov-report=term`

---

## Maintenance Notes

### Adding New Tests

1. **Follow naming convention:** `test_<feature>_<scenario>`
2. **Use appropriate fixtures:** Don't create unnecessary test data
3. **Test both success and failure:** Cover edge cases
4. **Check response format:** Verify wrapped response structure
5. **Verify database state:** When testing mutations, check DB

### Test Organization

- Group related tests in classes
- Use descriptive class names: `TestEmailCreate`, `TestEmailOperations`
- Keep tests focused on one scenario per test method

### Documentation

- Test names should be descriptive
- Use docstrings for complex test scenarios
- Reference issue numbers when testing bug fixes

---

## Summary

The test suite provides comprehensive coverage of:
- ✅ Authentication and security
- ✅ All API endpoints
- ✅ Database operations
- ✅ Business logic
- ✅ Edge cases and error handling
- ✅ Response formatting

**Total Test Files:** 13  
**Estimated Tests:** 300+  
**Test Types:** Unit, Integration, Security, Documentation  
**Framework:** pytest  
**Database:** In-memory SQLite (tests), PostgreSQL (production)  
**Coverage:** Configured with pytest-cov

