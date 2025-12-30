"""Response wrapper middleware.

Wraps all API responses in a consistent format:
{
    "success": true/false,
    "message": "...",
    "statusCode": 200,
    "data": [response]
}
"""

import json
import logging
from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger(__name__)


def wrap_response_data(data, status_code: int, message: str = None) -> dict:
    """Wrap response data in standard format.
    
    Args:
        data: The response data to wrap.
        status_code: HTTP status code.
        message: Optional message (defaults based on success/failure).
        
    Returns:
        Wrapped response dictionary.
    """
    success = 200 <= status_code < 400
    
    if message is None:
        message = "Success" if success else "Error"
    
    return {
        "success": success,
        "message": message,
        "statusCode": status_code,
        "data": data
    }


class ResponseWrapperMiddleware(BaseHTTPMiddleware):
    """Middleware to wrap all responses in a consistent format."""
    
    # Paths to skip wrapping
    SKIP_PATHS = ["/docs", "/redoc", "/openapi.json", "/favicon.ico"]
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process the request and wrap the response."""
        # Skip wrapping for docs/openapi endpoints
        if any(request.url.path.startswith(path) for path in self.SKIP_PATHS):
            return await call_next(request)
        
        # Skip OPTIONS (preflight) requests
        if request.method == "OPTIONS":
            return await call_next(request)
        
        response = await call_next(request)
        
        # Read the response body
        body = b""
        async for chunk in response.body_iterator:
            body += chunk
        
        # Check if it's JSON content
        content_type = response.headers.get("content-type", "")
        if "application/json" not in content_type:
            # Return non-JSON as-is
            return Response(
                content=body,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.media_type
            )
        
        # Handle empty body (like 204 No Content)
        if not body:
            return Response(
                content=body,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.media_type
            )
        
        try:
            # Parse JSON response
            original_data = json.loads(body.decode("utf-8"))
            
            # Check if already wrapped (avoid double-wrapping from exception handlers)
            if isinstance(original_data, dict) and all(
                key in original_data for key in ["success", "message", "statusCode", "data"]
            ):
                # Already wrapped, return as-is
                return Response(
                    content=body,
                    status_code=response.status_code,
                    headers=dict(response.headers),
                    media_type=response.media_type
                )
            
            # Extract message from error responses
            message = None
            if isinstance(original_data, dict):
                message = original_data.get("detail") or original_data.get("message")
                if isinstance(message, list):
                    # Validation errors come as list
                    message = "Validation error"
            
            # Wrap the response
            wrapped = wrap_response_data(original_data, response.status_code, message)
            wrapped_content = json.dumps(wrapped).encode("utf-8")
            
            # Create new headers with updated content-length
            new_headers = {}
            for key, value in response.headers.items():
                if key.lower() != "content-length":
                    new_headers[key] = value
            new_headers["content-length"] = str(len(wrapped_content))
            
            return Response(
                content=wrapped_content,
                status_code=response.status_code,
                headers=new_headers,
                media_type="application/json"
            )
            
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            logger.debug(f"Could not parse response as JSON: {e}")
            # Return original response if parsing fails
            return Response(
                content=body,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.media_type
            )


async def response_wrapper_middleware(request: Request, call_next: Callable) -> Response:
    """Functional middleware wrapper for compatibility.
    
    This wraps all API responses in a consistent format:
    {
        "success": true/false,
        "message": "...",
        "statusCode": 200,
        "data": {...}
    }
    """
    # Paths to skip wrapping
    skip_paths = ["/docs", "/redoc", "/openapi.json", "/favicon.ico"]
    
    if any(request.url.path.startswith(path) for path in skip_paths):
        return await call_next(request)
    
    if request.method == "OPTIONS":
        return await call_next(request)
    
    response = await call_next(request)
    
    # Read the response body
    body = b""
    async for chunk in response.body_iterator:
        body += chunk
    
    # Check if it's JSON content
    content_type = response.headers.get("content-type", "")
    if "application/json" not in content_type or not body:
        return Response(
            content=body,
            status_code=response.status_code,
            headers=dict(response.headers),
            media_type=response.media_type
        )
    
    try:
        original_data = json.loads(body.decode("utf-8"))
        
        # Check if already wrapped
        if isinstance(original_data, dict) and all(
            key in original_data for key in ["success", "message", "statusCode", "data"]
        ):
            return Response(
                content=body,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.media_type
            )
        
        # Extract message
        message = None
        if isinstance(original_data, dict):
            message = original_data.get("detail") or original_data.get("message")
            if isinstance(message, list):
                message = "Validation error"
        
        # Wrap the response
        wrapped = wrap_response_data(original_data, response.status_code, message)
        wrapped_content = json.dumps(wrapped).encode("utf-8")
        
        # Build new headers
        new_headers = {k: v for k, v in response.headers.items() if k.lower() != "content-length"}
        new_headers["content-length"] = str(len(wrapped_content))
        
        return Response(
            content=wrapped_content,
            status_code=response.status_code,
            headers=new_headers,
            media_type="application/json"
        )
        
    except (json.JSONDecodeError, UnicodeDecodeError) as e:
        logger.debug(f"Could not parse response as JSON: {e}")
        return Response(
            content=body,
            status_code=response.status_code,
            headers=dict(response.headers),
            media_type=response.media_type
        )


__all__ = ["response_wrapper_middleware", "ResponseWrapperMiddleware", "wrap_response_data"]
