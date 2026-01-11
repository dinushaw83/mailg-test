"""Data import functionality for inserting records into PostgreSQL database.

Handles JSON, CSV, and ZIP file imports with schema validation and
dependency-ordered insertion.
"""

import json
import csv
import io
import zipfile
import logging
from datetime import date, datetime, time
from decimal import Decimal
from pathlib import Path
from typing import Any
from uuid import UUID

import psycopg2
from psycopg2 import sql
from psycopg2.extras import Json

from .schema_utils import (
    validate_table_data,
    get_table_dependency_order,
    normalize_table_name,
    get_table_info,
    TABLE_SCHEMAS,
    RELATIONSHIPS,
)

logger = logging.getLogger(__name__)


def _build_column_enum_map() -> dict[tuple[str, str], type]:
    """
    Build mapping of (table_name, column_name) -> enum class by introspecting SQLAlchemy models.

    Returns dict like {("users", "role"): UserRole, ("tickets", "status"): TicketStatus, ...}
    """
    from sqlalchemy import Enum as SQLAlchemyEnum
    from app.db.base import Base
    from app import models  # Ensures all models are loaded

    column_enum_map = {}

    for mapper in Base.registry.mappers:
        table_name = mapper.local_table.name
        for column in mapper.local_table.columns:
            # Check if column type is an Enum
            if isinstance(column.type, SQLAlchemyEnum) and column.type.enum_class is not None:
                column_enum_map[(table_name, column.name)] = column.type.enum_class

    return column_enum_map


# Build the map once at module load
COLUMN_ENUM_MAP = _build_column_enum_map()


def _convert_enum_value(table_name: str, column_name: str, value: Any) -> Any:
    """
    Convert enum value from JSON (e.g., "admin") to PostgreSQL enum name (e.g., "ADMIN").

    Uses Python enum definitions to map value -> name.
    """
    if value is None:
        return None

    enum_class = COLUMN_ENUM_MAP.get((table_name, column_name))
    if not enum_class:
        return value

    str_value = str(value).lower()

    # Find the enum member with matching value
    for member in enum_class:
        if member.value.lower() == str_value:
            return member.name  # Return the NAME (e.g., "ADMIN")

    # If no match, return original value
    return value


