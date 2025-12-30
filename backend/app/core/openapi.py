"""OpenAPI schema customization for JWT Bearer authentication and wrapped responses."""

import copy
from fastapi.openapi.utils import get_openapi


def wrap_response_schema(original_schema: dict, status_code: int) -> dict:
    """Wrap a response schema in the standardized wrapper format.
    
    Args:
        original_schema: The original response schema.
        status_code: HTTP status code for this response.
        
    Returns:
        Wrapped schema dictionary.
    """
    is_success = 200 <= status_code < 400
    
    return {
        "type": "object",
        "required": ["success", "message", "statusCode", "data"],
        "properties": {
            "success": {
                "type": "boolean",
                "example": is_success,
                "description": "Indicates if the request was successful"
            },
            "message": {
                "type": "string",
                "example": "Success" if is_success else "Error",
                "description": "Human-readable response message"
            },
            "statusCode": {
                "type": "integer",
                "example": status_code,
                "description": "HTTP status code"
            },
            "data": original_schema if original_schema else {"type": "null"}
        }
    }


def create_error_response_schema(status_code: int, description: str) -> dict:
    """Create a standardized error response schema.
    
    Args:
        status_code: HTTP status code.
        description: Error description.
        
    Returns:
        Error response schema.
    """
    return {
        "type": "object",
        "required": ["success", "message", "statusCode", "data"],
        "properties": {
            "success": {
                "type": "boolean",
                "example": False
            },
            "message": {
                "type": "string",
                "example": description
            },
            "statusCode": {
                "type": "integer",
                "example": status_code
            },
            "data": {
                "type": "object",
                "nullable": True,
                "example": None
            }
        }
    }


def wrap_openapi_responses(openapi_schema: dict) -> dict:
    """Wrap all response schemas in the standardized wrapper format.
    
    Args:
        openapi_schema: The original OpenAPI schema.
        
    Returns:
        Modified OpenAPI schema with wrapped responses.
    """
    # Add wrapper schema components
    components = openapi_schema.setdefault("components", {})
    schemas = components.setdefault("schemas", {})
    
    # Add generic wrapper schemas
    schemas["WrappedResponse"] = {
        "type": "object",
        "required": ["success", "message", "statusCode", "data"],
        "properties": {
            "success": {
                "type": "boolean",
                "description": "Indicates if the request was successful"
            },
            "message": {
                "type": "string",
                "description": "Human-readable response message"
            },
            "statusCode": {
                "type": "integer",
                "description": "HTTP status code"
            },
            "data": {
                "description": "Response payload"
            }
        }
    }
    
    schemas["ValidationErrorResponse"] = {
        "type": "object",
        "required": ["success", "message", "statusCode", "data"],
        "properties": {
            "success": {
                "type": "boolean",
                "example": False
            },
            "message": {
                "type": "string",
                "example": "Validation error"
            },
            "statusCode": {
                "type": "integer",
                "example": 422
            },
            "data": {
                "type": "object",
                "properties": {
                    "errors": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "loc": {
                                    "type": "array",
                                    "items": {"type": "string"}
                                },
                                "msg": {"type": "string"},
                                "type": {"type": "string"}
                            }
                        }
                    }
                }
            }
        }
    }
    
    # Skip wrapping for these paths
    skip_paths = ["/docs", "/redoc", "/openapi.json"]
    
    # Wrap responses in all paths
    paths = openapi_schema.get("paths", {})
    for path, path_item in paths.items():
        # Skip docs endpoints
        if any(path.startswith(skip) for skip in skip_paths):
            continue
            
        for method, operation in path_item.items():
            if method not in ["get", "post", "put", "patch", "delete"]:
                continue
                
            responses = operation.get("responses", {})
            
            for status_code, response in responses.items():
                try:
                    code = int(status_code)
                except ValueError:
                    continue
                
                content = response.get("content", {})
                json_content = content.get("application/json", {})
                original_schema = json_content.get("schema", {})
                
                if original_schema:
                    # Deep copy to avoid modifying original
                    wrapped_schema = wrap_response_schema(copy.deepcopy(original_schema), code)
                    json_content["schema"] = wrapped_schema
                    
                    if "application/json" not in content:
                        content["application/json"] = json_content
                    response["content"] = content
            
            # Update 422 validation error response
            if "422" in responses:
                responses["422"] = {
                    "description": "Validation Error",
                    "content": {
                        "application/json": {
                            "schema": {"$ref": "#/components/schemas/ValidationErrorResponse"}
                        }
                    }
                }
            
            # Add common error responses if not present
            if "401" not in responses:
                responses["401"] = {
                    "description": "Unauthorized",
                    "content": {
                        "application/json": {
                            "schema": create_error_response_schema(401, "Not authenticated")
                        }
                    }
                }
    
    return openapi_schema


def custom_openapi(app):
    """Customize OpenAPI schema (Bearer auth + wrapped responses).
    
    Args:
        app: FastAPI application instance.
        
    Returns:
        OpenAPI schema dictionary with Bearer auth and wrapped response configuration.
    """
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        routes=app.routes,
        description=app.description,
    )

    components = openapi_schema.setdefault("components", {})
    security_schemes = components.setdefault("securitySchemes", {})
    security_schemes["BearerAuth"] = {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": "Paste a token from /api/v1/auth/token as: Bearer <token>",
    }

    # Apply Bearer auth globally so Swagger UI attaches Authorization automatically.
    openapi_schema["security"] = [{"BearerAuth": []}]
    
    # Wrap all responses in standardized format
    openapi_schema = wrap_openapi_responses(openapi_schema)

    app.openapi_schema = openapi_schema
    return app.openapi_schema
