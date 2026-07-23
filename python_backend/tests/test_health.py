import pytest


@pytest.mark.asyncio
async def test_health_endpoint(client):
    response = await client.get("/api/v1/health")

    assert response.status_code == 200

    data = response.json()

    assert "status" in data
    assert "timestamp" in data
    assert "database_connected" in data
    assert "redis_connected" in data

    assert data["status"] in ["healthy", "degraded"]

    assert isinstance(data["database_connected"], bool)
    assert isinstance(data["redis_connected"], bool)