"""PostgreSQL output writer."""

import json
import logging
from datetime import date, datetime, time
from decimal import Decimal
from ipaddress import IPv4Address, IPv6Address, ip_address
from pathlib import Path
from typing import Any
from uuid import UUID

try:
    import psycopg2
    from psycopg2 import sql
    from psycopg2.extras import Json
except ImportError:
    psycopg2 = None

from .base import OutputWriter

logger = logging.getLogger(__name__)


class PostgresWriter(OutputWriter):
    """Writes data to PostgreSQL database."""

    @property
    def extension(self) -> str:
        return ""

    def __init__(
        self,
        connection_string: str,
        output_dir: str | Path | None = None,
        prefix: str = "",
        overwrite: bool = False,
        schema: dict[str, Any] | None = None,
    ):
        """
        Initialize PostgreSQL writer.

        Args:
            connection_string: PostgreSQL connection string (DSN).
            output_dir: Directory for output files (ignored).
            prefix: Prefix for generated file names (ignored).
            overwrite: If True, overwrite existing tables.
            schema: Schema dict for table definitions.
        """
        super().__init__(output_dir, prefix, overwrite)
        
        if psycopg2 is None:
            raise ImportError("psycopg2 library is required for PostgresWriter.")

        self.connection_string = connection_string
        self.schema = schema or {}
        self._conn = None

    def _get_postgres_type(self, field_def: dict[str, Any], field_name: str) -> str:
        """Map JSON schema type to PostgreSQL type."""
        json_type = field_def.get("type", "string")
        if isinstance(json_type, list):
            for t in json_type:
                if t != "null":
                    json_type = t
                    break
            else:
                json_type = "string"

        if json_type == "string":
            fmt = field_def.get("format")
            pg_type = None
            if fmt == "date-time":
                pg_type = "TIMESTAMP"
            elif fmt == "date":
                pg_type = "DATE"
            elif fmt == "time":
                pg_type = "TIME"
            elif fmt == "uuid":
                pg_type = "UUID"
            elif fmt in ("ipv4", "ipv6"):
                pg_type = "INET"
            elif fmt == "binary":
                pg_type = "BYTEA"

            if pg_type:
                if field_def.get("primaryKey"):
                    return f"{pg_type} PRIMARY KEY"
                return pg_type

        # Check for specific subtypes or formats that indicate precision
        if json_type == "integer":
            # Check for size hints (bigint, smallint)
            subtype = field_def.get("subtype", "").lower()
            if subtype == "bigint" or field_def.get("minimum", 0) < -(2**31) or field_def.get("maximum", 0) > (2**31 - 1):
                pg_type = "BIGINT"
            elif subtype == "smallint" or (field_def.get("maximum", 0) <= 32767 and field_def.get("minimum", 0) >= -32768):
                pg_type = "SMALLINT"
            else:
                pg_type = "INTEGER"
        elif json_type == "number":
            # Check for decimal/numeric vs floating point
            subtype = field_def.get("subtype", "").lower()
            if subtype in ("decimal", "numeric"):
                precision = field_def.get("precision", 10)
                scale = field_def.get("scale", 2)
                pg_type = f"NUMERIC({precision},{scale})"
            elif subtype == "real":
                pg_type = "REAL"
            else:
                pg_type = "DOUBLE PRECISION"
        elif json_type == "boolean":
            pg_type = "BOOLEAN"
        elif json_type == "string":
            pg_type = "TEXT"
        elif json_type == "object":
            pg_type = "JSONB"
        elif json_type == "array":
            items = field_def.get("items", {})
            item_type = items.get("type", "string")
            item_format = items.get("format")

            # Map array item types to PostgreSQL array types
            if item_type == "integer":
                item_subtype = items.get("subtype", "").lower()
                if item_subtype == "bigint":
                    pg_type = "BIGINT[]"
                elif item_subtype == "smallint":
                    pg_type = "SMALLINT[]"
                else:
                    pg_type = "INTEGER[]"
            elif item_type == "number":
                item_subtype = items.get("subtype", "").lower()
                if item_subtype in ("decimal", "numeric"):
                    pg_type = "NUMERIC[]"
                elif item_subtype == "real":
                    pg_type = "REAL[]"
                else:
                    pg_type = "DOUBLE PRECISION[]"
            elif item_type == "boolean":
                pg_type = "BOOLEAN[]"
            elif item_type == "string":
                if item_format == "date-time":
                    pg_type = "TIMESTAMP[]"
                elif item_format == "date":
                    pg_type = "DATE[]"
                elif item_format == "time":
                    pg_type = "TIME[]"
                elif item_format == "uuid":
                    pg_type = "UUID[]"
                elif item_format in ("ipv4", "ipv6"):
                    pg_type = "INET[]"
                else:
                    pg_type = "TEXT[]"
            else:
                # Complex array types stored as JSONB
                pg_type = "JSONB"
        else:
            pg_type = "TEXT"

        if field_def.get("primaryKey"):
            return f"{pg_type} PRIMARY KEY"

        return pg_type

    def _create_table_sql(self, table_name: str, table_schema: dict[str, Any]) -> str:
        """Generate CREATE TABLE statement from schema."""
        properties = table_schema.get("properties", {})
        columns = []

        for field_name, field_def in properties.items():
            pg_type = self._get_postgres_type(field_def, field_name)

            is_nullable = field_def.get("nullable", False)
            if not is_nullable and "PRIMARY KEY" not in pg_type:
                pg_type += " NOT NULL"

            columns.append(f'"{field_name}" {pg_type}')

        columns_sql = ",\n  ".join(columns)
        return f'CREATE TABLE IF NOT EXISTS "{table_name}" (\n  {columns_sql}\n)'

    def create_tables(self, table_names: list[str] | None = None) -> None:
        """
        Create tables in the database if they don't exist.

        Args:
            table_names: List of table names to create. If None, creates all tables from schema.
        """
        if not self.schema:
            logger.warning("No schema provided, skipping table creation")
            return

        tables_schema = self.schema.get("properties", {}).get("tables", {}).get("properties", {})

        if table_names is None:
            table_names = list(tables_schema.keys())

        conn = self._get_connection()
        try:
            with conn.cursor() as cursor:
                for table_name in table_names:
                    table_schema = tables_schema.get(table_name)
                    if not table_schema:
                        logger.warning(f"Schema not found for table '{table_name}', skipping")
                        continue

                    create_sql = self._create_table_sql(table_name, table_schema)
                    logger.info(f"Creating table '{table_name}' if not exists")
                    cursor.execute(create_sql)

            conn.commit()
            logger.info(f"Successfully created {len(table_names)} tables")
        except Exception as e:
            conn.rollback()
            logger.error(f"Failed to create tables: {e}")
            raise

    def _is_null_value(self, value: Any) -> bool:
        """
        Check if a value should be treated as NULL.

        Handles various representations of null values:
        - Python None
        - String "null" (case-insensitive)
        - String "None"
        - Empty strings (for non-TEXT columns)
        - String "NULL"
        """
        if value is None:
            return True
        if isinstance(value, str):
            stripped = value.strip().lower()
            if stripped in ("null", "none", ""):
                return True
        return False

    def _serialize_value(self, value: Any, pg_type: str = "TEXT") -> Any:
        """
        Serialize value for PostgreSQL storage.

        Handles proper conversion for all PostgreSQL types including:
        - Date/time types (DATE, TIME, TIMESTAMP)
        - UUID types
        - INET types (IPv4/IPv6)
        - BYTEA (binary)
        - Arrays of all types
        - JSONB
        - Numeric types
        - Booleans
        """
        # Check for null values (including string representations)
        # For TEXT columns, only treat actual None as NULL, not empty strings
        if pg_type.strip().replace(" PRIMARY KEY", "") == "TEXT":
            if value is None:
                return None
        else:
            if self._is_null_value(value):
                return None

        # Extract base type (remove PRIMARY KEY suffix and array suffix)
        base_type = pg_type.replace(" PRIMARY KEY", "").strip()
        is_array = base_type.endswith("[]")

        if is_array:
            array_item_type = base_type[:-2]  # Remove []
            return self._serialize_array(value, array_item_type)

        # Handle specific PostgreSQL types
        if base_type == "UUID":
            return self._serialize_uuid(value)
        elif base_type in ("DATE", "TIME", "TIMESTAMP"):
            return self._serialize_datetime(value, base_type)
        elif base_type == "INET":
            return self._serialize_inet(value)
        elif base_type == "BYTEA":
            return self._serialize_bytea(value)
        elif base_type == "JSONB":
            return self._serialize_jsonb(value)
        elif base_type == "BOOLEAN":
            return self._serialize_boolean(value)
        elif base_type in ("INTEGER", "BIGINT", "SMALLINT"):
            return self._serialize_integer(value)
        elif base_type in ("DOUBLE PRECISION", "REAL") or base_type.startswith("NUMERIC"):
            return self._serialize_numeric(value)
        elif base_type == "TEXT":
            return str(value) if value is not None else None
        else:
            # Default: convert to string for unknown types
            return str(value) if value is not None else None

    def _serialize_array(self, value: Any, item_type: str) -> str | None:
        """
        Serialize array values to JSON string.

        Service code expects JSON arrays, not PostgreSQL native arrays.
        Uses item_type to properly serialize each element (e.g., UUID, TIMESTAMP).
        """
        if self._is_null_value(value):
            return None

        # Already a JSON array string - return as-is
        if isinstance(value, str):
            stripped = value.strip()
            if stripped.startswith('[') and stripped.endswith(']'):
                return stripped
            # Single value - serialize and wrap in array
            serialized = self._serialize_value(stripped, item_type)
            return json.dumps([serialized])

        # Ensure we have a list
        if not isinstance(value, list):
            value = [value]

        # Serialize each item using the appropriate type serializer
        serialized = [self._serialize_value(item, item_type) for item in value]
        return json.dumps(serialized)

    def _serialize_uuid(self, value: Any) -> str | None:
        """Serialize UUID values."""
        if self._is_null_value(value):
            return None
        if isinstance(value, UUID):
            return str(value)
        if isinstance(value, str):
            # Validate UUID format
            try:
                UUID(value)
                return value
            except ValueError:
                logger.warning(f"Invalid UUID format: {value}")
                return value
        return str(value)

    def _serialize_datetime(self, value: Any, dt_type: str) -> str | datetime | date | time | None:
        """Serialize date/time values."""
        if self._is_null_value(value):
            return None

        # If already correct type, return as-is (psycopg2 handles it)
        if dt_type == "TIMESTAMP" and isinstance(value, datetime):
            return value
        if dt_type == "DATE" and isinstance(value, date):
            return value
        if dt_type == "TIME" and isinstance(value, time):
            return value

        # Parse string values
        if isinstance(value, str):
            try:
                if dt_type == "DATE":
                    # Try parsing date
                    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
                    return parsed.date()
                elif dt_type == "TIME":
                    # Try parsing time
                    if "T" in value:
                        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
                        return parsed.time()
                    else:
                        return datetime.strptime(value, "%H:%M:%S").time()
                elif dt_type == "TIMESTAMP":
                    # Try parsing timestamp
                    return datetime.fromisoformat(value.replace("Z", "+00:00"))
            except (ValueError, AttributeError) as e:
                logger.warning(f"Failed to parse {dt_type} value '{value}': {e}")
                return value

        # Convert datetime to appropriate type
        if isinstance(value, datetime):
            if dt_type == "DATE":
                return value.date()
            elif dt_type == "TIME":
                return value.time()
            elif dt_type == "TIMESTAMP":
                return value

        return value

    def _serialize_inet(self, value: Any) -> str | None:
        """Serialize INET (IP address) values."""
        if self._is_null_value(value):
            return None
        if isinstance(value, (IPv4Address, IPv6Address)):
            return str(value)
        if isinstance(value, str):
            # Validate IP address format
            try:
                ip_address(value)
                return value
            except ValueError:
                logger.warning(f"Invalid IP address format: {value}")
                return value
        return str(value)

    def _serialize_bytea(self, value: Any) -> bytes | None:
        """Serialize BYTEA (binary) values."""
        if self._is_null_value(value):
            return None
        if isinstance(value, bytes):
            return value
        if isinstance(value, str):
            # Assume base64 or hex encoded
            try:
                import base64
                return base64.b64decode(value)
            except Exception:
                # Try as UTF-8 encoded string
                return value.encode("utf-8")
        return str(value).encode("utf-8")

    def _serialize_jsonb(self, value: Any) -> Json | None:
        """Serialize JSONB values."""
        if self._is_null_value(value):
            return None

        # If already a dict or list, wrap with psycopg2.extras.Json
        if isinstance(value, (dict, list)):
            return Json(value)

        # If string, validate it's valid JSON
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                return Json(parsed)
            except json.JSONDecodeError as e:
                logger.warning(f"Invalid JSON string for JSONB: {value[:100]}... Error: {e}")
                # Store as JSON string
                return Json(value)

        # For other types, convert to JSON-serializable format
        return Json(value)

    def _serialize_boolean(self, value: Any) -> bool | None:
        """Serialize boolean values."""
        if self._is_null_value(value):
            return None
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            lower_val = value.lower().strip()
            if lower_val in ("true", "t", "yes", "y", "1"):
                return True
            elif lower_val in ("false", "f", "no", "n", "0"):
                return False
        if isinstance(value, (int, float)):
            return bool(value)
        return bool(value)

    def _serialize_integer(self, value: Any) -> int | None:
        """Serialize integer values."""
        if self._is_null_value(value):
            return None
        if isinstance(value, bool):
            # Handle bool before int check (bool is subclass of int in Python)
            return int(value)
        if isinstance(value, int):
            return value
        if isinstance(value, str):
            try:
                return int(value)
            except ValueError:
                logger.warning(f"Cannot convert '{value}' to integer")
                return 0
        try:
            return int(value)
        except (ValueError, TypeError):
            return 0

    def _serialize_numeric(self, value: Any) -> float | Decimal | None:
        """Serialize numeric (float/decimal) values."""
        if self._is_null_value(value):
            return None
        if isinstance(value, (int, float, Decimal)):
            return value
        if isinstance(value, str):
            try:
                # Use Decimal for precision
                return Decimal(value)
            except (ValueError, ArithmeticError):
                logger.warning(f"Cannot convert '{value}' to numeric")
                return Decimal("0")
        try:
            return Decimal(str(value))
        except (ValueError, TypeError, ArithmeticError):
            return Decimal("0")

    def _get_connection(self):
        """Get or create database connection."""
        if self._conn is None or self._conn.closed:
            self._conn = psycopg2.connect(self.connection_string)
        return self._conn

    def _write_table_data(
        self,
        cursor,
        table_name: str,
        records: list[dict[str, Any]],
    ) -> None:
        """
        Write records for a single table.

        Args:
            cursor: Database cursor
            table_name: Name of the table to write to
            records: List of record dictionaries to insert

        Raises:
            ValueError: If schema is not found or records are invalid
        """
        if not records:
            logger.info(f"No records to write for table '{table_name}'")
            return

        tables_schema = self.schema.get("properties", {}).get("tables", {}).get("properties", {})
        table_schema = tables_schema.get(table_name, {})

        if not table_schema:
            raise ValueError(f"Schema for table '{table_name}' not found in schema definition.")

        # Build column type mapping from schema
        col_types = {}
        schema_columns = set()
        for field_name, field_def in table_schema.get("properties", {}).items():
            col_types[field_name] = self._get_postgres_type(field_def, field_name)
            schema_columns.add(field_name)

        # Note: For write_all, deletion is handled separately in reverse order
        # This per-table delete is only for write_table (single table mode)
        if self.overwrite and not getattr(self, '_bulk_delete_done', False):
            logger.info(f"Overwrite enabled: deleting existing data from '{table_name}'")
            cursor.execute(sql.SQL("DELETE FROM {}").format(sql.Identifier(table_name)))

        # Determine columns to insert (use schema columns, not just first record)
        # This ensures all schema-defined columns are considered
        all_record_keys = set()
        for record in records:
            all_record_keys.update(record.keys())

        # Validate that all record keys exist in schema
        extra_keys = all_record_keys - schema_columns
        if extra_keys:
            logger.warning(
                f"Records contain columns not in schema for table '{table_name}': {extra_keys}. "
                "These columns will be ignored."
            )

        # Use columns that exist in both schema and at least one record
        columns = [col for col in schema_columns if any(col in record for record in records)]
        if not columns:
            raise ValueError(f"No valid columns found for table '{table_name}'. Records may be empty or incompatible with schema.")

        logger.info(f"Writing {len(records)} records to table '{table_name}' with {len(columns)} columns")

        # Build INSERT query
        # When not overwriting, use ON CONFLICT DO NOTHING to skip duplicates
        # (e.g., seed data that may already exist in the database)
        if self.overwrite:
            query = sql.SQL("INSERT INTO {table} ({fields}) VALUES ({values})").format(
                table=sql.Identifier(table_name),
                fields=sql.SQL(", ").join(map(sql.Identifier, columns)),
                values=sql.SQL(", ").join(sql.Placeholder() * len(columns))
            )
        else:
            query = sql.SQL("INSERT INTO {table} ({fields}) VALUES ({values}) ON CONFLICT DO NOTHING").format(
                table=sql.Identifier(table_name),
                fields=sql.SQL(", ").join(map(sql.Identifier, columns)),
                values=sql.SQL(", ").join(sql.Placeholder() * len(columns))
            )

        # Serialize values for each record
        values_list = []
        for idx, record in enumerate(records):
            try:
                row_values = []
                for col in columns:
                    value = record.get(col)
                    col_type = col_types.get(col, "TEXT")
                    serialized = self._serialize_value(value, col_type)
                    row_values.append(serialized)
                values_list.append(row_values)
            except Exception as e:
                logger.error(f"Failed to serialize record {idx} for table '{table_name}': {e}")
                logger.error(f"Record data: {record}")
                raise

        # Execute batch insert
        try:
            cursor.executemany(query, values_list)
            logger.info(f"Successfully inserted {len(values_list)} records into '{table_name}'")
        except Exception as e:
            logger.error(f"Failed to insert records into table '{table_name}': {e}")
            raise

    def write_table(
        self,
        table_name: str,
        records: list[dict[str, Any]],
        out_file: str | Path | None = None,
    ) -> Path | None:
        """
        Write a single table to PostgreSQL database.

        Args:
            table_name: Name of the table to write to
            records: List of record dictionaries to insert
            out_file: Ignored (for base class compatibility)

        Returns:
            None (no file is created when writing to database)
        """
        # out_file parameter is unused but required for base class compatibility
        _ = out_file

        # Create table if it doesn't exist
        logger.info(f"Ensuring table '{table_name}' exists before inserting data")
        self.create_tables([table_name])

        conn = self._get_connection()
        try:
            with conn.cursor() as cursor:
                self._write_table_data(cursor, table_name, records)
            conn.commit()
            logger.info(f"Successfully committed data for table '{table_name}'")
        except Exception as e:
            conn.rollback()
            logger.error(f"Transaction rolled back for table '{table_name}': {e}")
            raise

        return None

    def write_all(
        self,
        data: dict[str, list[dict[str, Any]]],
        out_file: str | Path | None = None,
    ) -> list[Path]:
        """
        Write all tables to PostgreSQL database.

        Args:
            data: Dict mapping table names to records.
            out_file: Ignored (for base class compatibility)

        Returns:
            Empty list (no files are created when writing to database)
        """
        # out_file parameter is unused but required for base class compatibility
        _ = out_file

        TABLE_INSERT_ORDER = [
            # Level 0: No FK dependencies
            "users",
            "api_logs",

            # Level 1: Depends on users (with self-references)
            "labels",           # FK: users (owner_id), labels (parent_id - self-ref)
            "threads",          # FK: users (owner_id)
            "email_templates",  # FK: users (owner_id)
            "saved_searches",   # FK: users (owner_id)

            # Level 2: Depends on level 1
            "emails",           # FK: users (sender_id), threads (thread_id), emails (parent_email_id - self-ref)

            # Level 3: Depends on level 2
            "email_recipients", # FK: emails (email_id), users (recipient_id)
            "attachments",      # FK: emails (email_id)
            "thread_labels",    # FK: threads (thread_id), labels (label_id)
        ]

        # Sort tables by insertion order to avoid FK constraint violations
        ordered_tables = []
        for table_name in TABLE_INSERT_ORDER:
            if table_name in data:
                ordered_tables.append(table_name)

        # Add any tables not in the order list (shouldn't happen, but be safe)
        for table_name in data:
            if table_name not in ordered_tables:
                logger.warning(f"Table '{table_name}' not in TABLE_INSERT_ORDER, appending at end")
                ordered_tables.append(table_name)

        # Create tables if they don't exist
        logger.info("Ensuring tables exist before inserting data")
        self.create_tables(ordered_tables)

        conn = self._get_connection()
        try:
            with conn.cursor() as cursor:
                # Delete in REVERSE order to respect FK constraints (children before parents)
                if self.overwrite:
                    self._bulk_delete_done = True
                    for table_name in reversed(ordered_tables):
                        logger.info(f"Overwrite enabled: deleting existing data from '{table_name}'")
                        cursor.execute(sql.SQL("DELETE FROM {}").format(sql.Identifier(table_name)))

                # Insert in forward order (parents before children)
                for table_name in ordered_tables:
                    records = data[table_name]
                    if records:
                        self._write_table_data(cursor, table_name, records)

            conn.commit()
            logger.info("Successfully committed all tables to database")
        except Exception as e:
            conn.rollback()
            logger.error(f"Transaction rolled back: {e}")
            raise
        finally:
            self._bulk_delete_done = False

        return []

    def close(self) -> None:
        """Close database connection."""
        if self._conn:
            self._conn.close()
            self._conn = None

    def get_existing_counts(self, table_names: list[str] | None = None) -> dict[str, int]:
        """
        Query the database to get existing row counts for tables.

        Args:
            table_names: List of table names to query. If None, queries all tables in schema.

        Returns:
            Dict mapping table names to their current row counts.
        """
        if table_names is None:
            tables_schema = self.schema.get("properties", {}).get("tables", {}).get("properties", {})
            table_names = list(tables_schema.keys())

        counts = {}
        conn = self._get_connection()

        with conn.cursor() as cursor:
            for table_name in table_names:
                try:
                    cursor.execute(
                        sql.SQL("SELECT COUNT(*) FROM {}").format(sql.Identifier(table_name))
                    )
                    result = cursor.fetchone()
                    counts[table_name] = result[0] if result else 0
                except Exception as e:
                    logger.warning(f"Could not get count for table '{table_name}': {e}")
                    counts[table_name] = 0

        return counts

    def get_existing_ids(self, table_names: list[str] | None = None) -> dict[str, list]:
        """
        Query existing IDs from tables for FK resolution.

        Args:
            table_names: List of table names to query. If None, queries tables with 'id' column.

        Returns:
            Dict mapping table names to list of existing IDs.
        """
        if table_names is None:
            # Only query tables that have an 'id' column (skip junction tables)
            tables_schema = self.schema.get("properties", {}).get("tables", {}).get("properties", {})
            table_names = [
                name for name, schema in tables_schema.items()
                if "id" in schema.get("properties", {})
            ]

        existing_ids = {}
        conn = self._get_connection()

        for table_name in table_names:
            try:
                with conn.cursor() as cursor:
                    cursor.execute(
                        sql.SQL("SELECT id FROM {}").format(sql.Identifier(table_name))
                    )
                    rows = cursor.fetchall()
                    existing_ids[table_name] = [row[0] for row in rows]
            except Exception as e:
                conn.rollback()  # Reset transaction to continue with other tables
                logger.warning(f"Could not get IDs for table '{table_name}': {e}")
                existing_ids[table_name] = []

        return existing_ids