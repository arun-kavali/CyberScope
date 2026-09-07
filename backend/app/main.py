import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.router import api_router

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
    """
    logger.info(f"Starting {settings.APP_NAME} API backend in {settings.APP_ENV} mode...")
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

# Include API v1 routes
app.include_router(api_router, prefix=settings.API_V1_STR)
