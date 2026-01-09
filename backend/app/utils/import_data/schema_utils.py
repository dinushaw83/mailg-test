"""Schema validation and dependency resolution for data imports.

Provides:
- JSON Schema validation for imported data
- Topological ordering of tables based on foreign key relationships
- Custom error messages for validation failures
"""

import json
import logging
import re, random
from typing import Dict, List, Any, Tuple
from datetime import datetime
from pathlib import Path
from graphlib import TopologicalSorter
from jsonschema import validate, ValidationError, Draft7Validator

logger = logging.getLogger(__name__)

# Load schema once at module level
# Config files are in the same import_data directory
MY_DIR = Path(__file__).resolve()
CONFIG_DIR = MY_DIR.parent / "config"
SCHEMA_PATH = MY_DIR.parent.parent.parent.parent / "database_schema.json"
GUARDRAILS_CONFIG_PATH = CONFIG_DIR / "guardrails_config.json"

with open(SCHEMA_PATH) as f:
    FULL_SCHEMA = json.load(f)

with open(GUARDRAILS_CONFIG_PATH) as f:
    GUARDRAILS_CONFIG = json.load(f)

# Extract table schemas and relationships
TABLE_SCHEMAS = FULL_SCHEMA["properties"]["tables"]["properties"]
# Handle both old (default) and new (items) schema formats
_rel_prop = FULL_SCHEMA["properties"]["relationships"]
RELATIONSHIPS = _rel_prop.get("items", _rel_prop.get("default", []))

PII_PATTERNS = {
    "email": re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"),
    "phone": re.compile(r"\+?\d[\d\-\s]{6,}\d"),
    "ip": re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b"),
    "aws_key": re.compile(r"AKIA[0-9A-Z]{16}"),
    "jwt": re.compile(r"eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}")
}



def get_table_dependency_order() -> List[str]:
    """
    Compute topological ordering of tables based on foreign key dependencies.

    Tables are ordered such that parent tables (referenced by foreign keys)
    come before child tables.

    If a cycle is detected, only excludes nullable/deferred FK edges that are
    part of the cycle, preserving other dependencies for correct ordering.

    Returns:
        List of table names in dependency order (safe import order)
    """
    from graphlib import CycleError

    def get_all_edges() -> List[Dict]:
        """Get all FK edges with their metadata."""
        edges = []
        for rel in RELATIONSHIPS:
            from_table = rel["from_table"]
            to_table = rel["to_table"]
            from_column = rel.get("from_column", "")

            # Skip self-references
            if from_table == to_table:
                continue

            if from_table not in TABLE_SCHEMAS:
                continue

            table_props = TABLE_SCHEMAS[from_table].get("properties", {})
            field_def = table_props.get(from_column, {})
            is_nullable = field_def.get("nullable", False)
            is_deferred = field_def.get("deferred", False)

            edges.append({
                "from": from_table,
                "to": to_table,
                "column": from_column,
                "nullable": is_nullable,
                "deferred": is_deferred,
                "breakable": is_nullable or is_deferred,
            })
        return edges

    def build_graph_from_edges(edges: List[Dict], excluded: set = None) -> Dict[str, set]:
        """Build dependency graph from edges, excluding specified ones."""
        excluded = excluded or set()
        deps = {table_name: set() for table_name in TABLE_SCHEMAS.keys()}

        for edge in edges:
            edge_key = (edge["from"], edge["column"])
            if edge_key in excluded:
                continue
            if edge["to"] in deps:
                deps[edge["from"]].add(edge["to"])

        return deps

    def find_cycle_tables(deps: Dict[str, set]) -> set:
        """Find tables involved in cycles."""
        try:
            sorter = TopologicalSorter(deps)
            list(sorter.static_order())
            return set()
        except CycleError as e:
            # Extract table names from error message
            # Format: ('nodes are in a cycle', ['table1', 'table2', ...])
            if len(e.args) >= 2 and isinstance(e.args[1], list):
                return set(e.args[1])
            return set()

    edges = get_all_edges()

    # First, try with all dependencies
    deps = build_graph_from_edges(edges)
    cycle_tables = find_cycle_tables(deps)

    if not cycle_tables:
        sorter = TopologicalSorter(deps)
        ordered = list(sorter.static_order())
        logger.info(f"Table dependency order: {ordered}")
        return ordered

    logger.warning(f"Cycle detected involving tables: {cycle_tables}")

    # Only exclude breakable edges that are part of the cycle
    excluded = set()
    for edge in edges:
        if edge["breakable"] and edge["from"] in cycle_tables and edge["to"] in cycle_tables:
            excluded.add((edge["from"], edge["column"]))
            logger.debug(f"Excluding edge {edge['from']}.{edge['column']} -> {edge['to']} to break cycle")

    deps = build_graph_from_edges(edges, excluded)

    try:
        sorter = TopologicalSorter(deps)
        ordered = list(sorter.static_order())
        logger.info(f"Table dependency order (after breaking cycles): {ordered}")
        return ordered
    except CycleError as e:
        logger.error(f"Unable to resolve cycle even after excluding nullable/deferred FKs: {e}")
        raise


