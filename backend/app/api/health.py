from fastapi import APIRouter

router = APIRouter()

@router.get("/health", tags=["Health"])
async def health_check():
    """
    Basic health check endpoint for CyberScope API.
    Returns 200 OK with service status.
    """
    return {
        "status": "healthy",
        "service": "cyberscope-api"
    }
