# MailG GCP VM Deployment Guide

This guide covers deploying the MailG application stack to a GCP Compute Engine VM instance using Docker Compose with automated GitHub Actions CI/CD.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Architecture Overview](#architecture-overview)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [GitHub Actions Configuration](#github-actions-configuration)
- [Deployment](#deployment)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)
- [Security Best Practices](#security-best-practices)

## Prerequisites

### GCP Requirements

- GCP account with billing enabled
- GCP project created
- `gcloud` CLI installed and configured
- Service account with appropriate permissions

### Local Requirements

- `gcloud` CLI installed
- SSH access to GCP VM
- GitHub repository with Actions enabled

### VM Requirements

- **Minimum:** e2-standard-4 (4 vCPU, 16GB RAM)
- **Recommended:** e2-standard-8 (8 vCPU, 32GB RAM) for production
- Ubuntu 22.04 LTS or Debian 11+
- At least 50GB disk space

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│              GCP Compute Engine VM                      │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Docker Compose Stack                     │  │
│  │                                                   │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │  │
│  │  │ Frontend │  │ Backend  │  │  PostgreSQL  │  │  │
│  │  │ :3002    │  │ :8766    │  │  :5436       │  │  │
│  │  └──────────┘  └──────────┘  └──────────────┘  │  │
│  │                                                   │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │  │
│  │  │Prometheus│  │ Grafana  │  │OTEL Collector│  │  │
│  │  │ :9090    │  │ :3000    │  │ :4318        │  │  │
│  │  └──────────┘  └──────────┘  └──────────────┘  │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Create GCP VM Instance

```bash
gcloud compute instances create mailg-vm \
  --zone=us-central1-a \
  --machine-type=e2-standard-4 \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=50GB \
  --tags=mailg-server \
  --metadata=startup-script='#!/bin/bash
    apt-get update
    apt-get install -y git'
```

### 2. Set Up VM

SSH into the VM and run the setup script:

```bash
gcloud compute ssh mailg-vm --zone=us-central1-a

# On the VM:
git clone <your-repo-url>
cd <repo-name>/deploy/gcp
chmod +x setup-vm.sh
./setup-vm.sh
```

### 3. Configure Environment

```bash
# Copy environment template
cp env.production.template .env.production

# Edit with your values
nano .env.production
```

### 4. Set Up Container Registry

```bash
chmod +x setup-container-registry.sh
./setup-container-registry.sh
```

### 5. Configure Firewall Rules

From your local machine:

```bash
chmod +x firewall-rules.sh
./firewall-rules.sh
```

## Detailed Setup

### Step 1: Create GCP VM

1. **Create VM Instance:**

```bash
gcloud compute instances create mailg-vm \
  --project=YOUR_PROJECT_ID \
  --zone=us-central1-a \
  --machine-type=e2-standard-4 \
  --network-interface=network-tier=PREMIUM,stack-type=IPV4,subnet=default \
  --maintenance-policy=MIGRATE \
  --provisioning-model=STANDARD \
  --service-account=SERVICE_ACCOUNT_EMAIL \
  --scopes=https://www.googleapis.com/auth/cloud-platform \
  --tags=mailg-server \
  --create-disk=auto-delete=yes,boot=yes,device-name=mailg-vm,image=projects/ubuntu-os-cloud/global/images/ubuntu-2204-jammy-v20240110,mode=rw,size=50,type=projects/YOUR_PROJECT_ID/zones/us-central1-a/diskTypes/pd-standard \
  --no-shielded-secure-boot \
  --shielded-vtpm \
  --shielded-integrity-monitoring \
  --labels=env=production,app=mailg \
  --reservation-affinity=any
```

2. **Reserve Static IP (optional but recommended):**

```bash
gcloud compute addresses create mailg-ip \
  --project=YOUR_PROJECT_ID \
  --region=us-central1

# Get the IP address
gcloud compute addresses describe mailg-ip --region=us-central1
```

3. **Attach Static IP to VM:**

```bash
gcloud compute instances add-access-config mailg-vm \
  --access-config-name="External NAT" \
  --address=STATIC_IP_ADDRESS \
  --zone=us-central1-a
```

### Step 2: VM Initial Setup

1. **SSH into VM:**

```bash
gcloud compute ssh mailg-vm --zone=us-central1-a
```

2. **Run Setup Script:**

```bash
# Clone repository or copy files
git clone <your-repo-url>
cd <repo-name>/deploy/gcp

# Make scripts executable
chmod +x *.sh

# Run setup
./setup-vm.sh
```

3. **Log out and back in** (for Docker group changes to take effect)

### Step 3: Configure Environment Variables

1. **Copy template:**

```bash
cp env.production.template .env.production
```

2. **Generate secure values:**

```bash
# Generate JWT secret
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# Generate PostgreSQL password
openssl rand -base64 32
```

3. **Edit .env.production** with your values:

```bash
nano .env.production
```

**Required values:**
- `GCP_PROJECT_ID`: Your GCP project ID
- `POSTGRES_PASSWORD`: Strong random password
- `JWT_SECRET_KEY`: Secure random value (32+ bytes)
- `BACKEND_IMAGE`: Container registry image URL
- `FRONTEND_IMAGE`: Container registry image URL

### Step 4: Set Up Container Registry

Run the setup script:

```bash
./setup-container-registry.sh
```

Follow the prompts to set up your preferred registry:
- **GCP Artifact Registry** (recommended)
- Docker Hub
- GitHub Container Registry

### Step 5: Configure Firewall Rules

From your local machine (with gcloud configured):

```bash
./firewall-rules.sh
```

Or manually create rules:

```bash
# Frontend
gcloud compute firewall-rules create mailg-frontend-http \
  --allow tcp:3002 \
  --source-ranges 0.0.0.0/0 \
  --target-tags mailg-server

# Backend
gcloud compute firewall-rules create mailg-backend-api \
  --allow tcp:8766 \
  --source-ranges 0.0.0.0/0 \
  --target-tags mailg-server

# PostgreSQL (internal only)
gcloud compute firewall-rules create mailg-postgres-internal \
  --allow tcp:5436 \
  --source-ranges 10.0.0.0/8 \
  --target-tags mailg-server
```

### Step 6: Set Up Systemd Service (Optional)

For auto-start on boot:

```bash
# Copy service file
sudo cp mailg.service /etc/systemd/system/

# Edit service file to match your user
sudo nano /etc/systemd/system/mailg.service

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable mailg.service
sudo systemctl start mailg.service
```

## GitHub Actions Configuration

The project uses a unified CI/CD pipeline (`.github/workflows/ci-cd.yml`) that handles:
1. **Test Stage**: Runs backend and frontend tests in parallel
2. **Build Stage**: Builds Docker images and pushes to GitHub Container Registry (GHCR)
3. **Deploy Stage**: Deploys to GCP VM using pre-built images from GHCR

### Workflow Triggers

- **Push to main/master/feature branches**: Runs test → build → deploy
- **Pull Requests**: Runs test → build only (no deployment)
- **Manual Dispatch**: Can trigger deployment with environment selection

### Required GitHub Secrets

Configure these in your repository settings (Settings → Secrets and variables → Actions):

1. **GCP Configuration:**
   - `GCP_PROJECT_ID`: Your GCP project ID
   - `GCP_ZONE`: VM zone (e.g., `us-central1-a`)
   - `GCP_REGION`: GCP region (e.g., `us-central1`)
   - `GCP_SERVICE_ACCOUNT_KEY`: JSON key for service account
   - `GCP_VM_HOST`: VM external IP or hostname
   - `GCP_VM_USER`: SSH username (usually your GCP username)
   - `GCP_SSH_PRIVATE_KEY`: Private SSH key for VM access

2. **Container Registry:**
   - Uses GitHub Container Registry (GHCR) by default
   - `GITHUB_TOKEN`: Automatically provided by GitHub Actions
   - For other registries, additional secrets may be needed

3. **Application (Optional):**
   - `VITE_APP_URL`: Frontend URL (if needed during build)

### Creating GCP Service Account

1. **Create service account:**

```bash
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions Service Account"
```

2. **Grant permissions:**

```bash
PROJECT_ID=your-project-id
SA_EMAIL=github-actions@${PROJECT_ID}.iam.gserviceaccount.com

# Grant necessary roles
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/compute.instanceAdmin.v1"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser"
```

3. **Create and download key:**

```bash
gcloud iam service-accounts keys create key.json \
  --iam-account=${SA_EMAIL}

# Copy the contents of key.json to GitHub secret GCP_SERVICE_ACCOUNT_KEY
```

### Setting Up SSH Key

1. **Generate SSH key pair:**

```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions
```

2. **Add public key to VM:**

```bash
gcloud compute instances add-metadata mailg-vm \
  --zone=us-central1-a \
  --metadata-from-file ssh-keys=<(echo "$(whoami):$(cat ~/.ssh/github_actions.pub)")

# Or manually add to ~/.ssh/authorized_keys on VM
```

3. **Add private key to GitHub secret `GCP_SSH_PRIVATE_KEY`:**

```bash
cat ~/.ssh/github_actions
# Copy output to GitHub secret
```

## Deployment

### Automated Deployment (GitHub Actions)

The unified CI/CD pipeline (`.github/workflows/ci-cd.yml`) automatically:

1. **On push to main/master/feature branches:**
   - Runs tests (backend + frontend)
   - Builds Docker images
   - Pushes images to GHCR
   - Deploys to GCP VM

2. **On pull requests:**
   - Runs tests and builds images
   - Does NOT deploy (for safety)

3. **Manual dispatch:**
   - Go to Actions → CI/CD Pipeline → Run workflow
   - Select environment (production/staging)
   - Optionally skip tests
   - Triggers full pipeline including deployment

### Manual Deployment

1. **Build and push images manually:**

```bash
# Build images
docker build -t mailg-backend:latest ./backend
docker build -t mailg-frontend:latest .

# Tag for registry
docker tag mailg-backend:latest gcr.io/PROJECT_ID/mailg-backend:latest
docker tag mailg-frontend:latest gcr.io/PROJECT_ID/mailg-frontend:latest

# Push
docker push gcr.io/PROJECT_ID/mailg-backend:latest
docker push gcr.io/PROJECT_ID/mailg-frontend:latest
```

2. **Deploy on VM:**

```bash
# SSH to VM
gcloud compute ssh mailg-vm --zone=us-central1-a

# On VM
cd ~/mailg-deploy
export BACKEND_IMAGE_TAG=gcr.io/PROJECT_ID/mailg-backend:latest
export FRONTEND_IMAGE_TAG=gcr.io/PROJECT_ID/mailg-frontend:latest
./deploy-from-registry.sh
```

### Deployment Scripts

- **`deploy.sh`**: Manual deployment with local builds
- **`deploy-from-registry.sh`**: Automated deployment from registry (used by GitHub Actions)

## Monitoring and Maintenance

### Health Checks

- **Backend:** `http://VM_IP:8766/health`
- **Frontend:** `http://VM_IP:3002/api/health`

### Viewing Logs

```bash
# All services
docker compose -f docker-compose.prod.yaml logs

# Specific service
docker compose -f docker-compose.prod.yaml logs backend
docker compose -f docker-compose.prod.yaml logs mailg

# Follow logs
docker compose -f docker-compose.prod.yaml logs -f
```

### Container Status

```bash
docker compose -f docker-compose.prod.yaml ps
```

### Database Backup

```bash
# Backup PostgreSQL
docker compose -f docker-compose.prod.yaml exec postgres pg_dump -U mailg postgres > backup.sql

# Restore
docker compose -f docker-compose.prod.yaml exec -T postgres psql -U mailg postgres < backup.sql
```

### Updating Services

1. **Pull latest images:**

```bash
docker pull gcr.io/PROJECT_ID/mailg-backend:latest
docker pull gcr.io/PROJECT_ID/mailg-frontend:latest
```

2. **Redeploy:**

```bash
./deploy-from-registry.sh
```

The deploy script starts the application stack **and** instrumentation (Prometheus, Grafana, OpenTelemetry Collector, cAdvisor, Node Exporter). For manual `docker compose up` on staging/production, use:

```bash
docker compose -f docker-compose.prod.yaml --profile instrumentation up -d
```

### Cleaning Up

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes (careful!)
docker volume prune

# Full cleanup
docker system prune -a --volumes
```

## Troubleshooting

### Services Not Starting

1. **Check logs:**

```bash
docker compose -f docker-compose.prod.yaml logs
```

2. **Check container status:**

```bash
docker compose -f docker-compose.prod.yaml ps
```

3. **Verify environment variables:**

```bash
cat .env.production
```

### Health Checks Failing

1. **Check if ports are accessible:**

```bash
curl http://localhost:8766/health
curl http://localhost:3002/api/health
```

2. **Check firewall rules:**

```bash
gcloud compute firewall-rules list --filter="targetTags:mailg-server"
```

3. **Verify containers are running:**

```bash
docker ps
```

### Database Connection Issues

1. **Check PostgreSQL is running:**

```bash
docker compose -f docker-compose.prod.yaml ps postgres
```

2. **Test connection:**

```bash
docker compose -f docker-compose.prod.yaml exec postgres psql -U mailg -d postgres -c "SELECT 1;"
```

3. **Check database URL in .env.production**

### Image Pull Failures

1. **Verify registry authentication:**

```bash
gcloud auth configure-docker
docker pull gcr.io/PROJECT_ID/mailg-backend:latest
```

2. **Check image exists in registry:**

```bash
gcloud artifacts docker images list gcr.io/PROJECT_ID/mailg-backend
```

### GitHub Actions Failures

1. **Check workflow logs** in GitHub Actions tab
2. **Verify secrets are set correctly**
3. **Test SSH connection manually:**

```bash
ssh -i ~/.ssh/github_actions VM_USER@VM_HOST
```

4. **Verify service account permissions**

## Security Best Practices

1. **Use strong passwords and secrets:**
   - Generate random values for `JWT_SECRET_KEY` and `POSTGRES_PASSWORD`
   - Never commit secrets to git

2. **Restrict firewall rules:**
   - Limit database port to internal network only
   - Consider restricting monitoring ports (Prometheus, Grafana)

3. **Use GCP IAM:**
   - Grant minimal required permissions
   - Use service accounts instead of user accounts

4. **Enable SSL/TLS:**
   - Use GCP Cloud Load Balancer with SSL certificates
   - Or set up Let's Encrypt certificates

5. **Regular updates:**
   - Keep Docker images updated
   - Apply security patches regularly

6. **Monitor access:**
   - Review GCP audit logs
   - Monitor GitHub Actions access

7. **Backup strategy:**
   - Regular database backups
   - Store backups in GCP Cloud Storage

## Additional Resources

- [GCP Compute Engine Documentation](https://cloud.google.com/compute/docs)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GCP Artifact Registry](https://cloud.google.com/artifact-registry/docs)

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review GitHub Actions workflow logs
3. Check container logs on the VM
4. Review GCP console for VM status

