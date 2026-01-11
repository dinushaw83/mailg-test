"""Tests for PostgreSQL writer functionality.

Tests cover:
1. Table dependency ordering (topological sort)
2. Enum value conversion (lowercase -> uppercase)
3. Cycle detection and handling
"""

import pytest
from data_generation.generator.output.postgres_writer import (
    get_table_dependency_order,
    PostgresWriter,
)


class TestGetTableDependencyOrder:
    """Tests for get_table_dependency_order function."""

    def test_simple_linear_dependencies(self):
        """Test simple linear FK chain: A -> B -> C."""
        schema = {
            "properties": {
                "tables": {
                    "properties": {
                        "table_a": {"properties": {"id": {"type": "integer"}}},
                        "table_b": {
                            "properties": {
                                "id": {"type": "integer"},
                                "a_id": {"type": "integer"},
                            }
                        },
                        "table_c": {
                            "properties": {
                                "id": {"type": "integer"},
                                "b_id": {"type": "integer"},
                            }
                        },
                    }
                },
                "relationships": {
                    "items": [
                        {"from_table": "table_b", "to_table": "table_a", "from_column": "a_id"},
                        {"from_table": "table_c", "to_table": "table_b", "from_column": "b_id"},
                    ]
                },
            }
        }

        order = get_table_dependency_order(schema)

        # table_a must come before table_b, table_b must come before table_c
        assert order.index("table_a") < order.index("table_b")
        assert order.index("table_b") < order.index("table_c")

    def test_multiple_dependencies(self):
        """Test table with multiple FK dependencies."""
        schema = {
            "properties": {
                "tables": {
                    "properties": {
                        "users": {"properties": {"id": {"type": "integer"}}},
                        "threads": {"properties": {"id": {"type": "integer"}}},
                        "emails": {
                            "properties": {
                                "id": {"type": "integer"},
                                "thread_id": {"type": "integer"},
                                "sender_id": {"type": "integer"},
                            }
                        },
                    }
                },
                "relationships": {
                    "items": [
                        {"from_table": "emails", "to_table": "threads", "from_column": "thread_id"},
                        {"from_table": "emails", "to_table": "users", "from_column": "sender_id"},
                    ]
                },
            }
        }

        order = get_table_dependency_order(schema)

        # Both users and threads must come before emails
        assert order.index("users") < order.index("emails")
        assert order.index("threads") < order.index("emails")

    def test_no_dependencies(self):
        """Test tables with no FK dependencies."""
        schema = {
            "properties": {
                "tables": {
                    "properties": {
                        "table_a": {"properties": {"id": {"type": "integer"}}},
                        "table_b": {"properties": {"id": {"type": "integer"}}},
                        "table_c": {"properties": {"id": {"type": "integer"}}},
                    }
                },
                "relationships": {"items": []},
            }
        }

        order = get_table_dependency_order(schema)

        # All tables should be present
        assert set(order) == {"table_a", "table_b", "table_c"}

    def test_self_reference_ignored(self):
        """Test that self-referencing FKs are ignored."""
        schema = {
            "properties": {
                "tables": {
                    "properties": {
                        "categories": {
                            "properties": {
                                "id": {"type": "integer"},
                                "parent_id": {"type": "integer", "nullable": True},
                            }
                        },
                    }
                },
                "relationships": {
                    "items": [
                        {"from_table": "categories", "to_table": "categories", "from_column": "parent_id"},
                    ]
                },
            }
        }

        # Should not raise an error (self-reference is skipped)
        order = get_table_dependency_order(schema)
        assert "categories" in order

    def test_cycle_with_nullable_fk(self):
        """Test cycle detection with nullable FK that can be broken."""
        schema = {
            "properties": {
                "tables": {
                    "properties": {
                        "table_a": {
                            "properties": {
                                "id": {"type": "integer"},
                                "b_id": {"type": "integer", "nullable": True},
                            }
                        },
                        "table_b": {
                            "properties": {
                                "id": {"type": "integer"},
                                "a_id": {"type": "integer"},
                            }
                        },
                    }
                },
                "relationships": {
                    "items": [
                        {"from_table": "table_a", "to_table": "table_b", "from_column": "b_id"},
                        {"from_table": "table_b", "to_table": "table_a", "from_column": "a_id"},
                    ]
                },
            }
        }

        # Should break cycle by excluding nullable FK
        order = get_table_dependency_order(schema)
        assert set(order) == {"table_a", "table_b"}

    def test_real_schema_structure(self):
        """Test with schema structure similar to real mailg database_schema.json."""
        schema = {
            "properties": {
                "tables": {
                    "properties": {
                        "users": {
                            "properties": {
                                "id": {"type": "integer"},
                                "role": {"type": "string", "enum": ["admin", "user"]},
                            }
                        },
                        "threads": {
                            "properties": {
                                "id": {"type": "integer"},
                                "owner_id": {"type": "integer"},
                            }
                        },
                        "emails": {
                            "properties": {
                                "id": {"type": "integer"},
                                "sender_id": {"type": "integer"},
                                "thread_id": {"type": "integer", "nullable": True},
                            }
                        },
                        "labels": {
                            "properties": {
                                "id": {"type": "integer"},
                                "owner_id": {"type": "integer"},
                                "parent_id": {"type": "integer", "nullable": True},
                            }
                        },
                        "thread_labels": {
                            "properties": {
                                "id": {"type": "integer"},
                                "thread_id": {"type": "integer"},
                                "label_id": {"type": "integer"},
                                "user_id": {"type": "integer"},
                            }
                        },
                        "attachments": {
                            "properties": {
                                "id": {"type": "integer"},
                                "email_id": {"type": "integer"},
                            }
                        },
                        "email_recipients": {
                            "properties": {
                                "id": {"type": "integer"},
                                "email_id": {"type": "integer"},
                                "recipient_id": {"type": "integer", "nullable": True},
                            }
                        },
                    }
                },
                "relationships": {
                    "items": [
                        {"from_table": "threads", "to_table": "users", "from_column": "owner_id"},
                        {"from_table": "emails", "to_table": "users", "from_column": "sender_id"},
                        {"from_table": "emails", "to_table": "threads", "from_column": "thread_id"},
                        {"from_table": "labels", "to_table": "users", "from_column": "owner_id"},
                        {"from_table": "labels", "to_table": "labels", "from_column": "parent_id"},
                        {"from_table": "thread_labels", "to_table": "threads", "from_column": "thread_id"},
                        {"from_table": "thread_labels", "to_table": "labels", "from_column": "label_id"},
                        {"from_table": "thread_labels", "to_table": "users", "from_column": "user_id"},
                        {"from_table": "attachments", "to_table": "emails", "from_column": "email_id"},
                        {"from_table": "email_recipients", "to_table": "emails", "from_column": "email_id"},
                        {"from_table": "email_recipients", "to_table": "users", "from_column": "recipient_id"},
                    ]
                },
            }
        }

        order = get_table_dependency_order(schema)

        # Verify key ordering constraints for mailg schema
        assert order.index("users") < order.index("threads")
        assert order.index("users") < order.index("emails")
        assert order.index("users") < order.index("labels")
        assert order.index("threads") < order.index("emails")
        assert order.index("threads") < order.index("thread_labels")
        assert order.index("labels") < order.index("thread_labels")
        assert order.index("emails") < order.index("attachments")
        assert order.index("emails") < order.index("email_recipients")


