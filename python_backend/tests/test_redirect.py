from unittest.mock import AsyncMock, patch
import pytest


@pytest.mark.asyncio
@patch("app.api.redirect.redis_manager.get", new_callable=AsyncMock)
async def test_redirect_cache_hit(mock_redis_get, client):
    mock_redis_get.return_value = (
        '{"original_url":"https://google.com","expires_at":null}'
    )

    response = await client.get(
        "/r/abc123",
        follow_redirects=False,
    )

    assert response.status_code == 307
    assert response.headers["location"] == "https://google.com"


@pytest.mark.asyncio
@patch("app.api.redirect.redis_manager.get", new_callable=AsyncMock)
@patch("app.api.redirect.get_url_by_code", new_callable=AsyncMock)
async def test_redirect_cache_miss(
    mock_get_url,
    mock_redis_get,
    client,
):
    mock_redis_get.return_value = None

    mock_get_url.return_value = type(
        "MockURL",
        (),
        {
            "code": "abc123",
            "original_url": "https://google.com",
            "expires_at": None,
        },
    )()

    response = await client.get(
        "/r/abc123",
        follow_redirects=False,
    )

    assert response.status_code == 307
    assert response.headers["location"] == "https://google.com"


@pytest.mark.asyncio
@patch("app.api.redirect.redis_manager.get", new_callable=AsyncMock)
@patch("app.api.redirect.get_url_by_code", new_callable=AsyncMock)
async def test_redirect_not_found(
    mock_get_url,
    mock_redis_get,
    client,
):
    mock_redis_get.return_value = None
    mock_get_url.return_value = None

    response = await client.get(
        "/r/doesnotexist",
        follow_redirects=False,
    )

    assert response.status_code == 404


@pytest.mark.asyncio
@patch("app.api.redirect.redis_manager.get", new_callable=AsyncMock)
async def test_redirect_expired(
    mock_redis_get,
    client,
):
    mock_redis_get.return_value = (
        '{"original_url":"https://google.com",'
        '"expires_at":"2000-01-01T00:00:00"}'
    )

    response = await client.get(
        "/r/expired",
        follow_redirects=False,
    )

    assert response.status_code == 410
    assert response.json()["detail"] == "Short link has expired."