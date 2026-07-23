from unittest.mock import AsyncMock, patch
from datetime import datetime, UTC

import pytest


@pytest.mark.asyncio
@patch("app.api.urls.redis_manager.set", new_callable=AsyncMock)
@patch("app.api.urls.create_short_url", new_callable=AsyncMock)
async def test_create_short_url_success(
    mock_create_short_url,
    mock_redis_set,
    client,
    mock_db,
):
    mock_create_short_url.return_value = type(
        "MockURL",
        (),
        {
            "code": "abc123",
            "original_url": "https://google.com",
            "created_at": datetime.now(UTC),
            "expires_at": None,
            "clicks": 0,
        },
    )()

    response = await client.post(
        "/api/v1/shorten",
        json={
            "url": "https://google.com"
        },
    )

    assert response.status_code == 201

    data = response.json()

    assert data["code"] == "abc123"
    assert data["original_url"] == "https://google.com"
    assert data["clicks"] == 0

@pytest.mark.asyncio
async def test_invalid_url(client):
    response = await client.post(
        "/api/v1/shorten",
        json={
            "url": "google.com"
        },
    )

    assert response.status_code == 422

@pytest.mark.asyncio
async def test_missing_url(client):
    response = await client.post(
        "/api/v1/shorten",
        json={},
    )

    assert response.status_code == 422 

@pytest.mark.asyncio
async def test_invalid_custom_code(client):
    response = await client.post(
        "/api/v1/shorten",
        json={
            "url": "https://google.com",
            "custom_code": "@@@"
        },
    )

    assert response.status_code == 422         