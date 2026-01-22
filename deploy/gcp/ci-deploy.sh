#!/bin/bash
# =============================================================================
# CI/CD Deployment Script
# =============================================================================
# This script handles deployment from CI/CD pipelines
# It includes helper functions to handle Docker group membership issues
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Default values
DEPLOY_DIR="${DEPLOY_DIR:-${HOME}/mailg-deploy}"
BACKEND_IMAGE="${BACKEND_IMAGE:-}"
FRONTEND_IMAGE="${FRONTEND_IMAGE:-}"
GCP_PROJECT_ID="${GCP_PROJECT_ID:-}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
GITHUB_ACTOR="${GITHUB_ACTOR:-}"

# Validate required environment variables
if [ -z "$BACKEND_IMAGE" ] || [ -z "$FRONTEND_IMAGE" ]; then
    error "BACKEND_IMAGE and FRONTEND_IMAGE must be set"
    exit 1
fi

log "=========================================="
log "CI/CD Deployment Script"
log "=========================================="
log "Backend image:  $BACKEND_IMAGE"
log "Frontend image: $FRONTEND_IMAGE"
log "Deploy directory: $DEPLOY_DIR"

# Navigate to deploy directory
cd "$DEPLOY_DIR" || {
    error "Deploy directory not found: $DEPLOY_DIR"
    exit 1
}

# Helper function to run docker commands (handles group membership)
docker_cmd() {
    if docker ps &> /dev/null 2>&1; then
        docker "$@"
    elif sg docker -c "docker $*" 2>/dev/null; then
        sg docker -c "docker $*"
    else
        sudo docker "$@"
    fi
}

# Helper function to run docker compose commands
docker_compose_cmd() {
    if docker compose version &> /dev/null 2>&1; then
        if docker ps &> /dev/null 2>&1; then
            docker compose "$@"
        elif sg docker -c "docker compose $*" 2>/dev/null; then
            sg docker -c "docker compose $*"
        else
            sudo docker compose "$@"
        fi
    elif command -v docker-compose &> /dev/null; then
        if docker ps &> /dev/null 2>&1; then
            docker-compose "$@"
        elif sg docker -c "docker-compose $*" 2>/dev/null; then
            sg docker -c "docker-compose $*"
        else
            sudo docker-compose "$@"
        fi
    else
        error "Neither 'docker compose' nor 'docker-compose' is available"
        exit 1
    fi
}

# Log in to container registry if GitHub token is provided
if [ -n "$GITHUB_TOKEN" ] && [ -n "$GITHUB_ACTOR" ]; then
    log "Logging in to GitHub Container Registry..."
    echo "$GITHUB_TOKEN" | docker_cmd login ghcr.io -u "$GITHUB_ACTOR" --password-stdin || {
        warn "Failed to login to GHCR, continuing anyway..."
    }
fi

# Log in to GCP Container Registry if using GCP
if [ -n "$GCP_PROJECT_ID" ] && command -v gcloud &> /dev/null; then
    if [[ "$BACKEND_IMAGE" == *"gcr.io"* ]] || [[ "$BACKEND_IMAGE" == *"pkg.dev"* ]]; then
        log "Authenticating with GCP container registry..."
        gcloud auth configure-docker --quiet || warn "GCP authentication failed"
    fi
fi

# Make scripts executable
chmod +x deploy-from-registry.sh ensure-docker.sh 2>/dev/null || true

# Update docker-compose.prod.yaml with image tags
if [ -f docker-compose.prod.yaml ]; then
    log "Updating docker-compose.prod.yaml with image tags..."
    sed -i "s|image:.*mailg-backend.*|image: ${BACKEND_IMAGE}|g" docker-compose.prod.yaml || true
    sed -i "s|image:.*mailg-frontend.*|image: ${FRONTEND_IMAGE}|g" docker-compose.prod.yaml || true
else
    warn "docker-compose.prod.yaml not found, skipping image tag update"
fi

# Pull images from registry
log "Pulling images from registry..."
docker_cmd pull "$BACKEND_IMAGE" || {
    warn "Failed to pull backend image: $BACKEND_IMAGE"
}

docker_cmd pull "$FRONTEND_IMAGE" || {
    warn "Failed to pull frontend image: $FRONTEND_IMAGE"
}

# Stop existing containers
log "Stopping existing containers..."
docker_compose_cmd -f docker-compose.prod.yaml down --timeout 30 || {
    warn "Some containers may not have stopped gracefully"
}

# Start services with new images
log "Starting services with new images..."
export BACKEND_IMAGE
export FRONTEND_IMAGE
docker_compose_cmd -f docker-compose.prod.yaml up -d

# Wait for services to start
log "Waiting for services to start..."
sleep 15

# Display container status
log "Container status:"
docker_compose_cmd -f docker-compose.prod.yaml ps

log "=========================================="
log "Deployment completed successfully!"
log "=========================================="

