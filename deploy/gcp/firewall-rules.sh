#!/bin/bash
# =============================================================================
# GCP Firewall Rules Setup Script
# =============================================================================
# This script creates firewall rules for MailG services on GCP
# Run this script from your local machine with gcloud CLI configured
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=========================================="
echo "MailG Firewall Rules Setup"
echo "==========================================${NC}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed${NC}"
    echo "Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Get project ID
PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Error: GCP_PROJECT_ID not set and no default project configured${NC}"
    echo "Set GCP_PROJECT_ID environment variable or run: gcloud config set project PROJECT_ID"
    exit 1
fi

echo "Using GCP Project: $PROJECT_ID"

# Function to create firewall rule if it doesn't exist
create_firewall_rule() {
    local rule_name=$1
    local description=$2
    local ports=$3
    local target_tags=$4
    local source_ranges=$5

    if gcloud compute firewall-rules describe "$rule_name" --project="$PROJECT_ID" &>/dev/null; then
        echo -e "${YELLOW}Firewall rule '$rule_name' already exists, skipping...${NC}"
    else
        echo -e "${GREEN}Creating firewall rule: $rule_name${NC}"
        gcloud compute firewall-rules create "$rule_name" \
            --project="$PROJECT_ID" \
            --description="$description" \
            --direction=INGRESS \
            --priority=1000 \
            --network=default \
            --action=ALLOW \
            --rules=tcp:"$ports" \
            --source-ranges="$source_ranges" \
            --target-tags="$target_tags" \
            --enable-logging
    fi
}

# Create firewall rules
echo ""
echo -e "${GREEN}Creating firewall rules...${NC}"

# Frontend (HTTP)
create_firewall_rule \
    "mailg-frontend-http" \
    "Allow HTTP traffic to MailG frontend" \
    "3002" \
    "mailg-server" \
    "0.0.0.0/0"

# Backend API
create_firewall_rule \
    "mailg-backend-api" \
    "Allow API traffic to MailG backend" \
    "8766" \
    "mailg-server" \
    "0.0.0.0/0"

# PostgreSQL (restricted to internal network only)
create_firewall_rule \
    "mailg-postgres-internal" \
    "Allow PostgreSQL traffic from internal network only" \
    "5436" \
    "mailg-server" \
    "10.0.0.0/8"

# Prometheus (optional - consider restricting)
read -p "Create firewall rule for Prometheus (port 9090)? This exposes metrics. (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    create_firewall_rule \
        "mailg-prometheus" \
        "Allow Prometheus metrics access" \
        "9090" \
        "mailg-server" \
        "0.0.0.0/0"
else
    echo -e "${YELLOW}Skipping Prometheus firewall rule${NC}"
fi

# Grafana (optional - consider restricting)
read -p "Create firewall rule for Grafana (port 3000)? This exposes dashboards. (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    create_firewall_rule \
        "mailg-grafana" \
        "Allow Grafana dashboard access" \
        "3000" \
        "mailg-server" \
        "0.0.0.0/0"
else
    echo -e "${YELLOW}Skipping Grafana firewall rule${NC}"
fi

# cAdvisor (optional - consider restricting)
read -p "Create firewall rule for cAdvisor (port 8090)? This exposes container metrics. (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    create_firewall_rule \
        "mailg-cadvisor" \
        "Allow cAdvisor container metrics access" \
        "8090" \
        "mailg-server" \
        "0.0.0.0/0"
else
    echo -e "${YELLOW}Skipping cAdvisor firewall rule${NC}"
fi

echo ""
echo -e "${GREEN}=========================================="
echo "Firewall Rules Setup Complete!"
echo "==========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Apply the 'mailg-server' network tag to your VM instance:"
echo "   gcloud compute instances add-tags INSTANCE_NAME --tags=mailg-server --zone=ZONE"
echo ""
echo "2. Or create the VM with the tag:"
echo "   gcloud compute instances create INSTANCE_NAME ... --tags=mailg-server"
echo ""
echo "Security recommendations:"
echo "- Consider using GCP Cloud Load Balancer with SSL for frontend/backend"
echo "- Restrict Prometheus, Grafana, and cAdvisor to specific IP ranges"
echo "- Use VPC firewall rules for additional security"
echo ""

