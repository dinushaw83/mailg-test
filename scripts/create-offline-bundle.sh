#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BUNDLE_DIR="$PROJECT_DIR/mailg-offline-bundle"
BUNDLE_NAME="mailg-offline-bundle.tar.gz"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Detect docker compose command (plugin vs standalone)
if docker compose version &>/dev/null; then
    DOCKER_COMPOSE="docker compose"
elif command -v docker-compose &>/dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    error "Neither 'docker compose' nor 'docker-compose' found. Please install Docker Compose."
fi
log "Using: $DOCKER_COMPOSE"

# Parse arguments
PLATFORM=""
PLATFORM_FLAG=""

for arg in "$@"; do
    case $arg in
        --amd64|--x86|--x86_64)
            PLATFORM="linux/amd64"
            PLATFORM_FLAG="--platform linux/amd64"
            ;;
        --arm64|--arm)
            PLATFORM="linux/arm64"
            PLATFORM_FLAG="--platform linux/arm64"
            ;;
    esac
done

if [ -n "$PLATFORM" ]; then
    log "Building for platform: $PLATFORM"
fi

cd "$PROJECT_DIR"

# Clean up any previous bundle
rm -rf "$BUNDLE_DIR"
mkdir -p "$BUNDLE_DIR"

# Disable Apple-specific attestation metadata in Docker images
export BUILDX_NO_DEFAULT_ATTESTATIONS=1

log "Building Docker images..."
if [ -n "$PLATFORM" ]; then
    DOCKER_DEFAULT_PLATFORM="$PLATFORM" $DOCKER_COMPOSE build --no-cache
else
    $DOCKER_COMPOSE build
fi

# Core images
CORE_IMAGES=(
    "turing-mailg-aws-mailg"
    "mailg-backend:latest"
    "postgres:16-alpine"
)

# Instrumentation images
INSTRUMENTATION_IMAGES=(
    "ghcr.io/google/cadvisor:latest"
    "quay.io/prometheus/node-exporter:latest"
    "prom/prometheus:latest"
    "otel/opentelemetry-collector-contrib:latest"
    "grafana/grafana:latest"
)

# Pull external images
log "Pulling external images..."

# If platform specified, remove cached images first to ensure correct platform is pulled
if [ -n "$PLATFORM" ]; then
    log "Removing cached images to ensure correct platform..."
    docker rmi postgres:16-alpine 2>/dev/null || true
    for img in "${INSTRUMENTATION_IMAGES[@]}"; do
        docker rmi "$img" 2>/dev/null || true
    done
fi

docker pull $PLATFORM_FLAG postgres:16-alpine

log "Pulling instrumentation images..."
for img in "${INSTRUMENTATION_IMAGES[@]}"; do
    docker pull $PLATFORM_FLAG "$img"
done

# Build image list
IMAGES=("${CORE_IMAGES[@]}" "${INSTRUMENTATION_IMAGES[@]}")

# Save images to tar
log "Saving Docker images to tar (this may take a while)..."
docker save "${IMAGES[@]}" | gzip > "$BUNDLE_DIR/images.tar.gz"

# Copy required files
log "Copying configuration files..."

# docker-compose and env
cp docker-compose.prod.yaml "$BUNDLE_DIR/docker-compose.yaml"
[ -f .env.example ] && cp .env.example "$BUNDLE_DIR/"
[ -f readme.txt ] && cp readme.txt "$BUNDLE_DIR/"

# Backend fixtures and data_generation (mounted as volumes)
mkdir -p "$BUNDLE_DIR/backend/fixtures"
cp -r backend/fixtures/* "$BUNDLE_DIR/backend/fixtures/" 2>/dev/null || true

mkdir -p "$BUNDLE_DIR/data_generation"
cp -r data_generation/* "$BUNDLE_DIR/data_generation/"

# Instrumentation config files
mkdir -p  "$BUNDLE_DIR/instrumentation/prometheus"
cp instrumentation/prometheus/prometheus.yml "$BUNDLE_DIR/instrumentation/prometheus"
mkdir -p "$BUNDLE_DIR/instrumentation/collector"
cp instrumentation/collector/otel-collector-config.yaml "$BUNDLE_DIR/instrumentation/collector/"

mkdir -p "$BUNDLE_DIR/instrumentation/grafana/provisioning/datasources"
mkdir -p "$BUNDLE_DIR/instrumentation/grafana/provisioning/dashboards"
mkdir -p "$BUNDLE_DIR/instrumentation/grafana/dashboards"

cp instrumentation/grafana/grafana.ini "$BUNDLE_DIR/instrumentation/grafana/"
cp instrumentation/grafana/init.sh "$BUNDLE_DIR/instrumentation/grafana/"
cp instrumentation/grafana/provisioning/datasources/*.yml "$BUNDLE_DIR/instrumentation/grafana/provisioning/datasources/"
cp instrumentation/grafana/provisioning/dashboards/*.yml "$BUNDLE_DIR/instrumentation/grafana/provisioning/dashboards/"
cp instrumentation/grafana/dashboards/*.json "$BUNDLE_DIR/instrumentation/grafana/dashboards/"

# Create deployment script
cat > "$BUNDLE_DIR/start.sh" << 'DEPLOY_SCRIPT'
#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Detect docker compose command
if docker compose version &>/dev/null; then
    DOCKER_COMPOSE="docker compose"
elif command -v docker-compose &>/dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    echo "ERROR: Neither 'docker compose' nor 'docker-compose' found."
    exit 1
fi

if [ -f images.tar.gz ]; then
  echo "Loading Docker images (this may take a while)..."
  docker load < images.tar.gz
  rm images.tar.gz
fi

echo "Starting services..."
$DOCKER_COMPOSE --profile instrumentation up -d --no-build

echo ""
echo "Start complete!"
echo "  Frontend: http://localhost:3002"
echo "  Backend:  http://localhost:8766"
echo "  API Docs: http://localhost:8766/docs"
DEPLOY_SCRIPT
chmod +x "$BUNDLE_DIR/start.sh"

# Create stop script
cat > "$BUNDLE_DIR/stop.sh" << 'STOP_SCRIPT'
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Detect docker compose command
if docker compose version &>/dev/null; then
    DOCKER_COMPOSE="docker compose"
elif command -v docker-compose &>/dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    echo "ERROR: Neither 'docker compose' nor 'docker-compose' found."
    exit 1
fi

$DOCKER_COMPOSE --profile instrumentation down
echo "Services stopped."
STOP_SCRIPT
chmod +x "$BUNDLE_DIR/stop.sh"

# Create the final tarball
log "Creating final bundle..."
cd "$PROJECT_DIR"
# Strip macOS extended attributes and prevent ._ resource fork files
find "$BUNDLE_DIR" -exec xattr -c {} \; 2>/dev/null
COPYFILE_DISABLE=1 tar -c --no-xattr --no-mac-metadata -zvf "$BUNDLE_NAME" -C "$(dirname "$BUNDLE_DIR")" "$(basename "$BUNDLE_DIR")"

# Cleanup
#rm -rf "$BUNDLE_DIR"

# Summary
BUNDLE_SIZE=$(du -h "$BUNDLE_NAME" | cut -f1)
log "Bundle created: $BUNDLE_NAME ($BUNDLE_SIZE)"
echo ""
echo "To deploy on target machine:"
echo "  1. Copy $BUNDLE_NAME to target"
echo "  2. tar -xzf $BUNDLE_NAME"
echo "  3. cd mailg-offline-bundle"
echo "  4. ./start.sh"
