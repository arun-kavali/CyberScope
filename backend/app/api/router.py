from fastapi import APIRouter
from app.api import health, auth, alerts, analysis, incidents, sources, analytics, response, reports, audit

api_router = APIRouter()

# Register health check
api_router.include_router(health.router)

# Register modular feature routers (empty shells ready for future phases)
api_router.include_router(auth.router)
api_router.include_router(alerts.router)
api_router.include_router(analysis.router)
api_router.include_router(incidents.router)
api_router.include_router(sources.router)
api_router.include_router(analytics.router)
api_router.include_router(response.router)
api_router.include_router(reports.router)
api_router.include_router(audit.router)
