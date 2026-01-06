"""Exception handlers with CORS support and wrapped response format."""

import logging
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.exc import OperationalError

logger = logging.getLogger(__name__)


def wrap_error_response(message: str, status_code: int, data=None) -> dict:
    """Wrap error response in standard format.
    
    Args:
        message: Error message.
        status_code: HTTP status code.
        data: Optional additional error data.
        
    Returns:
        Wrapped response dictionary.
    """
    return {
        "success": False,
        "message": message,
        "statusCode": status_code,
        "data": data
    }


def add_cors_headers(response: JSONResponse, request: Request) -> JSONResponse:
    """Add CORS headers to a response.
    
    Args:
        response: The JSON response to add headers to.
        request: The request object to extract origin from.
        
    Returns:
        The response with CORS headers added.
    """
    origin = request.headers.get("origin")
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    else:
        response.headers["Access-Control-Allow-Origin"] = "*"
        # Do NOT set Allow-Credentials with wildcard origin; browsers will reject it.
    response.headers["Access-Control-Allow-Methods"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Expose-Headers"] = "*"
    return response


async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions and ensure CORS headers are included."""
    message = exc.detail if isinstance(exc.detail, str) else "HTTP Error"
    content = wrap_error_response(
        message=message,
        status_code=exc.status_code,
        data={"detail": exc.detail} if not isinstance(exc.detail, str) else None
    )
    response = JSONResponse(
        status_code=exc.status_code,
        content=content,
    )
    return add_cors_headers(response, request)


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors and ensure CORS headers are included."""
    # Serialize validation errors properly, handling any non-JSON-serializable objects
    errors = []
    for error in exc.errors():
        serializable_error = {
            "type": error.get("type"),
            "loc": error.get("loc"),
            "msg": str(error.get("msg", "")),
        }
        # Convert any non-serializable ctx values to strings
        if "ctx" in error and error["ctx"]:
            serializable_error["ctx"] = {
                k: str(v) if not isinstance(v, (str, int, float, bool, type(None), list, dict)) else v
                for k, v in error["ctx"].items()
            }
        errors.append(serializable_error)
    
    content = wrap_error_response(
        message="Validation error",
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        data={"errors": errors}
    )
    response = JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=content,
    )
    return add_cors_headers(response, request)


async def database_error_handler(request: Request, exc: OperationalError):
    """Handle database operational errors (like readonly database) and ensure CORS headers."""
    error_msg = str(exc.orig) if hasattr(exc, 'orig') else str(exc)
    logger.error(f"Database operational error: {error_msg}", exc_info=True)
    
    # Check if it's a readonly database error
    if "readonly" in error_msg.lower() or "read-only" in error_msg.lower():
        detail = (
            "Database write error: Attempted to write to a readonly database. "
            "This usually means the system is trying to write to the seed database "
            "instead of the run-specific database. Please check that the X-Run-ID header is set correctly."
        )
    else:
        detail = f"Database error: {error_msg}"
    
    content = wrap_error_response(
        message=detail,
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        data={"error_type": "database_operational_error"}
    )
    response = JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=content,
    )
    return add_cors_headers(response, request)


async def general_exception_handler(request: Request, exc: Exception):
    """Handle all other exceptions and ensure CORS headers are included."""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    content = wrap_error_response(
        message="Internal server error",
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        data={"error_type": type(exc).__name__}
    )
    response = JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=content,
    )
    return add_cors_headers(response, request)


def register_exception_handlers(app):
    """Register all exception handlers with the FastAPI app.
    
    Args:
        app: FastAPI application instance.
    """
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(OperationalError, database_error_handler)
    app.add_exception_handler(Exception, general_exception_handler)

