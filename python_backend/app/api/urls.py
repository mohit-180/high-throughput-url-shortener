from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import json
import logging

from app.config import settings
from app.database import get_db_session
from app.redis_client import redis_manager
from app.schemas import URLShortenRequest, URLResponse
from app.crud import create_short_url, get_url_by_code, delete_url
from sqlalchemy import select
from app.models import URLMapping
from app.config import settings

router = APIRouter(tags=["URLs"])
logger = logging.getLogger(__name__)

@router.post("/shorten", response_model=URLResponse, status_code=status.HTTP_201_CREATED)
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
            expiry_hours=payload.expiry_hours,
        )

        await db.commit()
        await db.refresh(db_item)

    except Exception:
        logger.exception("Failed to create short URL")
        await db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create short URL."
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

@router.get("/urls/{code}", response_model=URLResponse)
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
        short_url=f"{settings.BASE_URL}/r/{db_item.code}",
        created_at=db_item.created_at,
        expires_at=db_item.expires_at,
        clicks=db_item.clicks
    )

@router.delete("/urls/{code}", status_code=status.HTTP_200_OK)
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

@router.get(
    "/urls",
    response_model=list[URLResponse],
    status_code=status.HTTP_200_OK,
)
async def list_urls(
    db: AsyncSession = Depends(get_db_session),
):
    """
    Return all shortened URLs ordered by newest first.
    """

    result = await db.execute(
        select(URLMapping).order_by(URLMapping.created_at.desc())
    )

    urls = result.scalars().all()

    return [
        URLResponse(
            code=url.code,
            original_url=url.original_url,
            short_url=f"{settings.BASE_URL}/r/{url.code}",
            created_at=url.created_at,
            expires_at=url.expires_at,
            clicks=url.clicks,
        )
        for url in urls
    ]
