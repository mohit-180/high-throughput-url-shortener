import asyncio
import datetime
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.main import app
from app.config import settings
from app.models import Base, URLMapping
from app.database import get_db_session
from app.redis_client import redis_manager

# Set up an in-memory SQLite Database for fast async unit tests
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def test_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()

@pytest.fixture
async def db_session(test_engine) -> AsyncSession:
    async_session = async_sessionmaker(
        bind=test_engine,
        expire_on_commit=False,
        class_=AsyncSession
    )
    async with async_session() as session:
        yield session
        await session.rollback()
        await session.close()

@pytest.fixture(autouse=True)
async def mock_dependencies(db_session):
    # Override FastAPI dependecy injection to route queries to SQLite test memory
    app.dependency_overrides[get_db_session] = lambda: db_session
    # Connect Redis Manager to SQLite mock
    await redis_manager.connect()
    yield
    app.dependency_overrides.clear()


# ==============================================================================
# TESTS
# ==============================================================================

@pytest.mark.asyncio
async def test_health_check():
    """Verify that the health check endpoint returns 200 and connectivity details."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "database_connected" in data


@pytest.mark.asyncio
async def test_create_short_url_success():
    """Verify standard url shortening behaves correctly."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        payload = {"url": "https://www.google.com"}
        response = await ac.post("/api/v1/shorten", json=payload)
    
    assert response.status_code == 201
    data = response.json()
    assert "code" in data
    assert len(data["code"]) == 6
    assert data["original_url"] == "https://www.google.com"
    assert data["short_url"] == f"/r/{data['code']}"


@pytest.mark.asyncio
async def test_create_short_url_custom_code():
    """Verify custom shortcode definitions works and blocks duplicates."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        # First creation
        payload = {"url": "https://github.com", "custom_code": "my_git_hub"}
        res1 = await ac.post("/api/v1/shorten", json=payload)
        assert res1.status_code == 201
        
        # Second creation with duplicate custom_code
        res2 = await ac.post("/api/v1/shorten", json=payload)
        assert res2.status_code == 409
        assert "already in use" in res2.json()["detail"]


@pytest.mark.asyncio
async def test_create_short_url_validation():
    """Verify malformed inputs are correctly rejected by Pydantic."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        # Invalid URL format
        res1 = await ac.post("/api/v1/shorten", json={"url": "not_a_valid_url"})
        assert res1.status_code == 422
        
        # Custom code too short
        res2 = await ac.post("/api/v1/shorten", json={"url": "https://test.com", "custom_code": "ab"})
        assert res2.status_code == 422


@pytest.mark.asyncio
async def test_redirect_flow_cache_miss_and_hit():
    """
    Simulate Cache-Aside flows.
    First redirect registers a cache MISS.
    Subsequent redirect registers a cache HIT.
    """
    async with AsyncClient(app=app, base_url="http://test") as ac:
        # 1. Create short URL
        create_res = await ac.post("/api/v1/shorten", json={"url": "https://news.ycombinator.com"})
        code = create_res.json()["code"]

        # Evict cache to guarantee a Cache MISS on first click
        await redis_manager.delete(f"url:{code}")

        # 2. First Redirect (Cache MISS)
        res1 = await ac.get(f"/r/{code}", follow_redirects=False)
        assert res1.status_code == 307
        assert res1.headers["location"] == "https://news.ycombinator.com"

        # 3. Second Redirect (Cache HIT)
        res2 = await ac.get(f"/r/{code}", follow_redirects=False)
        assert res2.status_code == 307
        assert res2.headers["location"] == "https://news.ycombinator.com"


@pytest.mark.asyncio
async def test_redirect_404_not_found():
    """Verify redirection handles missing slugs gracefully with 404."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        res = await ac.get("/r/non_existent_code")
        assert res.status_code == 404


@pytest.mark.asyncio
async def test_delete_short_url():
    """Verify url deletion removes the mapping from DB and invalidates caches."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        # Create URL
        create_res = await ac.post("/api/v1/shorten", json={"url": "https://stackoverflow.com"})
        code = create_res.json()["code"]

        # Delete URL
        del_res = await ac.delete(f"/api/v1/urls/{code}")
        assert del_res.status_code == 200

        # Try to redirect
        redir_res = await ac.get(f"/r/{code}")
        assert redir_res.status_code == 404


@pytest.mark.asyncio
async def test_stats_aggregation():
    """Verify diagnostics statistics endpoint executes without failures."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        res = await ac.get("/api/v1/system/stats")
        assert res.status_code == 200
        data = res.json()
        assert "database" in data
        assert "cache" in data