class TestEnumConversion:
    """Tests for enum value conversion."""

    def test_build_enum_column_map(self):
        """Test that enum columns are correctly identified from schema."""
        schema = {
            "properties": {
                "tables": {
                    "properties": {
                        "users": {
                            "properties": {
                                "id": {"type": "integer"},
                                "role": {"type": "string", "enum": ["admin", "user"]},
                                "first_name": {"type": "string"},
                            }
                        },
                        "emails": {
                            "properties": {
                                "id": {"type": "integer"},
                                "status": {"type": "string", "enum": ["draft", "sent", "received"]},
                            }
                        },
                    }
                },
                "relationships": {"items": []},
            }
        }

        # Create writer without connection (we're just testing the map building)
        writer = PostgresWriter.__new__(PostgresWriter)
        writer.schema = schema
        enum_map = writer._build_enum_column_map()

        assert ("users", "role") in enum_map
        assert enum_map[("users", "role")] == ["admin", "user"]
        assert ("emails", "status") in enum_map
        assert enum_map[("emails", "status")] == ["draft", "sent", "received"]
        assert ("users", "id") not in enum_map
        assert ("users", "first_name") not in enum_map

    def test_convert_enum_value_uppercase(self):
        """Test that enum values are converted to uppercase."""
        schema = {
            "properties": {
                "tables": {
                    "properties": {
                        "emails": {
                            "properties": {
                                "status": {"type": "string", "enum": ["draft", "sent", "received"]},
                            }
                        },
                    }
                },
                "relationships": {"items": []},
            }
        }

        writer = PostgresWriter.__new__(PostgresWriter)
        writer.schema = schema
        writer._enum_columns = writer._build_enum_column_map()

        # Test lowercase -> uppercase conversion
        assert writer._convert_enum_value("emails", "status", "draft") == "DRAFT"
        assert writer._convert_enum_value("emails", "status", "sent") == "SENT"
        assert writer._convert_enum_value("emails", "status", "received") == "RECEIVED"

    def test_convert_enum_value_already_uppercase(self):
        """Test that already uppercase values are handled correctly."""
        schema = {
            "properties": {
                "tables": {
                    "properties": {
                        "emails": {
                            "properties": {
                                "folder": {"type": "string", "enum": ["inbox", "sent"]},
                            }
                        },
                    }
                },
                "relationships": {"items": []},
            }
        }

        writer = PostgresWriter.__new__(PostgresWriter)
        writer.schema = schema
        writer._enum_columns = writer._build_enum_column_map()

        # Already uppercase should still work
        assert writer._convert_enum_value("emails", "folder", "INBOX") == "INBOX"
        assert writer._convert_enum_value("emails", "folder", "Inbox") == "INBOX"

    def test_convert_enum_value_null(self):
        """Test that null values are passed through."""
        schema = {
            "properties": {
                "tables": {
                    "properties": {
                        "emails": {
                            "properties": {
                                "category": {"type": "string", "enum": ["primary", "promotions"]},
                            }
                        },
                    }
                },
                "relationships": {"items": []},
            }
        }

        writer = PostgresWriter.__new__(PostgresWriter)
        writer.schema = schema
        writer._enum_columns = writer._build_enum_column_map()

        assert writer._convert_enum_value("emails", "category", None) is None

    def test_convert_non_enum_column(self):
        """Test that non-enum columns are passed through unchanged."""
        schema = {
            "properties": {
                "tables": {
                    "properties": {
                        "emails": {
                            "properties": {
                                "subject": {"type": "string"},
                                "status": {"type": "string", "enum": ["draft", "sent"]},
                            }
                        },
                    }
                },
                "relationships": {"items": []},
            }
        }

        writer = PostgresWriter.__new__(PostgresWriter)
        writer.schema = schema
        writer._enum_columns = writer._build_enum_column_map()

        # Non-enum column should pass through unchanged
        assert writer._convert_enum_value("emails", "subject", "Hello World") == "Hello World"
        assert writer._convert_enum_value("emails", "subject", "draft") == "draft"


