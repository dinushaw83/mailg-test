"""OpenTelemetry instrumentation setup for FastAPI application.

This module configures OpenTelemetry metrics exporters
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
        from opentelemetry import metrics
        from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        from opentelemetry.sdk.metrics import MeterProvider
        from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
        from opentelemetry.sdk.resources import Resource

        # Create resource with service name
        resource = Resource.create({"service.name": SERVICE_NAME})

        # Setup metrics only (no traces - collector doesn't have a traces pipeline)
        metric_exporter = OTLPMetricExporter(endpoint=f"{OTEL_EXPORTER_ENDPOINT}/v1/metrics")
        metric_reader = PeriodicExportingMetricReader(
            metric_exporter,
            export_interval_millis=15000,  # Export every 15 seconds
        )
        meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
        metrics.set_meter_provider(meter_provider)

        # Instrument FastAPI (metrics only, no tracing)
        FastAPIInstrumentor.instrument_app(
            app,
            meter_provider=meter_provider,
        )

        logger.info(
            f"OpenTelemetry metrics enabled - exporting to {OTEL_EXPORTER_ENDPOINT}"
        )

    except ImportError as e:
        logger.warning(f"OpenTelemetry packages not installed, skipping instrumentation: {e}")
    except Exception as e:
        logger.error(f"Failed to initialize OpenTelemetry: {e}")
