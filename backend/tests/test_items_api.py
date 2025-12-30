"""Tests for Items API endpoints."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models.user import User
from app.models.item import Item


def test_create_item_authenticated(client_with_auth):
    """Test creating an item with authentication."""
    client, token, user = client_with_auth
    
    response = client.post(
        "/api/v1/items",
        json={
            "name": "Test Item",
            "description": "Test description",
            "status": "active",
            "priority": "high"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["name"] == "Test Item"
    assert data["description"] == "Test description"
    assert data["status"] == "active"
    assert data["priority"] == "high"
    assert data["created_by_id"] == user.id


def test_create_item_unauthenticated(client):
    """Test creating an item without authentication fails."""
    response = client.post(
        "/api/v1/items",
        json={
            "name": "Test Item",
            "description": "Test description"
        }
    )
    
    assert response.status_code == 401


def test_list_items_pagination(client_with_auth, db_session):
    """Test listing items with pagination."""
    client, token, user = client_with_auth
    
    # Create multiple items
    for i in range(5):
        item = Item(
            name=f"Item {i}",
            description=f"Description {i}",
            status="active",
            priority="medium",
            created_by_id=user.id
        )
        db_session.add(item)
    db_session.commit()
    
    # Test pagination
    response = client.get(
        "/api/v1/items?page=1&page_size=3",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data["results"]) == 3
    assert data["total"] >= 5
    assert data["page"] == 1
    assert data["page_size"] == 3


def test_get_item_by_id(client_with_auth, db_session):
    """Test getting a specific item by ID."""
    client, token, user = client_with_auth
    
    # Create an item
    item = Item(
        name="Test Item",
        description="Test description",
        status="active",
        priority="high",
        created_by_id=user.id
    )
    db_session.add(item)
    db_session.commit()
    db_session.refresh(item)
    
    response = client.get(
        f"/api/v1/items/{item.id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["id"] == item.id
    assert data["name"] == "Test Item"


def test_update_item_as_admin(client_with_admin_auth, db_session):
    """Test updating an item as admin."""
    client, token, admin = client_with_admin_auth
    
    # Create an item
    item = Item(
        name="Original Name",
        description="Original description",
        status="active",
        priority="medium",
        created_by_id=admin.id
    )
    db_session.add(item)
    db_session.commit()
    db_session.refresh(item)
    
    response = client.put(
        f"/api/v1/items/{item.id}",
        json={
            "name": "Updated Name",
            "priority": "high"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["name"] == "Updated Name"
    assert data["priority"] == "high"
    assert data["description"] == "Original description"  # Unchanged


def test_update_item_as_end_user_forbidden(client_with_end_user_auth, sample_admin, db_session):
    """Test that end users cannot update items."""
    client, token, user = client_with_end_user_auth
    
    # Create an item
    item = Item(
        name="Test Item",
        description="Test description",
        status="active",
        priority="medium",
        created_by_id=sample_admin.id
    )
    db_session.add(item)
    db_session.commit()
    db_session.refresh(item)
    
    response = client.put(
        f"/api/v1/items/{item.id}",
        json={"name": "Updated Name"},
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 403


def test_delete_item_as_admin(client_with_admin_auth, db_session):
    """Test deleting an item as admin."""
    client, token, admin = client_with_admin_auth
    
    # Create an item
    item = Item(
        name="To Delete",
        description="Will be deleted",
        status="active",
        priority="low",
        created_by_id=admin.id
    )
    db_session.add(item)
    db_session.commit()
    db_session.refresh(item)
    item_id = item.id
    
    response = client.delete(
        f"/api/v1/items/{item_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 204
    
    # Verify item is soft-deleted
    db_session.expire_all()
    deleted_item = db_session.query(Item).filter(Item.id == item_id).first()
    assert deleted_item.is_deleted == True


def test_delete_item_as_agent_forbidden(client_with_agent_auth, db_session):
    """Test that agents cannot delete items."""
    client, token, agent = client_with_agent_auth
    
    # Create an item
    item = Item(
        name="Test Item",
        description="Test description",
        status="active",
        priority="medium",
        created_by_id=agent.id
    )
    db_session.add(item)
    db_session.commit()
    db_session.refresh(item)
    
    response = client.delete(
        f"/api/v1/items/{item.id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 403


def test_list_items_with_filters(client_with_auth, db_session):
    """Test listing items with status and priority filters."""
    client, token, user = client_with_auth
    
    # Create items with different statuses and priorities
    items_data = [
        {"name": "High Priority Active", "status": "active", "priority": "high"},
        {"name": "Low Priority Active", "status": "active", "priority": "low"},
        {"name": "Medium Priority Inactive", "status": "inactive", "priority": "medium"},
    ]
    
    for item_data in items_data:
        item = Item(
            name=item_data["name"],
            status=item_data["status"],
            priority=item_data["priority"],
            created_by_id=user.id
        )
        db_session.add(item)
    db_session.commit()
    
    # Test status filter
    response = client.get(
        "/api/v1/items?status=active",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert all(item["status"] == "active" for item in data["results"])
    
    # Test priority filter
    response = client.get(
        "/api/v1/items?priority=high",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert all(item["priority"] == "high" for item in data["results"])


def test_list_items_with_search(client_with_auth, db_session):
    """Test listing items with search query."""
    client, token, user = client_with_auth
    
    # Create items with specific names
    item1 = Item(
        name="Python Programming",
        description="Learn Python",
        status="active",
        priority="high",
        created_by_id=user.id
    )
    item2 = Item(
        name="JavaScript Tutorial",
        description="Learn JS",
        status="active",
        priority="medium",
        created_by_id=user.id
    )
    db_session.add_all([item1, item2])
    db_session.commit()
    
    # Search for Python
    response = client.get(
        "/api/v1/items?search=Python",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert any("Python" in item["name"] for item in data["results"])


def test_public_private_item_visibility(client_with_end_user_auth, client_with_admin_auth, sample_admin, db_session):
    """Test that end users can only see public items."""
    end_user_client, end_user_token, end_user = client_with_end_user_auth
    admin_client, admin_token, admin = client_with_admin_auth
    
    # Create public and private items
    public_item = Item(
        name="Public Item",
        is_public=True,
        status="active",
        priority="medium",
        created_by_id=admin.id
    )
    private_item = Item(
        name="Private Item",
        is_public=False,
        status="active",
        priority="medium",
        created_by_id=admin.id
    )
    db_session.add_all([public_item, private_item])
    db_session.commit()
    db_session.refresh(public_item)
    db_session.refresh(private_item)
    
    # End user should see public item
    response = end_user_client.get(
        f"/api/v1/items/{public_item.id}",
        headers={"Authorization": f"Bearer {end_user_token}"}
    )
    assert response.status_code == 200
    
    # End user should NOT see private item
    response = end_user_client.get(
        f"/api/v1/items/{private_item.id}",
        headers={"Authorization": f"Bearer {end_user_token}"}
    )
    assert response.status_code == 404
    
    # Admin should see both
    response = admin_client.get(
        f"/api/v1/items/{private_item.id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200

