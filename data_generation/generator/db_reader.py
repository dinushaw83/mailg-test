"""
Database reader for querying existing data.

This module provides a DatabaseReader class that can query existing data
from a PostgreSQL database for FK resolution, independent of the output format.
"""

import logging
from typing import Any

try:
    import psycopg2
    from psycopg2 import sql
except ImportError:
    psycopg2 = None

logger = logging.getLogger(__name__)


class DatabaseReader:
    """
    Reads existing data from a PostgreSQL database for FK resolution.

    This class is used when generating data in any output format (JSON, CSV, SQLite, etc.)
    but needing to reference existing data from a PostgreSQL database.
    """

    def __init__(self, connection_string: str, schema: dict[str, Any] | None = None):
        """
        Initialize DatabaseReader.

        Args:
            connection_string: PostgreSQL connection string (DSN).
            schema: Schema dict for table definitions (used to identify tables with 'id' column).
        """
        if psycopg2 is None:
            raise ImportError(
                "psycopg2 library is required for DatabaseReader. "
                "Install it with: pip install psycopg2-binary"
            )

        self.connection_string = connection_string
        self.schema = schema or {}
        self._conn = None

    def _get_connection(self):
        """Get or create database connection."""
        if self._conn is None or self._conn.closed:
            self._conn = psycopg2.connect(self.connection_string)
        return self._conn

    def close(self):
        """Close database connection."""
        if self._conn is not None and not self._conn.closed:
            self._conn.close()
            self._conn = None

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

    def get_existing_ids_with_attrs(
        self,
        attr_config: dict[str, list[str]],
        table_names: list[str] | None = None,
    ) -> dict[str, list[dict]]:
        """
        Query existing IDs with their attributes from tables for FK resolution.

        This is needed for contextual FK constraints where we need to filter
        referenced entities by attribute values (e.g., boards by project_id).

        Args:
            attr_config: Dict mapping table names to list of attribute columns to fetch.
                        e.g., {"boards": ["project_id"], "sprints": ["project_id"]}
            table_names: List of table names to query. If None, queries all tables in attr_config.

        Returns:
            Dict mapping table names to list of dicts with 'id' and attribute values.
            e.g., {"boards": [{"id": 1, "project_id": 1}, {"id": 2, "project_id": 1}]}
        """
        if table_names is None:
            table_names = list(attr_config.keys())

        existing_data = {}
        conn = self._get_connection()

        for table_name in table_names:
            attrs = attr_config.get(table_name, [])
            if not attrs:
                continue

            try:
                # Build column list: id + attributes
                columns = ["id"] + attrs
                column_sql = sql.SQL(", ").join(sql.Identifier(c) for c in columns)

                with conn.cursor() as cursor:
                    cursor.execute(
                        sql.SQL("SELECT {} FROM {}").format(
                            column_sql,
                            sql.Identifier(table_name)
                        )
                    )
                    rows = cursor.fetchall()

                    # Convert to list of dicts
                    existing_data[table_name] = [
                        {col: row[i] for i, col in enumerate(columns)}
                        for row in rows
                    ]
            except Exception as e:
                conn.rollback()
                logger.warning(f"Could not get IDs with attrs for table '{table_name}': {e}")
                existing_data[table_name] = []

        return existing_data

    def get_derived_ids_with_attrs(
        self,
        derived_config: dict[str, dict[str, dict]],
    ) -> dict[str, list[dict]]:
        """
        Query existing IDs with derived attributes from tables using JOINs.

        This handles cases where an attribute needs to be resolved through
        another table (e.g., sprints.project_id via boards).

        Args:
            derived_config: Dict mapping table names to derived attribute specs.
                e.g., {
                    "sprints": {
                        "project_id": {
                            "via": "board_id",
                            "from_table": "boards",
                            "source_field": "project_id"
                        }
                    }
                }

        Returns:
            Dict mapping table names to list of dicts with 'id' and derived attribute values.
            e.g., {"sprints": [{"id": 1, "project_id": 1}, {"id": 2, "project_id": 1}]}
        """
        existing_data = {}
        conn = self._get_connection()

        for table_name, attr_specs in derived_config.items():
            try:
                # Build the SELECT clause and JOINs
                # SELECT t.id, j1.source_field AS attr_name, ...
                select_parts = ["t.id"]
                join_parts = []
                join_idx = 0

                for attr_name, spec in attr_specs.items():
                    via_field = spec.get("via")
                    from_table = spec.get("from_table")
                    source_field = spec.get("source_field")

                    if not all([via_field, from_table, source_field]):
                        logger.warning(
                            f"Incomplete derived attribute spec for {table_name}.{attr_name}"
                        )
                        continue

                    join_alias = f"j{join_idx}"
                    # SELECT j0.project_id AS project_id
                    select_parts.append(
                        f"{join_alias}.{source_field} AS {attr_name}"
                    )
                    # LEFT JOIN boards j0 ON t.board_id = j0.id
                    join_parts.append(
                        f"LEFT JOIN {from_table} {join_alias} ON t.{via_field} = {join_alias}.id"
                    )
                    join_idx += 1

                if len(select_parts) == 1:
                    # No valid derived attributes, skip table
                    continue

                select_clause = ", ".join(select_parts)
                join_clause = " ".join(join_parts)

                query = f"SELECT {select_clause} FROM {table_name} t {join_clause}"

                with conn.cursor() as cursor:
                    cursor.execute(query)
                    rows = cursor.fetchall()

                    # Build column names from select parts
                    # First is always 'id', rest are the attr_names
                    columns = ["id"] + list(attr_specs.keys())

                    existing_data[table_name] = [
                        {col: row[i] for i, col in enumerate(columns)}
                        for row in rows
                    ]

                    logger.info(
                        f"Fetched {len(rows)} rows with derived attrs from {table_name}"
                    )

            except Exception as e:
                conn.rollback()
                logger.warning(
                    f"Could not get derived IDs for table '{table_name}': {e}"
                )
                existing_data[table_name] = []

        return existing_data

    def get_full_table_data(
        self,
        table_names: list[str] | None = None,
        columns: dict[str, list[str]] | None = None,
    ) -> dict[str, list[dict]]:
        """
        Load full table data into memory.

        This method loads all rows and columns (or specified columns) for the
        given tables. Since data is expected to be < 200MB, this simplifies
        distribution analysis and FK resolution.

        Args:
            table_names: List of table names to load. If None, loads all tables in schema.
            columns: Optional dict mapping table names to list of columns to load.
                    If not specified for a table, loads all columns.

        Returns:
            Dict mapping table names to list of row dicts.
            e.g., {"users": [{"id": 1, "role": "admin", "email": "..."}, ...]}
        """
        if table_names is None:
            tables_schema = self.schema.get("properties", {}).get("tables", {}).get("properties", {})
            table_names = list(tables_schema.keys())

        columns = columns or {}
        table_data = {}
        conn = self._get_connection()

        for table_name in table_names:
            try:
                # Determine columns to select
                table_columns = columns.get(table_name)
                if table_columns:
                    column_sql = sql.SQL(", ").join(sql.Identifier(c) for c in table_columns)
                else:
                    column_sql = sql.SQL("*")

                with conn.cursor() as cursor:
                    cursor.execute(
                        sql.SQL("SELECT {} FROM {}").format(
                            column_sql,
                            sql.Identifier(table_name)
                        )
                    )

                    # Get column names from cursor description
                    col_names = [desc[0] for desc in cursor.description]
                    rows = cursor.fetchall()

                    # Convert to list of dicts
                    table_data[table_name] = [
                        {col_names[i]: row[i] for i in range(len(col_names))}
                        for row in rows
                    ]

                    logger.info(
                        f"Loaded {len(rows)} rows from {table_name} "
                        f"({len(col_names)} columns)"
                    )

            except Exception as e:
                conn.rollback()
                logger.warning(f"Could not load data for table '{table_name}': {e}")
                table_data[table_name] = []

        return table_data

    def get_row_counts(self, table_names: list[str] | None = None) -> dict[str, int]:
        """
        Get row counts for tables.

        Args:
            table_names: List of table names to query. If None, queries all tables in schema.

        Returns:
            Dict mapping table names to row counts.
        """
        if table_names is None:
            tables_schema = self.schema.get("properties", {}).get("tables", {}).get("properties", {})
            table_names = list(tables_schema.keys())

        counts = {}
        conn = self._get_connection()

        for table_name in table_names:
            try:
                with conn.cursor() as cursor:
                    cursor.execute(
                        sql.SQL("SELECT COUNT(*) FROM {}").format(sql.Identifier(table_name))
                    )
                    counts[table_name] = cursor.fetchone()[0]
            except Exception as e:
                conn.rollback()
                logger.warning(f"Could not get count for table '{table_name}': {e}")
                counts[table_name] = 0

        return counts

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.close()
        return False
