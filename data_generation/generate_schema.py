#!/usr/bin/env python3
"""Generate database-schema.json from PostgreSQL database introspection.

Includes:
- Column types, nullability, defaults
- Primary keys, foreign keys
- CHECK constraints (including enum values)
- UNIQUE constraints
- Indexes (including composite)
- Column comments/descriptions
- Min/max length constraints
"""

import json
import re
import sys
from collections import defaultdict

import psycopg2


def parse_check_constraint(check_clause: str, column_name: str) -> dict | None:
    """Parse CHECK constraint to extract validation rules."""
    if not check_clause:
        return None

    result = {}

    # Extract enum values from CHECK (column = ANY (ARRAY['val1', 'val2']))
    # or CHECK (column IN ('val1', 'val2'))
    enum_pattern = rf"\(\({column_name}\)::text = ANY \(\(ARRAY\[(.*?)\]\)::text\[\]\)\)"
    match = re.search(enum_pattern, check_clause, re.IGNORECASE)
    if match:
        values_str = match.group(1)
        values = re.findall(r"'([^']*)'", values_str)
        if values:
            result["enum"] = values
            return result

    # Alternative pattern: column = ANY(ARRAY[...])
    enum_pattern2 = rf"{column_name}\s*=\s*ANY\s*\(\s*ARRAY\s*\[(.*?)\]"
    match = re.search(enum_pattern2, check_clause, re.IGNORECASE)
    if match:
        values_str = match.group(1)
        values = re.findall(r"'([^']*)'", values_str)
        if values:
            result["enum"] = values
            return result

    # Extract IN clause: column IN ('val1', 'val2', ...)
    in_pattern = rf"{column_name}\s+IN\s*\((.*?)\)"
    match = re.search(in_pattern, check_clause, re.IGNORECASE)
    if match:
        values_str = match.group(1)
        values = re.findall(r"'([^']*)'", values_str)
        if values:
            result["enum"] = values
            return result

    # Extract length constraints: length(column) >= N, char_length(column) <= M
    min_len_pattern = rf"(?:length|char_length)\s*\(\s*\(?{column_name}\)?(?:::text)?\s*\)\s*>=?\s*(\d+)"
    match = re.search(min_len_pattern, check_clause, re.IGNORECASE)
    if match:
        result["minLength"] = int(match.group(1))

    max_len_pattern = rf"(?:length|char_length)\s*\(\s*\(?{column_name}\)?(?:::text)?\s*\)\s*<=?\s*(\d+)"
    match = re.search(max_len_pattern, check_clause, re.IGNORECASE)
    if match:
        result["maxLength"] = int(match.group(1))

    # Extract numeric range: column >= N, column <= M
    min_val_pattern = rf"{column_name}\s*>=?\s*(\d+)"
    match = re.search(min_val_pattern, check_clause, re.IGNORECASE)
    if match:
        result["minimum"] = int(match.group(1))

    max_val_pattern = rf"{column_name}\s*<=?\s*(\d+)"
    match = re.search(max_val_pattern, check_clause, re.IGNORECASE)
    if match:
        result["maximum"] = int(match.group(1))

    # Extract pattern constraint: column ~ 'pattern' or column ~* 'pattern'
    pattern_match = rf"{column_name}\s*~\*?\s*'([^']+)'"
    match = re.search(pattern_match, check_clause, re.IGNORECASE)
    if match:
        result["pattern"] = match.group(1)

    return result if result else None


