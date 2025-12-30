"""Central router for API v1 endpoints."""

from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, items, db_snapshot

router = APIRouter()

# Include all v1 endpoint routers
router.include_router(auth.router, tags=["auth"])
router.include_router(users.router, tags=["users"])
router.include_router(items.router, tags=["items"])
router.include_router(db_snapshot.router, tags=["db-snapshot"])

