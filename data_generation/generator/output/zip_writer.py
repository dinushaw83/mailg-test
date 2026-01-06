"""ZIP output writer."""

import csv
import io
import json
import zipfile
from pathlib import Path
from typing import Any, Literal

from .base import OutputWriter


class ZipWriter(OutputWriter):
    """Writes data to a ZIP archive."""

    def __init__(
        self,
        output_dir: str | Path | None = None,
        prefix: str = "",
        overwrite: bool = False,
        inner_format: Literal["json", "jsonl", "csv"] = "json",
    ):
        """
        Initialize ZIP writer.

        Args:
            output_dir: Directory for output files.
            prefix: Prefix for generated file names.
            overwrite: If True, overwrite existing files.
            inner_format: Format for files inside the ZIP.
        """
        super().__init__(output_dir, prefix, overwrite)
        self.inner_format = inner_format

    @property
    def extension(self) -> str:
        return f".{self.inner_format}.zip"

    def _get_inner_extension(self) -> str:
        """Get file extension for inner format."""
        return {"json": ".json", "jsonl": ".jsonl", "csv": ".csv"}[self.inner_format]

    def _serialize_table(self, records: list[dict[str, Any]]) -> str:
        """Serialize records to string based on inner format."""
        if self.inner_format == "json":
            return json.dumps(records, indent=2)
        elif self.inner_format == "jsonl":
            return "\n".join(json.dumps(r) for r in records) + "\n"
        elif self.inner_format == "csv":
            if not records:
                return ""
            output = io.StringIO()
            fieldnames = list(records[0].keys())
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(records)
            return output.getvalue()
        else:
            raise ValueError(f"Unknown format: {self.inner_format}")

    def write_table(
        self,
        table_name: str,
        records: list[dict[str, Any]],
        out_file: str | Path | None = None,
    ) -> Path:
        """Write a single table to a ZIP file."""
        file_path = self.get_file_path(table_name, out_file)
        self.check_file_exists(file_path)
        self.ensure_parent_dir(file_path)

        inner_ext = self._get_inner_extension()
        inner_name = f"{table_name}{inner_ext}"
        content = self._serialize_table(records)

        with zipfile.ZipFile(file_path, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr(inner_name, content)

        return file_path

    def write_all(
        self,
        data: dict[str, list[dict[str, Any]]],
        out_file: str | Path | None = None,
    ) -> list[Path]:
        """
        Write all tables to a single ZIP archive.

        Args:
            data: Dict mapping table names to records.
            out_file: Optional explicit output file path.

        Returns:
            List containing the single ZIP path.
        """
        if out_file:
            file_path = Path(out_file)
        else:
            if not self.output_dir:
                raise ValueError("output_dir required when out_file not specified")
            file_path = self.output_dir / f"{self.prefix}data{self.extension}"

        self.check_file_exists(file_path)
        self.ensure_parent_dir(file_path)

        inner_ext = self._get_inner_extension()

        with zipfile.ZipFile(file_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for table_name, records in data.items():
                if not records:
                    continue
                inner_name = f"{self.prefix}{table_name}{inner_ext}"
                content = self._serialize_table(records)
                zf.writestr(inner_name, content)

        return [file_path]
