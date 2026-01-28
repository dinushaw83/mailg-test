"""
JSON file reader for loading existing data from a directory.

This module provides a JsonFileReader class that can load existing data
from a directory of JSON files for FK resolution, as an alternative to
querying a database.
"""

import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


class JsonFileReader:
    """
    Reads existing data from a directory of JSON files for FK resolution.

    This class is used when generating data and needing to reference existing
    data from JSON files instead of a database. Each JSON file should be named
    after the table it contains (e.g., users.json, tickets.json).

    Supports both:
    - Single-table files: users.json containing [{"id": 1, ...}, ...]
    - Combined file: all_tables.json containing {"users": [...], "tickets": [...]}
    """

    def __init__(self, directory_path: str | Path, schema: dict[str, Any] | None = None):
        """
        Initialize JsonFileReader.

        Args:
            directory_path: Path to directory containing JSON files.
            schema: Schema dict for table definitions (used to identify tables).
        """
        self.directory_path = Path(directory_path)
        self.schema = schema or {}
        self._cached_data: dict[str, list[dict]] | None = None

        if not self.directory_path.exists():
            raise FileNotFoundError(f"Directory not found: {self.directory_path}")

        if not self.directory_path.is_dir():
            raise ValueError(f"Path is not a directory: {self.directory_path}")

    def _load_all_data(self) -> dict[str, list[dict]]:
        """
        Load all JSON data from the directory.

        Returns:
            Dict mapping table names to list of records.
        """
        if self._cached_data is not None:
            return self._cached_data

        table_data: dict[str, list[dict]] = {}

        # Check for combined file first (all_tables.json)
        combined_file = self.directory_path / "all_tables.json"
        if combined_file.exists():
            try:
                with open(combined_file, "r") as f:
                    data = json.load(f)
                if isinstance(data, dict):
                    for table_name, records in data.items():
                        if isinstance(records, list):
                            table_data[table_name] = records
                            logger.info(
                                f"Loaded {len(records)} records for {table_name} "
                                f"from all_tables.json"
                            )
            except json.JSONDecodeError as e:
                logger.warning(f"Failed to parse all_tables.json: {e}")

        # Load individual table files (overrides combined file if both exist)
        for json_file in self.directory_path.glob("*.json"):
            if json_file.name == "all_tables.json":
                continue

            table_name = json_file.stem  # filename without extension

            try:
                with open(json_file, "r") as f:
                    data = json.load(f)

                if isinstance(data, list):
                    table_data[table_name] = data
                    logger.info(
                        f"Loaded {len(data)} records for {table_name} from {json_file.name}"
                    )
                elif isinstance(data, dict) and "data" in data:
                    # Support for wrapped format: {"data": [...]}
                    records = data["data"]
                    if isinstance(records, list):
                        table_data[table_name] = records
                        logger.info(
                            f"Loaded {len(records)} records for {table_name} "
                            f"from {json_file.name}"
                        )
                else:
                    logger.warning(
                        f"Unexpected format in {json_file.name}: "
                        f"expected list or {{\"data\": [...]}})"
                    )
            except json.JSONDecodeError as e:
                logger.warning(f"Failed to parse {json_file.name}: {e}")

        self._cached_data = table_data
        return table_data

    def get_full_table_data(
        self,
        table_names: list[str] | None = None,
        columns: dict[str, list[str]] | None = None,
    ) -> dict[str, list[dict]]:
        """
        Load full table data from JSON files.

        Args:
            table_names: List of table names to load. If None, loads all available.
            columns: Optional dict mapping table names to list of columns to include.
                    If not specified for a table, includes all columns.

        Returns:
            Dict mapping table names to list of row dicts.
        """
        all_data = self._load_all_data()

        if table_names is None:
            table_names = list(all_data.keys())

        result: dict[str, list[dict]] = {}

        for table_name in table_names:
            records = all_data.get(table_name, [])

            if columns and table_name in columns:
                # Filter to specified columns
                cols = columns[table_name]
                filtered_records = []
                for record in records:
                    filtered_record = {k: v for k, v in record.items() if k in cols}
                    filtered_records.append(filtered_record)
                result[table_name] = filtered_records
            else:
                result[table_name] = records

        return result

    def get_existing_ids(self, table_names: list[str] | None = None) -> dict[str, list]:
        """
        Get existing IDs from JSON files for FK resolution.

        Args:
            table_names: List of table names to query. If None, queries all available.

        Returns:
            Dict mapping table names to list of existing IDs.
        """
        all_data = self._load_all_data()

        if table_names is None:
            table_names = list(all_data.keys())

        existing_ids: dict[str, list] = {}

        for table_name in table_names:
            records = all_data.get(table_name, [])
            ids = [r.get("id") for r in records if r.get("id") is not None]
            existing_ids[table_name] = ids

        return existing_ids

    def get_row_counts(self, table_names: list[str] | None = None) -> dict[str, int]:
        """
        Get row counts from JSON files.

        Args:
            table_names: List of table names to query. If None, queries all available.

        Returns:
            Dict mapping table names to row counts.
        """
        all_data = self._load_all_data()

        if table_names is None:
            table_names = list(all_data.keys())

        counts = {
            table_name: len(all_data.get(table_name, []))
            for table_name in table_names
        }

        return counts

    def close(self) -> None:
        """Clear cached data (for API compatibility with DatabaseReader)."""
        self._cached_data = None

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.close()
        return False
