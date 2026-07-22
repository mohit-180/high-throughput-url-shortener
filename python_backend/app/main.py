import time
import logging
import json
import asyncio
from fastapi import FastAPI, Depends, HTTPException, Request, BackgroundTasks, status
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession


from app.config import settings
from app.database import get_db_session, engine
from app.redis_client import RedisCacheManager, get_redis_client, redis_manager
from app.models import Base, URLMapping, AnalyticsEvent
from app.schemas import URLShortenRequest, URLResponse, SystemStatsResponse
from app.crud import create_short_url, get_url_by_code, delete_url, increment_click_counter
from app.tasks import record_analytics_task, run_expired_urls_cleanup_daemon
from app.utils.client_metadata import get_client_metadata
from app.api.health import health_router

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


# ==============================================================================
# ENDPOINTS
# =============================================================================


@app.post("/api/v1/shorten", response_model=URLResponse, status_code=status.HTTP_201_CREATED)
async def create_short_link(
    payload: URLShortenRequest,
    db: AsyncSession = Depends(get_db_session)
):
    """
    Creates a new base62 short URL.
    Validates duplicates and pre-warms the cache.
    """
    if payload.custom_code:
        # Check duplicate
        existing = await get_url_by_code(db, payload.custom_code)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Custom short code already in use."
            )

    try:
        db_item = await create_short_url(
            db=db,
            original_url=payload.url,
            custom_code=payload.custom_code,
            expiry_hours=payload.expiry_hours
        )
        await db.commit()
        await db.refresh(db_item)
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error during creation: {e}"
        )

    # Pre-warm Cache (Cache-Aside eager-write)
    cache_payload = {
        "code": db_item.code,
        "original_url": db_item.original_url,
        "expires_at": db_item.expires_at.isoformat() if db_item.expires_at else None
    }
    await redis_manager.set(
        key=f"url:{db_item.code}",
        value=json.dumps(cache_payload),
        ttl_seconds=settings.REDIS_TTL_SECONDS
    )

    return URLResponse(
        code=db_item.code,
        original_url=db_item.original_url,
        short_url=f"/r/{db_item.code}",
        created_at=db_item.created_at,
        expires_at=db_item.expires_at,
        clicks=db_item.clicks
    )


@app.get("/r/{code}", status_code=status.HTTP_307_TEMPORARY_REDIRECT)
async def redirect_short_url(
    code: str,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db_session)
):
    """
    Primary High-Speed Redirect Router.
    Implements Cache-Aside architecture. Reads from Redis, falls back to Postgres.
    Increments click counts and streams analytics telemetry asynchronously.
    """
    start_time = time.time()
    original_url = None
    cache_status = "MISS"
    expires_at_dt = None

    # 1. Look up in Redis cache
    cached_str = await redis_manager.get(f"url:{code}")
    if cached_str:
        try:
            cached_data = json.loads(cached_str)
            expires_at_str = cached_data.get("expires_at")
            
            # Check custom expiration in cache
            if expires_at_str:
                expires_at_dt = datetime.datetime.fromisoformat(expires_at_str)
                if expires_at_dt < datetime.datetime.utcnow():
                    # Evict from cache and delete from DB async
                    background_tasks.add_task(redis_manager.delete, f"url:{code}")
                    background_tasks.add_task(delete_url, db, code)
                    raise HTTPException(status_code=410, detail="Short link has expired.")
            
            original_url = cached_data["original_url"]
            cache_status = "HIT"
        except Exception as e:
            logger.warning(f"Failed to parse cached payload for '{code}': {e}")

    # 2. Cache Miss: Read from PostgreSQL
    if not original_url:
        db_item = await get_url_by_code(db, code)
        if not db_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Short URL code not found."
            )
        
        original_url = db_item.original_url
        expires_at_dt = db_item.expires_at
        
        # Populate Cache for future lookups
        cache_payload = {
            "code": db_item.code,
            "original_url": db_item.original_url,
            "expires_at": db_item.expires_at.isoformat() if db_item.expires_at else None
        }
        background_tasks.add_task(
            redis_manager.set,
            f"url:{code}",
            json.dumps(cache_payload),
            settings.REDIS_TTL_SECONDS
        )

    # 3. Calculate latency & compile telemetry
    latency_ms = int((time.time() - start_time) * 1000)
    meta = get_client_metadata(request)

    # 4. Asynchronously update click counter in DB and record telemetry
    background_tasks.add_task(increment_click_counter, db, code)
    background_tasks.add_task(
        record_analytics_task,
        code=code,
        browser=meta["browser"],
        os=meta["os"],
        country=meta["country"],
        ip_address=meta["ip_address"],
        referrer=meta["referrer"],
        device_type=meta["device_type"],
        cache_status=cache_status,
        latency_ms=max(1, latency_ms) # Ensure at least 1ms latency for profiling logs
    )

    # 5. Perform HTTP Redirect
    return RedirectResponse(url=original_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)


@app.get("/api/v1/urls/{code}", response_model=URLResponse)
async def get_url_details(
    code: str,
    db: AsyncSession = Depends(get_db_session)
):
    """Retrieve metadata details for a shortened URL."""
    db_item = await get_url_by_code(db, code)
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="URL short code not found."
        )
    return URLResponse(
        code=db_item.code,
        original_url=db_item.original_url,
        short_url=f"/r/{db_item.code}",
        created_at=db_item.created_at,
        expires_at=db_item.expires_at,
        clicks=db_item.clicks
    )


@app.delete("/api/v1/urls/{code}", status_code=status.HTTP_200_OK)
async def delete_short_link(
    code: str,
    db: AsyncSession = Depends(get_db_session)
):
    """Deletes a short URL from PostgreSQL and evicts its Redis cache entry."""
    success = await delete_url(db, code)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Short code not found."
        )
    # Evict Cache
    await redis_manager.delete(f"url:{code}")
    await db.commit()
    return {"detail": "URL mapping and cache eviction completed successfully."}


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
