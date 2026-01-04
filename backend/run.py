"""
Run the FastAPI development server with uvicorn.

For production, use gunicorn with the provided gunicorn_config.py:
    gunicorn -c gunicorn_config.py app.main:app
"""

import os
import sys
import uvicorn

# Set UTF-8 encoding for Windows compatibility
if sys.platform == "win32":
    import codecs
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())
    sys.stderr = codecs.getwriter("utf-8")(sys.stderr.detach())

if __name__ == "__main__":
    # Development mode enables auto-reload
    dev_mode = os.getenv("DEVELOPMENT_MODE", "false").lower() == "true"
    
    # Port configuration
    port = int(os.getenv("PORT", "8765"))
    
    # Worker configuration (only used in production, ignored with reload)
    workers = int(os.getenv("UVICORN_WORKERS", "1"))
    
    if dev_mode:
        # Development: single worker with auto-reload
        print("🚀 Starting FastAPI in DEVELOPMENT mode with auto-reload")
        print(f"📍 Server running at: http://localhost:{port}")
        print(f"📚 API docs available at: http://localhost:{port}/docs")
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=port,
            reload=True,
            log_level="debug"
        )
    else:
        # Production: multiple workers, no reload
        print(f"🚀 Starting FastAPI in PRODUCTION mode with {workers} worker(s)")
        print(f"📍 Server running at: http://localhost:{port}")
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=port,
            workers=workers,
            log_level="info"
        )
