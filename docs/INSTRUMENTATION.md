# Instrumentation & Observability Guide

This document describes the observability stack integrated into the Mailg application, including metrics collection, dashboards, and programmatic access to monitoring data.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Components](#components)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Backend Integration](#backend-integration)
- [Frontend Integration](#frontend-integration)
- [Metrics API](#metrics-api)
- [Grafana Dashboards](#grafana-dashboards)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

---

## Overview

The instrumentation stack provides full observability for the Mailg application:

| Capability | Tool | Description |
|------------|------|-------------|
| Metrics Collection | OpenTelemetry SDK | Collects HTTP request metrics from backend and frontend |
| Metrics Pipeline | OTEL Collector | Receives, processes, and exports metrics |
| Metrics Storage | Prometheus | Time-series database for metrics |
| Visualization | Grafana | Dashboards and alerting |
| Container Metrics | cAdvisor | Docker container resource usage |
| Host Metrics | Node Exporter | System-level metrics (CPU, memory, disk) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Application Layer                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────────┐                    ┌──────────────────┐              │
│   │  Backend         │                    │  Frontend        │              │
│   │  (FastAPI)       │                    │  (React/Vite)    │              │
│   │                  │                    │                  │              │
│   │  OTEL SDK        │                    │  OTEL SDK        │              │
│   │  - Traces        │                    │  - Fetch metrics │              │
│   │  - Metrics       │                    │                  │              │
│   └────────┬─────────┘                    └────────┬─────────┘              │
│            │                                       │                         │
│            │  OTLP HTTP (port 4318)                │                         │
│            └───────────────┬───────────────────────┘                         │
│                            ▼                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                           Telemetry Pipeline                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                    ┌──────────────────────┐                                  │
│                    │   OTEL Collector     │                                  │
│                    │                      │                                  │
│                    │  Receivers:          │                                  │
│                    │  - OTLP HTTP (:4318) │                                  │
│                    │  - OTLP gRPC (:4317) │                                  │
│                    │                      │                                  │
│                    │  Exporters:          │                                  │
│                    │  - Prometheus (:9464)│                                  │
│                    └──────────┬───────────┘                                  │
│                               │                                              │
│            ┌──────────────────┼──────────────────┐                          │
│            ▼                  ▼                  ▼                          │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                    │
│   │  cAdvisor   │    │ Node        │    │ App Metrics │                    │
│   │  (:8080)    │    │ Exporter    │    │ (:9464)     │                    │
│   │             │    │ (:9100)     │    │             │                    │
│   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                    │
│          │                  │                  │                            │
│          └──────────────────┼──────────────────┘                            │
│                             ▼                                                │
│                    ┌──────────────────────┐                                  │
│                    │     Prometheus       │                                  │
│                    │     (:9090)          │                                  │
│                    │                      │                                  │
│                    │  Scrape Targets:     │                                  │
│                    │  - otel-collector    │                                  │
│                    │  - cadvisor          │                                  │
│                    │  - node_exporter     │                                  │
│                    └──────────┬───────────┘                                  │
│                               │                                              │
│                               ▼                                              │
│                    ┌──────────────────────┐                                  │
│                    │      Grafana         │                                  │
│                    │      (:3000)         │                                  │
│                    │                      │                                  │
│                    │  Dashboards:         │                                  │
│                    │  - Backend Overview  │                                  │
│                    │  - Frontend Overview │                                  │
│                    │  - Docker & System   │                                  │
│                    └──────────────────────┘                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Components

### OpenTelemetry Collector

**Purpose**: Central hub for receiving telemetry data from applications and exporting to backends.

**Configuration File**: `instrumentation/collector/otel-collector-config.yaml`

```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: "0.0.0.0:4318"
      grpc:
        endpoint: "0.0.0.0:4317"

processors:
  batch:

exporters:
  prometheus:
    endpoint: "0.0.0.0:9464"

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheus]
```

**How It Works**:
1. **Receivers**: Accept telemetry via OTLP protocol (HTTP on 4318, gRPC on 4317)
2. **Processors**: Batch data for efficient export
3. **Exporters**: Convert to Prometheus format on port 9464
4. **Pipelines**: Define data flow from receivers → processors → exporters

---

### Prometheus

**Purpose**: Time-series database that scrapes and stores metrics.

**Configuration File**: `instrumentation/prometheus/prometheus.yml`

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: cadvisor
    scrape_interval: 5s
    static_configs:
      - targets:
        - cadvisor:8080

  - job_name: "app-metrics"
    static_configs:
      - targets: ["otel-collector:9464"]

  - job_name: "node_exporter"
    static_configs:
      - targets: ["node_exporter:9100"]
```

**Scrape Targets**:
| Job | Target | Interval | Metrics |
|-----|--------|----------|---------|
| `cadvisor` | cadvisor:8080 | 5s | Container resource usage |
| `app-metrics` | otel-collector:9464 | 15s | Backend/frontend HTTP metrics |
| `node_exporter` | node_exporter:9100 | 15s | Host system metrics |

---

### Grafana

**Purpose**: Visualization and dashboarding platform.

#### Configuration File: `instrumentation/grafana/grafana.ini`

```ini
[feature_toggles]
provisioning = true

[paths]
permitted_provisioning_paths = grafana/ | /etc/grafana/provisioning/

[log]
level = warn
```

#### Datasource Configuration: `instrumentation/grafana/provisioning/datasources/prometheus-ds.yml`

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    uid: prometheus_ds
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
```

#### Dashboard Provisioning: `instrumentation/grafana/provisioning/dashboards/dashboards.yml`

```yaml
apiVersion: 1

providers:
  - name: 'default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    options:
      path: /var/lib/grafana/dashboards
```

#### User Initialization Script: `instrumentation/grafana/init.sh`

This script runs on startup to create a read-only viewer user:

```bash
#!/bin/sh
ADMIN_USER=admin
ADMIN_PASS="${GF_SECURITY_ADMIN_PASSWORD:-admin}"
VIEWER_USER="${GF_VIEWER_USER:-readonly}"
VIEWER_PASS="${GF_VIEWER_PASSWORD:-readonly}"

# Wait for Grafana to be ready
until curl -sf "http://localhost:3000/api/health" >/dev/null 2>&1; do
  sleep 1
done

# Create viewer user with Viewer role
curl -sf -u "$ADMIN_USER:$ADMIN_PASS" \
  -X POST "http://localhost:3000/api/admin/users" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"$VIEWER_USER\",
    \"login\": \"$VIEWER_USER\",
    \"password\": \"$VIEWER_PASS\"
  }"
```

**Default Credentials**:
| User | Password | Role |
|------|----------|------|
| admin | admin | Admin |
| readonly | readonly | Viewer |

---

### cAdvisor

**Purpose**: Container resource usage and performance metrics.

**Metrics Exposed**:
| Metric | Description |
|--------|-------------|
| `container_cpu_usage_seconds_total` | Cumulative CPU time consumed |
| `container_memory_usage_bytes` | Current memory usage |
| `container_network_receive_bytes_total` | Network bytes received |
| `container_network_transmit_bytes_total` | Network bytes transmitted |
| `container_fs_usage_bytes` | Filesystem bytes used |

**Requirements**:
- Privileged container access
- Host filesystem mounts (`/`, `/var/run`, `/sys`, `/var/lib/docker`)
- Docker socket access

---

### Node Exporter

**Purpose**: Host system metrics (requires Linux host).

**Metrics Exposed**:
| Metric | Description |
|--------|-------------|
| `node_cpu_seconds_total` | CPU time in each mode |
| `node_memory_MemTotal_bytes` | Total memory |
| `node_memory_MemAvailable_bytes` | Available memory |
| `node_filesystem_size_bytes` | Filesystem size |
| `node_filesystem_avail_bytes` | Filesystem available space |
| `node_network_receive_bytes_total` | Network bytes received |
| `node_load1` | 1-minute load average |

**Requirements**:
- Linux host (limited on Windows/macOS Docker Desktop)
- Privileged container access
- Host PID namespace (`pid: host`)
- Host filesystem mount (`/:/host:ro`)

---

## Quick Start

### Run WITHOUT Instrumentation (Default)

```powershell
# Windows PowerShell
.\run-docker.ps1

# Or directly with docker compose
docker compose up -d
```

### Run WITH Instrumentation

```powershell
# Start all services including instrumentation
docker compose --profile instrumentation up -d

# Enable telemetry in backend (required for metrics)
$env:OTEL_SDK_DISABLED="false"
docker compose up -d backend --force-recreate
```

### Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| Grafana | http://localhost:3000 | admin/admin |
| Prometheus | http://localhost:9090 | - |
| Backend API | http://localhost:8766 | - |
| Metrics API | http://localhost:8766/api/v1/metrics/health | - |
| cAdvisor | http://localhost:8090 | - |

---

## Configuration

### Docker Compose Services

The instrumentation services are defined in `docker-compose.yaml` under the `instrumentation` profile. Below is the complete configuration for each service.

### Network Configuration

All services communicate over the `mailg-network` Docker bridge network, enabling DNS-based service discovery:

```yaml
networks:
  mailg-network:
    driver: bridge
```

### Volumes

```yaml
volumes:
  backend_logs:
  postgres_data:
  prometheus_data:    # Added for instrumentation
```

---

### Backend Service (Updated)

The backend service was updated to include OpenTelemetry environment variables:

```yaml
backend:
  build:
    context: ./backend
    dockerfile: Dockerfile
  image: mailg-backend:latest
  container_name: mailg-backend
  depends_on:
    postgres:
      condition: service_healthy
  environment:
    - DEVELOPMENT_MODE=${DEVELOPMENT_MODE:-false}
    - DB_BACKEND=postgres
    - DATABASE_URL=postgresql+psycopg2://mailg:mailg@postgres:5432/postgres
    - POSTGRES_ADMIN_DB=postgres
    - POSTGRES_TEMPLATE_DB=mailg_seed
    - POSTGRES_RUN_DB_PREFIX=mailg_
    - UVICORN_WORKERS=1
    - JWT_SECRET_KEY=${JWT_SECRET_KEY:-mailg-local-dev-secret}
    - JWT_ACCESS_TOKEN_TTL_SECONDS=86400
    # OpenTelemetry configuration (NEW)
    - OTEL_SDK_DISABLED=${OTEL_SDK_DISABLED:-true}
    - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
    - OTEL_SERVICE_NAME=mailg-backend
    # Prometheus URL for metrics API (NEW)
    - PROMETHEUS_URL=http://prometheus:9090
  volumes:
    - backend_logs:/app/backend/logs
    - ./backend/fixtures:/seed/fixtures:ro
  ports:
    - "8766:8765"
  networks:
    - mailg-network
  restart: unless-stopped
  healthcheck:
    test: ["CMD-SHELL", "curl -fsS http://localhost:8765/health >/dev/null || exit 1"]
    interval: 10s
    timeout: 5s
    retries: 5
    start_period: 15s
```

**Changes Made**:
- Added `OTEL_SDK_DISABLED` - Controls whether telemetry is enabled
- Added `OTEL_EXPORTER_OTLP_ENDPOINT` - Points to OTEL Collector
- Added `OTEL_SERVICE_NAME` - Service identifier in metrics
- Added `PROMETHEUS_URL` - For Metrics API to query Prometheus
- Added `networks: mailg-network` - For service discovery

---

### Frontend Service (Updated)

The frontend service was updated to include instrumentation environment variables:

```yaml
mailg:
  build:
    context: .
    dockerfile: Dockerfile
  container_name: mailg-app
  ports:
    - "3002:3000" 
  environment:
    - NODE_ENV=production
    - PORT=3000
    - VITE_RUN_MODE=localstorage
    # OpenTelemetry configuration (NEW)
    - VITE_ENABLE_INSTRUMENTATION=${VITE_ENABLE_INSTRUMENTATION:-false}
    - VITE_OTEL_COLLECTOR_URL=${VITE_OTEL_COLLECTOR_URL:-http://localhost:4318}
  networks:
    - mailg-network
  restart: unless-stopped
  healthcheck:
    test: ["CMD-SHELL", "wget --quiet --tries=1 --spider http://localhost:3000/api/health || exit 1"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s
```

**Changes Made**:
- Added `VITE_ENABLE_INSTRUMENTATION` - Controls frontend telemetry
- Added `VITE_OTEL_COLLECTOR_URL` - OTEL Collector endpoint
- Added `networks: mailg-network` - For service discovery

---

### cAdvisor Service (NEW)

Container metrics collection service:

```yaml
cadvisor:
  image: ghcr.io/google/cadvisor:latest
  profiles: ["instrumentation"]
  container_name: mailg-cadvisor
  ports:
    - "8090:8080"
  privileged: true
  restart: unless-stopped
  volumes:
    - /:/rootfs:ro
    - /var/run:/var/run:rw
    - /sys:/sys:ro
    - /var/lib/docker/:/var/lib/docker:ro
    - /var/run/docker.sock:/var/run/docker.sock:ro
    - /dev/disk/:/dev/disk:ro
  networks:
    - mailg-network
```

**Configuration Notes**:
- `profiles: ["instrumentation"]` - Only starts with `--profile instrumentation`
- `privileged: true` - Required for accessing host metrics
- Volume mounts provide read-only access to host filesystem for metrics
- Exposes metrics on port 8080 (mapped to 8090 externally)

---

### Node Exporter Service (NEW)

Host system metrics collection service:

```yaml
node_exporter:
  image: quay.io/prometheus/node-exporter:latest
  profiles: ["instrumentation"]
  container_name: mailg-node-exporter
  command:
    - "--path.rootfs=/host"
    - "--path.procfs=/host/proc"
    - "--path.sysfs=/host/sys"
  pid: host
  privileged: true
  restart: unless-stopped
  volumes:
    - "/:/host:ro"
  networks:
    - mailg-network
```

**Configuration Notes**:
- `profiles: ["instrumentation"]` - Only starts with `--profile instrumentation`
- `pid: host` - Access to host process namespace
- `privileged: true` - Required for host metrics access
- Command flags configure paths for host filesystem access
- Exposes metrics on port 9100 (internal only)

---

### OpenTelemetry Collector Service (NEW)

Central telemetry data pipeline:

```yaml
otel-collector:
  image: otel/opentelemetry-collector-contrib:latest
  profiles: ["instrumentation"]
  container_name: mailg-otel-collector
  command: ["--config=/etc/otel-collector-config.yaml"]
  volumes:
    - ./instrumentation/collector/otel-collector-config.yaml:/etc/otel-collector-config.yaml
  ports:
    - "4317:4317"   # OTLP gRPC receiver
    - "4318:4318"   # OTLP HTTP receiver (backend/frontend send here)
    - "9465:9464"   # Prometheus scrape endpoint (metrics export)
  restart: unless-stopped
  networks:
    - mailg-network
```

**Configuration Notes**:
- `profiles: ["instrumentation"]` - Only starts with `--profile instrumentation`
- Mounts external config file from `instrumentation/collector/`
- Port 4317: OTLP gRPC - for high-throughput telemetry
- Port 4318: OTLP HTTP - for browser and simpler clients
- Port 9464: Prometheus format export for scraping

---

### Prometheus Service (NEW)

Time-series metrics database:

```yaml
prometheus:
  image: prom/prometheus:latest
  profiles: ["instrumentation"]
  container_name: mailg-prometheus
  volumes:
    - ./instrumentation/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
    - prometheus_data:/prometheus
  ports:
    - "9090:9090"
  command:
    - --config.file=/etc/prometheus/prometheus.yml
    - --storage.tsdb.path=/prometheus
    - --storage.tsdb.retention.time=30d
    - --web.enable-lifecycle
    - --web.enable-admin-api
  restart: unless-stopped
  depends_on:
    - otel-collector
    - cadvisor
    - node_exporter
  networks:
    - mailg-network
```

**Configuration Notes**:
- `profiles: ["instrumentation"]` - Only starts with `--profile instrumentation`
- Mounts config from `instrumentation/prometheus/prometheus.yml`
- `prometheus_data` volume persists metrics across restarts
- `--storage.tsdb.retention.time=30d` - Keep 30 days of metrics
- `--web.enable-lifecycle` - Allows config reload via API
- `--web.enable-admin-api` - Enables admin endpoints
- Depends on collector and exporters being available

---

### Grafana Service (NEW)

Visualization and dashboarding platform:

```yaml
grafana:
  image: grafana/grafana:latest
  profiles: ["instrumentation"]
  container_name: mailg-grafana
  entrypoint: ["sh", "-c", "sh /etc/grafana/init.sh & exec /run.sh"]
  ports:
    - "3000:3000"
  volumes:
    - ./instrumentation/grafana/provisioning/datasources:/etc/grafana/provisioning/datasources
    - ./instrumentation/grafana/provisioning/dashboards:/etc/grafana/provisioning/dashboards
    - ./instrumentation/grafana/dashboards:/var/lib/grafana/dashboards
    - ./instrumentation/grafana/grafana.ini:/etc/grafana/grafana.ini:ro
    - ./instrumentation/grafana/init.sh:/etc/grafana/init.sh:ro
  environment:
    - GF_SECURITY_ADMIN_PASSWORD=${GF_SECURITY_ADMIN_PASSWORD:-admin}
    - GF_SERVER_ROOT_URL=${GF_SERVER_ROOT_URL:-http://localhost:3000}
    - GF_SERVER_SERVE_FROM_SUB_PATH=${GF_SERVER_SERVE_FROM_SUB_PATH:-false}
    - GF_SECURITY_DISABLE_INITIAL_ADMIN_PASSWORD_CHANGE=true
    - GF_VIEWER_USER=readonly
    - GF_VIEWER_PASSWORD=${GF_VIEWER_PASSWORD:-readonly}
  restart: unless-stopped
  depends_on:
    - prometheus
  networks:
    - mailg-network
```

**Configuration Notes**:
- `profiles: ["instrumentation"]` - Only starts with `--profile instrumentation`
- Custom entrypoint runs `init.sh` (creates viewer user) alongside Grafana
- Volume mounts for:
  - `provisioning/datasources` - Auto-configures Prometheus datasource
  - `provisioning/dashboards` - Dashboard provisioning config
  - `dashboards` - Pre-built dashboard JSON files
  - `grafana.ini` - Grafana configuration
  - `init.sh` - User initialization script
- Environment variables configure admin/viewer credentials
- Depends on Prometheus being available

---

## Backend Integration

### Dependencies

Added to `backend/requirements.txt`:

```text
# OpenTelemetry instrumentation
opentelemetry-api>=1.21.0
opentelemetry-sdk>=1.21.0
opentelemetry-instrumentation-fastapi>=0.42b0
opentelemetry-exporter-otlp>=1.21.0
```

### Telemetry Module

**File**: `backend/app/core/telemetry.py`

```python
"""OpenTelemetry instrumentation setup for FastAPI application.

This module configures OpenTelemetry metrics and tracing exporters
to send telemetry data to an OTEL collector via OTLP HTTP protocol.
"""

import logging
import os

logger = logging.getLogger(__name__)

# Check if OTEL is disabled via environment variable
OTEL_SDK_DISABLED = os.getenv("OTEL_SDK_DISABLED", "true").lower() == "true"
OTEL_EXPORTER_ENDPOINT = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://otel-collector:4318")
SERVICE_NAME = os.getenv("OTEL_SERVICE_NAME", "mailg-backend")


def setup_telemetry(app):
    """Initialize OpenTelemetry instrumentation for FastAPI.

    Args:
        app: FastAPI application instance to instrument.

    This function:
    - Checks OTEL_SDK_DISABLED env var to conditionally enable/disable
    - Configures OTLP HTTP exporter pointing to otel-collector:4318
    - Instruments FastAPI with FastAPIInstrumentor
    - Sets up metrics with histogram for request duration
    """
    if OTEL_SDK_DISABLED:
        logger.info("OpenTelemetry SDK is disabled (OTEL_SDK_DISABLED=true)")
        return

    try:
        from opentelemetry import metrics, trace
        from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        from opentelemetry.sdk.metrics import MeterProvider
        from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor

        # Create resource with service name
        resource = Resource.create({"service.name": SERVICE_NAME})

        # Setup tracing
        trace_exporter = OTLPSpanExporter(endpoint=f"{OTEL_EXPORTER_ENDPOINT}/v1/traces")
        tracer_provider = TracerProvider(resource=resource)
        tracer_provider.add_span_processor(BatchSpanProcessor(trace_exporter))
        trace.set_tracer_provider(tracer_provider)

        # Setup metrics
        metric_exporter = OTLPMetricExporter(endpoint=f"{OTEL_EXPORTER_ENDPOINT}/v1/metrics")
        metric_reader = PeriodicExportingMetricReader(
            metric_exporter,
            export_interval_millis=15000,  # Export every 15 seconds
        )
        meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
        metrics.set_meter_provider(meter_provider)

        # Instrument FastAPI
        FastAPIInstrumentor.instrument_app(
            app,
            meter_provider=meter_provider,
            tracer_provider=tracer_provider,
        )

        logger.info(
            f"OpenTelemetry instrumentation enabled - exporting to {OTEL_EXPORTER_ENDPOINT}"
        )

    except ImportError as e:
        logger.warning(f"OpenTelemetry packages not installed, skipping instrumentation: {e}")
    except Exception as e:
        logger.error(f"Failed to initialize OpenTelemetry: {e}")
```

### Integration Point

**File**: `backend/app/main.py`

Added import and setup call:

```python
from app.core.config import API_V1_PREFIX, get_jwt_secret_warnings
from app.core.openapi import custom_openapi
from app.core.exceptions import register_exception_handlers
from app.core.telemetry import setup_telemetry  # NEW

# ... FastAPI app creation ...

app = FastAPI(
    title="Mailg API",
    version="1.0.0",
    # ...
)

# Initialize OpenTelemetry instrumentation (if enabled)
setup_telemetry(app)  # NEW - Must be called after app creation

# Customize OpenAPI schema
app.openapi = lambda: custom_openapi(app)
```

### Metrics Emitted

The FastAPI instrumentation automatically emits:

| Metric | Type | Description |
|--------|------|-------------|
| `http_server_duration_milliseconds` | Histogram | Request latency distribution |
| `http_server_duration_milliseconds_count` | Counter | Total request count |
| `http_server_duration_milliseconds_sum` | Counter | Total request time |
| `http_server_duration_milliseconds_bucket` | Histogram buckets | Latency percentiles |

**Labels included**:
| Label | Description | Example |
|-------|-------------|---------|
| `http_method` | HTTP method | GET, POST |
| `http_target` | Request path | /api/v1/emails |
| `http_status_code` | Response status | 200, 404, 500 |
| `http_host` | Host header | localhost:8765 |
| `http_scheme` | Protocol | http, https |
| `http_flavor` | HTTP version | 1.1 |

---

## Frontend Integration

### Dependencies

Added to `package.json`:

```json
{
  "dependencies": {
    "@opentelemetry/api": "^1.7.0",
    "@opentelemetry/sdk-trace-web": "^1.21.0",
    "@opentelemetry/sdk-metrics": "^1.21.0",
    "@opentelemetry/instrumentation-fetch": "^0.48.0",
    "@opentelemetry/exporter-metrics-otlp-http": "^0.48.0",
    "@opentelemetry/resources": "^1.21.0",
    "@opentelemetry/semantic-conventions": "^1.21.0"
  }
}
```

After adding, run:
```bash
npm install
```

### Telemetry Module

**File**: `src/telemetry.js`

```javascript
/**
 * OpenTelemetry instrumentation for the frontend application.
 *
 * This module configures metrics collection and sends them to an OTEL collector.
 * It tracks HTTP request duration via fetch instrumentation.
 */

// Check if instrumentation is enabled via environment variable
const ENABLE_INSTRUMENTATION = import.meta.env.VITE_ENABLE_INSTRUMENTATION === "true";
const OTEL_COLLECTOR_URL = import.meta.env.VITE_OTEL_COLLECTOR_URL || "http://localhost:4318";

/**
 * Initialize OpenTelemetry instrumentation for the frontend.
 * Only runs if VITE_ENABLE_INSTRUMENTATION=true
 */
async function initTelemetry() {
  if (!ENABLE_INSTRUMENTATION) {
    console.log("[Telemetry] Disabled (set VITE_ENABLE_INSTRUMENTATION=true to enable)");
    return;
  }

  try {
    const { metrics } = await import("@opentelemetry/api");
    const { MeterProvider, PeriodicExportingMetricReader } = await import(
      "@opentelemetry/sdk-metrics"
    );
    const { OTLPMetricExporter } = await import(
      "@opentelemetry/exporter-metrics-otlp-http"
    );
    const { Resource } = await import("@opentelemetry/resources");
    const { SEMRESATTRS_SERVICE_NAME } = await import(
      "@opentelemetry/semantic-conventions"
    );

    // Create resource with service name
    const resource = new Resource({
      [SEMRESATTRS_SERVICE_NAME]: "mailg-frontend",
    });

    // Setup metrics exporter
    const metricExporter = new OTLPMetricExporter({
      url: `${OTEL_COLLECTOR_URL}/v1/metrics`,
    });

    const meterProvider = new MeterProvider({
      resource,
      readers: [
        new PeriodicExportingMetricReader({
          exporter: metricExporter,
          exportIntervalMillis: 15000, // Export every 15 seconds
        }),
      ],
    });

    metrics.setGlobalMeterProvider(meterProvider);

    // Create meter for custom metrics
    const meter = metrics.getMeter("mailg-frontend");

    // Create histogram for HTTP request duration
    const httpRequestDuration = meter.createHistogram(
      "http_request_duration_milliseconds",
      {
        description: "Duration of HTTP requests in milliseconds",
        unit: "ms",
      }
    );

    // Create counter for HTTP requests
    const httpRequestCounter = meter.createCounter("http_request_total", {
      description: "Total number of HTTP requests",
    });

    // Instrument fetch to track HTTP requests
    const originalFetch = window.fetch;
    window.fetch = async function instrumentedFetch(input, init) {
      const startTime = performance.now();
      const url = typeof input === "string" ? input : input.url;
      const method = init?.method || "GET";

      // Extract path from URL
      let path = "/";
      try {
        const urlObj = new URL(url, window.location.origin);
        path = urlObj.pathname;
      } catch {
        path = url.split("?")[0];
      }

      try {
        const response = await originalFetch.apply(this, arguments);
        const duration = performance.now() - startTime;

        // Record metrics
        const attributes = { method, path, status: response.status.toString() };
        httpRequestDuration.record(duration, attributes);
        httpRequestCounter.add(1, attributes);

        return response;
      } catch (error) {
        const duration = performance.now() - startTime;
        const attributes = { method, path, status: "error" };
        httpRequestDuration.record(duration, attributes);
        httpRequestCounter.add(1, attributes);
        throw error;
      }
    };

    console.log(`[Telemetry] Enabled - exporting to ${OTEL_COLLECTOR_URL}`);
  } catch (error) {
    console.warn("[Telemetry] Failed to initialize:", error.message);
  }
}

// Initialize telemetry
initTelemetry();

export default initTelemetry;
```

### Integration Point

**File**: `src/main.jsx`

```javascript
// Initialize telemetry first (before other imports)
import "./telemetry.js";

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### Metrics Emitted

| Metric | Type | Description |
|--------|------|-------------|
| `http_request_duration_milliseconds` | Histogram | Fetch request latency |
| `http_request_total` | Counter | Total fetch requests |

**Labels included**:
| Label | Description | Example |
|-------|-------------|---------|
| `method` | HTTP method | GET, POST |
| `path` | Request path | /api/v1/emails |
| `status` | Response status or "error" | 200, 404, error |

---

## Metrics API

The backend exposes a Metrics API for programmatic access to Prometheus data.

### New Files Created

**File**: `backend/app/api/v1/endpoints/metrics.py`

```python
"""Metrics API endpoints for querying Prometheus programmatically."""

import os
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter(prefix="/metrics")

PROMETHEUS_URL = os.getenv("PROMETHEUS_URL", "http://prometheus:9090")
PROMETHEUS_TIMEOUT = float(os.getenv("PROMETHEUS_TIMEOUT", "30.0"))


class PrometheusResponse(BaseModel):
    """Response model for Prometheus query results."""
    status: str
    data: dict
    errorType: Optional[str] = None
    error: Optional[str] = None


class HealthResponse(BaseModel):
    """Response model for Prometheus health check."""
    status: str
    prometheus_url: str
    ready: bool
    message: Optional[str] = None


@router.get("/health", response_model=HealthResponse)
async def metrics_health():
    """Check Prometheus connectivity."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{PROMETHEUS_URL}/-/ready")
            ready = response.status_code == 200
            return HealthResponse(
                status="ok" if ready else "degraded",
                prometheus_url=PROMETHEUS_URL,
                ready=ready,
                message="Prometheus is ready" if ready else "Prometheus not ready",
            )
    except httpx.RequestError as e:
        return HealthResponse(
            status="error",
            prometheus_url=PROMETHEUS_URL,
            ready=False,
            message=f"Cannot connect to Prometheus: {str(e)}",
        )


@router.get("/query", response_model=PrometheusResponse)
async def query_instant(
    query: str = Query(..., description="PromQL query expression"),
    time: Optional[str] = Query(None, description="Evaluation timestamp"),
):
    """Execute an instant query against Prometheus."""
    params = {"query": query}
    if time:
        params["time"] = time

    try:
        async with httpx.AsyncClient(timeout=PROMETHEUS_TIMEOUT) as client:
            response = await client.get(f"{PROMETHEUS_URL}/api/v1/query", params=params)
            data = response.json()
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail=data.get("error"))
            return PrometheusResponse(**data)
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Cannot connect to Prometheus: {str(e)}")


@router.get("/query_range", response_model=PrometheusResponse)
async def query_range(
    query: str = Query(..., description="PromQL query expression"),
    start: str = Query(..., description="Start timestamp"),
    end: str = Query(..., description="End timestamp"),
    step: str = Query(..., description="Query resolution step"),
):
    """Execute a range query against Prometheus."""
    params = {"query": query, "start": start, "end": end, "step": step}
    try:
        async with httpx.AsyncClient(timeout=PROMETHEUS_TIMEOUT) as client:
            response = await client.get(f"{PROMETHEUS_URL}/api/v1/query_range", params=params)
            data = response.json()
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail=data.get("error"))
            return PrometheusResponse(**data)
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Cannot connect to Prometheus: {str(e)}")


@router.get("/labels")
async def get_labels():
    """Get all label names from Prometheus."""
    # ... implementation ...


@router.get("/label/{label_name}/values")
async def get_label_values(label_name: str):
    """Get all values for a specific label."""
    # ... implementation ...
```

**File**: `backend/app/api/v1/router.py` (updated)

```python
"""Central router for API v1 endpoints."""

from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, db_snapshot
from app.api.v1.endpoints import emails, folders, labels, attachments, search, bulk, templates
from app.api.v1.endpoints import metrics  # NEW

router = APIRouter()

# ... existing routers ...

# Instrumentation routers (NEW)
router.include_router(metrics.router, tags=["metrics"])
```

---

### Endpoints

#### Health Check

```http
GET /api/v1/metrics/health
```

Check Prometheus connectivity.

**Response**:
```json
{
  "status": "ok",
  "prometheus_url": "http://prometheus:9090",
  "ready": true,
  "message": "Prometheus is ready"
}
```

#### Instant Query

```http
GET /api/v1/metrics/query?query=<promql>&time=<timestamp>
```

Execute an instant PromQL query.

**Parameters**:
| Parameter | Required | Description |
|-----------|----------|-------------|
| `query` | Yes | PromQL expression |
| `time` | No | Evaluation timestamp (RFC3339 or Unix) |

**Example**:
```bash
curl "http://localhost:8766/api/v1/metrics/query?query=sum(http_server_duration_milliseconds_count)"
```

**Response**:
```json
{
  "status": "success",
  "data": {
    "resultType": "vector",
    "result": [
      {
        "metric": {},
        "value": [1704067200, "42"]
      }
    ]
  }
}
```

#### Range Query

```http
GET /api/v1/metrics/query_range?query=<promql>&start=<ts>&end=<ts>&step=<duration>
```

Execute a range query for time-series data.

**Parameters**:
| Parameter | Required | Description |
|-----------|----------|-------------|
| `query` | Yes | PromQL expression |
| `start` | Yes | Start timestamp (RFC3339 or Unix) |
| `end` | Yes | End timestamp (RFC3339 or Unix) |
| `step` | Yes | Resolution (e.g., "15s", "1m", "5m") |

**Example**:
```bash
curl "http://localhost:8766/api/v1/metrics/query_range?query=rate(http_server_duration_milliseconds_count[1m])&start=2024-01-01T00:00:00Z&end=2024-01-01T01:00:00Z&step=1m"
```

#### Labels

```http
GET /api/v1/metrics/labels
```

Get all available label names.

#### Label Values

```http
GET /api/v1/metrics/label/{label_name}/values
```

Get all values for a specific label.

**Example**:
```bash
curl "http://localhost:8766/api/v1/metrics/label/http_target/values"
```

---

### Example PromQL Queries

| Use Case | Query |
|----------|-------|
| Total Requests | `sum(http_server_duration_milliseconds_count)` |
| Request Rate (per second) | `sum(rate(http_server_duration_milliseconds_count[1m]))` |
| P50 Latency | `histogram_quantile(0.50, sum(rate(http_server_duration_milliseconds_bucket[5m])) by (le))` |
| P95 Latency | `histogram_quantile(0.95, sum(rate(http_server_duration_milliseconds_bucket[5m])) by (le))` |
| P99 Latency | `histogram_quantile(0.99, sum(rate(http_server_duration_milliseconds_bucket[5m])) by (le))` |
| Error Rate (5xx) | `sum(rate(http_server_duration_milliseconds_count{http_status_code=~"5.."}[5m]))` |
| Requests by Endpoint | `sum by (http_target) (rate(http_server_duration_milliseconds_count[5m]))` |
| Slowest Endpoints | `topk(10, sum by (http_target) (rate(http_server_duration_milliseconds_sum[5m])) / sum by (http_target) (rate(http_server_duration_milliseconds_count[5m])))` |
| Container CPU Usage | `rate(container_cpu_usage_seconds_total{name=~"mailg.*"}[5m])` |
| Container Memory | `container_memory_usage_bytes{name=~"mailg.*"}` |

---

## Grafana Dashboards

### Pre-configured Dashboards

Located in `instrumentation/grafana/dashboards/`:

| Dashboard | File | Description |
|-----------|------|-------------|
| Backend Overview | `backend-overview.json` | API request metrics, latency, top endpoints |
| Frontend Overview | `frontend-overview.json` | Browser fetch metrics |
| Docker & System | `docker-and-system-monitoring.json` | Container and host resources |

### Backend Overview Dashboard

**Panels**:
1. **P95 Request Latency** - 95th percentile response time
2. **Request Rate** - Requests per minute
3. **Top Endpoints by Latency** - Slowest endpoints
4. **Top Endpoints by Traffic** - Most requested endpoints

### Accessing Dashboards

1. Open http://localhost:3000
2. Login with `admin` / `admin`
3. Navigate to **Dashboards** → **Browse**
4. Select a dashboard

---

## Environment Variables

### Backend

| Variable | Default | Description |
|----------|---------|-------------|
| `OTEL_SDK_DISABLED` | `true` | Disable OpenTelemetry SDK |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://otel-collector:4318` | OTLP exporter endpoint |
| `OTEL_SERVICE_NAME` | `mailg-backend` | Service name in metrics |
| `PROMETHEUS_URL` | `http://prometheus:9090` | Prometheus URL for Metrics API |

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_ENABLE_INSTRUMENTATION` | `false` | Enable frontend telemetry |
| `VITE_OTEL_COLLECTOR_URL` | `http://localhost:4318` | OTEL Collector URL |

### Grafana

| Variable | Default | Description |
|----------|---------|-------------|
| `GF_SECURITY_ADMIN_PASSWORD` | `admin` | Admin password |
| `GF_VIEWER_USER` | `readonly` | Read-only user name |
| `GF_VIEWER_PASSWORD` | `readonly` | Read-only user password |

---

## Troubleshooting

### No Data in Grafana

1. **Check OTEL is enabled**:
   ```bash
   docker logs mailg-backend | grep -i "telemetry\|otel"
   ```
   Should show: `OpenTelemetry instrumentation enabled`

2. **Verify Prometheus targets**:
   - Open http://localhost:9090/targets
   - All targets should show "UP"

3. **Check metrics exist**:
   ```bash
   curl "http://localhost:9090/api/v1/query?query=http_server_duration_milliseconds_count"
   ```

4. **Generate traffic**:
   ```bash
   curl http://localhost:8766/health
   curl http://localhost:8766/api/v1/folders
   ```

5. **Adjust time range** in Grafana to "Last 5 minutes"

### Backend Export Errors

If you see `Failed to export span batch code: 404`:
- This is expected - the OTEL Collector is configured for metrics only, not traces
- Metrics still work correctly

### cAdvisor/Node Exporter Not Working

These tools require:
- Linux host (not Windows/macOS Docker Desktop)
- Privileged container access
- Host filesystem mounts

On Windows, container metrics may be limited.

### Metrics API Returns 503

Prometheus is not accessible from the backend:
1. Check Prometheus is running: `docker ps | grep prometheus`
2. Verify network connectivity: Both services must be on `mailg-network`
3. Check `PROMETHEUS_URL` environment variable

---

## File Structure

```
instrumentation/
├── collector/
│   └── otel-collector-config.yaml    # OTEL Collector configuration
├── grafana/
│   ├── dashboards/
│   │   ├── backend-overview.json     # Backend metrics dashboard
│   │   ├── frontend-overview.json    # Frontend metrics dashboard
│   │   └── docker-and-system-monitoring.json
│   ├── provisioning/
│   │   ├── dashboards/
│   │   │   └── dashboards.yml        # Dashboard provisioning
│   │   └── datasources/
│   │       └── prometheus-ds.yml     # Prometheus datasource
│   ├── grafana.ini                   # Grafana configuration
│   └── init.sh                       # User initialization script
└── prometheus/
    └── prometheus.yml                # Prometheus scrape config

backend/
├── app/
│   ├── core/
│   │   └── telemetry.py              # OTEL setup for FastAPI
│   └── api/v1/endpoints/
│       └── metrics.py                # Metrics query API
└── requirements.txt                  # Includes OTEL packages

src/
├── telemetry.js                      # Frontend OTEL setup
└── main.jsx                          # Imports telemetry

docker-compose.yaml                   # Includes instrumentation profile
```

---

## References

- [OpenTelemetry Python](https://opentelemetry.io/docs/languages/python/)
- [OpenTelemetry JavaScript](https://opentelemetry.io/docs/languages/js/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [PromQL Cheat Sheet](https://promlabs.com/promql-cheat-sheet/)

