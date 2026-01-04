"""Central router for API v1 endpoints."""

from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, db_snapshot
from app.api.v1.endpoints import emails, folders, labels, attachments, search, bulk, templates
from app.api.v1.endpoints import metrics

router = APIRouter()

# Include all v1 endpoint routers
router.include_router(auth.router, tags=["auth"])
router.include_router(users.router, tags=["users"])
router.include_router(db_snapshot.router, tags=["db-snapshot"])

# Email-related routers
router.include_router(emails.router, tags=["emails"])
router.include_router(folders.router, tags=["folders"])
router.include_router(labels.router, tags=["labels"])
router.include_router(attachments.router, tags=["attachments"])
router.include_router(search.router, tags=["search"])
router.include_router(bulk.router, tags=["bulk"])
router.include_router(templates.router, tags=["templates"])

# Instrumentation routers
router.include_router(metrics.router, tags=["metrics"])
