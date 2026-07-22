export interface PythonFileNode {
  path: string;
  name: string;
  category: "app" | "test" | "config" | "docs" | "infra";
  language: "python" | "yaml" | "dockerfile" | "ini" | "markdown" | "text";
  code: string;
}

export const pythonFiles: PythonFileNode[] = [
  {
    path: "app/main.py",
    name: "main.py",
    category: "app",
    language: "python",
    code: `import time
import logging
import json
import asyncio
from fastapi import FastAPI, Depends, HTTPException, Request, BackgroundTasks, status
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.config import settings
from app.database import get_db_session, engine, async_session_maker
from app.redis_client import RedisCacheManager, get_redis_client, redis_manager
from app.models import Base, URLMapping, AnalyticsEvent
from app.schemas import URLShortenRequest, URLResponse, SystemStatsResponse
from app.crud import create_short_url, get_url_by_code, delete_url, increment_click_counter
from app.tasks import record_analytics_task, run_expired_urls_cleanup_daemon

app = FastAPI(
    title=settings.PROJECT_NAME,
    debug=settings.DEBUG,
    version="1.0.0"
)

@app.on_event("startup")
async def startup_event():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await redis_manager.connect()
    asyncio.create_task(run_expired_urls_cleanup_daemon())

@app.get("/r/{code}", status_code=status.HTTP_307_TEMPORARY_REDIRECT)
async def redirect_short_url(
    code: str,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db_session)
):
    start_time = time.time()
    original_url = None
    cache_status = "MISS"

    # 1. Look up in Redis cache
    cached_str = await redis_manager.get(f"url:{code}")
    if cached_str:
        cached_data = json.loads(cached_str)
        original_url = cached_data["original_url"]
        cache_status = "HIT"

    # 2. Cache Miss: Read from PostgreSQL
    if not original_url:
        db_item = await get_url_by_code(db, code)
        if not db_item:
            raise HTTPException(status_code=404, detail="Short URL not found.")
        original_url = db_item.original_url
        
        # Populate Cache for future lookups
        cache_payload = {"code": db_item.code, "original_url": db_item.original_url}
        background_tasks.add_task(
            redis_manager.set, f"url:{code}", json.dumps(cache_payload), settings.REDIS_TTL_SECONDS
        )

    latency_ms = int((time.time() - start_time) * 1000)

    # 3. Asynchronously update click counter & log telemetry
    background_tasks.add_task(increment_click_counter, db, code)
    background_tasks.add_task(
        record_analytics_task,
        code=code,
        browser="Chrome", # Extracted from UA header in full version
        os="Windows",     # Extracted from UA header in full version
        country="United States",
        ip_address=request.client.host,
        referrer=request.headers.get("referer", "Direct"),
        device_type="Desktop",
        cache_status=cache_status,
        latency_ms=max(1, latency_ms)
    )

    return RedirectResponse(url=original_url, status_code=307)`
  },
  {
    path: "app/config.py",
    name: "config.py",
    category: "config",
    language: "python",
    code: `from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "High Throughput Distributed URL Shortener and Analytics Engine"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres_secure_pass@localhost:5432/url_shortener"
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 10
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_TTL_SECONDS: int = 300
    RATE_LIMIT_PER_MINUTE: int = 60

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()`
  },
  {
    path: "app/database.py",
    name: "database.py",
    category: "config",
    language: "python",
    code: `from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_pre_ping=True
)

async_session_maker = async_sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False
)

async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()`
  },
  {
    path: "app/redis_client.py",
    name: "redis_client.py",
    category: "config",
    language: "python",
    code: `import logging
import redis.asyncio as aioredis
from app.config import settings

logger = logging.getLogger(__name__)

class RedisCacheManager:
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self.client = None

    async def connect(self):
        try:
            self.client = aioredis.from_url(self.redis_url, decode_responses=True)
            await self.client.ping()
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")

    async def get(self, key: str) -> str | None:
        if not self.client: return None
        return await self.client.get(key)

    async def set(self, key: str, value: str, ttl_seconds: int = 300):
        if not self.client: return
        await self.client.set(key, value, ex=ttl_seconds)

    async def delete(self, key: str):
        if not self.client: return
        await self.client.delete(key)

redis_manager = RedisCacheManager(settings.REDIS_URL)`
  },
  {
    path: "app/models.py",
    name: "models.py",
    category: "app",
    language: "python",
    code: `import datetime
from sqlalchemy import String, DateTime, Integer, ForeignKey, Index
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

class Base(DeclarativeBase):
    pass

class URLMapping(Base):
    __tablename__ = "url_mappings"

    code: Mapped[str] = mapped_column(String(20), primary_key=True)
    original_url: Mapped[str] = mapped_column(String(2048), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    expires_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)
    clicks: Mapped[int] = mapped_column(Integer, default=0)

    analytics: Mapped[list["AnalyticsEvent"]] = relationship(
        "AnalyticsEvent", back_populates="url_mapping", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_url_mappings_code_btree", "code", postgresql_using="btree"),
    )`
  },
  {
    path: "app/crud.py",
    name: "crud.py",
    category: "app",
    language: "python",
    code: `import datetime
import random
import string
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import URLMapping, AnalyticsEvent

BASE62_ALPHABET = string.digits + string.ascii_uppercase + string.ascii_lowercase

def encode_base62(num: int) -> str:
    if num == 0: return BASE62_ALPHABET[0]
    arr = []
    while num:
        num, rem = divmod(num, 62)
        arr.append(BASE62_ALPHABET[rem])
    arr.reverse()
    return "".join(arr)

async def create_short_url(db: AsyncSession, original_url: str, custom_code=None, expiry_hours=None):
    code = custom_code or encode_base62(int(datetime.datetime.utcnow().timestamp() * 100))[:6]
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(hours=expiry_hours) if expiry_hours else None
    
    db_item = URLMapping(code=code, original_url=original_url, expires_at=expires_at)
    db.add(db_item)
    return db_item`
  },
  {
    path: "app/tasks.py",
    name: "tasks.py",
    category: "app",
    language: "python",
    code: `import logging
import asyncio
from app.database import async_session_maker
from app.crud import create_analytics_event, cleanup_expired_urls

logger = logging.getLogger(__name__)

async def record_analytics_task(code, browser, os, country, ip_address, referrer, device_type, cache_status, latency_ms):
    async with async_session_maker() as session:
        await create_analytics_event(session, code, browser, os, country, ip_address, referrer, device_type, cache_status, latency_ms)
        await session.commit()

async def run_expired_urls_cleanup_daemon():
    while True:
        try:
            async with async_session_maker() as session:
                deleted = await cleanup_expired_urls(session)
                await session.commit()
                if deleted > 0:
                    logger.info(f"Pruned {deleted} expired links.")
        except Exception as e:
            logger.error(f"Error sweeping expired links: {e}")
        await asyncio.sleep(3600)`
  },
  {
    path: "tests/test_main.py",
    name: "test_main.py",
    category: "test",
    language: "python",
    code: `import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

@pytest.mark.asyncio
async def test_create_url():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        payload = {"url": "https://www.google.com"}
        response = await ac.post("/api/v1/shorten", json=payload)
    assert response.status_code == 201
    assert "code" in response.json()`
  },
  {
    path: "locustfile.py",
    name: "locustfile.py",
    category: "test",
    language: "python",
    code: `import random
from locust import HttpUser, task, between

class URLShortenerLoadTester(HttpUser):
    wait_time = between(0.1, 1.5)

    @task(3)
    def redirect_url(self):
        code = random.choice(["goog89", "github", "ytbe12"])
        self.client.get(f"/r/{code}", allow_redirects=False)

    @task(1)
    def check_health(self):
        self.client.get("/api/v1/health")`
  },
  {
    path: "Dockerfile",
    name: "Dockerfile",
    category: "infra",
    language: "dockerfile",
    code: `FROM python:3.13-slim AS builder
WORKDIR /build
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

FROM python:3.13-slim AS final
WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY . /app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]`
  },
  {
    path: "docker-compose.yml",
    name: "docker-compose.yml",
    category: "infra",
    language: "yaml",
    code: `version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: postgres_secure_pass
      POSTGRES_DB: url_shortener
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7.2-alpine
    ports:
      - "6379:6379"

  fastapi:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql+asyncpg://postgres:postgres_secure_pass@postgres:5432/url_shortener
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - postgres
      - redis

volumes:
  postgres_data:`
  },
  {
    path: "requirements.txt",
    name: "requirements.txt",
    category: "config",
    language: "text",
    code: `fastapi==0.115.8
uvicorn==0.34.0
pydantic==2.10.6
pydantic-settings==2.7.1
sqlalchemy==2.0.37
asyncpg==0.30.0
alembic==1.14.1
redis==5.2.1
httpx==0.28.1
pytest==8.3.4
pytest-asyncio==0.25.3
locust==2.33.0
python-dotenv==1.0.1`
  },
  {
    path: ".env.example",
    name: ".env.example",
    category: "config",
    language: "text",
    code: `DATABASE_URL="postgresql+asyncpg://postgres:postgres_secure_pass@postgres:5432/url_shortener"
REDIS_URL="redis://redis:6379/0"
PROJECT_NAME="High Throughput Distributed URL Shortener and Analytics Engine"
REDIS_TTL_SECONDS=300`
  }
];