class DataImporter:
    """Handles importing data into PostgreSQL database."""

    def __init__(self, connection: str | dict):
        """
        Initialize importer with PostgreSQL connection.

        Args:
            connection: Either a connection string (DSN) or dict of connection params
        """
        self.connection = connection
        self.conn = None

    def __enter__(self):
        """Context manager entry - open database connection."""
        if isinstance(self.connection, dict):
            self.conn = psycopg2.connect(**self.connection)
        else:
            self.conn = psycopg2.connect(self.connection)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - close database connection."""
        if self.conn:
            if exc_type is None:
                self.conn.commit()
            else:
                self.conn.rollback()
            self.conn.close()

    def _coerce_json_fields(
            self, table_name: str, records: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        """
        Parse JSON strings for object/array fields before validation.

        For JSON/JSONB columns, we need to ensure values are Python objects
        (dict or list) for validation. String values that contain JSON are parsed.
        Dict/list values are kept as-is (they'll be serialized to JSONB later).

        Args:
            table_name: Name of the table
            records: List of record dictionaries

        Returns:
            Records with JSON strings parsed into objects/arrays
        """
        table_schema = TABLE_SCHEMAS.get(table_name, {})
        properties = table_schema.get("properties", {})

        # Find fields that expect object or array types (JSON columns)
        json_fields = set()
        for field_name, field_def in properties.items():
            field_type = field_def.get("type", "string")
            if field_type in ("object", "array"):
                json_fields.add(field_name)
            elif isinstance(field_type, list) and any(t in ("object", "array") for t in field_type):
                json_fields.add(field_name)

        if not json_fields:
            return records

        coerced = []
        for record in records:
            new_record = dict(record)
            for field_name in json_fields:
                if field_name not in new_record:
                    continue
                value = new_record[field_name]

                # Only parse strings - dict/list values are already in the right format
                if isinstance(value, str):
                    try:
                        new_record[field_name] = json.loads(value)
                    except (json.JSONDecodeError, TypeError):
                        # Keep as string if not valid JSON
                        pass
                # dict/list values are kept as-is for validation
                # _serialize_value will handle JSONB conversion later

            coerced.append(new_record)

        return coerced

    def import_table_data(
            self,
            table_name: str,
            records: list[dict[str, Any]],
            continue_on_errors: bool = False,
            ignore_duplicates: bool = True,
    ) -> dict[str, Any]:
        """
        Import records into a table.

        Args:
            table_name: Name of target table
            records: List of record dictionaries
            continue_on_errors: continue with valid rows
            ignore_duplicates: If True, skip duplicates. If False, fail on duplicates.

        Returns:
            Dictionary with import results

        Raises:
            ValueError: If validation fails or import errors occur
        """
        if not records:
            return {
                "table": table_name,
                "records_imported": 0,
                "status": "success",
                "message": "No records to import",
            }

        # Pre-process records to parse JSON strings for object/array fields
        records = self._coerce_json_fields(table_name, records)

        # Validate data against schema
        # validate_table_data returns (sanitized, error_type, errors)
        # where error_type is "" for success or "pii" for PII violations
        sanitized, error_type, errors = validate_table_data(
            table_name, records, continue_on_errors
        )

        # Check if there are actual validation errors (not empty error lists)
        has_errors = any(
            any(err_list for err_list in field_errors.values() if isinstance(err_list, list))
            for _, field_errors in errors
        )

        if error_type or has_errors:
            # Format error tuples into readable strings
            error_messages = []

            if error_type == "pii":
                error_messages.append(
                    "PII (Personally Identifiable Information) detected and blocked"
                )

            for row_idx, field_errors in errors[:10]:
                for field, errs in field_errors.items():
                    if isinstance(errs, list) and errs:
                        for err in errs:
                            error_messages.append(f"Row {row_idx + 1}, Field '{field}': {err}")
                    elif isinstance(errs, str) and errs:
                        error_messages.append(f"Row {row_idx + 1}, Field '{field}': {errs}")

            if not error_messages:
                error_messages.append("Unknown validation error occurred")

            error_msg = f"Validation failed for table '{table_name}':\n" + "\n".join(
                error_messages
            )
            if len(errors) > 10:
                error_msg += f"\n... and {len(errors) - 10} more errors"
            if not continue_on_errors:
                raise ValueError(error_msg)

        records = sanitized

        # Get table schema info
        table_info = get_table_info(table_name)
        if not table_info:
            raise ValueError(f"Unknown table: {table_name}")

        # Check if table exists in database
        with self.conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = %s
                )
                """,
                (table_name,),
            )
            if not cursor.fetchone()[0]:
                raise ValueError(f"Table '{table_name}' does not exist in database")

        # Get schema for type mapping
        table_schema = TABLE_SCHEMAS.get(table_name, {})
        properties = table_schema.get("properties", {})

        # Build column type mapping
        col_types = {}
        for field_name, field_def in properties.items():
            col_types[field_name] = self._get_postgres_type(field_def)

        # Perform batch insert
        records_imported = self._insert_records(table_name, records, col_types, ignore_duplicates=ignore_duplicates)

        logger.info(f"Imported {records_imported} records into {table_name}")

        return {
            "table": table_name,
            "records_imported": records_imported,
            "errors": errors,
            "status": "success",
        }

    def _get_postgres_type(self, field_def: dict[str, Any]) -> str:
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
            if fmt == "date-time":
                return "TIMESTAMP"
            elif fmt == "date":
                return "DATE"
            elif fmt == "time":
                return "TIME"
            elif fmt == "uuid":
                return "UUID"
            elif fmt in ("ipv4", "ipv6"):
                return "INET"
            return "TEXT"

        if json_type == "integer":
            return "BIGINT"
        elif json_type == "number":
            return "DOUBLE PRECISION"
        elif json_type == "boolean":
            return "BOOLEAN"
        elif json_type == "object":
            return "JSONB"
        elif json_type == "array":
            items = field_def.get("items", {})
            item_type = items.get("type", "string")
            item_format = items.get("format")

            if item_type == "integer":
                return "BIGINT[]"
            elif item_type == "string":
                if item_format == "uuid":
                    return "UUID[]"
                elif item_format == "date-time":
                    return "TIMESTAMP[]"
                return "TEXT[]"
            return "JSONB"

        return "TEXT"

    def _serialize_value(self, value: Any, pg_type: str) -> Any:
        """Serialize value for PostgreSQL storage."""
        if value is None:
            return None

        # Handle null string representations
        if isinstance(value, str) and value.strip().lower() in ("null", "none", ""):
            if pg_type != "TEXT":
                return None

        base_type = pg_type.replace(" PRIMARY KEY", "").strip()
        is_array = base_type.endswith("[]")

        if is_array:
            return self._serialize_array(value, base_type[:-2])

        if base_type == "UUID":
            if isinstance(value, UUID):
                return str(value)
            return value

        if base_type in ("DATE", "TIME", "TIMESTAMP"):
            return self._serialize_datetime(value, base_type)

        if base_type == "JSONB":
            if isinstance(value, (dict, list)):
                return Json(value)
            if isinstance(value, str):
                try:
                    return Json(json.loads(value))
                except json.JSONDecodeError:
                    return Json(value)
            return Json(value)

        if base_type == "BOOLEAN":
            if isinstance(value, bool):
                return value
            if isinstance(value, str):
                return value.lower().strip() in ("true", "t", "yes", "y", "1")
            return bool(value)

        if base_type in ("INTEGER", "BIGINT", "SMALLINT"):
            if isinstance(value, bool):
                return int(value)
            if isinstance(value, int):
                return value
            try:
                return int(value)
            except (ValueError, TypeError):
                return 0

        if base_type in ("DOUBLE PRECISION", "REAL") or base_type.startswith("NUMERIC"):
            if isinstance(value, (int, float, Decimal)):
                return value
            try:
                return Decimal(str(value))
            except (ValueError, TypeError):
                return Decimal("0")

        return str(value) if value is not None else None

    def _serialize_array(self, value: Any, item_type: str) -> str | None:
        """Serialize array values to JSON string."""
        if value is None:
            return None

        if isinstance(value, str):
            stripped = value.strip()
            if stripped.startswith("[") and stripped.endswith("]"):
                return stripped
            serialized = self._serialize_value(stripped, item_type)
            return json.dumps([serialized])

        if not isinstance(value, list):
            value = [value]

        serialized = [self._serialize_value(item, item_type) for item in value]
        return json.dumps(serialized)

    def _serialize_datetime(
            self, value: Any, dt_type: str
    ) -> str | datetime | date | time | None:
        """Serialize date/time values."""
        if value is None:
            return None

        if dt_type == "TIMESTAMP" and isinstance(value, datetime):
            return value
        if dt_type == "DATE" and isinstance(value, date):
            return value
        if dt_type == "TIME" and isinstance(value, time):
            return value

        # Handle numeric timestamps (epoch time)
        if isinstance(value, (int, float)):
            try:
                # If value is too large, it's likely milliseconds
                if value > 10000000000:
                    value = value / 1000
                parsed = datetime.fromtimestamp(value)
                if dt_type == "DATE":
                    return parsed.date()
                elif dt_type == "TIME":
                    return parsed.time()
                return parsed
            except (ValueError, OSError) as e:
                logger.warning(f"Failed to parse epoch timestamp '{value}': {e}")
                return None

        if isinstance(value, str):
            # Try to parse as numeric string first
            try:
                numeric_val = float(value)
                if numeric_val > 10000000000:
                    numeric_val = numeric_val / 1000
                parsed = datetime.fromtimestamp(numeric_val)
                if dt_type == "DATE":
                    return parsed.date()
                elif dt_type == "TIME":
                    return parsed.time()
                return parsed
            except (ValueError, OSError):
                pass

            # Try ISO format
            try:
                if dt_type == "DATE":
                    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
                    return parsed.date()
                elif dt_type == "TIME":
                    if "T" in value:
                        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
                        return parsed.time()
                    return datetime.strptime(value, "%H:%M:%S").time()
                elif dt_type == "TIMESTAMP":
                    return datetime.fromisoformat(value.replace("Z", "+00:00"))
            except (ValueError, AttributeError) as e:
                logger.warning(f"Failed to parse {dt_type} value '{value}': {e}")
                return None

        return None

    def _insert_records(
            self,
            table_name: str,
            records: list[dict[str, Any]],
            col_types: dict[str, str],
            ignore_duplicates: bool = True,
    ) -> int:
        """
        Insert records into table using batch insert.

        Args:
            table_name: Name of target table
            records: List of record dictionaries
            col_types: Mapping of column names to PostgreSQL types
            ignore_duplicates: If True, skip duplicates (ON CONFLICT DO NOTHING).
                              If False, fail on duplicates.

        Returns:
            Number of records inserted
        """
        if not records:
            return 0

        # Get columns from first record
        columns = [col for col in records[0].keys() if col in col_types]

        # Build INSERT query - with or without conflict handling
        if ignore_duplicates:
            query = sql.SQL(
                "INSERT INTO {table} ({fields}) VALUES ({values}) ON CONFLICT DO NOTHING"
            ).format(
                table=sql.Identifier(table_name),
                fields=sql.SQL(", ").join(map(sql.Identifier, columns)),
                values=sql.SQL(", ").join(sql.Placeholder() * len(columns)),
            )
        else:
            query = sql.SQL(
                "INSERT INTO {table} ({fields}) VALUES ({values})"
            ).format(
                table=sql.Identifier(table_name),
                fields=sql.SQL(", ").join(map(sql.Identifier, columns)),
                values=sql.SQL(", ").join(sql.Placeholder() * len(columns)),
            )

        # Serialize all values
        values_list = []
        for record in records:
            row_values = []
            for col in columns:
                value = record.get(col)
                col_type = col_types.get(col, "TEXT")
                serialized = self._serialize_value(value, col_type)

                # Convert enum values to match PostgreSQL enum labels (value -> NAME)
                serialized = _convert_enum_value(table_name, col, serialized)

                row_values.append(serialized)
            values_list.append(row_values)

        # Execute batch insert
        with self.conn.cursor() as cursor:
            cursor.executemany(query, values_list)

        return len(values_list)

    def import_json_data(self, table_name: str, json_content: str, ignore_duplicates: bool = True) -> dict[str, Any]:
        """
        Import JSON data into table.

        Args:
            table_name: Target table name
            json_content: JSON string (array of objects or single object)
            ignore_duplicates: If True, skip duplicates. If False, fail on duplicates.

        Returns:
            Import results dictionary

        Raises:
            ValueError: If JSON is invalid or import fails
        """
        try:
            data = json.loads(json_content)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON format: {str(e)}")

        # Convert single object to array
        if isinstance(data, dict):
            records = [data]
        elif isinstance(data, list):
            records = data
        else:
            raise ValueError("JSON must be an array of objects or a single object")

        return self.import_table_data(table_name, records, ignore_duplicates=ignore_duplicates)

    def import_csv_data(self, table_name: str, csv_content: str, ignore_duplicates: bool = True) -> dict[str, Any]:
        """
        Import CSV data into table.

        First row must contain column names.

        Args:
            table_name: Target table name
            csv_content: CSV string
            ignore_duplicates: If True, skip duplicates. If False, fail on duplicates.

        Returns:
            Import results dictionary

        Raises:
            ValueError: If CSV is invalid or import fails
        """
        try:
            reader = csv.DictReader(io.StringIO(csv_content))
            records = list(reader)
        except csv.Error as e:
            raise ValueError(f"Invalid CSV format: {str(e)}")

        if not records:
            raise ValueError("CSV file is empty or has no data rows")

        # Convert numeric and boolean strings to proper types based on schema
        table_info = get_table_info(table_name)
        if table_info:
            records = self._convert_csv_types(records, table_info)

        return self.import_table_data(table_name, records, ignore_duplicates=ignore_duplicates)

    def _convert_csv_types(
            self, records: list[dict[str, Any]], table_info: dict[str, Any]
    ) -> list[dict[str, Any]]:
        """
        Convert CSV string values to proper types based on schema.

        Args:
            records: List of record dictionaries with string values
            table_info: Table schema information

        Returns:
            List of records with converted types
        """
        fields = table_info.get("fields", {})
        converted_records = []

        for record in records:
            converted = {}
            for col_name, col_value in record.items():
                if col_name not in fields:
                    converted[col_name] = col_value
                    continue

                field_info = fields[col_name]
                field_type = field_info.get("type")

                # Handle empty strings as None for nullable fields
                if col_value == "" and field_info.get("nullable"):
                    converted[col_name] = None
                    continue

                # Type conversion
                if field_type == "integer":
                    try:
                        converted[col_name] = int(col_value)
                    except (ValueError, TypeError):
                        converted[col_name] = col_value
                elif field_type == "boolean":
                    if col_value.lower() in ("true", "1", "yes", "y"):
                        converted[col_name] = True
                    elif col_value.lower() in ("false", "0", "no", "n"):
                        converted[col_name] = False
                    else:
                        converted[col_name] = col_value
                elif field_type == "array":
                    try:
                        parsed = json.loads(col_value)
                        if isinstance(parsed, list):
                            converted[col_name] = parsed
                        else:
                            converted[col_name] = col_value
                    except (json.JSONDecodeError, TypeError):
                        converted[col_name] = col_value
                elif field_type == "object":
                    try:
                        parsed = json.loads(col_value)
                        if isinstance(parsed, dict):
                            converted[col_name] = parsed
                        else:
                            converted[col_name] = col_value
                    except (json.JSONDecodeError, TypeError):
                        converted[col_name] = col_value
                else:
                    converted[col_name] = col_value

            converted_records.append(converted)

        return converted_records

    def import_zip_data(
            self,
            zip_content: bytes,
            on_table_start=None,
            on_table_complete=None,
            ignore_duplicates: bool = True,
    ) -> dict[str, Any]:
        """
        Import data from ZIP file containing multiple JSON/CSV files.

        Files are imported in dependency order based on table relationships.
        Each file should be named after its table (e.g., users.json, tickets.csv).

        Args:
            zip_content: ZIP file bytes
            on_table_start: Optional callback(table_name) called when table import starts
            on_table_complete: Optional callback(table_name, result) called when table import completes
            ignore_duplicates: If True, skip duplicates. If False, fail on duplicates.

        Returns:
            Import results dictionary with per-table results

        Raises:
            ValueError: If ZIP is invalid or import fails
        """
        try:
            with zipfile.ZipFile(io.BytesIO(zip_content)) as zip_file:
                # Extract all data files
                file_list = zip_file.namelist()

                # Filter out directories and hidden files
                data_files = [
                    f for f in file_list
                    if not f.endswith('/') and not Path(f).name.startswith('.')
                ]

                if not data_files:
                    raise ValueError("ZIP file contains no valid data files")

                # Parse files and organize by table
                table_data = {}

                for filename in data_files:
                    file_content = zip_file.read(filename)
                    table_name = normalize_table_name(filename)

                    # Determine file type
                    if filename.lower().endswith('.json'):
                        try:
                            data = json.loads(file_content.decode('utf-8'))
                            # Convert single object to array
                            if isinstance(data, dict):
                                records = [data]
                            elif isinstance(data, list):
                                records = data
                            else:
                                logger.warning(f"Skipping {filename}: JSON must be array or object")
                                continue
                        except (json.JSONDecodeError, UnicodeDecodeError) as e:
                            logger.warning(f"Skipping {filename}: Invalid JSON - {e}")
                            continue

                    elif filename.lower().endswith('.csv'):
                        try:
                            csv_content = file_content.decode('utf-8')
                            reader = csv.DictReader(io.StringIO(csv_content))
                            records = list(reader)

                            if not records:
                                logger.warning(f"Skipping {filename}: No data rows")
                                continue

                            # Convert CSV types
                            table_info = get_table_info(table_name)
                            if table_info:
                                records = self._convert_csv_types(records, table_info)

                        except (csv.Error, UnicodeDecodeError) as e:
                            logger.warning(f"Skipping {filename}: Invalid CSV - {e}")
                            continue
                    else:
                        logger.warning(f"Skipping {filename}: Unsupported file type")
                        continue

                    table_data[table_name] = records
                    logger.info(f"Parsed {filename}: {len(records)} records for table '{table_name}'")

                if not table_data:
                    raise ValueError("No valid data files found in ZIP")

                # Get dependency order
                all_tables_ordered = get_table_dependency_order()

                # Filter to only tables we have data for, in dependency order
                tables_to_import = [t for t in all_tables_ordered if t in table_data]

                logger.info(f"Importing {len(tables_to_import)} tables in order: {tables_to_import}")

                # Import in dependency order
                results = {
                    "tables_imported": 0,
                    "total_records": 0,
                    "table_results": {}
                }

                for table_name in tables_to_import:
                    records = table_data[table_name]
                    try:
                        # Notify start of table import
                        if on_table_start:
                            on_table_start(table_name)

                        result = self.import_table_data(table_name, records, ignore_duplicates=ignore_duplicates)
                        results["tables_imported"] += 1
                        results["total_records"] += result["records_imported"]
                        results["table_results"][table_name] = result

                        # Notify completion of table import
                        if on_table_complete:
                            on_table_complete(table_name, result)
                    except Exception as e:
                        # On failure, include partial results
                        error_result = {
                            "table": table_name,
                            "status": "failed",
                            "error": str(e)
                        }
                        results["table_results"][table_name] = error_result

                        # Notify completion even on failure
                        if on_table_complete:
                            on_table_complete(table_name, error_result)

                        raise ValueError(
                            f"Failed to import table '{table_name}': {str(e)}\n"
                            f"Successfully imported {results['tables_imported']} tables before failure."
                        )

                return results

        except zipfile.BadZipFile:
            raise ValueError("Invalid ZIP file format")
