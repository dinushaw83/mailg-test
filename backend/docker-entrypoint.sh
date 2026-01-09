#!/bin/sh
# Docker entrypoint script for Mailg backend
# Initializes the Postgres template database from schema + fixtures + optional generated data

set -e  # Exit on error for critical operations

echo "=== Mailg Backend Entrypoint (Postgres) ==="
cd /app/backend

# Copy fixtures first (before init_db.py runs migrate_data)
if [ -d /seed/fixtures ]; then
  echo "Copying fixtures from /seed/fixtures to /app/backend/fixtures..."
  mkdir -p /app/backend/fixtures
  cp -r /seed/fixtures/* /app/backend/fixtures/ 2>/dev/null || echo "Warning: fixtures copy failed"
else
  echo "No fixtures found at /seed/fixtures; skipping fixture copy."
fi

# init_db.py now handles:
# 1. Creating database tables
# 2. Migrating fixture data (calls migrate_data.py internally)
# 3. Generating additional data if GENERATE_ADDITIONAL_DATA=1
echo "Initializing Postgres template database..."
python scripts/init_db.py || echo "Warning: init_db.py failed"

echo "=== Entrypoint Complete ==="
echo ""
exec "$@"

