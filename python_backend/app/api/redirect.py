import datetime
import json
import time

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.crud import delete_url, get_url_by_code, increment_click_counter
from app.database import get_db_session
from app.redis_client import redis_manager
from app.tasks import record_analytics_task
from app.utils.client_metadata import get_client_metadata

router = APIRouter(tags=["Redirect"])


@router.get("/r/{code}", status_code=status.HTTP_307_TEMPORARY_REDIRECT)
async def redirect_short_url(
    code: str,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db_session),
):
    """
    Primary High-Speed Redirect Router.
    Implements Cache-Aside architecture.
    """

    start_time = time.time()
    original_url = None
    cache_status = "MISS"
    expires_at_dt = None

    # 1. Redis lookup
    cached_str = await redis_manager.get(f"url:{code}")

    if cached_str:
        try:
            cached_data = json.loads(cached_str)

            expires_at_str = cached_data.get("expires_at")

            if expires_at_str:
                expires_at_dt = datetime.datetime.fromisoformat(expires_at_str)

                if expires_at_dt < datetime.datetime.utcnow():
                    background_tasks.add_task(
                        redis_manager.delete,
                        f"url:{code}"
                    )
                    background_tasks.add_task(
                        delete_url,
                        db,
                        code
                    )

                    raise HTTPException(
                        status_code=410,
                        detail="Short link has expired."
                    )

            original_url = cached_data["original_url"]
            cache_status = "HIT"

        except HTTPException:
          raise
        except Exception:
          original_url = None

    # 2. Cache miss → PostgreSQL
    if not original_url:
        db_item = await get_url_by_code(db, code)

        if not db_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Short URL code not found."
            )

        original_url = db_item.original_url

        cache_payload = {
            "code": db_item.code,
            "original_url": db_item.original_url,
            "expires_at": (
                db_item.expires_at.isoformat()
                if db_item.expires_at
                else None
            ),
        }

        background_tasks.add_task(
            redis_manager.set,
            f"url:{code}",
            json.dumps(cache_payload),
            settings.REDIS_TTL_SECONDS,
        )

    # 3. Analytics
    latency_ms = int((time.time() - start_time) * 1000)

    meta = get_client_metadata(request)

    background_tasks.add_task(
        increment_click_counter,
        db,
        code,
    )

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
        latency_ms=max(1, latency_ms),
    )

    return RedirectResponse(
        url=original_url,
        status_code=status.HTTP_307_TEMPORARY_REDIRECT,
    )