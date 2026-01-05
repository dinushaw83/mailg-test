"""
Main data generator orchestrating fake data generation for all tables.

Uses the registry pattern to match fields to appropriate generators,
applies consistency rules, and respects foreign key dependencies.
"""

import csv
import io
import json
import zipfile
from pathlib import Path
from typing import Any, Literal

from .schema_loader import (
    load_schema,
    get_tables,
    get_table_properties,
    get_required_fields,
    get_unique_constraints,
)
from .dependency_resolver import get_generation_order, get_table_dependencies
from .core.analyzer import FieldAnalyzer
from .core.registry import GeneratorRegistry
from .core.context import GenerationContext
from .config import load_config
from .rules import ConsistencyRules

# Import generators to trigger registration
from . import generators  # noqa: F401


class DataGenerator:
    """
    Generator for creating fake data based on Deskzen schema.

    Features:
    - Semantic field analysis for intelligent data generation
    - Priority-based generator matching
    - Configurable distributions via YAML
    - Foreign key relationship handling
    - Post-generation consistency rules
    """

    def __init__(
        self,
        schema_path: str | Path | None = None,
        config_path: str | Path | None = None,
        seed: int | None = None,
        use_seed: bool = True,
    ):
        """
        Initialize the generator.

        Args:
            schema_path: Optional path to schema file.
            config_path: Optional path to config YAML file.
            seed: Optional random seed for reproducibility.
            use_seed: Whether to inject seed data (users, orgs, groups) from config.
        """
        self.schema = load_schema(schema_path)
        self.tables = get_tables(self.schema)
        self.config = load_config(config_path)
        self.use_seed = use_seed

        self.analyzer = FieldAnalyzer()
        self.consistency = ConsistencyRules(self.config, self.schema)

        self.context = GenerationContext()
        self.context.config = self.config

        if seed is not None:
            self.context.set_seed(seed)

        self.generated_data: dict[str, list[dict[str, Any]]] = {}

    def generate_table(
        self,
        table_name: str,
        num_rows: int,
        include_dependencies: bool = True,
    ) -> dict[str, list[dict[str, Any]]]:
        """
        Generate fake data for a specific table.

        Args:
            table_name: Name of the table to generate.
            num_rows: Number of rows to generate.
            include_dependencies: If True, also generates required parent tables.

        Returns:
            Dict mapping table names to list of generated records.
        """
        if table_name not in self.tables:
            raise ValueError(f"Unknown table: {table_name}")

        result: dict[str, list[dict[str, Any]]] = {}

        if include_dependencies:
            # Generate dependencies first
            deps = get_table_dependencies(self.schema, table_name)
            order = get_generation_order(self.schema)

            # Filter to just dependencies and the target table
            tables_to_generate = [t for t in order if t in deps or t == table_name]

            for dep_table in tables_to_generate:
                if dep_table not in self.generated_data:
                    # Use config defaults or generate proportional rows
                    if dep_table != table_name:
                        dep_rows = self._get_default_rows(dep_table)
                    else:
                        dep_rows = num_rows

                    records = self._generate_table_records(dep_table, dep_rows)
                    self.generated_data[dep_table] = records
                    result[dep_table] = records
        else:
            records = self._generate_table_records(table_name, num_rows)
            self.generated_data[table_name] = records
            result[table_name] = records

        return result

    def register_existing_ids(self, existing_ids: dict[str, list]) -> None:
        """
        Register existing IDs from database for FK resolution.

        Args:
            existing_ids: Dict mapping table names to list of existing IDs.
        """
        for table_name, ids in existing_ids.items():
            for id_val in ids:
                self.context.register_id(table_name, id_val)

    def generate_all(
        self,
        row_counts: dict[str, int] | None = None,
        default_rows: int | None = None,
        existing_counts: dict[str, int] | None = None,
    ) -> dict[str, list[dict[str, Any]]]:
        """
        Generate fake data for all tables.

        Args:
            row_counts: Optional dict mapping table names to row counts.
                        These are TOTAL counts including existing/seed data.
            default_rows: Default number of rows for tables not in row_counts.
            existing_counts: Optional dict of existing row counts from database.
                            If provided, uses these instead of seed counts from config.
                            Typically used with --no-seed when appending to existing DB.

        Returns:
            Dict mapping table names to list of generated records.
        """
        if row_counts is None:
            row_counts = {}

        if default_rows is None:
            default_rows = self.config.get("default_rows", 100)

        order = get_generation_order(self.schema)
        result: dict[str, list[dict[str, Any]]] = {}

        # Get seed counts from config (pattern: seed_{table_name})
        seed_counts = {}
        for key, value in self.config.items():
            if key.startswith("seed_") and isinstance(value, list):
                table_name = key[5:]  # Remove "seed_" prefix
                seed_counts[table_name] = len(value)

        # Use existing_counts from DB if provided, otherwise default to 0
        if existing_counts is None:
            existing_counts = {}

        # Pre-calculate row counts for all tables (needed for percentage constraints)
        # Row counts are TOTAL including existing/seed data
        for table_name in order:
            if table_name in row_counts:
                total_rows = row_counts[table_name]
            else:
                total_rows = self._get_default_rows(table_name, default_rows)
            self.context.table_row_counts[table_name] = total_rows

        for table_name in order:
            total_rows = self.context.table_row_counts[table_name]

            # Calculate how many NEW records to generate
            existing_count = existing_counts.get(table_name, 0)
            seed_count = seed_counts.get(table_name, 0)

            if self.use_seed:
                # With seed: new = requested - seed_count - existing
                # We'll prepend seed records, so subtract both
                num_new_rows = max(0, total_rows - seed_count - existing_count)
            else:
                # Without seed (--no-seed): new = requested - existing
                # All records are brand new
                num_new_rows = max(0, total_rows - existing_count)

            records = self._generate_table_records(table_name, num_new_rows)

            # Inject seed data if enabled
            if self.use_seed:
                seed_records = self._get_seed_data(table_name)
                if seed_records:
                    records = seed_records + records

            self.generated_data[table_name] = records
            result[table_name] = records

            # Register IDs with attributes for assignment constraints
            self._register_ids_with_attributes(table_name, records)

        # Apply cross-table consistency checks after all data is generated
        self._apply_cross_table_consistency(result)

        # Sort self-referencing tables for correct insertion order
        self._sort_self_referencing_tables(result)

        return result

    def _apply_cross_table_consistency(
        self, data: dict[str, list[dict[str, Any]]]
    ) -> None:
        """
        Apply cross-table consistency checks after all data is generated.

        This ensures fields that depend on related table data are accurate.
        For example, threads.last_email_at should match the created_at of
        the most recent email in that thread.
        """
        # Update threads.last_email_at based on actual emails
        if "threads" in data and "emails" in data:
            threads = data["threads"]
            emails = data["emails"]

            # Group emails by thread_id
            emails_by_thread: dict[str, list[dict[str, Any]]] = {}
            for email in emails:
                thread_id = email.get("thread_id")
                if thread_id:
                    if thread_id not in emails_by_thread:
                        emails_by_thread[thread_id] = []
                    emails_by_thread[thread_id].append(email)

            # Update each thread's email_count and last_email_at
            for thread in threads:
                thread_id = thread.get("id")
                if not thread_id:
                    continue

                thread_emails = emails_by_thread.get(thread_id, [])

                # Update email_count to match actual number of emails
                thread["email_count"] = len(thread_emails)

                if thread_emails:
                    # Find the most recent email's created_at timestamp
                    latest_email = max(
                        thread_emails,
                        key=lambda e: e.get("created_at", ""),
                        default=None
                    )
                    if latest_email and "created_at" in latest_email:
                        thread["last_email_at"] = latest_email["created_at"]
                else:
                    # No emails in this thread, set last_email_at to None
                    thread["last_email_at"] = None

    def _sort_self_referencing_tables(
        self, data: dict[str, list[dict[str, Any]]]
    ) -> None:
        """
        Sort records in self-referencing tables to ensure parents come before children.

        This is necessary for tables like folders (parent_folder_id), labels (parent_id),
        and emails (parent_email_id) to avoid foreign key violations during insertion.
        """
        # Define self-referencing relationships: table -> parent_column
        self_ref_tables = {
            "folders": "parent_folder_id",
            "labels": "parent_id",
            "emails": "parent_email_id",
        }

        for table_name, parent_column in self_ref_tables.items():
            if table_name not in data:
                continue

            records = data[table_name]
            if not records:
                continue

            # Perform topological sort
            sorted_records = self._topological_sort(records, parent_column)
            data[table_name] = sorted_records

    def _topological_sort(
        self,
        records: list[dict[str, Any]],
        parent_column: str,
    ) -> list[dict[str, Any]]:
        """
        Topologically sort records based on parent-child relationships.

        Args:
            records: List of records to sort.
            parent_column: Name of the column containing parent ID reference.

        Returns:
            Sorted list where parents come before children.
        """
        # Build ID to record mapping
        id_to_record = {r["id"]: r for r in records}

        # Build dependency graph (child -> parent)
        dependencies: dict[str, str | None] = {}
        for record in records:
            record_id = record["id"]
            parent_id = record.get(parent_column)
            dependencies[record_id] = parent_id

        # Perform topological sort using DFS
        visited = set()
        sorted_ids = []

        def visit(record_id: str) -> None:
            if record_id in visited:
                return

            visited.add(record_id)

            # Visit parent first (if it exists in our dataset)
            parent_id = dependencies.get(record_id)
            if parent_id and parent_id in id_to_record:
                visit(parent_id)

            sorted_ids.append(record_id)

        # Visit all records
        for record_id in dependencies.keys():
            visit(record_id)

        # Return records in sorted order
        return [id_to_record[record_id] for record_id in sorted_ids]

    def _get_default_rows(self, table_name: str, fallback: int = 100) -> int:
        """Get default row count for a table from config."""
        table_defaults = self.config.get("table_defaults", {})
        return table_defaults.get(table_name, fallback)

    def _get_seed_data(self, table_name: str) -> list[dict[str, Any]]:
        """
        Get seed data for a table from config with complete field values.

        Looks for config key 'seed_{table_name}' and fills in defaults
        for any missing fields using the regular generator infrastructure.
        """
        config_key = f"seed_{table_name}"
        seed_records = self.config.get(config_key, [])
        if not seed_records:
            return []

        # Get table schema and analyze fields
        table_schema = self.tables.get(table_name, {})
        properties = get_table_properties(table_schema)
        required_fields = get_required_fields(table_schema)

        # Analyze all fields once
        field_semantics = {}
        for field_name, field_schema in properties.items():
            semantics = self.analyzer.analyze(field_name, field_schema, table_name)
            if field_name in required_fields:
                semantics.is_required = True
            field_semantics[field_name] = semantics

        complete_records = []

        for idx, seed in enumerate(seed_records):
            # Set up context for this seed record
            self.context.new_row(table_name, idx + 1)

            record = {}

            # Fill in all fields from schema
            for field_name, field_schema in properties.items():
                if field_name in seed:
                    # Use provided value
                    value = seed[field_name]
                else:
                    # Generate value using regular generator
                    semantics = field_semantics[field_name]
                    value = self._generate_field(semantics)

                record[field_name] = value
                self.context.set_field_value(field_name, value)

            # Apply consistency rules
            record = self.consistency.apply(record, table_name)

            complete_records.append(record)

            # Register seed ID for FK resolution
            if "id" in record and record["id"] is not None:
                # Get attributes to register from config
                attrs = self._get_registration_attributes(table_name, record)
                self.context.register_id(table_name, record["id"], **attrs)

        return complete_records

    def _get_registration_attributes(
        self, table_name: str, record: dict[str, Any]
    ) -> dict[str, Any]:
        """
        Get attributes to register with an ID for FK filtering.

        Reads from config 'id_registration_attributes' which specifies
        which fields to track per table.
        """
        reg_config = self.config.get("id_registration_attributes", {})
        attr_fields = reg_config.get(table_name, [])

        attrs = {}
        for field_name in attr_fields:
            if field_name in record and record[field_name] is not None:
                attrs[field_name] = record[field_name]

        return attrs

    def _register_ids_with_attributes(
        self, table_name: str, records: list[dict[str, Any]]
    ) -> None:
        """Register IDs with attributes for FK filtering based on config."""
        reg_config = self.config.get("id_registration_attributes", {})
        attr_fields = reg_config.get(table_name, [])

        # Skip if no attributes to track for this table
        if not attr_fields:
            return

        for record in records:
            record_id = record.get("id")
            if record_id is None:
                continue

            attrs = {}
            for field_name in attr_fields:
                if field_name in record and record[field_name] is not None:
                    attrs[field_name] = record[field_name]

            if attrs:
                self.context.register_id(table_name, record_id, **attrs)

    def _is_junction_table(self, field_semantics: dict) -> list[str]:
        """
        Check if table is a junction table (all PK fields are also FKs).

        Returns list of composite PK field names if junction table, empty list otherwise.
        """
        pk_fk_fields = [
            name for name, sem in field_semantics.items()
            if sem.is_primary_key and sem.is_foreign_key
        ]
        # It's a junction table if there are 2+ fields that are both PK and FK
        if len(pk_fk_fields) >= 2:
            return pk_fk_fields
        return []

    def _generate_table_records(
        self,
        table_name: str,
        num_rows: int,
    ) -> list[dict[str, Any]]:
        """
        Generate records for a single table.

        Args:
            table_name: Name of the table.
            num_rows: Number of rows to generate.

        Returns:
            List of generated records.
        """
        table_schema = self.tables[table_name]
        properties = get_table_properties(table_schema)
        required_fields = get_required_fields(table_schema)
        unique_constraints = get_unique_constraints(table_schema)

        # Analyze all fields once
        field_semantics = {}
        for field_name, field_schema in properties.items():
            semantics = self.analyzer.analyze(field_name, field_schema, table_name)
            # Mark as required if in required list
            if field_name in required_fields:
                semantics.is_required = True
            field_semantics[field_name] = semantics

        # Check if this is a junction table with composite PK
        composite_pk_fields = self._is_junction_table(field_semantics)

        # Track used combinations for composite PKs and unique constraints
        used_combinations: dict[str, set[tuple]] = {}
        if composite_pk_fields:
            used_combinations["_composite_pk"] = set()
        for constraint in unique_constraints:
            constraint_key = "_".join(sorted(constraint))
            used_combinations[constraint_key] = set()

        records = []

        for i in range(1, num_rows + 1):
            # Start new row in context
            self.context.new_row(table_name, i)

            max_retries = 100
            retry_count = 0
            record: dict[str, Any] = {}

            while True:
                record = {}

                # Generate fields in order (PKs first, then others)
                pk_fields = [n for n, s in field_semantics.items() if s.is_primary_key]
                other_fields = [n for n, s in field_semantics.items() if not s.is_primary_key]

                # Generate PK fields
                for field_name in pk_fields:
                    semantics = field_semantics[field_name]
                    value = self._generate_field(semantics)
                    record[field_name] = value
                    self.context.set_field_value(field_name, value)

                # Generate non-PK fields
                for field_name in other_fields:
                    semantics = field_semantics[field_name]
                    value = self._generate_field(semantics)
                    record[field_name] = value
                    self.context.set_field_value(field_name, value)

                # Check for duplicate composite key in junction tables
                is_duplicate = False
                if composite_pk_fields:
                    combo = tuple(record.get(f) for f in composite_pk_fields)
                    if combo in used_combinations["_composite_pk"]:
                        is_duplicate = True
                    else:
                        used_combinations["_composite_pk"].add(combo)

                # Check for duplicate unique constraints
                if not is_duplicate:
                    for constraint in unique_constraints:
                        constraint_key = "_".join(sorted(constraint))
                        combo = tuple(record.get(f) for f in constraint)
                        if combo in used_combinations[constraint_key]:
                            is_duplicate = True
                            # Remove the composite PK combo we just added
                            if composite_pk_fields:
                                pk_combo = tuple(record.get(f) for f in composite_pk_fields)
                                used_combinations["_composite_pk"].discard(pk_combo)
                            break
                        used_combinations[constraint_key].add(combo)

                if is_duplicate:
                    retry_count += 1
                    if retry_count >= max_retries:
                        # Can't find unique combination, skip this row
                        break
                    continue  # Try again

                # Success, exit retry loop
                break

            # Skip row if we couldn't find unique combination
            if retry_count >= max_retries:
                continue

            # Register primary key for FK resolution (only for single-column PKs)
            if not composite_pk_fields:
                for field_name in pk_fields:
                    if field_name == "id":
                        self.context.register_id(table_name, record[field_name])

            # Apply consistency rules
            record = self.consistency.apply(record, table_name)

            records.append(record)

        return records

    def _generate_field(self, semantics) -> Any:
        """Generate a value for a field using the appropriate generator."""
        # Get matching generator from registry
        gen = GeneratorRegistry.get_generator(semantics)

        if gen:
            value = gen.generate(semantics, self.context)
        else:
            # Fallback for unknown types
            value = None

        # Ensure required fields are not None
        if semantics.is_required and value is None:
            # Try again without null possibility
            if gen:
                # Temporarily mark as not nullable
                semantics.is_nullable = False
                value = gen.generate(semantics, self.context)
                semantics.is_nullable = True

        return value

    def to_json(self, output_dir: str | Path, separate_files: bool = True) -> None:
        """
        Write generated data to JSON files.

        Args:
            output_dir: Directory to write files to.
            separate_files: If True, creates one file per table.
        """
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        if separate_files:
            for table_name, records in self.generated_data.items():
                file_path = output_dir / f"{table_name}.json"
                with open(file_path, "w") as f:
                    json.dump(records, f, indent=2)
        else:
            file_path = output_dir / "all_tables.json"
            with open(file_path, "w") as f:
                json.dump(self.generated_data, f, indent=2)

    def to_jsonl(self, output_dir: str | Path) -> None:
        """
        Write generated data to JSONL (JSON Lines) files.

        Note: JSONL is only supported for single-table output.

        Args:
            output_dir: Directory to write files to.
        """
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        for table_name, records in self.generated_data.items():
            file_path = output_dir / f"{table_name}.jsonl"
            with open(file_path, "w") as f:
                for record in records:
                    f.write(json.dumps(record) + "\n")

    def to_csv(self, output_dir: str | Path) -> None:
        """
        Write generated data to CSV files (one per table).

        Args:
            output_dir: Directory to write files to.
        """
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        for table_name, records in self.generated_data.items():
            if not records:
                continue

            file_path = output_dir / f"{table_name}.csv"
            fieldnames = list(records[0].keys())

            with open(file_path, "w", newline="") as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(records)

    def to_zip(
        self,
        output_path: str | Path,
        format: Literal["json", "jsonl", "csv"] = "json",
    ) -> None:
        """
        Write generated data to a ZIP archive.

        Args:
            output_path: Path to the output ZIP file.
            format: Format for files inside the ZIP (json, jsonl, or csv).
        """
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for table_name, records in self.generated_data.items():
                if not records:
                    continue

                if format == "json":
                    content = json.dumps(records, indent=2)
                    zf.writestr(f"{table_name}.json", content)

                elif format == "jsonl":
                    lines = [json.dumps(record) for record in records]
                    content = "\n".join(lines) + "\n"
                    zf.writestr(f"{table_name}.jsonl", content)

                elif format == "csv":
                    output = io.StringIO()
                    fieldnames = list(records[0].keys())
                    writer = csv.DictWriter(output, fieldnames=fieldnames)
                    writer.writeheader()
                    writer.writerows(records)
                    zf.writestr(f"{table_name}.csv", output.getvalue())

    def write(
        self,
        output_dir: str | Path,
        format: Literal["json", "jsonl", "csv"] = "json",
        single_file: bool = False,
        zip_output: bool = False,
    ) -> str:
        """
        Write generated data in the specified format.

        Args:
            output_dir: Directory to write files to.
            format: Output format (json, jsonl, or csv).
            single_file: If True, combines all tables into single file (json only).
            zip_output: If True, creates a ZIP archive instead of loose files.

        Returns:
            Path to the output file or directory.
        """
        output_dir = Path(output_dir)

        if zip_output:
            zip_path = output_dir / f"data.{format}.zip"
            self.to_zip(zip_path, format)
            return str(zip_path)

        if format == "json":
            self.to_json(output_dir, separate_files=not single_file)
        elif format == "jsonl":
            self.to_jsonl(output_dir)
        elif format == "csv":
            self.to_csv(output_dir)

        return str(output_dir)

    def reset(self) -> None:
        """Reset all generated data."""
        self.generated_data.clear()
        self.context.generated_ids.clear()


