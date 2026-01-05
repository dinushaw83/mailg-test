# Deskzen Data Generator

A flexible data generator for creating realistic test data for the Deskzen support platform. Supports multiple output formats, foreign key relationships, and incremental data generation.

## Setup

```bash
pip install -r requirements.txt
```

## Quick Start

```bash
# Generate data with defaults (100 rows per table, JSON output)
python -m data_generation

# Generate 1000 tickets with dependencies
python -m data_generation --rows tickets=1000

# Append data to existing PostgreSQL database
python -m data_generation --format postgres --use-db "postgresql://user:pass@localhost:5432/mydb"
```

## Output Formats

### JSON (default)
Creates separate JSON files per table in the output directory.

```bash
python -m data_generation --format json --output ./generated_data
```

**Use case:** Importing into applications, debugging, or as fixtures for tests.

### JSON Lines (JSONL)
One JSON object per line - useful for streaming processing.

```bash
python -m data_generation --table tickets --format jsonl --output ./generated_data
```

**Use case:** Processing large datasets line-by-line, log-style data ingestion.

### CSV
Creates separate CSV files per table.

```bash
python -m data_generation --format csv --output ./generated_data
```

**Use case:** Excel analysis, importing into spreadsheet tools, legacy system imports.

### SQLite
Creates a SQLite database with all tables and constraints.

```bash
python -m data_generation --format sqlite --output ./generated_data
```

**Use case:** Local development, testing without a server, portable databases.

### PostgreSQL
Inserts data directly into a PostgreSQL database.

```bash
python -m data_generation --format postgres --use-db "postgresql://user:pass@host:5432/dbname"
```

**Use case:** Populating development/staging databases, load testing, seeding production-like environments.

### ZIP Archive
Packages output files into a ZIP archive.

```bash
python -m data_generation --format csv --zip --output ./generated_data
```

**Use case:** Distributing test data, archiving generated datasets.

## Row Count Control

### Default row count for all tables
```bash
python -m data_generation --rows 500
```

### Per-table row counts
```bash
python -m data_generation --rows users=100 --rows tickets=5000 --rows organizations=10
```

### Skip specific tables
```bash
python -m data_generation --rows statuses=0 --rows api_logs=0
```

**Use case:** Generate a realistic distribution where you have many tickets but few organizations.

## Starting ID Control

Useful when appending to existing data to avoid ID conflicts.

### Global starting ID
```bash
python -m data_generation --start-id 100000
```

### Per-table starting IDs
```bash
python -m data_generation --start-id users=50000 --start-id tickets=100000
```

**Use case:** Appending generated data to an existing database without ID collisions.

## Appending to Existing Databases

### SQLite
```bash
python -m data_generation --format sqlite --use-db /path/to/existing.db
```

### PostgreSQL
```bash
python -m data_generation --format postgres --use-db "postgresql://user:pass@host:5432/dbname"
```

The generator will:
1. Query existing IDs to avoid duplicates
2. Use existing records for foreign key references
3. Append new records with non-conflicting IDs

**Use case:** Incrementally growing a test database, adding more tickets to an existing dataset.

## Single Table Generation

Generate data for a specific table and its dependencies.

```bash
# Generate only tickets (will also generate required users, groups, etc.)
python -m data_generation --table tickets --rows 1000
```

### Without dependencies
```bash
python -m data_generation --table tickets --rows 1000 --no-deps
```

**Use case:** Testing a specific feature, focused performance testing.

## Seed Data Control

By default, the generator injects seed data (default users, organizations, groups) from the config.

### Disable seed data injection
```bash
python -m data_generation --no-seed
```

**Use case:** When appending to a database that already has seed data, or when you want purely random data.

## Reproducible Generation

Use a seed for deterministic output - same seed produces identical data.

```bash
python -m data_generation --seed 42
```

**Use case:** Reproducible tests, debugging data-related issues, consistent demo environments.

## Output Options

### Single combined file
```bash
python -m data_generation --single-file --format json
```

Creates one JSON file with all tables instead of separate files.

