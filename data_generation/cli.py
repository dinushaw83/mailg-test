"""
Command-line interface for the fake data generator.
"""

import argparse
import json
import sys
from pathlib import Path

from .generator import DataGenerator
from .generator.schema_loader import load_schema, get_tables
from .generator.config import dump_default_config
from .generator.config.schema_analyzer import analyze_schema
from .generator.output import (
    JsonWriter,
    JsonlWriter,
    CsvWriter,
    SqliteWriter,
    ZipWriter,
    PostgresWriter,
)
from .generator.output.base import FileExistsError as OutputFileExistsError


def parse_key_value_spec(spec: str, value_name: str = "value") -> tuple[str, int]:
    """
    Parse a key=value specification like 'table=1000'.

    Args:
        spec: String in format 'key=value' or just 'value'.
        value_name: Name of the value for error messages.

    Returns:
        Tuple of (key or empty string, value).

    Raises:
        ValueError: If spec is invalid.
    """
    if "=" in spec:
        parts = spec.split("=", 1)
        if len(parts) != 2:
            raise ValueError(f"Invalid spec: {spec}")
        key, value_str = parts
        try:
            value = int(value_str)
        except ValueError:
            raise ValueError(f"Invalid {value_name}: {value_str}")
        return key.strip(), value
    else:
        try:
            return "", int(spec)
        except ValueError:
            raise ValueError(f"Invalid {value_name}: {spec}")


def parse_row_spec(spec: str) -> tuple[str, int]:
    """Parse a row specification like 'table=1000'."""
    return parse_key_value_spec(spec, "row count")