def validate_string_format(value: str, format_type: str) -> Tuple[bool, str]:
    """
    Validate string against a specific format.

    Supports JSON Schema string formats:
    - date-time: RFC3339 datetime
    - date: RFC3339 date
    - time: RFC3339 time
    - email: Email address
    - uri: URI
    - uuid: UUID
    - ipv4: IPv4 address
    - ipv6: IPv6 address

    Args:
        value: String value to validate
        format_type: Format type from schema

    Returns:
        Tuple of (is_valid, error_message)
    """
    if format_type == "date-time":
        # ISO 8601 / RFC3339 datetime
        try:
            datetime.fromisoformat(value.replace('Z', '+00:00'))
            return True, ""
        except (ValueError, AttributeError):
            return False, f"Invalid date-time format (expected ISO 8601, e.g., '2024-12-15T10:30:00Z')"

    elif format_type == "date":
        # ISO 8601 date
        try:
            datetime.strptime(value, "%Y-%m-%d")
            return True, ""
        except (ValueError, AttributeError):
            return False, f"Invalid date format (expected YYYY-MM-DD)"

    elif format_type == "time":
        # ISO 8601 time
        try:
            datetime.strptime(value, "%H:%M:%S")
            return True, ""
        except (ValueError, AttributeError):
            return False, f"Invalid time format (expected HH:MM:SS)"

    elif format_type == "email":
        # Simple email validation
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if re.match(email_pattern, value):
            return True, ""
        return False, f"Invalid email format"

    elif format_type == "uri":
        # Simple URI validation
        uri_pattern = r'^[a-zA-Z][a-zA-Z0-9+.-]*:'
        if re.match(uri_pattern, value):
            return True, ""
        return False, f"Invalid URI format"

    elif format_type == "uuid":
        # UUID validation
        uuid_pattern = r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        if re.match(uuid_pattern, value):
            return True, ""
        return False, f"Invalid UUID format (expected xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)"

    elif format_type == "ipv4":
        # IPv4 validation
        ipv4_pattern = r'^(\d{1,3}\.){3}\d{1,3}$'
        if re.match(ipv4_pattern, value):
            parts = value.split('.')
            if all(0 <= int(part) <= 255 for part in parts):
                return True, ""
        return False, f"Invalid IPv4 address format"

    elif format_type == "ipv6":
        # IPv6 validation (simplified)
        ipv6_pattern = r'^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$'
        if re.match(ipv6_pattern, value):
            return True, ""
        return False, f"Invalid IPv6 address format"

    # Unknown format - just warn and pass
    logger.warning(f"Unknown format type '{format_type}', skipping validation")
    return True, ""


