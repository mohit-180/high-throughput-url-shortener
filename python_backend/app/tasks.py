import logging
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import async_session_maker
from app.crud import create_analytics_event, cleanup_expired_urls

logger = logging.getLogger(__name__)

async def record_analytics_task(
    code: str,
    browser: str,
    os: str,
    country: str,
    ip_address: str,
    referrer: str,
    device_type: str,
    cache_status: str,
    latency_ms: int
) -> None:
    """
    Background Task: Records click analytics without blocking the HTTP Redirect pipeline.
    This runs asynchronously using FastAPI's background execution queue.
    """
    async with async_session_maker() as session:
        try:
            await create_analytics_event(
                db=session,
                code=code,
                browser=browser,
                os=os,
                country=country,
                ip_address=ip_address,
                referrer=referrer,
                device_type=device_type,
                cache_status=cache_status,
                latency_ms=latency_ms
            )
            await session.commit()
            logger.info(f"Recorded background analytics event for short code: {code}")
        except Exception as e:
            await session.rollback()
            logger.error(f"Error persisting background analytics for code '{code}': {e}")
        finally:
            await session.close()


async def run_expired_urls_cleanup_daemon() -> None:
    """
    Periodic Daemon Loop: Periodically prunes expired URLs from Postgres and Redis.
    Runs in a separate asyncio execution context.
    """
    while True:
        try:
            logger.info("Initializing scheduled sweep for expired URLs...")
            async with async_session_maker() as session:
                deleted = await cleanup_expired_urls(session)
                await session.commit()
                if deleted > 0:
                    logger.info(f"Successfully pruned {deleted} expired URL mappings.")
        except Exception as e:
            logger.error(f"Exception during scheduled URL pruning task: {e}")
        
        # Sleep for 1 hour (3600 seconds)
        await asyncio.sleep(3600)
