import pytest
from app.config import settings


@pytest.mark.asyncio
async def test_docs_endpoint(client):
    response = await client.get("/docs")

    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]


@pytest.mark.asyncio
async def test_openapi_endpoint(client):
    response = await client.get("/openapi.json")

    assert response.status_code == 200

    data = response.json()

    assert data["info"]["title"] == settings.PROJECT_NAME
    assert data["info"]["version"] == "1.0.0"


@pytest.mark.asyncio
async def test_health_endpoint(client):
    response = await client.get("/api/v1/health")

    assert response.status_code == 200


@pytest.mark.asyncio
async def test_unknown_endpoint(client):
    response = await client.get("/this-endpoint-does-not-exist")

    assert response.status_code == 404