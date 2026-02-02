/**
 * OpenTelemetry instrumentation for the frontend application.
 *
 * This module configures metrics collection and sends them to an OTEL collector.
 * It tracks HTTP request duration via fetch instrumentation.
 */
import { metrics, ValueType } from "@opentelemetry/api";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { MeterProvider, PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {configPromise} from "./services/apiClient";

// Check if instrumentation is enabled via environment variable
const ENABLE_INSTRUMENTATION = import.meta.env.VITE_ENABLE_INSTRUMENTATION === "true";

if (ENABLE_INSTRUMENTATION) {
  configPromise.then( apiUrl => {
    console.log("Instrumentation enabled: apiUrl=" + apiUrl);
    setupInstrumentation(apiUrl);
  });
}

function setupInstrumentation(apiUrl) {
  const baseExporter = new OTLPMetricExporter({
    url:  apiUrl + "/v1/otel-metrics",
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Custom exporter that only sends when there's actual data
  const conditionalExporter = {
    export: (metrics, resultCallback) => {
      // Check if there's any actual data to send
      const hasData = metrics.scopeMetrics?.some((sm) =>
        sm.metrics?.some(
          (m) =>
            m.dataPoints?.length > 0 ||
            m.histogram?.dataPoints?.length > 0 ||
            m.sum?.dataPoints?.length > 0 ||
            m.gauge?.dataPoints?.length > 0
        )
      );

      if (!hasData) {
        // No data, skip export
        resultCallback({ code: 0 }); // Success without sending
        return;
      }

      // Has data, forward to actual exporter
      baseExporter.export(metrics, resultCallback);
    },
    forceFlush: () => baseExporter.forceFlush(),
    shutdown: () => baseExporter.shutdown(),
  };

  const metricReader = new PeriodicExportingMetricReader({
    exporter: conditionalExporter,
    exportIntervalMillis: 30000,
  });

  const meterProvider = new MeterProvider({
    resource: resourceFromAttributes({
      "service.name": "mailg-frontend",
    }),
    readers: [metricReader],
  });

  metrics.setGlobalMeterProvider(meterProvider);

  const meter = metrics.getMeter("network-requests-meter");

  const requestDurationHistogram = meter.createHistogram("http_request_duration", {
    description: "Duration of HTTP requests in milliseconds",
    unit: "ms",
    valueType: ValueType.DOUBLE,
  });

  const requestCountCounter = meter.createCounter("http_request_count", {
    description: "Count of HTTP requests",
    valueType: ValueType.INT,
  });

  // Extract path from URL (strip protocol, host, port - keep path and query)
  function getUrlPath(url) {
    try {
      const parsed = new URL(url, window.location.href);
      return parsed.pathname + parsed.search;
    } catch {
      return url;
    }
  }

  // Record metrics for a completed request
  function recordRequestMetrics(method, path, status, durationMs, success) {
    const index = path.indexOf("?");
    const pathname = index === -1 ? path : path.substring(0, index);
    const query = index !== -1 && path.substring(index + 1);
    const attributes = {
      method: method.toUpperCase(),
      path: pathname,
      query: query,
      status_code: status || 0,
      success: success,
    };

    requestDurationHistogram.record(durationMs, attributes);
    requestCountCounter.add(1, attributes);
  }

  // Proxy fetch
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "unknown";
    const method = args[1]?.method || "GET";
    const startTime = performance.now();
    const urlPath = getUrlPath(url);

    // Skip recording metrics for the metrics endpoint itself
    const isMetricsEndpoint = urlPath.includes("/otel-metrics");

    try {
      const response = await originalFetch.apply(this, args);
      const duration = performance.now() - startTime;

      if (!isMetricsEndpoint) {
        recordRequestMetrics(method, urlPath, response.status, duration, response.ok);
      }

      return response;
    } catch (error) {
      const duration = performance.now() - startTime;

      if (!isMetricsEndpoint) {
        recordRequestMetrics(method, urlPath, 0, duration, false);
      }

      throw error;
    }
  };

  // Proxy XMLHttpRequest
  const OriginalXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = function () {
    const xhr = new OriginalXHR();

    let method = "GET";
    let urlPath = "unknown";
    let startTime = 0;

    const originalOpen = xhr.open;
    xhr.open = function (m, u, ...rest) {
      method = m;
      urlPath = getUrlPath(u);
      return originalOpen.apply(this, [m, u, ...rest]);
    };

    const originalSend = xhr.send;
    xhr.send = function (...args) {
      startTime = performance.now();
      return originalSend.apply(this, args);
    };

    xhr.addEventListener("loadend", function () {
      const duration = performance.now() - startTime;
      const success = xhr.status >= 200 && xhr.status < 400;

      recordRequestMetrics(method, urlPath, xhr.status, duration, success);
    });

    xhr.addEventListener("error", function () {
      const duration = performance.now() - startTime;

      recordRequestMetrics(method, urlPath, 0, duration, false);
    });

    xhr.addEventListener("abort", function () {
      const duration = performance.now() - startTime;

      recordRequestMetrics(method, urlPath, 0, duration, false);
    });

    return xhr;
  };

  // Copy static properties and prototype
  Object.keys(OriginalXHR).forEach((key) => {
    try {
      window.XMLHttpRequest[key] = OriginalXHR[key];
    } catch (e) {
      // Some properties may not be writable
    }
  });
  window.XMLHttpRequest.prototype = OriginalXHR.prototype;
}