def validate_field_value(field_name: str, field_value: Any, field_schema: Dict[str, Any], record_idx: int, rules: Dict[str, Any]) -> List[str]:
    """
    Validate a single field value against its schema.

    Supports:
    - Type validation (integer, string, boolean, array, object, number)
    - Nullable fields
    - String: format, enum, minLength, maxLength, pattern
    - Number/Integer: minimum, maximum, multipleOf
    - Array: minItems, maxItems, uniqueItems

    Args:
        field_name: Name of the field
        field_value: Value to validate
        field_schema: Schema definition for the field
        record_idx: Index of the record (for error messages)

    Returns:
        List of error messages (empty if valid)
    """
    errors = []
    expected_type = field_schema.get("type")
    nullable = field_schema.get("nullable", False)

    # Check null values
    if field_value is None:
        if not nullable:
            errors.append(f"Record {record_idx + 1}: Field '{field_name}' cannot be null")
        return errors

    # Type validation
    if expected_type == "integer":
        if not isinstance(field_value, int) or isinstance(field_value, bool):
            errors.append(
                f"Record {record_idx + 1}: Field '{field_name}' should be integer, got {type(field_value).__name__}"
            )
            return errors

        # Integer-specific validations
        if "minimum" in field_schema and field_value < field_schema["minimum"]:
            errors.append(
                f"Record {record_idx + 1}: Field '{field_name}' value {field_value} is less than minimum {field_schema['minimum']}"
            )
        if "maximum" in field_schema and field_value > field_schema["maximum"]:
            errors.append(
                f"Record {record_idx + 1}: Field '{field_name}' value {field_value} is greater than maximum {field_schema['maximum']}"
            )
        if "multipleOf" in field_schema and field_value % field_schema["multipleOf"] != 0:
            errors.append(
                f"Record {record_idx + 1}: Field '{field_name}' value {field_value} is not a multiple of {field_schema['multipleOf']}"
            )

    elif expected_type == "number":
        if not isinstance(field_value, (int, float)) or isinstance(field_value, bool):
            errors.append(
                f"Record {record_idx + 1}: Field '{field_name}' should be number, got {type(field_value).__name__}"
            )
            return errors

        # Number-specific validations
        if "minimum" in field_schema and field_value < field_schema["minimum"]:
            errors.append(
                f"Record {record_idx + 1}: Field '{field_name}' value {field_value} is less than minimum {field_schema['minimum']}"
            )
        if "maximum" in field_schema and field_value > field_schema["maximum"]:
            errors.append(
                f"Record {record_idx + 1}: Field '{field_name}' value {field_value} is greater than maximum {field_schema['maximum']}"
            )
        if "multipleOf" in field_schema:
            if (field_value / field_schema["multipleOf"]) % 1 != 0:
                errors.append(
                    f"Record {record_idx + 1}: Field '{field_name}' value {field_value} is not a multiple of {field_schema['multipleOf']}"
                )

    elif expected_type == "string":
        if not isinstance(field_value, str):
            errors.append(
                f"Record {record_idx + 1}: Field '{field_name}' should be string, got {type(field_value).__name__}"
            )
            return errors

        # String-specific validations
        # Enum validation
        if "enum" in field_schema:
            allowed_values = field_schema["enum"]
            if field_value not in allowed_values:
                errors.append(
                    f"Record {record_idx + 1}: Field '{field_name}' value '{field_value}' is not one of allowed values: {allowed_values}"
                )
        if "allowed" in rules:
            allowed_values = rules["allowed"]
            if field_value not in allowed_values:
                errors.append(
                    f"Record {record_idx + 1}: Field '{field_name}' value '{field_value}' is not one of allowed values: {allowed_values}"
                )


        # Format validation
        if "format" in field_schema:
            is_valid, error_msg = validate_string_format(field_value, field_schema["format"])
            if not is_valid:
                errors.append(
                    f"Record {record_idx + 1}: Field '{field_name}' {error_msg}. Got: '{field_value}'"
                )

        # Length validations
        if "minLength" in field_schema and len(field_value) < field_schema["minLength"]:
            errors.append(
                f"Record {record_idx + 1}: Field '{field_name}' length {len(field_value)} is less than minimum {field_schema['minLength']}"
            )
        if "min_length" in rules and len(field_value) < rules["min_length"]:
            errors.append(
                f"Record {record_idx + 1}: Field '{field_name}' length {len(field_value)} is less than minimum {rules['min_length']}"
            )
        if "maxLength" in field_schema and len(field_value) > field_schema["maxLength"]:
            errors.append(
                f"Record {record_idx + 1}: Field '{field_name}' length {len(field_value)} is greater than maximum {field_schema['maxLength']}"
            )
        if "max_length" in rules and len(field_value) > rules["max_length"]:
            errors.append(
                f"Record {record_idx + 1}: Field '{field_name}' length {len(field_value)} is longer than maximum {rules['max_length']}"
            )

        # Pattern validation (regex)
        if "pattern" in field_schema:
            pattern = field_schema["pattern"]
            if not re.match(pattern, field_value):
                errors.append(
                    f"Record {record_idx + 1}: Field '{field_name}' value '{field_value}' does not match pattern '{pattern}'"
                )


    elif expected_type == "boolean":
        if not isinstance(field_value, bool):
            errors.append(
                f"Record {record_idx + 1}: Field '{field_name}' should be boolean, got {type(field_value).__name__}"
            )

    elif expected_type == "array":
        # For JSON/JSONB columns, accept both list and dict as valid JSON values
        if not isinstance(field_value, (list, dict)):
            errors.append(
                f"Record {record_idx + 1}: Field '{field_name}' should be array/object (JSON), got {type(field_value).__name__}"
            )
            return errors

        # Array-specific validations (only apply if it's actually a list)
        if isinstance(field_value, list):
            if "minItems" in field_schema and len(field_value) < field_schema["minItems"]:
                errors.append(
                    f"Record {record_idx + 1}: Field '{field_name}' array length {len(field_value)} is less than minimum {field_schema['minItems']}"
                )
            if "maxItems" in field_schema and len(field_value) > field_schema["maxItems"]:
                errors.append(
                    f"Record {record_idx + 1}: Field '{field_name}' array length {len(field_value)} is greater than maximum {field_schema['maxItems']}"
                )
            if "uniqueItems" in field_schema and field_schema["uniqueItems"]:
                if len(field_value) != len(set(str(item) for item in field_value)):
                    errors.append(
                        f"Record {record_idx + 1}: Field '{field_name}' array contains duplicate items"
                    )

    elif expected_type == "object":
        # For JSON/JSONB columns, accept both dict and list as valid JSON values
        if not isinstance(field_value, (dict, list)):
            errors.append(
                f"Record {record_idx + 1}: Field '{field_name}' should be object/array (JSON), got {type(field_value).__name__}"
            )



    return errors


