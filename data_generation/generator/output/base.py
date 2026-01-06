"""Base output writer interface."""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any


class FileExistsError(Exception):
    """Raised when output file exists and overwrite is False."""
    pass


class OutputWriter(ABC):
    """Abstract base class for output writers."""

    def __init__(
        self,
        output_dir: str | Path | None = None,
        prefix: str = "",
        overwrite: bool = False,
    ):
        """
        Initialize the writer.

        Args:
            output_dir: Directory for output files.
            prefix: Prefix for generated file names.
            overwrite: If True, overwrite existing files.
        """
        self.output_dir = Path(output_dir) if output_dir else None
        self.prefix = prefix
        self.overwrite = overwrite

    @property
    @abstractmethod
    def extension(self) -> str:
        """File extension for this format (e.g., '.json')."""
        pass

    def get_file_path(self, table_name: str, out_file: str | Path | None = None) -> Path:
        """
        Get the output file path for a table.

        Args:
            table_name: Name of the table.
            out_file: Optional explicit output file path.

        Returns:
            Path to the output file.
        """
        if out_file:
            return Path(out_file)

        if not self.output_dir:
            raise ValueError("output_dir required when out_file not specified")

        filename = f"{self.prefix}{table_name}{self.extension}"
        return self.output_dir / filename

    def check_file_exists(self, file_path: Path) -> None:
        """
        Check if file exists and raise error if overwrite is False.

        Args:
            file_path: Path to check.

        Raises:
            FileExistsError: If file exists and overwrite is False.
        """
        if file_path.exists() and not self.overwrite:
            raise FileExistsError(f"File already exists: {file_path}")

    def ensure_parent_dir(self, file_path: Path) -> None:
        """Ensure parent directory exists."""
        file_path.parent.mkdir(parents=True, exist_ok=True)

    @abstractmethod
    def write_table(
        self,
        table_name: str,
        records: list[dict[str, Any]],
        out_file: str | Path | None = None,
    ) -> Path:
        """
        Write a single table's data.

        Args:
            table_name: Name of the table.
            records: List of records to write.
            out_file: Optional explicit output file path.

        Returns:
            Path to the written file.
        """
        pass

    def write_all(
        self,
        data: dict[str, list[dict[str, Any]]],
    ) -> list[Path]:
        """
        Write all tables' data.

        Args:
            data: Dict mapping table names to records.

        Returns:
            List of paths to written files.
        """
        paths = []
        for table_name, records in data.items():
            if records:
                path = self.write_table(table_name, records)
                paths.append(path)
        return paths
