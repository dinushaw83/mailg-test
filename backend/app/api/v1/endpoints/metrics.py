"""Metrics API endpoints for querying Prometheus programmatically.

This module provides endpoints to query Prometheus metrics data,
enabling programmatic access to observability insights.
"""

import os
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter(prefix="/metrics")

# Prometheus configuration
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
    """Check Prometheus connectivity.

    Returns:
        HealthResponse with Prometheus status and connectivity info.
    """
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
    time: Optional[str] = Query(None, description="Evaluation timestamp (RFC3339 or Unix timestamp)"),
):
    """Execute an instant query against Prometheus.

    Args:
        query: PromQL query expression (e.g., 'up', 'http_server_duration_milliseconds_count')
        time: Optional evaluation timestamp. If omitted, current server time is used.

    Returns:
        PrometheusResponse with query results.

    Example queries:
        - `up` - Check if targets are up
        - `sum(http_server_duration_milliseconds_count)` - Total request count
        - `histogram_quantile(0.95, sum(rate(http_server_duration_milliseconds_bucket[5m])) by (le))` - P95 latency
    """
    params = {"query": query}
    if time:
        params["time"] = time

    try:
        async with httpx.AsyncClient(timeout=PROMETHEUS_TIMEOUT) as client:
            response = await client.get(f"{PROMETHEUS_URL}/api/v1/query", params=params)
            data = response.json()

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=data.get("error", "Prometheus query failed"),
                )

            return PrometheusResponse(**data)

    except httpx.RequestError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Cannot connect to Prometheus: {str(e)}",
        )


@router.get("/query_range", response_model=PrometheusResponse)
async def query_range(
    query: str = Query(..., description="PromQL query expression"),
    start: str = Query(..., description="Start timestamp (RFC3339 or Unix timestamp)"),
    end: str = Query(..., description="End timestamp (RFC3339 or Unix timestamp)"),
    step: str = Query(..., description="Query resolution step (e.g., '15s', '1m', '5m')"),
):
    """Execute a range query against Prometheus.

    Args:
        query: PromQL query expression
        start: Start timestamp (RFC3339 or Unix timestamp)
        end: End timestamp (RFC3339 or Unix timestamp)
        step: Query resolution step width (duration format, e.g., '15s', '1m')

    Returns:
        PrometheusResponse with time-series data.

    Example:
        GET /api/v1/metrics/query_range?query=rate(http_server_duration_milliseconds_count[1m])&start=2024-01-01T00:00:00Z&end=2024-01-01T01:00:00Z&step=1m
    """
    params = {
        "query": query,
        "start": start,
        "end": end,
        "step": step,
    }

    try:
        async with httpx.AsyncClient(timeout=PROMETHEUS_TIMEOUT) as client:
            response = await client.get(f"{PROMETHEUS_URL}/api/v1/query_range", params=params)
            data = response.json()

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=data.get("error", "Prometheus query failed"),
                )

            return PrometheusResponse(**data)

    except httpx.RequestError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Cannot connect to Prometheus: {str(e)}",
        )


@router.get("/labels")
async def get_labels():
    """Get all label names from Prometheus.

    Returns:
        List of all label names present in the metrics.
    """
    try:
        async with httpx.AsyncClient(timeout=PROMETHEUS_TIMEOUT) as client:
            response = await client.get(f"{PROMETHEUS_URL}/api/v1/labels")
            data = response.json()

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=data.get("error", "Failed to fetch labels"),
                )

            return data

    except httpx.RequestError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Cannot connect to Prometheus: {str(e)}",
        )


@router.get("/label/{label_name}/values")
async def get_label_values(label_name: str):
    """Get all values for a specific label.

    Args:
        label_name: Name of the label to query values for.

    Returns:
        List of all values for the specified label.
    """
    try:
        async with httpx.AsyncClient(timeout=PROMETHEUS_TIMEOUT) as client:
            response = await client.get(f"{PROMETHEUS_URL}/api/v1/label/{label_name}/values")
            data = response.json()

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=data.get("error", "Failed to fetch label values"),
                )

            return data

    except httpx.RequestError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Cannot connect to Prometheus: {str(e)}",
        )

