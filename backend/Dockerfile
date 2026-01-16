FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app/backend

RUN apt-get update && \
    BUILD_ESSENTIAL_VERSION=$(apt-cache madison build-essential | head -1 | awk '{print $3}') && \
    CURL_VERSION=$(apt-cache madison curl | head -1 | awk '{print $3}') && \
    apt-get install -y --no-install-recommends \
        build-essential=${BUILD_ESSENTIAL_VERSION} \
        curl=${CURL_VERSION} && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# these are here because code doesn't depend on them
RUN pip install \
  opentelemetry-distro \
  opentelemetry-exporter-otlp \
  opentelemetry-instrumentation-system-metrics

ENV OTEL_METRICS_EXPORTER=otlp \
    OTEL_TRACES_EXPORTER=none \
    OTEL_LOGS_EXPORTER=none \
    OTEL_SERVICE_NAME=backend \
    OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317 \
    OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE=cumulative \
    OTEL_METRIC_EXPORT_INTERVAL=10000 \
    OTEL_PYTHON_RUNTIME_METRICS_ENABLED=true

RUN opentelemetry-bootstrap -a install

COPY . .

# Create logs + reports directory
RUN mkdir -p /app/backend/logs /app/reports

# Copy and setup entrypoint
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN sed -i 's/\r$//' /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 8765

# Set entrypoint and default command
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["opentelemetry-instrument", "gunicorn", "app.main:app", "-c", "gunicorn_config.py"]

