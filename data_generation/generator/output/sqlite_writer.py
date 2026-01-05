"""SQLite output writer."""

import json
import os
import shutil
import sqlite3
import tempfile
from pathlib import Path
from typing import Any

from .base import OutputWriter


class SqliteWriter(OutputWriter):
    """Writes data to SQLite database."""

    @property
    def extension(self) -> str:
        return ".db"

    def __init__(
        self,
        output_dir: str | Path | None = None,
        prefix: str = "",
        overwrite: bool = False,
        schema: dict[str, Any] | None = None,
        use_db: str | Path | None = None,
    ):
        """
        Initialize SQLite writer.

        Args:
            output_dir: Directory for output files.
            prefix: Prefix for generated file names.
            overwrite: If True, overwrite existing files.
            schema: Schema dict for table definitions.
            use_db: Path to existing database to append to.
        """
        super().__init__(output_dir, prefix, overwrite)
        self.schema = schema or {}
        self.use_db = Path(use_db) if use_db else None
        self._conn: sqlite3.Connection | None = None
        self._db_path: Path | None = None
        self._temp_path: Path | None = None
        self._original_path: Path | None = None
        self._success: bool = False

    def _get_sqlite_type(self, json_type: str | list, field_name: str) -> str:
        """Map JSON schema type to SQLite type."""
        if isinstance(json_type, list):
            for t in json_type:
                if t != "null":
                    json_type = t
                    break
            else:
                json_type = "string"

        type_map = {
            "integer": "INTEGER",
            "number": "REAL",
            "boolean": "INTEGER",
            "string": "TEXT",
            "array": "TEXT",
            "object": "TEXT",
        }

        if field_name == "id":
            return "INTEGER PRIMARY KEY" if json_type == "integer" else "TEXT PRIMARY KEY"

        return type_map.get(json_type, "TEXT")

    def _create_table(self, table_name: str, table_schema: dict[str, Any]) -> str:
        """Generate CREATE TABLE statement from schema."""
        properties = table_schema.get("properties", {})
        columns = []

        for field_name, field_def in properties.items():
            field_type = field_def.get("type", "string")
            sqlite_type = self._get_sqlite_type(field_type, field_name)
            columns.append(f'"{field_name}" {sqlite_type}')

        columns_sql = ",\n  ".join(columns)
        return f'CREATE TABLE IF NOT EXISTS "{table_name}" (\n  {columns_sql}\n)'

    def _serialize_value(self, value: Any) -> Any:
        """Serialize value for SQLite storage."""
        if value is None:
            return None
        if isinstance(value, bool):
            return 1 if value else 0
        if isinstance(value, (list, dict)):
            return json.dumps(value)
        return value

    def _get_connection(self, db_path: Path) -> sqlite3.Connection:
        """Get or create database connection."""
        if self._conn is None or self._db_path != db_path:
            if self._conn:
                self._conn.close()
            self._conn = sqlite3.connect(db_path)
            self._db_path = db_path
        return self._conn

    def _prepare_db_path(self, out_file: str | Path | None = None) -> Path:
        """
        Prepare the database path, handling existing db copy if needed.

        Returns the path to write to (temp file if using existing db).
        """
        # Determine final destination path
        if self.use_db:
            # Using existing database
            if not self.use_db.exists():
                raise FileNotFoundError(f"Database not found: {self.use_db}")
            self._original_path = self.use_db

            # Create temp copy in same directory (for atomic replace)
            temp_fd, temp_path = tempfile.mkstemp(
                suffix=".db",
                prefix=".tmp_",
                dir=self.use_db.parent
            )
            os.close(temp_fd)
            self._temp_path = Path(temp_path)

            # Copy existing db to temp
            shutil.copy2(self.use_db, self._temp_path)
            return self._temp_path

        elif out_file:
            file_path = Path(out_file)
            self.check_file_exists(file_path)
            self.ensure_parent_dir(file_path)
            return file_path

        else:
            if not self.output_dir:
                raise ValueError("output_dir required when out_file not specified")
            file_path = self.output_dir / f"{self.prefix}data.db"
            self.check_file_exists(file_path)
            self.ensure_parent_dir(file_path)
            return file_path

    def _write_table_data(
        self,
        cursor: sqlite3.Cursor,
        table_name: str,
        records: list[dict[str, Any]],
    ) -> None:
        """Write records for a single table."""
        if not records:
            return

        tables_schema = self.schema.get("properties", {}).get("tables", {}).get("properties", {})
        table_schema = tables_schema.get(table_name, {})

        # Create table if it doesn't exist
        if table_schema:
            create_sql = self._create_table(table_name, table_schema)
            cursor.execute(create_sql)
        else:
            # Infer schema from first record
            columns = []
            for key, value in records[0].items():
                if key == "id":
                    if isinstance(value, int):
                        columns.append(f'"{key}" INTEGER PRIMARY KEY')
                    else:
                        columns.append(f'"{key}" TEXT PRIMARY KEY')
                elif isinstance(value, int):
                    columns.append(f'"{key}" INTEGER')
                elif isinstance(value, float):
                    columns.append(f'"{key}" REAL')
                else:
                    columns.append(f'"{key}" TEXT')
            create_sql = f'CREATE TABLE IF NOT EXISTS "{table_name}" ({", ".join(columns)})'
            cursor.execute(create_sql)

        # Insert records
        columns = list(records[0].keys())
        placeholders = ", ".join(["?" for _ in columns])
        columns_sql = ", ".join([f'"{c}"' for c in columns])
        insert_sql = f'INSERT INTO "{table_name}" ({columns_sql}) VALUES ({placeholders})'

        for record in records:
            values = [self._serialize_value(record.get(col)) for col in columns]
            cursor.execute(insert_sql, values)

    def write_table(
        self,
        table_name: str,
        records: list[dict[str, Any]],
        out_file: str | Path | None = None,
    ) -> Path:
        """Write a single table to SQLite database."""
        db_path = self._prepare_db_path(out_file)

        try:
            conn = self._get_connection(db_path)
            cursor = conn.cursor()
            self._write_table_data(cursor, table_name, records)
            conn.commit()
            self._success = True
        except Exception:
            self._success = False
            raise

        return self._original_path if self._original_path else db_path

    def write_all(
        self,
        data: dict[str, list[dict[str, Any]]],
        out_file: str | Path | None = None,
    ) -> list[Path]:
        """
        Write all tables to a single SQLite database.

        Args:
            data: Dict mapping table names to records.
            out_file: Optional explicit output file path.

        Returns:
            List containing the single database path.
        """
        db_path = self._prepare_db_path(out_file)

        try:
            conn = self._get_connection(db_path)
            cursor = conn.cursor()

            for table_name, records in data.items():
                if records:
                    self._write_table_data(cursor, table_name, records)

            conn.commit()
            self._success = True
        except Exception:
            self._success = False
            raise

        return [self._original_path if self._original_path else db_path]

    def close(self) -> None:
        """
        Close database connection and finalize writes.

        If using existing db, replaces original with temp copy on success.
        """
        if self._conn:
            self._conn.close()
            self._conn = None
            self._db_path = None

        # Handle atomic replace for existing db
        if self._temp_path and self._original_path:
            if self._success:
                # Replace original with temp (atomic on same filesystem)
                shutil.move(str(self._temp_path), str(self._original_path))
            else:
                # Clean up temp file on failure
                try:
                    self._temp_path.unlink()
                except OSError:
                    pass

        self._temp_path = None
        self._original_path = None
        self._success = False
