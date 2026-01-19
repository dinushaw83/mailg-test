import httpx
from fastapi import APIRouter, Request, FastAPI, Response, status
from fastapi.responses import JSONResponse
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# --- CONFIGURATION ---
OTEL_COLLECTOR_BASE_URL = "http://otel-collector:4318"

# Will be set during initialize()
_app: FastAPI = None


@router.post("/otel-metrics")
async def forward_telemetry(request: Request):
    """
    Receives OTLP metrics/traces from the browser (in JSON format)
    and forwards them to the OpenTelemetry Collector.
    """

    # 1. VALIDATION: Check for JSON Content-Type
    content_type = request.headers.get("content-type", "").lower()

    # We expect application/json for OTLP/JSON
    if "application/json" not in content_type:
        return JSONResponse({"detail": "Unsupported Content-Type. Expected application/json."},
                            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE)

    try:
        # FastAPI's Request object can read the raw body directly
        body = (await request.body()).decode("utf-8")

        logger.debug(json.dumps(json.loads(body), indent=2))

        # 2. FORWARDING
        # Use the stored HTTPX client to forward the request
        collector_response = await _app.state.collector_client.post(
            # CRITICAL: We explicitly append the metrics path to the base URL
            "/v1/metrics",
            content=body,
            headers={
                # CRITICAL: Pass the original JSON Content-Type header
                "Content-Type": content_type,
            }
        )

        # 3. RETURN RESPONSE
        # Return the Collector's status code and body to the browser
        return Response(
            content=collector_response.content,
            status_code=collector_response.status_code,
            media_type=collector_response.headers.get("Content-Type", "application/json")
        )

    except httpx.HTTPError as e:
        logger.warning(f"Error forwarding to Collector: {e}")
        return JSONResponse({"detail": "Telemetry forwarding failed"},
                            status_code=status.HTTP_502_BAD_GATEWAY)
    except Exception as e:
        logger.exception(f"Unexpected error during forwarding: {e}")
        return JSONResponse({"detail": "Internal error"},
                            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


def initialize(app: FastAPI):
    global _app
    _app = app
    # Create an async HTTPX client session to reuse connections for forwarding
    app.state.collector_client = httpx.AsyncClient(base_url=OTEL_COLLECTOR_BASE_URL, timeout=10)


async def shutdown(app: FastAPI):
    client = getattr(app.state, "collector_client", None)
    if client is not None:
        await client.aclose()
