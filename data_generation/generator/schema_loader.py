"""Schema loader for parsing the Deskzen database schema."""

import json
from pathlib import Path
from typing import Any


def load_schema(schema_path: str | Path | None = None) -> dict[str, Any]:
    """
    Load the Deskzen schema from JSON file.

    Args:
        schema_path: Path to schema file. If None, uses default location.

    Returns:
        Parsed schema dictionary.
    """
    if schema_path is None:
        # Default path relative to this file
        schema_path = (
            Path(__file__).parent.parent.parent
            / "backend"
            / "database_schema.json"
        )

    schema_path = Path(schema_path)
    if not schema_path.exists():
        raise FileNotFoundError(f"Schema file not found: {schema_path}")

    with open(schema_path, "r") as f:
        return json.load(f)


def get_tables(schema: dict[str, Any]) -> dict[str, Any]:
    """Extract tables definition from schema."""
    return schema.get("properties", {}).get("tables", {}).get("properties", {})


def get_relationships(schema: dict[str, Any]) -> list[dict[str, Any]]:
    """Extract relationships from schema."""
    return schema.get("properties", {}).get("relationships", {}).get("default", [])


def get_table_properties(table_schema: dict[str, Any]) -> dict[str, Any]:
    """Extract properties from a table schema."""
    return table_schema.get("properties", {})


def get_required_fields(table_schema: dict[str, Any]) -> list[str]:
    """Extract required fields from a table schema."""
    return table_schema.get("required", [])


def get_foreign_keys(table_schema: dict[str, Any]) -> dict[str, str]:
    """
    Extract foreign key mappings from table schema.

    Returns:
        Dict mapping column name to foreign table.column reference.
    """
    fks = {}
    for prop_name, prop_def in get_table_properties(table_schema).items():
        if "foreignKey" in prop_def:
            fks[prop_name] = prop_def["foreignKey"]
    return fks


def get_unique_constraints(table_schema: dict[str, Any]) -> list[list[str]]:
    """
    Extract unique constraints from table schema.

    Supports both formats:
    - Plain list of column names: ["col1", "col2"]
    - Object with columns key: {"name": "...", "columns": ["col1", "col2"]}

    Returns:
        List of unique constraints, where each constraint is a list of column names.
    """
    raw = table_schema.get("uniqueConstraints", [])
    result = []
    for entry in raw:
        if isinstance(entry, dict):
            columns = entry.get("columns", [])
            if columns:
                result.append(columns)
        elif isinstance(entry, list):
            result.append(entry)
    return result
