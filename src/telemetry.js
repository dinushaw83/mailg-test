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
    const httpRequestDuration = meter.createHistogram("http_request_duration_milliseconds", {
      description: "Duration of HTTP requests in milliseconds",
      unit: "ms",
    });

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

      // Extract path from URL (remove query string and origin)
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
        const attributes = {
          method,
          path,
          status: response.status.toString(),
        };

        httpRequestDuration.record(duration, attributes);
        httpRequestCounter.add(1, attributes);

        return response;
      } catch (error) {
        const duration = performance.now() - startTime;

        // Record failed request
        const attributes = {
          method,
          path,
          status: "error",
        };

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