### Custom output file (single table only)
```bash
python -m data_generation --table users --out-file /tmp/users.json
```

### File prefix
```bash
python -m data_generation --prefix "test_"
# Creates: test_users.json, test_tickets.json, etc.
```

### Overwrite existing files
```bash
python -m data_generation --overwrite
```

### Output to stdout
```bash
python -m data_generation --table users --format json --stdout
```

## Configuration

### View available tables
```bash
python -m data_generation --list-tables
```

### Dump default configuration
```bash
python -m data_generation --dump-config > my_config.yaml
```

### Analyze schema and generate config
```bash
python -m data_generation --analyze-schema > generated_config.yaml
```

### Use custom configuration
```bash
python -m data_generation --config my_config.yaml
```

### Use custom schema
```bash
python -m data_generation --schema /path/to/schema.json
```

## Common Scenarios

### Scenario 1: Fresh development database
Generate a complete dataset for local development:

```bash
python -m data_generation \
  --format postgres \
  --use-db "postgresql://deskzen:deskzen@localhost:5433/deskzen_seed" \
  --rows users=50 \
  --rows organizations=10 \
  --rows tickets=500 \
  --rows conversations=1000 \
  --seed 42
```

### Scenario 2: Load testing
Generate a large dataset for performance testing:

```bash
python -m data_generation \
  --format postgres \
  --use-db "postgresql://user:pass@localhost:5432/loadtest" \
  --start-id 1000000 \
  --rows users=10000 \
  --rows tickets=100000 \
  --rows conversations=500000 \
  --no-seed
```

### Scenario 3: Incremental data addition
Add more tickets to an existing database:

```bash
python -m data_generation \
  --format postgres \
  --use-db "postgresql://user:pass@localhost:5432/existing_db" \
  --table tickets \
  --rows 1000 \
  --no-seed
```

### Scenario 4: Export for sharing
Generate data as a portable ZIP file:

```bash
python -m data_generation \
  --format csv \
  --zip \
  --rows 100 \
  --seed 42 \
  --output ./export
```

### Scenario 5: CI/CD test fixtures
Generate reproducible test data:

```bash
python -m data_generation \
  --format json \
  --single-file \
  --rows 10 \
  --seed 12345 \
  --out-file ./tests/fixtures/test_data.json
```

### Scenario 6: Docker startup data generation
Automatically generate data on container startup (via init_db.py):

```bash
# Set environment variables in docker-compose.yaml
GENERATE_ADDITIONAL_DATA=1
DATA_GENERATOR_PARAMS="--start-id 100000 --rows tickets=1000 --no-seed"
```

## CLI Reference

| Option | Description |
|--------|-------------|
| `--table, -t` | Generate data for specific table only (with dependencies) |
| `--rows, -r` | Row count: number or table=count format (can repeat) |
| `--start-id` | Starting ID: number or table=id format (can repeat) |
| `--output, -o` | Output directory (default: ./generated_data) |
| `--out-file` | Output file path (single table only) |
| `--prefix` | Prefix for generated file names |
| `--overwrite` | Overwrite existing files |
| `--schema, -s` | Path to schema JSON file |
| `--config, -c` | Path to config YAML file |
| `--seed` | Random seed for reproducible generation |
| `--format, -f` | Output format: json, jsonl, csv, sqlite, postgres |
| `--use-db` | Path to SQLite DB or PostgreSQL connection string |
| `--single-file` | Output all tables to a single file (json/sqlite) |
| `--zip` | Package output files into ZIP archive |
| `--stdout` | Output to stdout (json/jsonl only) |
| `--list-tables` | List available tables and exit |
| `--dump-config` | Print default config and exit |
| `--analyze-schema` | Analyze schema and generate config YAML |
| `--no-deps` | Don't generate dependency tables (with --table) |
| `--no-seed` | Don't inject seed data from config |

## Schema Location

By default, uses the schema at:
```
backend/app/utils/import_data/config/deskzen-schema.json
```

This ensures the data generator stays in sync with the actual database schema.