def main(argv: list[str] | None = None) -> int:
    """
    Main entry point for CLI.

    Args:
        argv: Command line arguments (defaults to sys.argv[1:]).

    Returns:
        Exit code (0 for success).
    """
    parser = argparse.ArgumentParser(
        description="Generate fake data for database tables.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Generate with default row counts from config
  python -m data_generation

  # Generate 100 rows for all tables
  python -m data_generation --rows 100

  # Generate data for specific table
  python -m data_generation --table users --rows 500

  # Generate different row counts per table
  python -m data_generation --rows users=1000 --rows tickets=5000 --rows 100

  # Output formats
  python -m data_generation --format json                # JSON files (default)
  python -m data_generation --table users --format jsonl # JSON Lines (single table)
  python -m data_generation --format csv                 # CSV files
  python -m data_generation --format sqlite              # SQLite database

  # Append to existing SQLite database (atomic write)
  python -m data_generation --use-db /path/to/existing.db

  # Custom output file (single table only)
  python -m data_generation --table users --out-file /path/to/users.json

  # File prefix (no separator added)
  python -m data_generation --prefix "prod_"             # Creates prod_users.json, etc.
  python -m data_generation --prefix "test-"             # Creates test-users.json, etc.

  # Overwrite existing files
  python -m data_generation --overwrite

  # Package as ZIP archive
  python -m data_generation --zip
  python -m data_generation --format csv --zip

  # Single combined JSON file
  python -m data_generation --single-file

  # Reproducible generation with seed
  python -m data_generation --seed 42

  # List available tables
  python -m data_generation --list-tables

  # Analyze schema and generate config file
  python -m data_generation --analyze-schema > my_config.yaml
  python -m data_generation --schema /path/to/schema.json --analyze-schema > config.yaml
        """,
    )

    parser.add_argument(
        "--table", "-t",
        type=str,
        help="Generate data for specific table only (with dependencies).",
    )

    parser.add_argument(
        "--rows", "-r",
        action="append",
        default=[],
        help=(
            "Number of rows to generate. Can be a single number (applies to all) "
            "or table=count format. Can be specified multiple times."
        ),
    )

    parser.add_argument(
        "--output", "-o",
        type=str,
        default=".",
        help="Output directory for generated files (default: current directory).",
    )

    parser.add_argument(
        "--out-file",
        type=str,
        help="Output file path (single table only). Full path, ignores --output.",
    )

    parser.add_argument(
        "--prefix",
        type=str,
        default="",
        help="Prefix for generated file names (no separator added).",
    )

    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite existing files. Without this, existing files cause an error.",
    )

    parser.add_argument(
        "--schema", "-s",
        type=str,
        help="Path to schema JSON file (default: auto-detect).",
    )

    parser.add_argument(
        "--config", "-c",
        type=str,
        help="Path to config YAML file (default: use built-in defaults).",
    )

    parser.add_argument(
        "--seed",
        type=int,
        help="Random seed for reproducible generation.",
    )

    parser.add_argument(
        "--format", "-f",
        type=str,
        choices=["json", "jsonl", "csv", "sqlite", "postgres"],
        default="json",
        help="Output format: json (default), jsonl, csv, sqlite, or postgres.",
    )

    parser.add_argument(
        "--use-db",
        type=str,
        help="Either the file path of an existing SQLite database or a PostgreSQL connection string for appending data.",
    )

    parser.add_argument(
        "--single-file",
        action="store_true",
        help="Output all tables to a single file (json/sqlite only).",
    )

    parser.add_argument(
        "--zip",
        action="store_true",
        help="Package output files into a ZIP archive.",
    )

    parser.add_argument(
        "--stdout",
        action="store_true",
        help="Output to stdout instead of files (json/jsonl only).",
    )

    parser.add_argument(
        "--list-tables",
        action="store_true",
        help="List available tables and exit.",
    )

    parser.add_argument(
        "--dump-config",
        action="store_true",
        help="Print default config to stdout and exit. Pipe to file to customize.",
    )

    parser.add_argument(
        "--analyze-schema",
        action="store_true",
        help="Analyze schema and generate a config file. Outputs YAML to stdout.",
    )

    parser.add_argument(
        "--no-deps",
        action="store_true",
        help="Don't generate dependency tables (only with --table).",
    )

    parser.add_argument(
        "--no-seed",
        action="store_true",
        help="Don't inject seed data (users, organizations, groups from config).",
    )

    args = parser.parse_args(argv)

    # Handle --dump-config
    if args.dump_config:
        print(dump_default_config())
        return 0

    # Handle --analyze-schema
    if args.analyze_schema:
        try:
            schema = load_schema(args.schema)
            print(analyze_schema(schema))
            return 0
        except FileNotFoundError as e:
            print(f"Error: {e}", file=sys.stderr)
            return 1

    # Handle --list-tables
    if args.list_tables:
        try:
            schema = load_schema(args.schema)
            tables = get_tables(schema)
            print("Available tables:")
            for name in sorted(tables.keys()):
                desc = tables[name].get("description", "")
                if len(desc) > 60:
                    desc = desc[:57] + "..."
                print(f"  {name:<30} {desc}")
            return 0
        except FileNotFoundError as e:
            print(f"Error: {e}", file=sys.stderr)
            return 1

    # Handle --use-db implying sqlite format
    if args.use_db:
        if args.format != "json" and args.format != "sqlite" and args.format != "postgres":
            print("Error: --use-db can only be used with SQLite/Postgres format", file=sys.stderr)
            return 1

    # Validate options
    if args.format == "jsonl" and not args.table:
        print("Error: JSONL format requires --table option (single table only)", file=sys.stderr)
        return 1

    if args.single_file and args.format not in ["json", "sqlite"]:
        print("Error: --single-file only supported with JSON or SQLite format", file=sys.stderr)
        return 1

    if args.out_file and not args.table and not args.zip:
        print("Error: --out-file requires --table option (single table only), or use with --zip for multi-table archive", file=sys.stderr)
        return 1

    if args.zip and args.format == "sqlite":
        print("Error: --zip not supported with SQLite format", file=sys.stderr)
        return 1

    if args.stdout and args.format not in ["json", "jsonl"]:
        print("Error: --stdout only supported with JSON or JSONL format", file=sys.stderr)
        return 1

    if args.use_db and not Path(args.use_db).exists() and args.format == "sqlite":
        print(f"Error: Database not found: {args.use_db}", file=sys.stderr)
        return 1

    # Parse row specifications
    default_rows: int | None = None
    row_counts: dict[str, int] = {}

    for spec in args.rows:
        table_name, count = parse_row_spec(spec)
        if table_name:
            row_counts[table_name] = count
        else:
            default_rows = count

    # Generate data
    try:
        generator = DataGenerator(
            schema_path=args.schema,
            config_path=args.config,
            seed=args.seed,
            use_seed=not args.no_seed,
        )

        # For postgres format, query existing data from database (unless --overwrite)
        existing_counts = None
        postgres_writer = None
        if args.format == "postgres" and args.use_db and not args.overwrite:
            # Create writer early to query existing data
            postgres_writer = PostgresWriter(
                output_dir=Path(args.output),
                prefix=args.prefix,
                overwrite=args.overwrite,
                schema=generator.schema,
                connection_string=args.use_db,
            )

            # Query existing IDs for FK resolution
            existing_ids = postgres_writer.get_existing_ids()
            generator.register_existing_ids(existing_ids)

            # Use existing ID counts for row calculation
            existing_counts = {table: len(ids) for table, ids in existing_ids.items()}
            print(f"Existing row counts in database:")
            for table, count in sorted(existing_counts.items()):
                if count > 0:
                    print(f"  {table}: {count}")

        if args.table:
            num_rows = row_counts.get(args.table, default_rows or 100)
            data = generator.generate_table(
                args.table,
                num_rows,
                include_dependencies=not args.no_deps,
            )
        else:
            data = generator.generate_all(row_counts, default_rows, existing_counts)

        # Output to stdout
        if args.stdout:
            if args.format == "jsonl":
                for table_name, records in data.items():
                    for record in records:
                        print(json.dumps(record))
            else:
                print(json.dumps(data, indent=2))
            return 0

        # Create appropriate writer
        output_dir = Path(args.output)
        writer_kwargs = {
            "output_dir": output_dir,
            "prefix": args.prefix,
            "overwrite": args.overwrite,
        }

        if args.zip:
            writer = ZipWriter(**writer_kwargs, inner_format=args.format)
        elif args.format == "json":
            writer = JsonWriter(**writer_kwargs)
        elif args.format == "jsonl":
            writer = JsonlWriter(**writer_kwargs)
        elif args.format == "csv":
            writer = CsvWriter(**writer_kwargs)
        elif args.format == "sqlite":
            writer = SqliteWriter(
                **writer_kwargs,
                schema=generator.schema,
                use_db=args.use_db,
            )
        elif args.format == "postgres":
            # Reuse existing writer if already created for counting
            if postgres_writer is not None:
                writer = postgres_writer
            else:
                writer = PostgresWriter(
                    **writer_kwargs,
                    schema=generator.schema,
                    connection_string=args.use_db,
                )

        # Write output
        if args.table and args.out_file:
            # Single table with explicit output file
            table_data = data.get(args.table, [])
            output_path = writer.write_table(args.table, table_data, out_file=args.out_file)
            written_paths = [output_path]
        elif args.single_file or args.format == "sqlite":
            # Combined output
            if args.format == "json" and not args.zip:
                written_paths = [writer.write_combined(data, out_file=args.out_file)]
            else:
                written_paths = writer.write_all(data, out_file=args.out_file)
        elif args.zip:
            # ZIP archive
            written_paths = writer.write_all(data, out_file=args.out_file)
        else:
            # Separate files
            written_paths = writer.write_all(data)

        # Close SQLite connection if needed
        if hasattr(writer, 'close'):
            writer.close()

        # Print summary
        if len(written_paths) == 1:
            print(f"Generated data written to: {written_paths[0]}")
        else:
            print(f"Generated data written to: {output_dir}")

        total_records = 0
        for table_name, records in data.items():
            count = len(records)
            total_records += count
            print(f"  {table_name}: {count} records")
        print(f"  ---")
        print(f"  Total: {total_records} records")
        if args.format != "json":
            print(f"  Format: {args.format}")

        return 0

    except OutputFileExistsError as e:
        print(f"Error: {e}", file=sys.stderr)
        print("Use --overwrite to replace existing files.", file=sys.stderr)
        return 1
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
