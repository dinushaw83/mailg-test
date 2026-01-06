#!/bin/bash
# =============================================================================
# Deployment Script for GitHub Actions / Automated Deployments
# =============================================================================
# This script deploys MailG by pulling images from a container registry
# Designed to be run by GitHub Actions or other CI/CD systems
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="${DEPLOY_DIR:-$HOME/mailg-deploy}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

log "=========================================="
log "MailG Automated Deployment"
log "=========================================="

# Check if .env.production exists
if [ ! -f "$DEPLOY_DIR/.env.production" ]; then
    error ".env.production not found in $DEPLOY_DIR"
    error "Please ensure environment variables are set"
    exit 1
fi

# Load environment variables
set -a
source "$DEPLOY_DIR/.env.production"
set +a

# Image tags can be passed as environment variables or use defaults
BACKEND_IMAGE_TAG="${BACKEND_IMAGE_TAG:-${BACKEND_IMAGE:-gcr.io/${GCP_PROJECT_ID}/mailg-backend:latest}}"
FRONTEND_IMAGE_TAG="${FRONTEND_IMAGE_TAG:-${FRONTEND_IMAGE:-gcr.io/${GCP_PROJECT_ID}/mailg-frontend:latest}}"

log "Backend image: $BACKEND_IMAGE_TAG"
log "Frontend image: $FRONTEND_IMAGE_TAG"

# Validate required environment variables
REQUIRED_VARS=(
    "JWT_SECRET_KEY"
    "POSTGRES_PASSWORD"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var:-}" ]; then
        error "Required environment variable $var is not set"
        exit 1
    fi
done

# Navigate to deploy directory
cd "$DEPLOY_DIR"

# Check if docker-compose.prod.yaml exists
if [ ! -f "docker-compose.prod.yaml" ]; then
    error "docker-compose.prod.yaml not found"
    exit 1
fi

# Export image tags for docker-compose
export BACKEND_IMAGE="$BACKEND_IMAGE_TAG"
export FRONTEND_IMAGE="$FRONTEND_IMAGE_TAG"

# Validate docker-compose configuration
log "Validating docker-compose configuration..."
docker compose -f docker-compose.prod.yaml config > /dev/null || {
    error "docker-compose configuration is invalid"
    exit 1
}

# Authenticate with container registry if needed
if [[ "$BACKEND_IMAGE_TAG" == *"gcr.io"* ]] || [[ "$BACKEND_IMAGE_TAG" == *"pkg.dev"* ]]; then
    log "Authenticating with GCP container registry..."
    gcloud auth configure-docker --quiet || warn "GCP authentication failed, may need manual setup"
fi

# Pull latest images
log "Pulling latest images..."
docker pull "$BACKEND_IMAGE_TAG" || {
    error "Failed to pull backend image: $BACKEND_IMAGE_TAG"
    exit 1
}

docker pull "$FRONTEND_IMAGE_TAG" || {
    error "Failed to pull frontend image: $FRONTEND_IMAGE_TAG"
    exit 1
}

# Stop existing containers gracefully
log "Stopping existing containers..."
docker compose -f docker-compose.prod.yaml down --timeout 30 || {
    warn "Some containers may not have stopped gracefully"
}

# Remove old images (optional cleanup)
if [ "${CLEANUP_OLD_IMAGES:-false}" = "true" ]; then
    log "Cleaning up old images..."
    docker image prune -f --filter "until=168h" || true
fi

# Start services
log "Starting services..."
docker compose -f docker-compose.prod.yaml up -d

# Wait for services to start
log "Waiting for services to start..."
sleep 15

# Health checks with retries
log "Running health checks..."

check_health() {
    local url=$1
    local service=$2
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -fsS "$url" > /dev/null 2>&1; then
            log "$service is healthy"
            return 0
        fi
        if [ $attempt -lt $max_attempts ]; then
            log "Waiting for $service... ($attempt/$max_attempts)"
            sleep 2
        fi
        attempt=$((attempt + 1))
    done

    error "$service health check failed after $max_attempts attempts"
    return 1
}

# Check backend health
BACKEND_URL="http://localhost:${BACKEND_EXTERNAL_PORT:-8766}/health"
if ! check_health "$BACKEND_URL" "Backend"; then
    error "Backend health check failed"
    log "Backend logs:"
    docker compose -f docker-compose.prod.yaml logs backend --tail 50
    exit 1
fi

# Check frontend health
FRONTEND_URL="http://localhost:${FRONTEND_EXTERNAL_PORT:-3002}/api/health"
if ! check_health "$FRONTEND_URL" "Frontend"; then
    error "Frontend health check failed"
    log "Frontend logs:"
    docker compose -f docker-compose.prod.yaml logs mailg --tail 50
    exit 1
fi

# Verify all required services are running
log "Verifying all services are running..."
REQUIRED_SERVICES=("postgres" "backend" "mailg")
MISSING_SERVICES=()

for service in "${REQUIRED_SERVICES[@]}"; do
    if ! docker compose -f docker-compose.prod.yaml ps "$service" | grep -q "Up"; then
        MISSING_SERVICES+=("$service")
    fi
done

if [ ${#MISSING_SERVICES[@]} -gt 0 ]; then
    error "The following services are not running: ${MISSING_SERVICES[*]}"
    log "Container status:"
    docker compose -f docker-compose.prod.yaml ps
    exit 1
fi

# Display deployment summary
log "=========================================="
log "Deployment Successful!"
log "=========================================="
log ""
log "Container Status:"
docker compose -f docker-compose.prod.yaml ps
log ""
log "Services:"
log "  ✓ PostgreSQL: Running"
log "  ✓ Backend:    Running (http://localhost:${BACKEND_EXTERNAL_PORT:-8766})"
log "  ✓ Frontend:   Running (http://localhost:${FRONTEND_EXTERNAL_PORT:-3002})"
log ""
log "Health Endpoints:"
log "  Backend:  http://localhost:${BACKEND_EXTERNAL_PORT:-8766}/health"
log "  Frontend: http://localhost:${FRONTEND_EXTERNAL_PORT:-3002}/api/health"
log ""

# Optional: Display logs
if [ "${SHOW_LOGS:-false}" = "true" ]; then
    log "Recent logs:"
    docker compose -f docker-compose.prod.yaml logs --tail 20
fi

log "Deployment completed successfully!"

