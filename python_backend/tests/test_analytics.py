from unittest.mock import AsyncMock, patch

import pytest


@pytest.mark.asyncio
@patch("app.api.analytics.crud.get_click_timeline", new_callable=AsyncMock)
@patch("app.api.analytics.crud.get_device_distribution", new_callable=AsyncMock)
@patch("app.api.analytics.crud.get_country_distribution", new_callable=AsyncMock)
@patch("app.api.analytics.crud.get_os_distribution", new_callable=AsyncMock)
@patch("app.api.analytics.crud.get_browser_distribution", new_callable=AsyncMock)
@patch("app.api.analytics.crud.get_recent_clicks", new_callable=AsyncMock)
@patch("app.api.analytics.crud.get_average_latency", new_callable=AsyncMock)
@patch("app.api.analytics.crud.get_cache_stats", new_callable=AsyncMock)
@patch("app.api.analytics.crud.get_total_clicks", new_callable=AsyncMock)
async def test_get_analytics(
    mock_total_clicks,
    mock_cache_stats,
    mock_average_latency,
    mock_recent_clicks,
    mock_browser_distribution,
    mock_os_distribution,
    mock_country_distribution,
    mock_device_distribution,
    mock_click_timeline,
    client,
):
    mock_total_clicks.return_value = 150
    mock_cache_stats.return_value = (120, 30)
    mock_average_latency.return_value = 12.5

    mock_recent_clicks.return_value = []

    mock_browser_distribution.return_value = [
        {"name": "Chrome", "value": 100}
    ]

    mock_os_distribution.return_value = [
        {"name": "Windows", "value": 80}
    ]

    mock_country_distribution.return_value = [
        {"name": "India", "value": 70}
    ]

    mock_device_distribution.return_value = [
        {"name": "Desktop", "value": 90}
    ]

    mock_click_timeline.return_value = [
        {"date": "2026-07-23", "clicks": 25}
    ]

    response = await client.get("/api/v1/analytics")

    assert response.status_code == 200

    data = response.json()

    assert data["summary"]["totalClicks"] == 150
    assert data["summary"]["cacheHits"] == 120
    assert data["summary"]["cacheMisses"] == 30
    assert data["summary"]["averageLatency"] == 12.5

    assert len(data["browserDistribution"]) == 1
    assert len(data["osDistribution"]) == 1
    assert len(data["countryDistribution"]) == 1
    assert len(data["deviceDistribution"]) == 1
    assert len(data["clickTimeline"]) == 1