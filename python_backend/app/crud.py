import datetime
import random
import string
from sqlalchemy import select, update, delete, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import URLMapping, AnalyticsEvent

BASE62_ALPHABET = string.digits + string.ascii_uppercase + string.ascii_lowercase

def encode_base62(num: int) -> str:
    """Encodes a positive integer into a Base62 string."""
    if num == 0:
        return BASE62_ALPHABET[0]
    arr = []
    base = len(BASE62_ALPHABET)
    while num:
        num, rem = divmod(num, base)
        arr.append(BASE62_ALPHABET[rem])
    arr.reverse()
    return "".join(arr)

async def generate_unique_short_code(db: AsyncSession) -> str:
    """
    Generates a unique 6-character Base62 short code.
    Failsafe collision check against PostgreSQL database records.
    """
    for _ in range(100):
        # Combining a timestamp seed with a highly-entropy random factor
        id_seed = int(datetime.datetime.utcnow().timestamp() * 1000) + random.randint(1, 100000)
        code = encode_base62(id_seed)
        
        # Standardize to exactly 6 characters
        if len(code) > 6:
            code = code[-6:]
        elif len(code) < 6:
            code = code.zfill(6)
            
        # Check uniqueness in DB
        db_check = await db.execute(select(URLMapping).where(URLMapping.code == code))
        if db_check.scalar_one_or_none() is None:
            return code
            
    # Absolute backup random alphanumeric string
    return "".join(random.choices(BASE62_ALPHABET, k=6))

async def create_short_url(
    db: AsyncSession, 
    original_url: str, 
    custom_code: str | None = None, 
    expiry_hours: float | None = None
) -> URLMapping:
    """Inserts a new short URL into the Postgres database."""
    if custom_code:
        code = custom_code
    else:
        code = await generate_unique_short_code(db)

    expires_at = None
    if expiry_hours is not None:
        expires_at = datetime.datetime.utcnow() + datetime.timedelta(hours=expiry_hours)

    db_item = URLMapping(
        code=code,
        original_url=original_url,
        expires_at=expires_at
    )
    db.add(db_item)
    await db.flush()
    return db_item

async def get_url_by_code(db: AsyncSession, code: str) -> URLMapping | None:
    """Retrieves a URL by its code. Returns None if not found or expired."""
    result = await db.execute(select(URLMapping).where(URLMapping.code == code))
    db_item = result.scalar_one_or_none()
    
    if db_item and db_item.expires_at and db_item.expires_at < datetime.datetime.utcnow():
        # Clean up asynchronously if expired during query
        await db.delete(db_item)
        await db.flush()
        return None
        
    return db_item

async def increment_click_counter(db: AsyncSession, code: str) -> None:
    """Atomic click increment database update."""
    await db.execute(
        update(URLMapping)
        .where(URLMapping.code == code)
        .values(clicks=URLMapping.clicks + 1)
    )

async def create_analytics_event(
    db: AsyncSession,
    code: str,
    browser: str,
    os: str,
    country: str,
    ip_address: str,
    referrer: str,
    device_type: str,
    cache_status: str,
    latency_ms: int
) -> AnalyticsEvent:
    """Inserts a new click analytics record."""
    event = AnalyticsEvent(
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
    db.add(event)
    await db.flush()
    return event

async def delete_url(db: AsyncSession, code: str) -> bool:
    """Deletes a short URL from the database."""
    db_item = await get_url_by_code(db, code)
    if not db_item:
        return False
    await db.delete(db_item)
    return True

async def cleanup_expired_urls(db: AsyncSession) -> int:
    """Deletes all expired links and returns the deletion count."""
    now = datetime.datetime.utcnow()
    stmt = delete(URLMapping).where(URLMapping.expires_at < now)
    result = await db.execute(stmt)
    return result.rowcount

async def get_total_clicks(db: AsyncSession) -> int:
    result = await db.execute(
        select(func.count(AnalyticsEvent.id))
    )
    return result.scalar() or 0

async def get_cache_stats(db: AsyncSession):
    hits = await db.scalar(
        select(func.count()).where(AnalyticsEvent.cache_status == "HIT")
    ) or 0

    misses = await db.scalar(
        select(func.count()).where(AnalyticsEvent.cache_status == "MISS")
    ) or 0

    return hits, misses

async def get_average_latency(db: AsyncSession) -> float:
    avg = await db.scalar(
        select(func.avg(AnalyticsEvent.latency_ms))
    )

    return round(float(avg or 0), 2)

async def get_recent_clicks(
    db: AsyncSession,
    limit: int = 25,
):
    result = await db.execute(
        select(AnalyticsEvent)
        .order_by(AnalyticsEvent.timestamp.desc())
        .limit(limit)
    )

    return result.scalars().all()

async def get_browser_distribution(db: AsyncSession):
    result = await db.execute(
        select(
            AnalyticsEvent.browser,
            func.count(AnalyticsEvent.id)
        )
        .group_by(AnalyticsEvent.browser)
    )

    return [
        {
            "name": browser,
            "value": count,
        }
        for browser, count in result.all()
    ]

async def get_os_distribution(db: AsyncSession):
    result = await db.execute(
        select(
            AnalyticsEvent.os,
            func.count(AnalyticsEvent.id)
        )
        .group_by(AnalyticsEvent.os)
    )

    return [
        {
            "name": os,
            "value": count,
        }
        for os, count in result.all()
    ]

async def get_country_distribution(db: AsyncSession):
    result = await db.execute(
        select(
            AnalyticsEvent.country,
            func.count(AnalyticsEvent.id)
        )
        .group_by(AnalyticsEvent.country)
    )

    return [
        {
            "name": country,
            "value": count,
        }
        for country, count in result.all()
    ]

async def get_device_distribution(db: AsyncSession):
    result = await db.execute(
        select(
            AnalyticsEvent.device_type,
            func.count(AnalyticsEvent.id)
        )
        .group_by(AnalyticsEvent.device_type)
    )

    return [
        {
            "name": device,
            "value": count,
        }
        for device, count in result.all()
    ]

async def get_click_timeline(db: AsyncSession):
    result = await db.execute(
        select(
            func.date(AnalyticsEvent.timestamp),
            func.count(AnalyticsEvent.id)
        )
        .group_by(func.date(AnalyticsEvent.timestamp))
        .order_by(func.date(AnalyticsEvent.timestamp))
    )

    return [
        {
            "date": str(date),
            "clicks": count,
        }
        for date, count in result.all()
    ]