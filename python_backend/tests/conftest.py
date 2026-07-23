import sys
from pathlib import Path
from unittest.mock import AsyncMock

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.database import get_db_session


@pytest_asyncio.fixture
async def mock_db():
    db = AsyncMock()

    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.rollback = AsyncMock()
    db.execute = AsyncMock()

    return db


@pytest_asyncio.fixture
async def client(mock_db):
    app.dependency_overrides[get_db_session] = lambda: mock_db

    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        yield client

    app.dependency_overrides.clear()