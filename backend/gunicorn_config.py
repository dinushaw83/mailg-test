import os
import fcntl


# Gunicorn config for running FastAPI via UvicornWorker.
#
# Usage:
#   gunicorn app.main:app -c gunicorn_config.py
#
# Notes:
# - workers should be tuned based on CPU and expected concurrency.
# - Keepalive/timeout are bumped for long-ish requests.

# workers = int(os.getenv("UVICORN_WORKERS", "8"))
workers = 8
worker_class = "uvicorn.workers.UvicornWorker"

bind = os.getenv("BIND", "0.0.0.0:8765")
keepalive = int(os.getenv("GUNICORN_KEEPALIVE", "120"))
timeout = int(os.getenv("GUNICORN_TIMEOUT", "120"))

accesslog = "-"
errorlog = "-"
loglevel = os.getenv("GUNICORN_LOGLEVEL", "info")


# Lock file path for background task worker election
_BACKGROUND_TASK_LOCK_FILE = "/tmp/mailg_background_task_worker.lock"


def _cleanup_lock_file():
    """Remove the background task lock file if it exists."""
    try:
        if os.path.exists(_BACKGROUND_TASK_LOCK_FILE):
            os.remove(_BACKGROUND_TASK_LOCK_FILE)
    except OSError:
        pass


def on_starting(server):
    """Called just before the master process is initialized.
    
    Clean up any stale lock file from previous runs.
    """
    _cleanup_lock_file()


def on_reload(server):
    """Called when the master receives SIGHUP for graceful reload.
    
    Clean up lock file so new workers can re-elect a background task leader.
    """
    _cleanup_lock_file()
    print("[gunicorn] Reload triggered - lock file cleaned for worker re-election")


def post_worker_init(worker):
    """Called after a worker has been initialized.
    
    Only the first worker to acquire the lock file will run background tasks.
    This prevents duplicate background task execution across multiple workers.
    """
    try:
        # Try to acquire an exclusive lock (non-blocking)
        lock_file = open(_BACKGROUND_TASK_LOCK_FILE, "w")
        fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        # Got the lock - this worker runs background tasks
        # Keep the file handle open to hold the lock
        worker._background_task_lock = lock_file
        lock_file.write(str(worker.pid))
        lock_file.flush()
        os.environ["RUN_BACKGROUND_TASKS"] = "true"
        print(f"[gunicorn] Worker {worker.pid} assigned to run background tasks")
    except (IOError, OSError):
        # Another worker already has the lock
        os.environ["RUN_BACKGROUND_TASKS"] = "false"

