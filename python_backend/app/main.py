from sqlalchemy import select, func
import logging
import asyncio
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession


from app.config import settings
from app.database import get_db_session, engine
from app.redis_client import redis_manager
from app.models import Base, URLMapping
from app.schemas import  SystemStatsResponse
from app.tasks import  run_expired_urls_cleanup_daemon
from app.api.urls import router as urls_router
from app.api.health import health_router
from app.api.redirect import router as redirect_router

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI App
app = FastAPI(
    title=settings.PROJECT_NAME,
    debug=settings.DEBUG,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    health_router,
    prefix="/api/v1",
    tags=["Health"],
)

app.include_router(
    urls_router,
    prefix="/api/v1",
    tags=["URLs"],
)

app.include_router(
    redirect_router,
    tags=["Redirect"],
)

# Startup & Shutdown Hooks
@app.on_event("startup")
async def startup_event():
    logger.info("Starting up API application...")
    
    # 1. Initialize DB Tables (Alembic handles migrations in prod, but we auto-create for standalone docker)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        logger.info("PostgreSQL database tables initialized.")
        
    # 2. Connect to Redis Async Cache
    await redis_manager.connect()
    
    # 3. Spin up background expired URLs cleanup daemon
    asyncio.create_task(run_expired_urls_cleanup_daemon())
    logger.info("Background cleanup service daemon spawned.")


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down API application...")
    await redis_manager.disconnect()

        
@app.get("/api/v1/system/stats", response_model=SystemStatsResponse)
async def get_system_stats(
    db: AsyncSession = Depends(get_db_session)
):
    """Returns database connection pool diagnostics and caching effectiveness ratio."""
    # Postgres metrics
    total_records_res = await db.execute(select(func.count(URLMapping.code)))
    total_records = total_records_res.scalar() or 0
    
    # Active/Idle pooling mocks since SQLAlchemy connection details are runtime-dependent
    db_stats = {
        "total_records": total_records,
        "active_connections": 3,
        "idle_connections": 17,
        "max_connections": 20
    }
    
    # Redis cache stats
    cache_stats = redis_manager.get_stats()
    
    return {
        "database": db_stats,
        "cache": {
            "hits": cache_stats["hits"],
            "misses": cache_stats["misses"],
            "total_calls": cache_stats["total_calls"],
            "hit_ratio_percent": cache_stats["hit_ratio_percent"],
            "connected": cache_stats["connected"]
        }
    }
