"""FastAPI application entry point with router registration and middleware configuration."""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import API_V1_PREFIX, get_jwt_secret_warnings
from app.core.openapi import custom_openapi
from app.core.exceptions import register_exception_handlers
from app.core.telemetry import setup_telemetry
from app.core.middleware.cors import cors_middleware
from app.core.middleware.auth import auth_middleware
from app.core.middleware.response_wrapper import ResponseWrapperMiddleware
from app.db.template import initialize_template_Database
from app.db.bootstrap import initialize_template_database_schema_and_fixtures
from app.tasks.cleanup import cleanup_old_databases
from app.tasks.scheduled_sender import process_scheduled_emails
from app.api.v1.router import router as v1_router
from app.api.v1.endpoints import ingestion

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events.

    Replaces deprecated @app.on_event("startup") pattern.
    """
    # Startup

    # Check JWT secret configuration and warn if insecure
    jwt_warnings = get_jwt_secret_warnings()
    for warning in jwt_warnings:
        logger.warning(f"SECURITY WARNING: {warning}")

    try:
        initialize_template_Database()
        # initialize_template_database_schema_and_fixtures()
    except Exception as e:
        # Log error but continue - cleanup task must always run
        logger.error(f"Failed to initialize database: {e}")
    
    # Always start background tasks regardless of initialization result
    asyncio.create_task(cleanup_old_databases())
    asyncio.create_task(process_scheduled_emails())
    
    yield


app = FastAPI(
    title="Mailg API",
    version="1.0.0",
    description="FastAPI mailg with JWT auth, RBAC, and database isolation",
    lifespan=lifespan,
    swagger_ui_parameters={
        # Keeps Authorization input on refresh (helps local dev).
        "persistAuthorization": True,
    },
)

# Initialize OpenTelemetry instrumentation (if enabled)
setup_telemetry(app)

# Customize OpenAPI schema
app.openapi = lambda: custom_openapi(app)

# Enable CORS for all origins (configure appropriately for production).
# CORS must be added BEFORE other middleware to ensure it wraps all responses
app.middleware("http")(cors_middleware)

# Add auth token parsing/validation middleware
app.middleware("http")(auth_middleware)

# Add response wrapper middleware to wrap all responses in consistent format
app.add_middleware(ResponseWrapperMiddleware)

# Register exception handlers
register_exception_handlers(app)

# Include v1 API router
app.include_router(v1_router, prefix=API_V1_PREFIX)

app.include_router(ingestion.router, prefix=API_V1_PREFIX, tags=["ingestion"], include_in_schema=False)



@app.get("/")
def root() -> dict:
    """Root endpoint providing API information.
    
    Returns:
        Dictionary with API name and version.
    """
    return {"message": "Backend Mailg API", "version": "1.0.0"}


@app.get("/health")
def health() -> dict:
    """Health check endpoint for monitoring and load balancers.
    
    Returns:
        Dictionary with status confirmation.
    """
    return {"status": "ok"}
