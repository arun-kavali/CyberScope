import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.router import api_router
from app.api import auth, alerts, ws, analysis, incidents, ai, reports, data_quality, sources, analytics, response, audit, dashboard
from app.db.session import SessionLocal
from app.auth.service import seed_default_users

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("cyberscope")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan events handler for startup and shutdown logging.
    Executes database seed for default users and roles.
    """
    logger.info(f"Starting {settings.APP_NAME} API backend in {settings.APP_ENV} mode...")
    db = SessionLocal()
    try:
        seed_default_users(db)
    finally:
        db.close()
    yield
    logger.info(f"Shutting down {settings.APP_NAME} API backend...")

app = FastAPI(
    title=settings.APP_NAME,
    description="Evidence-Driven Cybersecurity Intelligence Platform API",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# CORS middleware for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Direct root-level GET /health endpoint as required by spec
@app.get("/health", tags=["Health"])
async def root_health_check():
    """
    Primary health endpoint returning system health status.
    """
    return {
        "status": "healthy",
        "service": "cyberscope-api"
    }
# Direct root-level feature routes for legacy compatibility
app.include_router(auth.router)
app.include_router(alerts.router)
app.include_router(ws.router)
app.include_router(analysis.router)
app.include_router(incidents.router)
app.include_router(ai.router)
app.include_router(reports.router)
app.include_router(data_quality.router)
app.include_router(sources.router)
app.include_router(analytics.router)
app.include_router(response.router)
app.include_router(audit.router)
app.include_router(dashboard.router)

# Canonical API v1 routes (/api/v1/...)
app.include_router(api_router, prefix=settings.API_V1_STR)
