from fastapi import APIRouter, status
from sqlalchemy import select
import time
import logging

from app.database import async_session_maker
from app.redis_client import redis_manager

health_router = APIRouter()
logger = logging.getLogger(__name__)

@health_router.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    """Liveness check returning health state of database and cache."""
    db_alive = False
    try:
        async with async_session_maker() as session:
            await session.execute(select(1))
            db_alive = True
    except Exception as e:
        logger.error(f"Health check PostgreSQL connection failure: {e}")
        
    cache_alive = False
    if redis_manager.client:
        try:
            await redis_manager.client.ping()
            cache_alive = True
        except Exception:
            pass

    return {
        "status": "healthy" if db_alive and cache_alive else "degraded",
        "timestamp": time.time(),
        "database_connected": db_alive,
        "redis_connected": cache_alive
    }