def get_db_schema(conn_string: str) -> dict:
    """Extract comprehensive schema from PostgreSQL database."""
    conn = psycopg2.connect(conn_string)
    cur = conn.cursor()

    # Get all tables with columns and extended info
    cur.execute("""
        SELECT
            t.table_name,
            c.column_name,
            c.data_type,
            c.udt_name,
            c.is_nullable,
            c.column_default,
            c.character_maximum_length,
            c.numeric_precision,
            c.numeric_scale,
            c.ordinal_position
        FROM information_schema.tables t
        JOIN information_schema.columns c
            ON t.table_name = c.table_name AND t.table_schema = c.table_schema
        WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
        ORDER BY t.table_name, c.ordinal_position
    """)
    columns = cur.fetchall()

    # Get column comments/descriptions
    cur.execute("""
        SELECT
            c.relname AS table_name,
            a.attname AS column_name,
            d.description
        FROM pg_class c
        JOIN pg_attribute a ON c.oid = a.attrelid
        LEFT JOIN pg_description d ON c.oid = d.objoid AND a.attnum = d.objsubid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public'
          AND c.relkind = 'r'
          AND a.attnum > 0
          AND d.description IS NOT NULL
    """)
    column_comments = {(row[0], row[1]): row[2] for row in cur.fetchall()}

    # Get table comments
    cur.execute("""
        SELECT
            c.relname AS table_name,
            d.description
        FROM pg_class c
        LEFT JOIN pg_description d ON c.oid = d.objoid AND d.objsubid = 0
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public'
          AND c.relkind = 'r'
          AND d.description IS NOT NULL
    """)
    table_comments = {row[0]: row[1] for row in cur.fetchall()}

    # Get primary keys
    cur.execute("""
        SELECT kcu.table_name, kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'
    """)
    pk_set = {(row[0], row[1]) for row in cur.fetchall()}

    # Get foreign keys with ON DELETE/UPDATE actions
    cur.execute("""
        SELECT
            kcu.table_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name,
            rc.update_rule,
            rc.delete_rule
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
            ON tc.constraint_name = ccu.constraint_name
            AND tc.table_schema = ccu.table_schema
        JOIN information_schema.referential_constraints rc
            ON tc.constraint_name = rc.constraint_name
            AND tc.table_schema = rc.constraint_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    """)
    fk_rows = cur.fetchall()
    fk_map = {}
    for row in fk_rows:
        table_name, col_name, ref_table, ref_col, update_rule, delete_rule = row
        fk_map[(table_name, col_name)] = {
            "reference": f"{ref_table}.{ref_col}",
            "onUpdate": update_rule,
            "onDelete": delete_rule,
        }

    # Get UNIQUE constraints
    cur.execute("""
        SELECT
            tc.table_name,
            kcu.column_name,
            tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'UNIQUE' AND tc.table_schema = 'public'
        ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position
    """)
    unique_rows = cur.fetchall()
    unique_constraints = defaultdict(lambda: defaultdict(list))
    for table_name, col_name, constraint_name in unique_rows:
        unique_constraints[table_name][constraint_name].append(col_name)

    # Get CHECK constraints
    cur.execute("""
        SELECT
            tc.table_name,
            cc.check_clause,
            tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.check_constraints cc
            ON tc.constraint_name = cc.constraint_name
            AND tc.constraint_schema = cc.constraint_schema
        WHERE tc.constraint_type = 'CHECK'
          AND tc.table_schema = 'public'
          AND tc.constraint_name NOT LIKE '%_not_null'
    """)
    check_constraints = defaultdict(list)
    for table_name, check_clause, constraint_name in cur.fetchall():
        check_constraints[table_name].append({
            "name": constraint_name,
            "clause": check_clause,
        })

    # Get indexes with detailed info
    cur.execute("""
        SELECT
            t.relname AS table_name,
            i.relname AS index_name,
            ix.indisunique AS is_unique,
            ix.indisprimary AS is_primary,
            a.attname AS column_name,
            am.amname AS index_type
        FROM pg_index ix
        JOIN pg_class t ON t.oid = ix.indrelid
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        JOIN pg_am am ON am.oid = i.relam
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
        WHERE n.nspname = 'public'
        ORDER BY t.relname, i.relname, array_position(ix.indkey, a.attnum)
    """)
    index_rows = cur.fetchall()
    indexed_columns = defaultdict(set)
    table_indexes = defaultdict(list)
    current_index = None
    current_index_cols = []

    for table_name, index_name, is_unique, is_primary, col_name, index_type in index_rows:
        indexed_columns[table_name].add(col_name)

        if current_index != (table_name, index_name):
            if current_index and current_index_cols:
                t, idx = current_index
                table_indexes[t].append({
                    "name": idx,
                    "columns": current_index_cols.copy(),
                    "unique": prev_unique,
                    "type": prev_type,
                })
            current_index = (table_name, index_name)
            current_index_cols = [col_name]
            prev_unique = is_unique
            prev_type = index_type
        else:
            current_index_cols.append(col_name)

    # Don't forget the last index
    if current_index and current_index_cols:
        t, idx = current_index
        table_indexes[t].append({
            "name": idx,
            "columns": current_index_cols,
            "unique": prev_unique,
            "type": prev_type,
        })

    cur.close()
    conn.close()

    # Build schema structure
    tables = defaultdict(lambda: {"properties": {}, "required": []})
    relationships = []

    type_mapping = {
        "integer": "integer",
        "bigint": "integer",
        "smallint": "integer",
        "serial": "integer",
        "bigserial": "integer",
        "character varying": "string",
        "varchar": "string",
        "character": "string",
        "char": "string",
        "text": "string",
        "boolean": "boolean",
        "bool": "boolean",
        "timestamp without time zone": "string",
        "timestamp with time zone": "string",
        "timestamptz": "string",
        "date": "string",
        "time": "string",
        "time without time zone": "string",
        "time with time zone": "string",
        "json": "object",
        "jsonb": "object",
        "ARRAY": "array",
        "real": "number",
        "float4": "number",
        "double precision": "number",
        "float8": "number",
        "numeric": "number",
        "decimal": "number",
        "uuid": "string",
        "bytea": "string",
        "inet": "string",
        "cidr": "string",
        "macaddr": "string",
    }

    for row in columns:
        table_name, col_name, data_type, udt_name, is_nullable, col_default, max_length, num_precision, num_scale, ordinal = row

        # Determine JSON Schema type
        json_type = type_mapping.get(data_type, type_mapping.get(udt_name, "string"))

        # Handle array types
        if data_type == "ARRAY" or udt_name.startswith("_"):
            json_type = "array"

        prop = {
            "type": json_type,
            "nullable": is_nullable == "YES",  # Use actual database nullability
        }

        # Add format for timestamps and dates
        if "timestamp" in data_type or "timestamp" in udt_name:
            prop["format"] = "date-time"
        elif data_type == "date":
            prop["format"] = "date"
        elif "time" in data_type and "timestamp" not in data_type:
            prop["format"] = "time"
        elif udt_name == "uuid":
            prop["format"] = "uuid"

        # Add max length for strings
        if max_length and json_type == "string":
            prop["maxLength"] = max_length

        # Add precision/scale for numbers
        if num_precision and json_type == "number":
            prop["precision"] = num_precision
            if num_scale:
                prop["scale"] = num_scale

        # Add default value (cleaned up)
        if col_default:
            default_str = str(col_default)
            # Skip sequence defaults and function calls
            if not any(x in default_str.lower() for x in ["nextval", "now()", "current_", "gen_random"]):
                # Clean up type casting
                if "::" in default_str:
                    default_str = default_str.split("::")[0]
                # Remove quotes
                default_str = default_str.strip("'")
                if default_str.lower() == "true":
                    prop["default"] = True
                elif default_str.lower() == "false":
                    prop["default"] = False
                elif default_str.isdigit():
                    prop["default"] = int(default_str)
                elif default_str.replace(".", "").isdigit():
                    prop["default"] = float(default_str)
                elif default_str and default_str != "NULL":
                    prop["default"] = default_str

        # Add column description/comment
        if (table_name, col_name) in column_comments:
            prop["description"] = column_comments[(table_name, col_name)]

        # Primary key
        if (table_name, col_name) in pk_set:
            prop["primaryKey"] = True
            prop["indexed"] = True
            if col_name not in tables[table_name]["required"]:
                tables[table_name]["required"].append(col_name)

        # Foreign key with actions
        if (table_name, col_name) in fk_map:
            fk_info = fk_map[(table_name, col_name)]
            prop["foreignKey"] = fk_info["reference"]
            if fk_info["onUpdate"] != "NO ACTION":
                prop["onUpdate"] = fk_info["onUpdate"]
            if fk_info["onDelete"] != "NO ACTION":
                prop["onDelete"] = fk_info["onDelete"]
            ref_table, ref_col = fk_info["reference"].split(".")
            relationships.append({
                "from_table": table_name,
                "from_column": col_name,
                "to_table": ref_table,
                "to_column": ref_col,
                "onUpdate": fk_info["onUpdate"],
                "onDelete": fk_info["onDelete"],
            })

        # Indexed
        if col_name in indexed_columns[table_name]:
            prop["indexed"] = True

        # Not nullable and no default -> required
        if is_nullable == "NO" and col_default is None:
            if col_name not in tables[table_name]["required"]:
                tables[table_name]["required"].append(col_name)

        tables[table_name]["properties"][col_name] = prop

    # Apply CHECK constraints to properties
    for table_name, checks in check_constraints.items():
        for check in checks:
            clause = check["clause"]
            # Try to match constraint to a column
            for col_name in tables[table_name]["properties"]:
                parsed = parse_check_constraint(clause, col_name)
                if parsed:
                    tables[table_name]["properties"][col_name].update(parsed)

    # Add UNIQUE constraint info to properties
    for table_name, constraints in unique_constraints.items():
        for constraint_name, columns_list in constraints.items():
            if len(columns_list) == 1:
                # Single column unique
                col_name = columns_list[0]
                if col_name in tables[table_name]["properties"]:
                    tables[table_name]["properties"][col_name]["unique"] = True

    # Add table-level metadata
    for table_name in tables:
        # Add table description
        if table_name in table_comments:
            tables[table_name]["description"] = table_comments[table_name]

        # Add composite unique constraints
        if table_name in unique_constraints:
            composite_uniques = []
            for constraint_name, columns_list in unique_constraints[table_name].items():
                if len(columns_list) > 1:
                    composite_uniques.append({
                        "name": constraint_name,
                        "columns": columns_list,
                    })
            if composite_uniques:
                tables[table_name]["uniqueConstraints"] = composite_uniques

        # Add composite indexes
        if table_name in table_indexes:
            composite_indexes = []
            for idx in table_indexes[table_name]:
                if len(idx["columns"]) > 1:
                    composite_indexes.append(idx)
            if composite_indexes:
                tables[table_name]["compositeIndexes"] = composite_indexes

        # Add check constraints
        if table_name in check_constraints:
            tables[table_name]["checkConstraints"] = check_constraints[table_name]

    # Build final schema
    schema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "Database Schema",
        "description": "Auto-generated schema from PostgreSQL database with full constraint information",
        "version": "2.0",
        "generatedAt": None,  # Will be set at runtime
        "type": "object",
        "properties": {
            "tables": {
                "type": "object",
                "properties": dict(tables),
            },
            "relationships": {
                "type": "array",
                "items": relationships,
            },
        },
    }

    # Add generation timestamp
    from datetime import datetime
    schema["generatedAt"] = datetime.utcnow().isoformat() + "Z"

    return schema


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Generate JSON Schema from PostgreSQL database")
    parser.add_argument(
        "connection",
        nargs="?",
        default="postgresql://mailg:mailg@localhost:5436/mailg_seed",
        help="PostgreSQL connection string"
    )
    parser.add_argument(
        "-o", "--output",
        help="Output file path (default: stdout)"
    )
    args = parser.parse_args()

    schema = get_db_schema(args.connection)
    output = json.dumps(schema, indent=2)

    if args.output:
        with open(args.output, "w") as f:
            f.write(output)
        print(f"Schema written to {args.output}")
    else:
        print(output)


if __name__ == "__main__":
    main()