class TestTableOrderingReliability:
    """Tests to ensure table ordering is reliable across multiple runs."""

    def test_ordering_deterministic(self):
        """Test that ordering is deterministic across multiple calls."""
        schema = {
            "properties": {
                "tables": {
                    "properties": {
                        "a": {"properties": {"id": {"type": "integer"}}},
                        "b": {"properties": {"id": {"type": "integer"}, "a_id": {"type": "integer"}}},
                        "c": {"properties": {"id": {"type": "integer"}, "b_id": {"type": "integer"}}},
                        "d": {"properties": {"id": {"type": "integer"}, "a_id": {"type": "integer"}}},
                    }
                },
                "relationships": {
                    "items": [
                        {"from_table": "b", "to_table": "a", "from_column": "a_id"},
                        {"from_table": "c", "to_table": "b", "from_column": "b_id"},
                        {"from_table": "d", "to_table": "a", "from_column": "a_id"},
                    ]
                },
            }
        }

        # Run multiple times and verify same result
        results = [get_table_dependency_order(schema) for _ in range(10)]

        # All results should be identical
        for result in results[1:]:
            assert result == results[0], "Ordering should be deterministic"

        # Verify ordering constraints hold
        for result in results:
            assert result.index("a") < result.index("b")
            assert result.index("b") < result.index("c")
            assert result.index("a") < result.index("d")

    def test_ordering_with_many_tables(self):
        """Test ordering with many tables to catch edge cases."""
        # Create a schema with 20 tables in a chain
        tables = {}
        relationships = []

        for i in range(20):
            table_name = f"table_{i:02d}"
            tables[table_name] = {
                "properties": {
                    "id": {"type": "integer"},
                }
            }
            if i > 0:
                tables[table_name]["properties"]["prev_id"] = {"type": "integer"}
                relationships.append({
                    "from_table": table_name,
                    "to_table": f"table_{i-1:02d}",
                    "from_column": "prev_id",
                })

        schema = {
            "properties": {
                "tables": {"properties": tables},
                "relationships": {"items": relationships},
            }
        }

        order = get_table_dependency_order(schema)

        # Verify all tables present
        assert len(order) == 20

        # Verify ordering (each table should come after its dependency)
        for i in range(1, 20):
            assert order.index(f"table_{i-1:02d}") < order.index(f"table_{i:02d}")


