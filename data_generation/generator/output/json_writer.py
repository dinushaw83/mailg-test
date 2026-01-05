"""JSON and JSONL output writers."""

import json
from pathlib import Path
from typing import Any

from .base import OutputWriter


class JsonWriter(OutputWriter):
    """Writes data as JSON files."""

    @property
    def extension(self) -> str:
        return ".json"

    def write_table(
        self,
        table_name: str,
        records: list[dict[str, Any]],
        out_file: str | Path | None = None,
    ) -> Path:
        """Write a single table as JSON."""
        file_path = self.get_file_path(table_name, out_file)
        self.check_file_exists(file_path)
        self.ensure_parent_dir(file_path)

        with open(file_path, "w") as f:
            json.dump(records, f, indent=2)

        return file_path

    def write_combined(
        self,
        data: dict[str, list[dict[str, Any]]],
        out_file: str | Path | None = None,
    ) -> Path:
        """
        Write all tables to a single JSON file.

        Args:
            data: Dict mapping table names to records.
            out_file: Optional explicit output file path.

        Returns:
            Path to the written file.
        """
        if out_file:
            file_path = Path(out_file)
        else:
            if not self.output_dir:
                raise ValueError("output_dir required when out_file not specified")
            file_path = self.output_dir / f"{self.prefix}all_tables.json"

        self.check_file_exists(file_path)
        self.ensure_parent_dir(file_path)

        with open(file_path, "w") as f:
            json.dump(data, f, indent=2)

        return file_path


class JsonlWriter(OutputWriter):
    """Writes data as JSONL (JSON Lines) files."""

    @property
    def extension(self) -> str:
        return ".jsonl"

    def write_table(
        self,
        table_name: str,
        records: list[dict[str, Any]],
        out_file: str | Path | None = None,
    ) -> Path:
        """Write a single table as JSONL."""
        file_path = self.get_file_path(table_name, out_file)
        self.check_file_exists(file_path)
        self.ensure_parent_dir(file_path)

        with open(file_path, "w") as f:
            for record in records:
                f.write(json.dumps(record) + "\n")

        return file_path
