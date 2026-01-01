"""Tests for Labels API endpoints with hierarchical (nested) label support."""

import pytest
from app.models.label import Label
from app.models.email_label import EmailLabel


class TestLabelCreate:
    """Test label creation."""

    def test_create_label(self, client_with_auth, db_session):
        """Test creating a label."""
        client, token, user = client_with_auth
        
        response = client.post(
            "/api/v1/labels",
            json={
                "name": "Important",
                "color": "#ea4335"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 201
        data = response.json()["data"]
        assert data["name"] == "Important"
        assert data["color"] == "#ea4335"
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
                "color": "#34a853",
                "parent_id": parent.id
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 201
        data = response.json()["data"]
        assert data["name"] == "2025"
        assert data["parent_id"] == parent.id

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
            json={"name": "App Launch", "parent_id": year_2025.id},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 201
        data = response.json()["data"]
        assert data["parent_id"] == year_2025.id

    def test_create_label_invalid_parent(self, client_with_auth, db_session):
        """Test creating a label with non-existent parent fails."""
        client, token, user = client_with_auth
        
        response = client.post(
            "/api/v1/labels",
            json={"name": "Orphan", "parent_id": 99999},
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
            json={"name": "Work", "color": "#ff0000"},
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
            json={"name": "Reports", "parent_id": parent1.id},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response1.status_code == 201
        
        # Create "Reports" under Personal (same name, different parent)
        response2 = client.post(
            "/api/v1/labels",
            json={"name": "Reports", "parent_id": parent2.id},
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
            json={"label_id": sample_label.id},
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
            json={"parent_id": parent2.id},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["parent_id"] == parent2.id

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

    def test_move_label_to_root_with_zero(self, client_with_auth, db_session):
        """Test moving a label to root using parent_id=0."""
        client, token, user = client_with_auth
        
        parent = Label(name="Parent", owner_id=user.id)
        db_session.add(parent)
        db_session.commit()
        
        child = Label(name="Child", parent_id=parent.id, owner_id=user.id)
        db_session.add(child)
        db_session.commit()
        
        # Move to root using 0
        response = client.put(
            f"/api/v1/labels/{child.id}",
            json={"parent_id": 0},
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
            json={"parent_id": label.id},
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
            json={"parent_id": child.id},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400
        assert "circular" in response.json()["message"].lower()

    def test_delete_label_cascade(self, client_with_auth, db_session):
        """Test deleting a label cascades to children."""
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
        
        # Delete with cascade=true (default)
        response = client.delete(
            f"/api/v1/labels/{parent_id}?cascade=true",
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

    def test_delete_label_no_cascade(self, client_with_auth, db_session):
        """Test deleting a label moves children to grandparent."""
        client, token, user = client_with_auth
        
        # Create: Grandparent -> Parent -> Child
        grandparent = Label(name="Grandparent", owner_id=user.id)
        db_session.add(grandparent)
        db_session.commit()
        
        parent = Label(name="Parent", parent_id=grandparent.id, owner_id=user.id)
        db_session.add(parent)
        db_session.commit()
        parent_id = parent.id
        
        child = Label(name="Child", parent_id=parent.id, owner_id=user.id)
        db_session.add(child)
        db_session.commit()
        child_id = child.id
        
        # Delete parent with cascade=false
        response = client.delete(
            f"/api/v1/labels/{parent_id}?cascade=false",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 204
        
        # Verify child moved to grandparent
        db_session.expire_all()
        child_check = db_session.query(Label).filter(
            Label.id == child_id, Label.is_deleted == False
        ).first()
        
        assert child_check is not None
        assert child_check.parent_id == grandparent.id

    def test_delete_root_label_no_cascade(self, client_with_auth, db_session):
        """Test deleting a root label moves children to root."""
        client, token, user = client_with_auth
        
        # Create: Root -> Child
        root = Label(name="Root", owner_id=user.id)
        db_session.add(root)
        db_session.commit()
        root_id = root.id
        
        child = Label(name="Child", parent_id=root.id, owner_id=user.id)
        db_session.add(child)
        db_session.commit()
        child_id = child.id
        
        # Delete root with cascade=false
        response = client.delete(
            f"/api/v1/labels/{root_id}?cascade=false",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 204
        
        # Verify child is now at root level
        db_session.expire_all()
        child_check = db_session.query(Label).filter(
            Label.id == child_id, Label.is_deleted == False
        ).first()
        
        assert child_check is not None
        assert child_check.parent_id is None

