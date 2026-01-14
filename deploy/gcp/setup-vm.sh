#!/bin/bash
# =============================================================================
# VM Setup Script for MailG Deployment
# =============================================================================
# This script sets up a GCP VM instance for running MailG with Docker Compose
# Run this script once on a fresh VM instance
# =============================================================================

set -euo pipefail

echo "=========================================="
echo "MailG VM Setup Script"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}Please do not run as root${NC}"
   exit 1
fi

# Update system packages
echo -e "${GREEN}[1/8] Updating system packages...${NC}"
sudo apt-get update
sudo apt-get upgrade -y

# Install required packages
echo -e "${GREEN}[2/8] Installing required packages...${NC}"
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    unzip \
    jq

# Install Docker
echo -e "${GREEN}[3/8] Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
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
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Add current user to docker group
    sudo usermod -aG docker $USER
    echo -e "${YELLOW}Note: You may need to log out and back in for docker group changes to take effect${NC}"
else
    echo "Docker is already installed"
fi

# Install Docker Compose (standalone if not using plugin)
echo -e "${GREEN}[4/8] Verifying Docker Compose...${NC}"
if ! docker compose version &> /dev/null; then
    echo "Docker Compose plugin not found, installing standalone..."
    DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | jq -r '.tag_name')
    sudo curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
else
    echo "Docker Compose is already installed"
fi

# Create necessary directories
echo -e "${GREEN}[5/8] Creating directories...${NC}"
mkdir -p ~/mailg-deploy
mkdir -p ~/mailg-deploy/backend/logs
mkdir -p ~/mailg-deploy/instrumentation/collector
mkdir -p ~/mailg-deploy/instrumentation/prometheus
mkdir -p ~/mailg-deploy/instrumentation/grafana/provisioning/datasources
mkdir -p ~/mailg-deploy/instrumentation/grafana/provisioning/dashboards
mkdir -p ~/mailg-deploy/instrumentation/grafana/dashboards

# Set up log rotation
echo -e "${GREEN}[6/8] Setting up log rotation...${NC}"
sudo tee /etc/logrotate.d/mailg > /dev/null <<EOF
~/mailg-deploy/backend/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0644 $USER $USER
}
EOF

# Configure swap (if needed)
echo -e "${GREEN}[7/8] Checking swap configuration...${NC}"
if [ -z "$(swapon --show)" ]; then
    echo "No swap detected. Creating 2GB swap file..."
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "Swap file created and enabled"
else
    echo "Swap is already configured"
fi

# Configure Docker to start on boot
echo -e "${GREEN}[8/8] Configuring Docker to start on boot...${NC}"
sudo systemctl enable docker
sudo systemctl start docker

# Display summary
echo ""
echo -e "${GREEN}=========================================="
echo "Setup Complete!"
echo "==========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Copy deployment files to ~/mailg-deploy/"
echo "2. Copy env.production.template to .env.production and configure it"
echo "3. Configure firewall rules (run firewall-rules.sh or manually)"
echo "4. Set up container registry authentication"
echo "5. Run deploy-from-registry.sh to deploy"
echo ""
echo "Useful commands:"
echo "  docker --version"
echo "  docker compose version"
echo "  docker ps"
echo ""

