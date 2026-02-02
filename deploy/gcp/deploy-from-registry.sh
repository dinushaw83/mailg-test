#!/bin/bash
# =============================================================================
# Deployment Script for GitHub Actions / Automated Deployments
# =============================================================================
# This script deploys MailG by pulling images from a container registry
# Designed to be run by GitHub Actions or other CI/CD systems
#
# Image tags can be passed via environment variables:
#   BACKEND_IMAGE="ghcr.io/owner/mailg-backend:sha"
#   FRONTEND_IMAGE="ghcr.io/owner/mailg-frontend:sha"
#
# Secrets should be configured in .env.production on the VM:
#   JWT_SECRET_KEY, POSTGRES_PASSWORD, etc.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="${DEPLOY_DIR:-$HOME/mailg-deploy}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

log "=========================================="
log "MailG Automated Deployment"
log "=========================================="

# =============================================================================
# STEP 1: Capture CI-passed image tags BEFORE loading .env.production
# =============================================================================
# This ensures CI/CD-provided values take priority over file values
CI_BACKEND_IMAGE="${BACKEND_IMAGE:-}"
CI_FRONTEND_IMAGE="${FRONTEND_IMAGE:-}"

if [ -n "$CI_BACKEND_IMAGE" ]; then
    info "Backend image from CI: $CI_BACKEND_IMAGE"
fi
if [ -n "$CI_FRONTEND_IMAGE" ]; then
    info "Frontend image from CI: $CI_FRONTEND_IMAGE"
fi

# =============================================================================
# STEP 2: Load .env.production for secrets (JWT, DB passwords, etc.)
# =============================================================================
if [ -f "$DEPLOY_DIR/.env.production" ]; then
    log "Loading secrets from .env.production..."
    set -a
    source "$DEPLOY_DIR/.env.production"
    set +a
else
    warn ".env.production not found in $DEPLOY_DIR"
    warn "Continuing with environment variables only..."
fi

# =============================================================================
# STEP 3: Determine final image tags (CI takes priority over file)
# =============================================================================
# Priority: CI-passed > .env.production > default
if [ -n "$CI_BACKEND_IMAGE" ]; then
    BACKEND_IMAGE_TAG="$CI_BACKEND_IMAGE"
elif [ -n "${BACKEND_IMAGE:-}" ]; then
    BACKEND_IMAGE_TAG="$BACKEND_IMAGE"
else
    BACKEND_IMAGE_TAG="ghcr.io/${GITHUB_REPOSITORY_OWNER:-owner}/mailg-backend:latest"
fi

if [ -n "$CI_FRONTEND_IMAGE" ]; then
    FRONTEND_IMAGE_TAG="$CI_FRONTEND_IMAGE"
elif [ -n "${FRONTEND_IMAGE:-}" ]; then
    FRONTEND_IMAGE_TAG="$FRONTEND_IMAGE"
else
    FRONTEND_IMAGE_TAG="ghcr.io/${GITHUB_REPOSITORY_OWNER:-owner}/mailg-frontend:latest"
fi

log "Backend image:  $BACKEND_IMAGE_TAG"
log "Frontend image: $FRONTEND_IMAGE_TAG"

# =============================================================================
# STEP 4: Validate secrets and warn about defaults
# =============================================================================

# JWT_SECRET_KEY is critical for security - must be set for production
if [ -z "${JWT_SECRET_KEY:-}" ]; then
    warn "JWT_SECRET_KEY is not set - using default from docker-compose"
    warn "⚠️  This is insecure for production! Anyone could forge tokens."
    warn ""
    warn "To fix, create .env.production on the VM:"
    warn "  cd ~/mailg-deploy"
    warn "  echo 'JWT_SECRET_KEY=your-secure-random-key' >> .env.production"
    warn ""
    warn "Generate a secure key with:"
    warn "  python3 -c \"import secrets; print(secrets.token_urlsafe(32))\""
    warn ""
elif [[ "$JWT_SECRET_KEY" == "mailg-local-dev-secret" ]] || [[ "$JWT_SECRET_KEY" == *"CHANGE_ME"* ]]; then
    warn "JWT_SECRET_KEY appears to be a default/weak value"
    warn "⚠️  Please use a secure random value for production!"
fi

# POSTGRES_PASSWORD is optional since docker-compose has a default
# But warn if using the default in production
if [ -z "${POSTGRES_PASSWORD:-}" ]; then
    info "Using default POSTGRES_PASSWORD from docker-compose (mailg)"
fi

# Navigate to deploy directory
cd "$DEPLOY_DIR"

# Check if docker-compose.prod.yaml exists
if [ ! -f "docker-compose.prod.yaml" ]; then
    error "docker-compose.prod.yaml not found"
    exit 1
fi

# =============================================================================
# STEP 5: Export image tags and config for docker-compose
# =============================================================================
# The production docker-compose.prod.yaml uses environment variables:
#   image: ${BACKEND_IMAGE:-gcr.io/.../mailg-backend:latest}
#   image: ${FRONTEND_IMAGE:-gcr.io/.../mailg-frontend:latest}
#   environment: BACKEND_API_URL=${BACKEND_API_URL:-...}
# We export these so docker-compose picks up the CI-passed values

export BACKEND_IMAGE="$BACKEND_IMAGE_TAG"
export FRONTEND_IMAGE="$FRONTEND_IMAGE_TAG"

# Export BACKEND_API_URL if provided (from CI/CD or .env.production)
if [ -n "${BACKEND_API_URL:-}" ]; then
    export BACKEND_API_URL
    log "Backend API URL configured: ${BACKEND_API_URL}"
else
    warn "BACKEND_API_URL not set, using default from docker-compose"
fi

log "Exported image tags and config for docker-compose:"
log "  BACKEND_IMAGE=${BACKEND_IMAGE}"
log "  FRONTEND_IMAGE=${FRONTEND_IMAGE}"
[ -n "${BACKEND_API_URL:-}" ] && log "  BACKEND_API_URL=${BACKEND_API_URL}"

# Validate docker-compose configuration
log "Validating docker-compose configuration..."
docker compose -f docker-compose.prod.yaml config > /dev/null || {
    error "docker-compose configuration is invalid"
    error "Showing docker-compose.prod.yaml content:"
    cat docker-compose.prod.yaml
    exit 1
}

# Authenticate with container registry if needed
if [[ "$BACKEND_IMAGE_TAG" == *"ghcr.io"* ]]; then
    log "Using GitHub Container Registry (GHCR)..."
    # GHCR login should be done before calling this script (via CI or manual docker login)
    if [ -n "${GITHUB_TOKEN:-}" ] && [ -n "${GITHUB_ACTOR:-}" ]; then
        log "Authenticating with GHCR..."
        echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_ACTOR" --password-stdin || warn "GHCR login failed"
    else
        info "GHCR credentials not provided, assuming already logged in"
    fi
elif [[ "$BACKEND_IMAGE_TAG" == *"gcr.io"* ]] || [[ "$BACKEND_IMAGE_TAG" == *"pkg.dev"* ]]; then
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
docker compose -f docker-compose.prod.yaml down -v --timeout 30 || {
    warn "Some containers may not have stopped gracefully"
}

log "Removing container resources..."
docker system prune -a --volumes || true

# Remove old images (optional cleanup)
if [ "${CLEANUP_OLD_IMAGES:-false}" = "true" ]; then
    log "Cleaning up old images..."
    docker image prune -f --filter "until=168h" || true
fi

# Start services (including instrumentation for staging/production)
log "Starting services..."
docker compose -f docker-compose.prod.yaml --profile instrumentation up -d

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
