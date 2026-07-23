import logging
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


from app.config import settings
from app.database import engine
from app.redis_client import redis_manager
from app.models import Base
from app.tasks import  run_expired_urls_cleanup_daemon
from app.api.urls import router as urls_router
from app.api.health import health_router
from app.api.redirect import router as redirect_router
from app.api.system import router as system_router

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

app.include_router(
    system_router,
    prefix="/api/v1",
    tags=["System"],
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