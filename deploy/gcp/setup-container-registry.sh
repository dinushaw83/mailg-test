#!/bin/bash
# =============================================================================
# Container Registry Setup Script
# =============================================================================
# This script sets up a container registry for MailG Docker images
# Supports: GCP Artifact Registry, Docker Hub, GitHub Container Registry
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=========================================="
echo "MailG Container Registry Setup"
echo "==========================================${NC}"

# Check if gcloud is installed (for GCP Artifact Registry)
if ! command -v gcloud &> /dev/null; then
    echo -e "${YELLOW}Warning: gcloud CLI is not installed${NC}"
    echo "GCP Artifact Registry setup will be skipped"
    GCP_AVAILABLE=false
else
    GCP_AVAILABLE=true
fi

# Get project ID
PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || echo '')}"
REGION="${GCP_REGION:-us-central1}"
REPO_NAME="${REGISTRY_REPO_NAME:-mailg}"

echo ""
echo "Select container registry type:"
echo "1) GCP Artifact Registry (recommended for GCP)"
echo "2) Docker Hub"
echo "3) GitHub Container Registry (GHCR)"
echo ""
read -p "Enter choice [1-3]: " choice

case $choice in
    1)
        if [ "$GCP_AVAILABLE" = false ]; then
            echo -e "${RED}Error: gcloud CLI is required for GCP Artifact Registry${NC}"
            exit 1
        fi

        if [ -z "$PROJECT_ID" ]; then
            read -p "Enter GCP Project ID: " PROJECT_ID
        fi

        echo ""
        echo -e "${GREEN}Setting up GCP Artifact Registry...${NC}"
        echo "Project: $PROJECT_ID"
        echo "Region: $REGION"
        echo "Repository: $REPO_NAME"

        # Enable Artifact Registry API
        echo "Enabling Artifact Registry API..."
        gcloud services enable artifactregistry.googleapis.com --project="$PROJECT_ID" || true

        # Create repository if it doesn't exist
        if gcloud artifacts repositories describe "$REPO_NAME" \
            --location="$REGION" \
            --project="$PROJECT_ID" &>/dev/null; then
            echo -e "${YELLOW}Repository '$REPO_NAME' already exists${NC}"
        else
            echo "Creating Artifact Registry repository..."
            gcloud artifacts repositories create "$REPO_NAME" \
                --repository-format=docker \
                --location="$REGION" \
                --description="MailG Docker images" \
                --project="$PROJECT_ID"
        fi

        # Configure Docker authentication
        echo "Configuring Docker authentication..."
        gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

        REGISTRY_URL="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}"
        echo ""
        echo -e "${GREEN}✓ GCP Artifact Registry setup complete!${NC}"
        echo ""
        echo "Registry URL: $REGISTRY_URL"
        echo ""
        echo "Image tags:"
        echo "  Backend:  $REGISTRY_URL/mailg-backend:TAG"
        echo "  Frontend: $REGISTRY_URL/mailg-frontend:TAG"
        echo ""
        echo "To push images:"
        echo "  docker tag mailg-backend:latest $REGISTRY_URL/mailg-backend:latest"
        echo "  docker push $REGISTRY_URL/mailg-backend:latest"
        ;;

    2)
        echo ""
        echo -e "${GREEN}Setting up Docker Hub...${NC}"
        read -p "Enter Docker Hub username: " DOCKERHUB_USERNAME

        echo ""
        echo "Docker Hub setup:"
        echo "1. Log in to Docker Hub:"
        echo "   docker login"
        echo ""
        echo "2. Tag and push images:"
        echo "   docker tag mailg-backend:latest $DOCKERHUB_USERNAME/mailg-backend:latest"
        echo "   docker push $DOCKERHUB_USERNAME/mailg-backend:latest"
        echo ""
        echo "Registry URL: docker.io/$DOCKERHUB_USERNAME"
        echo ""
        echo "Image tags:"
        echo "  Backend:  docker.io/$DOCKERHUB_USERNAME/mailg-backend:TAG"
        echo "  Frontend: docker.io/$DOCKERHUB_USERNAME/mailg-frontend:TAG"
        ;;

    3)
        echo ""
        echo -e "${GREEN}Setting up GitHub Container Registry...${NC}"
        read -p "Enter GitHub username/organization: " GH_USERNAME

        echo ""
        echo "GitHub Container Registry setup:"
        echo "1. Create a GitHub Personal Access Token (PAT) with 'write:packages' scope"
        echo "2. Log in to GHCR:"
        echo "   echo \$GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin"
        echo ""
        echo "Registry URL: ghcr.io/$GH_USERNAME"
        echo ""
        echo "Image tags:"
        echo "  Backend:  ghcr.io/$GH_USERNAME/mailg-backend:TAG"
        echo "  Frontend: ghcr.io/$GH_USERNAME/mailg-frontend:TAG"
        ;;

    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}=========================================="
echo "Setup Complete!"
echo "==========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Update .env.production with the registry URL and image tags"
echo "2. Build and push images using GitHub Actions or manually"
echo "3. Configure VM to authenticate with the registry"
echo ""