def validate_table_data(table_name: str, records: List[Dict[str, Any]], ignore_errors: bool = False) -> Tuple[List[Dict[str, Any]], str, List[Tuple[int, Dict[str, List[str]]]]]:
    """
    Validate records against table schema.

    Supports comprehensive JSON Schema validation including:
    - Required fields
    - Type validation
    - Format validation (datetime, email, uri, uuid, etc.)
    - Enum values
    - String constraints (minLength, maxLength, pattern)
    - Number constraints (minimum, maximum, multipleOf)
    - Array constraints (minItems, maxItems, uniqueItems)

    Args:
        table_name: Name of the table
        records: List of record dictionaries to validate
        ignore_errors: continues on errors

    Returns:
        Tuple of (sanitized rows, error or empty string, list of tuples of row index and field errors)
    """
    if table_name not in TABLE_SCHEMAS:
        return [], f"Unknown table: {table_name}", []

    table_schema = TABLE_SCHEMAS[table_name]
    errors: List[Tuple[int, Dict[str, Any]]] = []
    sanitized: List[Dict[str, Any]]= []

    # Get required fields from schema
    required_fields = set(table_schema.get("required", []))

    # Get all properties and their types
    properties = table_schema.get("properties", {})

    rule_config = GUARDRAILS_CONFIG.get("rules", {}).get("tables", {}).get(table_name) or {}
    pii_cfg = GUARDRAILS_CONFIG.get("pii", {})

    for idx, record in enumerate(records):
        record_errors = {}

        # Check required fields
        missing_required = required_fields - set(record.keys())
        if missing_required:
            record_errors["_missing_fields"] = [
                f"Record {idx + 1}: Missing required fields: {', '.join(missing_required)}"
            ]

        record_sanitized = {}

        # Validate each field in the record
        for field_name, field_value in record.items():
            if field_name not in properties:
                # Unknown field - log warning but don't fail
                logger.warning(f"Table '{table_name}' record {idx + 1}: Unknown field '{field_name}'")
                continue

            field_schema = properties[field_name]
            field_errors = validate_field_value(field_name, field_value, field_schema, idx, rule_config.get(field_name, {}))
            sv = field_value

            # Skip PII detection for ID fields and timestamp fields
            is_id_field = (
                    field_name == "id" or
                    field_name.endswith("_id") or
                    field_schema.get("primaryKey") or
                    field_schema.get("foreignKey")
            )
            is_timestamp_field = (
                    field_name.endswith("_at") or
                    field_schema.get("format") in ("date-time", "date", "time")
            )

            if not is_id_field and not is_timestamp_field:
                for label, pat in PII_PATTERNS.items():
                    if isinstance(field_value, str) and pat.search(field_value):
                        on_det = pii_cfg.get("on_detection", "sanitize")
                        if on_det == "sanitize":
                            sv = _mask_pii(label, sv)
                            # actions.append({"action":"pii_mask","field":col,"type":label})
                        else:
                            field_errors.append("type:pii_detected" + ", pii_type:" + label)
                            if pii_cfg.get("severity","block") == "block":
                                return sanitized, "pii", errors
            record_sanitized[field_name] = sv

            if field_errors:
                record_errors[field_name] = field_errors

        sanitized.append(record_sanitized)

        # Only track records that have actual errors
        if record_errors:
            errors.append((idx, record_errors))
            if not ignore_errors:
                break

    return sanitized, "", errors



