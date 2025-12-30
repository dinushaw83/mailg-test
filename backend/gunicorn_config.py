import os


# Gunicorn config for running FastAPI via UvicornWorker.
#
# Usage:
#   gunicorn app.main:app -c gunicorn_config.py
#
# Notes:
# - workers should be tuned based on CPU and expected concurrency.
# - Keepalive/timeout are bumped for long-ish requests.

workers = int(os.getenv("UVICORN_WORKERS", "8"))
worker_class = "uvicorn.workers.UvicornWorker"

bind = os.getenv("BIND", "0.0.0.0:8765")
keepalive = int(os.getenv("GUNICORN_KEEPALIVE", "120"))
timeout = int(os.getenv("GUNICORN_TIMEOUT", "120"))

accesslog = "-"
errorlog = "-"
loglevel = os.getenv("GUNICORN_LOGLEVEL", "info")

