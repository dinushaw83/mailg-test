#!/bin/bash
# =============================================================================
# Ensure Docker is Installed on VM
# =============================================================================
# This script checks if Docker is installed and installs it if missing
# Designed to be run via SSH from CI/CD pipelines
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

# Function to install Docker manually
install_docker_manual() {
    local user=$1
    log "Installing Docker manually..."
    
    # Update package list
    sudo apt-get update
    
    # Install prerequisites
    sudo apt-get install -y \
        ca-certificates \
        curl \
        gnupg \
        lsb-release
    
    # Add Docker's official GPG key
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    
    # Set up Docker repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker Engine
    sudo apt-get update
    sudo apt-get install -y \
        docker-ce \
        docker-ce-cli \
        containerd.io \
        docker-buildx-plugin \
        docker-compose-plugin
    
    # Add user to docker group
    sudo usermod -aG docker "$user"
    
    # Enable and start Docker
    sudo systemctl enable docker
    sudo systemctl start docker
    
    log "Docker installed successfully"
}

# Get the current user (defaults to $USER if not provided)
VM_USER="${1:-${USER}}"
DEPLOY_DIR="${2:-${HOME}/mailg-deploy}"

log "Checking Docker installation for user: $VM_USER"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    log "Docker not found. Installing Docker..."
    cd "$DEPLOY_DIR" || cd "$HOME"
    
    # Make setup script executable if it exists
    if [ -f "$DEPLOY_DIR/setup-vm.sh" ]; then
        chmod +x "$DEPLOY_DIR/setup-vm.sh" || true
    fi
    
    # Try to run setup script first
    if [ -f "$DEPLOY_DIR/setup-vm.sh" ]; then
        log "Running setup-vm.sh..."
        bash "$DEPLOY_DIR/setup-vm.sh" || {
            warn "Setup script failed. Attempting manual Docker installation..."
            install_docker_manual "$VM_USER"
        }
    else
        warn "Setup script not found. Installing Docker manually..."
        install_docker_manual "$VM_USER"
    fi
else
    log "Docker is already installed"
fi

# Verify Docker installation
if ! command -v docker &> /dev/null; then
    error "Docker installation failed"
    exit 1
fi

# Handle docker group membership (changes require logout/login, so use sg or sudo)
# Check if user can run docker without sudo
if ! docker ps &> /dev/null 2>&1; then
    warn "User not in docker group or needs to refresh. Adding to docker group..."
    # Try to add user to docker group if not already added
    sudo usermod -aG docker "$VM_USER" || true
    # Note: Changes take effect after logout/login, so we'll use sg or sudo as fallback
fi

# Verify docker compose is available
if ! docker compose version &> /dev/null 2>&1 && ! command -v docker-compose &> /dev/null; then
    log "Docker Compose not found. Installing..."
    DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep -oP '"tag_name": "\K[^"]*' || echo "v2.24.0")
    sudo curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Display Docker version
log "Docker installation verified:"
docker --version
docker compose version 2>/dev/null || docker-compose --version 2>/dev/null || true

log "✅ Docker setup complete"

