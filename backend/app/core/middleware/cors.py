import logging

from fastapi import Request, Response
from fastapi.responses import JSONResponse


logger = logging.getLogger(__name__)


async def cors_middleware(request: Request, call_next):
    origin = request.headers.get("origin")

    # Preflight (OPTIONS)
    if request.method == "OPTIONS" and origin:
        resp = Response(status_code=204)
    else:
        resp = await call_next(request)

    resp.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    resp.headers["Access-Control-Allow-Headers"] = request.headers.get(
        "Access-Control-Request-Headers", "*"
    )

    if origin:
        resp.headers["Access-Control-Allow-Origin"] = origin
        resp.headers["Timing-Allow-Origin"] = origin
        # Credentials are only valid when Allow-Origin is a specific origin (not "*").
        resp.headers["Access-Control-Allow-Credentials"] = "true"
    else:
        resp.headers["Access-Control-Allow-Origin"] = "*"
        resp.headers["Timing-Allow-Origin"] = "*"
        # Do NOT set Allow-Credentials with wildcard origin; browsers will reject it.

    return resp