class TestEnumValuesFromRealSchema:
    """Tests using enum values from the real mailg database schema."""

    def test_user_role_enum(self):
        """Test user role enum conversion."""
        schema = {
            "properties": {
                "tables": {
                    "properties": {
                        "users": {
                            "properties": {
                                "role": {
                                    "type": "string",
                                    "enum": ["admin", "user"],
                                }
                            }
                        }
                    }
                },
                "relationships": {"items": []},
            }
        }

        writer = PostgresWriter.__new__(PostgresWriter)
        writer.schema = schema
        writer._enum_columns = writer._build_enum_column_map()

        assert writer._convert_enum_value("users", "role", "admin") == "ADMIN"
        assert writer._convert_enum_value("users", "role", "user") == "USER"

    def test_email_status_enum(self):
        """Test email status enum conversion."""
        schema = {
            "properties": {
                "tables": {
                    "properties": {
                        "emails": {
                            "properties": {
                                "status": {
                                    "type": "string",
                                    "enum": ["draft", "queued", "sent", "received", "archived", "cancelled"],
                                }
                            }
                        }
                    }
                },
                "relationships": {"items": []},
            }
        }

        writer = PostgresWriter.__new__(PostgresWriter)
        writer.schema = schema
        writer._enum_columns = writer._build_enum_column_map()

        assert writer._convert_enum_value("emails", "status", "draft") == "DRAFT"
        assert writer._convert_enum_value("emails", "status", "sent") == "SENT"
        assert writer._convert_enum_value("emails", "status", "received") == "RECEIVED"

    def test_email_folder_enum(self):
        """Test email folder enum conversion."""
        schema = {
            "properties": {
                "tables": {
                    "properties": {
                        "emails": {
                            "properties": {
                                "folder": {
                                    "type": "string",
                                    "enum": ["inbox", "sent", "drafts", "trash", "spam"],
                                }
                            }
                        }
                    }
                },
                "relationships": {"items": []},
            }
        }

        writer = PostgresWriter.__new__(PostgresWriter)
        writer.schema = schema
        writer._enum_columns = writer._build_enum_column_map()

        assert writer._convert_enum_value("emails", "folder", "inbox") == "INBOX"
        assert writer._convert_enum_value("emails", "folder", "sent") == "SENT"
        assert writer._convert_enum_value("emails", "folder", "drafts") == "DRAFTS"

    def test_attachment_type_enum(self):
        """Test attachment type enum conversion."""
        schema = {
            "properties": {
                "tables": {
                    "properties": {
                        "attachments": {
                            "properties": {
                                "attachment_type": {
                                    "type": "string",
                                    "enum": ["file", "image", "document"],
                                }
                            }
                        }
                    }
                },
                "relationships": {"items": []},
            }
        }

        writer = PostgresWriter.__new__(PostgresWriter)
        writer.schema = schema
        writer._enum_columns = writer._build_enum_column_map()

        assert writer._convert_enum_value("attachments", "attachment_type", "file") == "FILE"
        assert writer._convert_enum_value("attachments", "attachment_type", "image") == "IMAGE"
        assert writer._convert_enum_value("attachments", "attachment_type", "document") == "DOCUMENT"