def get_table_info(table_name: str) -> Dict[str, Any]:
    """
    Get schema information for a table.

    Args:
        table_name: Name of the table

    Returns:
        Dictionary containing table schema info
    """
    if table_name not in TABLE_SCHEMAS:
        return {}

    schema = TABLE_SCHEMAS[table_name]
    properties = schema.get("properties", {})

    return {
        "name": table_name,
        "description": schema.get("description", ""),
        "required_fields": schema.get("required", []),
        "fields": {
            name: {
                "type": prop.get("type"),
                "nullable": prop.get("nullable", False),
                "description": prop.get("description", ""),
                "primary_key": prop.get("primaryKey", False),
                "foreign_key": prop.get("foreignKey"),
                "format": prop.get("format"),
                "enum": prop.get("enum"),
                "min_length": prop.get("minLength"),
                "max_length": prop.get("maxLength"),
                "minimum": prop.get("minimum"),
                "maximum": prop.get("maximum"),
                "pattern": prop.get("pattern"),
            }
            for name, prop in properties.items()
        }
    }


def normalize_table_name(filename: str) -> str:
    """
    Extract table name from filename.

    Supports formats:
    - table_name.json
    - table_name.csv
    - TableName.json (converts to snake_case)

    Args:
        filename: Name of the file

    Returns:
        Normalized table name
    """
    from pathlib import Path

    # Remove extension
    name = Path(filename).stem

    # Convert to lowercase
    name = name.lower()

    # Convert CamelCase/PascalCase to snake_case
    import re
    name = re.sub(r'(?<!^)(?=[A-Z])', '_', name).lower()

    return name

def _mask_pii(label: str, value: str) -> str:
    """Mask PII data based on type."""
    if label == "email":
        return f"user{random.randint(10000,99999)}@example.com"
    if label == "phone":
        return str(random.randint(6000000000,9999999999))
    if label == "ip":
        return "0.0.0.0"
    return "[REDACTED]"
