#!/bin/bash
# Quick setup script for FastAPI Backend Boilerplate
# This script sets up the local development environment

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "==================================="
echo "  FastAPI Backend Setup"
echo "==================================="
echo ""

# Check Python version
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: python3 is not installed"
    echo "   Please install Python 3.11+ and try again"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
echo "✓ Python version: $PYTHON_VERSION"

# Check if venv exists at project root
VENV_PATH="$PROJECT_ROOT/venv"
if [ ! -d "$VENV_PATH" ]; then
    echo ""
    echo "Creating virtual environment at project root..."
    python3 -m venv "$VENV_PATH"
    echo "✓ Virtual environment created"
else
    echo "✓ Virtual environment exists"
fi

# Activate virtual environment
echo ""
echo "Activating virtual environment..."
source "$VENV_PATH/bin/activate"
echo "✓ Virtual environment activated"

# Upgrade pip, setuptools, and wheel
echo ""
echo "Upgrading pip, setuptools, and wheel..."
pip install --quiet --upgrade pip setuptools wheel
echo "✓ Package managers upgraded"

# Install dependencies
echo ""
echo "Installing dependencies from requirements.txt..."
pip install --quiet -r requirements.txt
echo "✓ Dependencies installed"

# Check if PostgreSQL is running
echo ""
echo "Checking PostgreSQL connection..."
if command -v docker &> /dev/null; then
    if docker ps | grep -q "boiler_plate-postgres"; then
        echo "✓ PostgreSQL container is running"
    else
        echo "⚠️  PostgreSQL container is not running"
        echo ""
        echo "   Starting PostgreSQL with docker-compose..."
        cd "$PROJECT_ROOT"
        docker-compose up -d postgres
        echo ""
        echo "   Waiting for PostgreSQL to be ready..."
        sleep 5
        cd "$SCRIPT_DIR"
        echo "✓ PostgreSQL started"
    fi
else
    echo "⚠️  Docker not found. Please ensure PostgreSQL is running manually:"
    echo "   Host: localhost"
    echo "   Port: 5434"
    echo "   User: boiler_plate"
    echo "   Password: boiler_plate"
    echo "   Database: postgres"
fi

# Set environment variables for development
echo ""
echo "Setting environment variables..."
export DEVELOPMENT_MODE=true
export DATABASE_URL="postgresql+psycopg2://boiler_plate:boiler_plate@localhost:5434/postgres"
export POSTGRES_TEMPLATE_DB="boiler_plate_seed"
export POSTGRES_RUN_DB_PREFIX="boiler_plate_"

# Generate JWT secret if not set
if [ -z "$JWT_SECRET_KEY" ]; then
    export JWT_SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
    echo "✓ Generated JWT secret key (temporary for this session)"
else
    echo "✓ Using existing JWT_SECRET_KEY"
fi

echo ""
echo "==================================="
echo "  Setup Complete!"
echo "==================================="
echo ""
echo "📝 Quick Start:"
echo "   1. Server is about to start on http://localhost:8766"
echo "      (Database initializes automatically on startup)"
echo "   2. API docs: http://localhost:8766/docs"
echo "   3. Test users:"
echo "      • admin@example.com (admin role)"
echo "      • agent@example.com (agent role)"
echo "      • user@example.com (end-user role)"
echo ""
echo "📚 Generate a token:"
echo "   POST http://localhost:8766/api/v1/auth/token"
echo "   Body: {\"email\": \"admin@example.com\"}"
echo ""
echo "🔧 Environment:"
echo "   • Development mode: enabled"
echo "   • Auto-reload: enabled"
echo "   • Database: PostgreSQL (localhost:5434)"
echo ""
echo "==================================="
echo ""
read -p "Press Enter to start the server (or Ctrl+C to exit)..."

# Start development server
echo ""
echo "🚀 Starting development server..."
python run.py
