#!/bin/bash
# =============================================================================
# Manual Deployment Script for MailG
# =============================================================================
# This script manually deploys MailG by building images locally
# For automated deployments, use deploy-from-registry.sh instead
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="${DEPLOY_DIR:-$HOME/mailg-deploy}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=========================================="
echo "MailG Manual Deployment"
echo "==========================================${NC}"

# Check if .env.production exists
if [ ! -f "$DEPLOY_DIR/.env.production" ]; then
    echo -e "${RED}Error: .env.production not found in $DEPLOY_DIR${NC}"
    echo "Please copy env.production.template to .env.production and configure it"
    exit 1
fi

# Load environment variables
set -a
source "$DEPLOY_DIR/.env.production"
set +a

# Validate required environment variables
REQUIRED_VARS=(
    "JWT_SECRET_KEY"
    "POSTGRES_PASSWORD"
    "GCP_PROJECT_ID"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var:-}" ]; then
        echo -e "${RED}Error: Required environment variable $var is not set${NC}"
        exit 1
    fi
done

# Check if JWT_SECRET_KEY is the default/weak value
if [[ "$JWT_SECRET_KEY" == *"CHANGE_ME"* ]] || [[ "$JWT_SECRET_KEY" == "mailg-local-dev-secret" ]]; then
    echo -e "${YELLOW}Warning: JWT_SECRET_KEY appears to be a default/weak value${NC}"
    echo "Please generate a secure random value for production"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Navigate to deploy directory
cd "$DEPLOY_DIR"

# Check if docker-compose.prod.yaml exists
if [ ! -f "docker-compose.prod.yaml" ]; then
    echo -e "${RED}Error: docker-compose.prod.yaml not found${NC}"
    exit 1
fi

# Pull latest code (if using git)
if [ -d ".git" ]; then
    echo -e "${GREEN}Pulling latest code...${NC}"
    git pull || echo -e "${YELLOW}Warning: git pull failed, continuing...${NC}"
fi

# Build Docker images
echo -e "${GREEN}Building Docker images...${NC}"
docker compose -f docker-compose.prod.yaml build

# Stop existing containers
echo -e "${GREEN}Stopping existing containers...${NC}"
docker compose -f docker-compose.prod.yaml down -v || true

# Remove container resources
echo -e "${GREEN}Removing container resources...${NC}"
docker system prune -a --volumes || true

# Start services
echo -e "${GREEN}Starting services...${NC}"
docker compose -f docker-compose.prod.yaml up -d

# Wait for services to be healthy
echo -e "${GREEN}Waiting for services to be healthy...${NC}"
sleep 10

# Health checks
echo -e "${GREEN}Running health checks...${NC}"

# Check backend
BACKEND_HEALTHY=false
for i in {1..30}; do
    if curl -fsS "http://localhost:${BACKEND_EXTERNAL_PORT:-8766}/health" > /dev/null 2>&1; then
        BACKEND_HEALTHY=true
        break
    fi
    echo "Waiting for backend... ($i/30)"
    sleep 2
done

# Check frontend
FRONTEND_HEALTHY=false
for i in {1..30}; do
    if curl -fsS "http://localhost:${FRONTEND_EXTERNAL_PORT:-3002}/api/health" > /dev/null 2>&1; then
        FRONTEND_HEALTHY=true
        break
    fi
    echo "Waiting for frontend... ($i/30)"
    sleep 2
done

# Display status
echo ""
echo -e "${GREEN}=========================================="
echo "Deployment Status"
echo "==========================================${NC}"
echo ""

# Check container status
docker compose -f docker-compose.prod.yaml ps

echo ""
if [ "$BACKEND_HEALTHY" = true ] && [ "$FRONTEND_HEALTHY" = true ]; then
    echo -e "${GREEN}✓ All services are healthy!${NC}"
    echo ""
    echo "Access URLs:"
    echo "  Frontend: http://$(curl -s ifconfig.me):${FRONTEND_EXTERNAL_PORT:-3002}"
    echo "  Backend:  http://$(curl -s ifconfig.me):${BACKEND_EXTERNAL_PORT:-8766}"
    echo "  Backend Health: http://$(curl -s ifconfig.me):${BACKEND_EXTERNAL_PORT:-8766}/health"
    exit 0
else
    echo -e "${RED}✗ Some services are not healthy${NC}"
    if [ "$BACKEND_HEALTHY" = false ]; then
        echo "  Backend health check failed"
    fi
    if [ "$FRONTEND_HEALTHY" = false ]; then
        echo "  Frontend health check failed"
    fi
    echo ""
    echo "Check logs with: docker compose -f docker-compose.prod.yaml logs"
    exit 1
fi
