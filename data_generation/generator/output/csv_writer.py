"""CSV output writer."""

import csv
from pathlib import Path
from typing import Any

from .base import OutputWriter


class CsvWriter(OutputWriter):
    """Writes data as CSV files."""

    @property
    def extension(self) -> str:
        return ".csv"

    def write_table(
        self,
        table_name: str,
        records: list[dict[str, Any]],
        out_file: str | Path | None = None,
    ) -> Path:
        """Write a single table as CSV."""
        if not records:
            return self.get_file_path(table_name, out_file)

        file_path = self.get_file_path(table_name, out_file)
        self.check_file_exists(file_path)
        self.ensure_parent_dir(file_path)

        fieldnames = list(records[0].keys())

        with open(file_path, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(records)

        return file_path
