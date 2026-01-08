"""Tests for Labels API endpoints with hierarchical (nested) label support."""

import pytest
import uuid
from app.models.label import Label
from app.models.email import Email
from app.models.email_label import EmailLabel
from app.core.constants import FolderType


# Helper to generate a non-existent UUID for 404 tests
NON_EXISTENT_UUID = "00000000-0000-0000-0000-000000099999"


class TestLabelCreate:
    """Test label creation."""

    def test_create_label(self, client_with_auth, db_session):
        """Test creating a label."""
        client, token, user = client_with_auth
        
        response = client.post(
            "/api/v1/labels",
            json={
                "name": "Work"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 201
        data = response.json()["data"]
        assert data["name"] == "Work"
        assert data["parent_id"] is None

    def test_create_nested_label(self, client_with_auth, db_session):
        """Test creating a nested label with parent_id."""
        client, token, user = client_with_auth
        
        # Create parent label
        parent = Label(name="Projects", color="#4285f4", owner_id=user.id)
        db_session.add(parent)
        db_session.commit()
        
        # Create child label
        response = client.post(
            "/api/v1/labels",
            json={
                "name": "2025",
                "parent_id": str(parent.id)
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 201
        data = response.json()["data"]
        assert data["name"] == "2025"
        assert data["parent_id"] == str(parent.id)

    def test_create_deeply_nested_label(self, client_with_auth, db_session):
        """Test creating labels with multiple nesting levels."""
        client, token, user = client_with_auth
        
        # Create: Projects -> 2025 -> App Launch
        projects = Label(name="Projects", owner_id=user.id)
        db_session.add(projects)
        db_session.commit()
        
        year_2025 = Label(name="2025", parent_id=projects.id, owner_id=user.id)
        db_session.add(year_2025)
        db_session.commit()
        
        response = client.post(
            "/api/v1/labels",
            json={"name": "App Launch", "parent_id": str(year_2025.id)},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 201
        data = response.json()["data"]
        assert data["parent_id"] == str(year_2025.id)

    def test_create_label_invalid_parent(self, client_with_auth, db_session):
        """Test creating a label with non-existent parent fails."""
        client, token, user = client_with_auth
        
        response = client.post(
            "/api/v1/labels",
            json={"name": "Orphan", "parent_id": NON_EXISTENT_UUID},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 404

    def test_create_duplicate_label_name_at_root(self, client_with_auth, db_session):
        """Test creating a label with duplicate name at root level fails."""
        client, token, user = client_with_auth
        
        # Create first label at root
        label = Label(name="Work", color="#4285f4", owner_id=user.id)
        db_session.add(label)
        db_session.commit()
        
        # Try to create duplicate at root
        response = client.post(
            "/api/v1/labels",
            json={"name": "Work"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400

    def test_create_same_name_different_parent(self, client_with_auth, db_session):
        """Test creating labels with same name under different parents succeeds."""
        client, token, user = client_with_auth
        
        # Create two parent labels
        parent1 = Label(name="Work", owner_id=user.id)
        parent2 = Label(name="Personal", owner_id=user.id)
        db_session.add_all([parent1, parent2])
        db_session.commit()
        
        # Create "Reports" under Work
        response1 = client.post(
            "/api/v1/labels",
            json={"name": "Reports", "parent_id": str(parent1.id)},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response1.status_code == 201
        
        # Create "Reports" under Personal (same name, different parent)
        response2 = client.post(
            "/api/v1/labels",
            json={"name": "Reports", "parent_id": str(parent2.id)},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response2.status_code == 201


class TestLabelList:
    """Test label listing."""

    def test_list_user_labels_flat(self, client_with_auth, db_session):
        """Test listing user's labels as flat list (default)."""
        client, token, user = client_with_auth
        
        # Create labels with hierarchy
        parent = Label(name="Work", color="#4285f4", owner_id=user.id)
        db_session.add(parent)
        db_session.commit()
        
        child = Label(name="Projects", color="#34a853", owner_id=user.id, parent_id=parent.id)
        db_session.add(child)
        db_session.commit()
        
        response = client.get(
            "/api/v1/labels",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert len(data) >= 2
        # Flat list includes parent_id
        for label in data:
            assert "parent_id" in label

    def test_list_labels_tree_structure(self, client_with_auth, db_session):
        """Test listing labels as hierarchical tree."""
        client, token, user = client_with_auth
        
        # Create: Work -> Clients, Work -> Reports
        work = Label(name="Work", owner_id=user.id)
        db_session.add(work)
        db_session.commit()
        
        clients = Label(name="Clients", parent_id=work.id, owner_id=user.id)
        reports = Label(name="Reports", parent_id=work.id, owner_id=user.id)
        db_session.add_all([clients, reports])
        db_session.commit()
        
        response = client.get(
            "/api/v1/labels/tree",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Find the Work label in root
        work_label = next((l for l in data if l["name"] == "Work"), None)
        assert work_label is not None
        assert "children" in work_label
        assert len(work_label["children"]) == 2
        
        child_names = [c["name"] for c in work_label["children"]]
        assert "Clients" in child_names
        assert "Reports" in child_names

    def test_list_labels_flat_param(self, client_with_auth, db_session):
        """Test flat=false parameter returns tree structure."""
        client, token, user = client_with_auth
        
        parent = Label(name="Projects", owner_id=user.id)
        db_session.add(parent)
        db_session.commit()
        
        child = Label(name="2025", parent_id=parent.id, owner_id=user.id)
        db_session.add(child)
        db_session.commit()
        
        response = client.get(
            "/api/v1/labels?flat=false",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Tree structure should have children arrays
        projects = next((l for l in data if l["name"] == "Projects"), None)
        assert projects is not None
        assert "children" in projects
        assert any(c["name"] == "2025" for c in projects["children"])


class TestLabelFullName:
    """Test full_name hierarchical field in label list responses."""

    def test_list_labels_includes_full_name(self, client_with_auth, db_session):
        """Test that flat list response includes full_name field."""
        client, token, user = client_with_auth
        
        label = Label(name="Work", owner_id=user.id)
        db_session.add(label)
        db_session.commit()
        
        response = client.get(
            "/api/v1/labels",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Find our label and check full_name exists
        work_label = next((l for l in data if l["name"] == "Work"), None)
        assert work_label is not None
        assert "full_name" in work_label

    def test_root_label_full_name_equals_name(self, client_with_auth, db_session):
        """Test that root-level labels have full_name equal to name."""
        client, token, user = client_with_auth
        
        label = Label(name="Important", owner_id=user.id)
        db_session.add(label)
        db_session.commit()
        
        response = client.get(
            "/api/v1/labels",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        important_label = next((l for l in data if l["name"] == "Important"), None)
        assert important_label is not None
        assert important_label["name"] == "Important"
        assert important_label["full_name"] == "Important"

    def test_nested_label_full_name_shows_hierarchy(self, client_with_auth, db_session):
        """Test that nested labels show full hierarchy path in full_name."""
        client, token, user = client_with_auth
        
        # Create hierarchy: Work -> Projects
        work = Label(name="Work", owner_id=user.id)
        db_session.add(work)
        db_session.commit()
        
        projects = Label(name="Projects", parent_id=work.id, owner_id=user.id)
        db_session.add(projects)
        db_session.commit()
        
        response = client.get(
            "/api/v1/labels",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Parent label
        work_label = next((l for l in data if l["name"] == "Work"), None)
        assert work_label is not None
        assert work_label["full_name"] == "Work"
        
        # Nested label
        projects_label = next((l for l in data if l["name"] == "Projects"), None)
        assert projects_label is not None
        assert projects_label["full_name"] == "Work/Projects"

    def test_deeply_nested_label_full_name(self, client_with_auth, db_session):
        """Test that deeply nested labels show complete hierarchy path."""
        client, token, user = client_with_auth
        
        # Create hierarchy: Work -> Projects -> 2025 -> Q1
        work = Label(name="Work", owner_id=user.id)
        db_session.add(work)
        db_session.commit()
        
        projects = Label(name="Projects", parent_id=work.id, owner_id=user.id)
        db_session.add(projects)
        db_session.commit()
        
        year_2025 = Label(name="2025", parent_id=projects.id, owner_id=user.id)
        db_session.add(year_2025)
        db_session.commit()
        
        q1 = Label(name="Q1", parent_id=year_2025.id, owner_id=user.id)
        db_session.add(q1)
        db_session.commit()
        
        response = client.get(
            "/api/v1/labels",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Check each level
        work_label = next((l for l in data if l["name"] == "Work"), None)
        assert work_label["full_name"] == "Work"
        
        projects_label = next((l for l in data if l["name"] == "Projects"), None)
        assert projects_label["full_name"] == "Work/Projects"
        
        year_label = next((l for l in data if l["name"] == "2025"), None)
        assert year_label["full_name"] == "Work/Projects/2025"
        
        q1_label = next((l for l in data if l["name"] == "Q1"), None)
        assert q1_label["full_name"] == "Work/Projects/2025/Q1"

    def test_multiple_hierarchies_full_name(self, client_with_auth, db_session):
        """Test that multiple separate hierarchies have correct full_names."""
        client, token, user = client_with_auth
        
        # Create two separate hierarchies
        # Work -> Clients
        work = Label(name="Work", owner_id=user.id)
        db_session.add(work)
        db_session.commit()
        
        clients = Label(name="Clients", parent_id=work.id, owner_id=user.id)
        db_session.add(clients)
        db_session.commit()
        
        # Personal -> Family
        personal = Label(name="Personal", owner_id=user.id)
        db_session.add(personal)
        db_session.commit()
        
        family = Label(name="Family", parent_id=personal.id, owner_id=user.id)
        db_session.add(family)
        db_session.commit()
        
        response = client.get(
            "/api/v1/labels",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Check Work hierarchy
        clients_label = next((l for l in data if l["name"] == "Clients"), None)
        assert clients_label["full_name"] == "Work/Clients"
        
        # Check Personal hierarchy
        family_label = next((l for l in data if l["name"] == "Family"), None)
        assert family_label["full_name"] == "Personal/Family"


class TestLabelOperations:
    """Test label operations."""

    def test_get_label_by_id(self, client_with_auth, db_session, sample_label):
        """Test getting a label by ID."""
        client, token, user = client_with_auth
        
        response = client.get(
            f"/api/v1/labels/{sample_label.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert "parent_id" in data

    def test_update_label(self, client_with_auth, db_session, sample_label):
        """Test updating a label."""
        client, token, user = client_with_auth
        
        response = client.put(
            f"/api/v1/labels/{sample_label.id}",
            json={"name": "New Name", "color": "#ffffff"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["name"] == "New Name"

    def test_delete_label(self, client_with_auth, db_session, sample_label):
        """Test deleting a label."""
        client, token, user = client_with_auth
        label_id = sample_label.id
        
        response = client.delete(
            f"/api/v1/labels/{label_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 204

    def test_add_label_to_email(self, client_with_auth, db_session, sample_email, sample_label):
        """Test adding a label to an email."""
        client, token, user = client_with_auth
        
        response = client.post(
            f"/api/v1/emails/{sample_email.id}/labels",
            json={"label_id": str(sample_label.id)},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200

    def test_remove_label_from_email(self, client_with_auth, db_session, sample_email, sample_label):
        """Test removing a label from an email."""
        client, token, user = client_with_auth
        
        # Add label first
        email_label = EmailLabel(email_id=sample_email.id, label_id=sample_label.id)
        db_session.add(email_label)
        db_session.commit()
        
        response = client.delete(
            f"/api/v1/emails/{sample_email.id}/labels/{sample_label.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 204

    def test_list_emails_with_label(self, client_with_auth, db_session, sample_label):
        """Test listing emails that have a specific label."""
        client, token, user = client_with_auth
        
        response = client.get(
            f"/api/v1/labels/{sample_label.id}/emails",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200


class TestHierarchicalLabelNames:
    """Test hierarchical label names in email responses."""

    def test_email_label_shows_hierarchy_name(self, client_with_auth, db_session):
        """Test that labels on emails show full hierarchy path (grand/parent/child)."""
        client, token, user = client_with_auth
        
        # Create hierarchical labels: Work -> Projects -> 2025
        work = Label(name="Work", owner_id=user.id)
        db_session.add(work)
        db_session.commit()
        
        projects = Label(name="Projects", parent_id=work.id, owner_id=user.id)
        db_session.add(projects)
        db_session.commit()
        
        year_2025 = Label(name="2025", parent_id=projects.id, owner_id=user.id)
        db_session.add(year_2025)
        db_session.commit()
        
        # Create email and add the nested label
        email = Email(
            subject="Project Update",
            body="Content",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=user.id,
        )
        db_session.add(email)
        db_session.commit()
        
        email_label = EmailLabel(email_id=email.id, label_id=year_2025.id)
        db_session.add(email_label)
        db_session.commit()
        
        # Get email and check label name includes full hierarchy
        response = client.get(
            f"/api/v1/emails/{email.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert len(data["labels"]) == 1
        assert data["labels"][0]["name"] == "Work/Projects/2025"

    def test_email_list_label_shows_hierarchy_name(self, client_with_auth, db_session):
        """Test that labels in email list responses show full hierarchy path."""
        client, token, user = client_with_auth
        
        # Create hierarchical labels: Personal -> Family
        personal = Label(name="Personal", owner_id=user.id)
        db_session.add(personal)
        db_session.commit()
        
        family = Label(name="Family", parent_id=personal.id, owner_id=user.id)
        db_session.add(family)
        db_session.commit()
        
        # Create email with nested label
        email = Email(
            subject="Family Reunion",
            body="Content",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=user.id,
        )
        db_session.add(email)
        db_session.commit()
        
        email_label = EmailLabel(email_id=email.id, label_id=family.id)
        db_session.add(email_label)
        db_session.commit()
        
        # List emails and check label hierarchy
        response = client.get(
            "/api/v1/emails",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        # Find our email
        our_email = next((e for e in data["results"] if e["id"] == str(email.id)), None)
        assert our_email is not None
        assert len(our_email["labels"]) == 1
        assert our_email["labels"][0]["name"] == "Personal/Family"

    def test_root_label_shows_simple_name(self, client_with_auth, db_session):
        """Test that root-level labels show just their name (no slash)."""
        client, token, user = client_with_auth
        
        # Create root label (no parent)
        important = Label(name="Important", owner_id=user.id)
        db_session.add(important)
        db_session.commit()
        
        # Create email with root label
        email = Email(
            subject="Important Email",
            body="Content",
            status="received",
            folder=FolderType.INBOX.value,
            sender_id=user.id,
        )
        db_session.add(email)
        db_session.commit()
        
        email_label = EmailLabel(email_id=email.id, label_id=important.id)
        db_session.add(email_label)
        db_session.commit()
        
        # Get email and check label name is simple
        response = client.get(
            f"/api/v1/emails/{email.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert len(data["labels"]) == 1
        assert data["labels"][0]["name"] == "Important"


class TestNestedLabelOperations:
    """Test nested label specific operations."""

    def test_move_label_to_new_parent(self, client_with_auth, db_session):
        """Test moving a label to a different parent."""
        client, token, user = client_with_auth
        
        # Create: Parent1, Parent2, Child (under Parent1)
        parent1 = Label(name="Parent1", owner_id=user.id)
        parent2 = Label(name="Parent2", owner_id=user.id)
        db_session.add_all([parent1, parent2])
        db_session.commit()
        
        child = Label(name="Child", parent_id=parent1.id, owner_id=user.id)
        db_session.add(child)
        db_session.commit()
        
        # Move child to parent2
        response = client.put(
            f"/api/v1/labels/{child.id}",
            json={"parent_id": str(parent2.id)},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["parent_id"] == str(parent2.id)

    def test_move_label_to_root(self, client_with_auth, db_session):
        """Test moving a nested label to root level."""
        client, token, user = client_with_auth
        
        parent = Label(name="Parent", owner_id=user.id)
        db_session.add(parent)
        db_session.commit()
        
        child = Label(name="Child", parent_id=parent.id, owner_id=user.id)
        db_session.add(child)
        db_session.commit()
        
        # Move to root (parent_id = null)
        response = client.put(
            f"/api/v1/labels/{child.id}",
            json={"parent_id": None},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["parent_id"] is None

    def test_move_label_to_root_with_zero_uuid(self, client_with_auth, db_session):
        """Test moving a label to root using null UUID."""
        client, token, user = client_with_auth
        
        parent = Label(name="Parent", owner_id=user.id)
        db_session.add(parent)
        db_session.commit()
        
        child = Label(name="Child", parent_id=parent.id, owner_id=user.id)
        db_session.add(child)
        db_session.commit()
        
        # Move to root using null UUID (00000000-0000-0000-0000-000000000000)
        response = client.put(
            f"/api/v1/labels/{child.id}",
            json={"parent_id": "00000000-0000-0000-0000-000000000000"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["parent_id"] is None

    def test_prevent_circular_reference_self(self, client_with_auth, db_session):
        """Test that a label cannot be its own parent."""
        client, token, user = client_with_auth
        
        label = Label(name="Label", owner_id=user.id)
        db_session.add(label)
        db_session.commit()
        
        response = client.put(
            f"/api/v1/labels/{label.id}",
            json={"parent_id": str(label.id)},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400
        assert "circular" in response.json()["message"].lower()

    def test_prevent_circular_reference_descendant(self, client_with_auth, db_session):
        """Test that a label cannot have its descendant as parent."""
        client, token, user = client_with_auth
        
        # Create: Grandparent -> Parent -> Child
        grandparent = Label(name="Grandparent", owner_id=user.id)
        db_session.add(grandparent)
        db_session.commit()
        
        parent = Label(name="Parent", parent_id=grandparent.id, owner_id=user.id)
        db_session.add(parent)
        db_session.commit()
        
        child = Label(name="Child", parent_id=parent.id, owner_id=user.id)
        db_session.add(child)
        db_session.commit()
        
        # Try to set grandparent's parent as child (circular)
        response = client.put(
            f"/api/v1/labels/{grandparent.id}",
            json={"parent_id": str(child.id)},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400
        assert "circular" in response.json()["message"].lower()

    def test_delete_label_cascade(self, client_with_auth, db_session):
        """Test deleting a label always cascades to children."""
        client, token, user = client_with_auth
        
        # Create: Parent -> Child1, Child2
        parent = Label(name="Parent", owner_id=user.id)
        db_session.add(parent)
        db_session.commit()
        parent_id = parent.id
        
        child1 = Label(name="Child1", parent_id=parent.id, owner_id=user.id)
        child2 = Label(name="Child2", parent_id=parent.id, owner_id=user.id)
        db_session.add_all([child1, child2])
        db_session.commit()
        child1_id, child2_id = child1.id, child2.id
        
        # Delete parent (children should be cascade deleted)
        response = client.delete(
            f"/api/v1/labels/{parent_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 204
        
        # Verify parent and children are deleted
        db_session.expire_all()
        parent_check = db_session.query(Label).filter(
            Label.id == parent_id, Label.is_deleted == False
        ).first()
        child1_check = db_session.query(Label).filter(
            Label.id == child1_id, Label.is_deleted == False
        ).first()
        child2_check = db_session.query(Label).filter(
            Label.id == child2_id, Label.is_deleted == False
        ).first()
        
        assert parent_check is None
        assert child1_check is None
        assert child2_check is None

    def test_delete_label_deep_cascade(self, client_with_auth, db_session):
        """Test deleting a label cascades through multiple levels."""
        client, token, user = client_with_auth
        
        # Create: Grandparent -> Parent -> Child
        grandparent = Label(name="Grandparent", owner_id=user.id)
        db_session.add(grandparent)
        db_session.commit()
        grandparent_id = grandparent.id
        
        parent = Label(name="Parent", parent_id=grandparent.id, owner_id=user.id)
        db_session.add(parent)
        db_session.commit()
        parent_id = parent.id
        
        child = Label(name="Child", parent_id=parent.id, owner_id=user.id)
        db_session.add(child)
        db_session.commit()
        child_id = child.id
        
        # Delete grandparent - should cascade to parent and child
        response = client.delete(
            f"/api/v1/labels/{grandparent_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 204
        
        # Verify all descendants are deleted
        db_session.expire_all()
        grandparent_check = db_session.query(Label).filter(
            Label.id == grandparent_id, Label.is_deleted == False
        ).first()
        parent_check = db_session.query(Label).filter(
            Label.id == parent_id, Label.is_deleted == False
        ).first()
        child_check = db_session.query(Label).filter(
            Label.id == child_id, Label.is_deleted == False
        ).first()
        
        assert grandparent_check is None
        assert parent_check is None
        assert child_check is None

    def test_delete_label_permanent(self, client_with_auth, db_session):
        """Test permanently deleting a label removes it from database."""
        client, token, user = client_with_auth
        
        # Create label
        label = Label(name="ToDelete", owner_id=user.id)
        db_session.add(label)
        db_session.commit()
        label_id = label.id
        
        # Delete permanently
        response = client.delete(
            f"/api/v1/labels/{label_id}?permanent=true",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 204
        
        # Verify label is completely gone (not just soft deleted)
        db_session.expire_all()
        label_check = db_session.query(Label).filter(Label.id == label_id).first()
        assert label_check is None

    def test_delete_label_soft_delete_default(self, client_with_auth, db_session):
        """Test default delete is soft delete (is_deleted=True)."""
        client, token, user = client_with_auth
        
        # Create label
        label = Label(name="SoftDelete", owner_id=user.id)
        db_session.add(label)
        db_session.commit()
        label_id = label.id
        
        # Delete without permanent flag (soft delete)
        response = client.delete(
            f"/api/v1/labels/{label_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 204
        
        # Verify label still exists but is marked deleted
        db_session.expire_all()
        label_check = db_session.query(Label).filter(Label.id == label_id).first()
        assert label_check is not None
        assert label_check.is_deleted == True

