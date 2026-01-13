# Data Import Module

This module provides database-agnostic data import functionality that works with both SQLite and PostgreSQL.

## Architecture

The code uses a **Database Adapter Pattern** to abstract database-specific differences:

- **`db_adapter.py`**: Contains database adapters (`SQLiteAdapter`, `PostgreSQLAdapter`)
- **`data_importer.py`**: Main import logic (database-agnostic)
- **`schema_utils.py`**: Schema validation and dependency resolution

## Key Features

1. **Database Abstraction**: Easy to switch between SQLite and PostgreSQL
2. **Batch Inserts**: Efficient batch insert operations
3. **Conflict Handling**: `INSERT OR IGNORE` (SQLite) / `ON CONFLICT DO NOTHING` (PostgreSQL)
4. **Schema Validation**: Validates data against database schema before import
5. **Dependency Ordering**: Automatically orders table imports based on foreign key relationships

## Usage

### SQLite (Current Default)

```python
from app.utils.import_data.data_importer import DataImporter

# Using file path
with DataImporter(db_path="/path/to/database.db") as importer:
    result = importer.import_json_data("users", json_string)
```

### PostgreSQL

```python
from app.utils.import_data.data_importer import DataImporter

# Using connection string
connection_string = "postgresql://user:password@localhost/dbname"
with DataImporter(connection_string=connection_string) as importer:
    result = importer.import_json_data("users", json_string)
```

## Switching to PostgreSQL

To switch from SQLite to PostgreSQL:

1. **Update connection string** in your code:
   ```python
   # Change from:
   DataImporter(db_path="database.db")

   # To:
   DataImporter(connection_string="postgresql://user:pass@host/db")
   ```

2. **Install PostgreSQL driver** (if not already installed):
   ```bash
   pip install psycopg2-binary
   ```

3. **No code changes needed** - the adapter automatically detects PostgreSQL from the connection string.

## Database Differences Handled

| Feature | SQLite | PostgreSQL | Adapter Handles |
|---------|--------|------------|-----------------|
| Parameter Placeholder | `?` | `%s` | ✅ |
| Conflict Handling | `INSERT OR IGNORE` | `ON CONFLICT DO NOTHING` | ✅ |
| Table Existence Check | `sqlite_master` | `information_schema` | ✅ |
| Batch Insert | Raw DBAPI | Raw DBAPI | ✅ |

## Implementation Details

### Database Adapter Interface

All adapters implement:
- `create_engine()`: Create SQLAlchemy engine with database-specific settings
- `get_placeholder()`: Return parameter placeholder (`?` or `%s`)
- `build_insert_query()`: Build INSERT query with conflict handling
- `check_table_exists()`: Check if table exists
- `execute_batch_insert()`: Execute efficient batch inserts

### Batch Insert Strategy

1. **First attempt**: Use raw DBAPI `executemany()` for maximum performance
2. **Fallback**: Execute individually using raw DBAPI connection
3. **Last resort**: Use SQLAlchemy (less efficient but more compatible)

This ensures compatibility across different SQLAlchemy versions and database drivers.

## Testing

The code has been tested with:
- ✅ SQLite (primary use case)
- ✅ Database adapter pattern (ready for PostgreSQL)

To test with PostgreSQL, simply change the connection string - no code modifications needed.