def generate_all(
    schema_path: str | Path | None = None,
    config_path: str | Path | None = None,
    row_counts: dict[str, int] | None = None,
    default_rows: int = 100,
    seed: int | None = None,
) -> dict[str, list[dict[str, Any]]]:
    """
    Convenience function to generate all tables.

    Args:
        schema_path: Optional path to schema file.
        config_path: Optional path to config YAML file.
        row_counts: Optional dict mapping table names to row counts.
        default_rows: Default number of rows.
        seed: Optional random seed.

    Returns:
        Dict mapping table names to list of generated records.
    """
    generator = DataGenerator(schema_path, config_path, seed)
    return generator.generate_all(row_counts, default_rows)


def generate_table(
    table_name: str,
    num_rows: int,
    schema_path: str | Path | None = None,
    config_path: str | Path | None = None,
    include_dependencies: bool = True,
    seed: int | None = None,
) -> dict[str, list[dict[str, Any]]]:
    """
    Convenience function to generate a single table.

    Args:
        table_name: Name of the table to generate.
        num_rows: Number of rows to generate.
        schema_path: Optional path to schema file.
        config_path: Optional path to config YAML file.
        include_dependencies: If True, generates required parent tables.
        seed: Optional random seed.

    Returns:
        Dict mapping table names to list of generated records.
    """
    generator = DataGenerator(schema_path, config_path, seed)
    return generator.generate_table(table_name, num_rows, include_dependencies)
