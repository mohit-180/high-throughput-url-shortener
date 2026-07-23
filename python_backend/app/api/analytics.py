from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db_session
from app import crud
from app.schemas import (
    AnalyticsDashboardResponse,
    AnalyticsSummary,
)

router = APIRouter()

@router.get(
    "/analytics",
    response_model=AnalyticsDashboardResponse,
    status_code=status.HTTP_200_OK,
)
async def get_analytics(
    db: AsyncSession = Depends(get_db_session),
):
    total_clicks = await crud.get_total_clicks(db)

    hits, misses = await crud.get_cache_stats(db)

    average_latency = await crud.get_average_latency(db)

    recent_clicks = await crud.get_recent_clicks(db)

    browser_distribution = await crud.get_browser_distribution(db)

    os_distribution = await crud.get_os_distribution(db)

    country_distribution = await crud.get_country_distribution(db)

    device_distribution = await crud.get_device_distribution(db)

    click_timeline = await crud.get_click_timeline(db)

    return AnalyticsDashboardResponse(
       summary=AnalyticsSummary(
        totalClicks=total_clicks,
        cacheHits=hits,
        cacheMisses=misses,
        averageLatency=average_latency,
    ),
    recentClicks=recent_clicks,
    browserDistribution=browser_distribution,
    osDistribution=os_distribution,
    countryDistribution=country_distribution,
    deviceDistribution=device_distribution,
    clickTimeline=click_timeline,
)