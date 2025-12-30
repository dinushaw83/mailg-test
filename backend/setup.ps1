# Quick setup script for FastAPI Backend Mailg (Windows)
# This script sets up the local development environment

$ErrorActionPreference = "Stop"

# Get script directory
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$PROJECT_ROOT = Split-Path -Parent $SCRIPT_DIR
Set-Location $SCRIPT_DIR

Write-Host ""
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "  FastAPI Backend Setup (Windows)" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Check Python version
try {
    $pythonVersion = python --version 2>&1
    if ($pythonVersion -match "Python (\d+\.\d+)") {
        Write-Host "[OK] Python version: $($matches[1])" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Could not determine Python version" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[ERROR] Python is not installed or not in PATH" -ForegroundColor Red
    Write-Host "   Please install Python 3.11+ and try again" -ForegroundColor Yellow
    exit 1
}

# Check if venv exists at project root
$VENV_PATH = Join-Path $PROJECT_ROOT "venv"
if (-Not (Test-Path $VENV_PATH)) {
    Write-Host ""
    Write-Host "Creating virtual environment at project root..." -ForegroundColor Yellow
    python -m venv "$VENV_PATH"
    Write-Host "[OK] Virtual environment created" -ForegroundColor Green
} else {
    Write-Host "[OK] Virtual environment exists" -ForegroundColor Green
}

# Activate virtual environment
Write-Host ""
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
$activateScript = Join-Path $VENV_PATH "Scripts\Activate.ps1"
if (Test-Path $activateScript) {
    & $activateScript
    Write-Host "[OK] Virtual environment activated" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Could not find activation script" -ForegroundColor Red
    exit 1
}

# Upgrade pip, setuptools, and wheel
Write-Host ""
Write-Host "Upgrading pip, setuptools, and wheel..." -ForegroundColor Yellow
python -m pip install --quiet --upgrade pip setuptools wheel
Write-Host "[OK] Package managers upgraded" -ForegroundColor Green

# Install dependencies
Write-Host ""
Write-Host "Installing dependencies from requirements.txt..." -ForegroundColor Yellow
pip install --quiet -r requirements.txt
Write-Host "[OK] Dependencies installed" -ForegroundColor Green

# Check if PostgreSQL is running
Write-Host ""
Write-Host "Checking PostgreSQL connection..." -ForegroundColor Yellow
try {
    $dockerPs = docker ps 2>&1
    if ($dockerPs -match "mailg-postgres") {
        Write-Host "[OK] PostgreSQL container is running" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] PostgreSQL container is not running" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "   Starting PostgreSQL with docker-compose..." -ForegroundColor Yellow
        Set-Location $PROJECT_ROOT
        docker-compose up -d postgres
        Write-Host ""
        Write-Host "   Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
        Set-Location $SCRIPT_DIR
        Write-Host "[OK] PostgreSQL started" -ForegroundColor Green
    }
} catch {
    Write-Host "[WARNING] Docker not found or not running." -ForegroundColor Yellow
    Write-Host "   Please ensure PostgreSQL is running manually:" -ForegroundColor Yellow
    Write-Host "   Host: localhost" -ForegroundColor White
    Write-Host "   Port: 5434" -ForegroundColor White
    Write-Host "   User: mailg" -ForegroundColor White
    Write-Host "   Password: mailg" -ForegroundColor White
    Write-Host "   Database: postgres" -ForegroundColor White
}

# Set environment variables for development
Write-Host ""
Write-Host "Setting environment variables..." -ForegroundColor Yellow
$env:DEVELOPMENT_MODE = "true"
$env:DATABASE_URL = "postgresql+psycopg2://mailg:mailg@localhost:5434/postgres"
$env:POSTGRES_TEMPLATE_DB = "mailg_seed"
$env:POSTGRES_RUN_DB_PREFIX = "mailg_"

# Generate JWT secret if not set
if (-Not $env:JWT_SECRET_KEY) {
    $env:JWT_SECRET_KEY = python -c "import secrets; print(secrets.token_urlsafe(32))"
    Write-Host "[OK] Generated JWT secret key (temporary for this session)" -ForegroundColor Green
} else {
    Write-Host "[OK] Using existing JWT_SECRET_KEY" -ForegroundColor Green
}

Write-Host ""
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Quick Start:" -ForegroundColor Cyan
Write-Host "   1. Server is about to start on http://localhost:8766"
Write-Host "      (Database initializes automatically on startup)"
Write-Host "   2. API docs: http://localhost:8766/docs"
Write-Host "   3. Test users:"
Write-Host "      - admin@example.com (admin role)"
Write-Host "      - agent@example.com (agent role)"
Write-Host "      - user@example.com (end-user role)"
Write-Host ""
Write-Host "Generate a token:" -ForegroundColor Cyan
Write-Host "   POST http://localhost:8766/api/v1/auth/token"
Write-Host "   Body: {`"email`": `"admin@example.com`"}"
Write-Host ""
Write-Host "Environment:" -ForegroundColor Cyan
Write-Host "   - Development mode: enabled"
Write-Host "   - Auto-reload: enabled"
Write-Host "   - Database: PostgreSQL (localhost:5434)"
Write-Host ""
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting development server..." -ForegroundColor Green
python run.py
