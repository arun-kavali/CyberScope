from fastapi import APIRouter
from app.api import health, test, auth, alerts, analysis, incidents, sources, analytics, response, reports, audit, ws, ai

api_router = APIRouter()

# Register health check and database test diagnostics
api_router.include_router(health.router)
api_router.include_router(test.router)

# Register modular feature routers
api_router.include_router(auth.router)
api_router.include_router(alerts.router)
api_router.include_router(ws.router)
api_router.include_router(analysis.router)
api_router.include_router(incidents.router)
api_router.include_router(ai.router)
api_router.include_router(sources.router)
api_router.include_router(analytics.router)
api_router.include_router(response.router)
api_router.include_router(reports.router)
api_router.include_router(audit.router)
