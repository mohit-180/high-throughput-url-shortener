import logging
from collections.abc import AsyncGenerator
import redis.asyncio as aioredis
from app.config import settings

logger = logging.getLogger(__name__)

class RedisCacheManager:
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self.client: aioredis.Redis | None = None
        self._hits = 0
        self._misses = 0

    async def connect(self) -> None:
        try:
            self.client = aioredis.from_url(
                self.redis_url, 
                encoding="utf-8", 
                decode_responses=True,
                socket_timeout=2.0,
                socket_connect_timeout=2.0
            )
            await self.client.ping()
            logger.info("Successfully connected to Redis cluster.")
        except Exception:
            logger.exception(f"Failed to connect to Redis at {self.redis_url}. Caching falls back to DB.")
            self.client = None

    async def disconnect(self) -> None:
        if self.client:
            await self.client.close()
            logger.info("Closed Redis connection pool.")

    async def get(self, key: str) -> str | None:
        if not self.client:
            self._misses += 1
            return None
        try:
            val = await self.client.get(key)
            if val is not None:
                self._hits += 1
            else:
                self._misses += 1
            return val
        except Exception as e:
            logger.warning(f"Error reading from Redis key '{key}': {e}")
            self._misses += 1
            return None

    async def set(self, key: str, value: str, ttl_seconds: int = 300) -> bool:
        if not self.client:
            return False
        try:
            await self.client.set(key, value, ex=ttl_seconds)
            return True
        except Exception as e:
            logger.warning(f"Error writing to Redis key '{key}': {e}")
            return False

    async def delete(self, key: str) -> bool:
        if not self.client:
            return False
        try:
            await self.client.delete(key)
            return True
        except Exception as e:
            logger.warning(f"Error deleting Redis key '{key}': {e}")
            return False

    def get_stats(self) -> dict:
        total = self._hits + self._misses
        ratio = (self._hits / total * 100.0) if total > 0 else 0.0
        return {
            "hits": self._hits,
            "misses": self._misses,
            "total_calls": total,
            "hit_ratio_percent": round(ratio, 2),
            "connected": self.client is not None
        }

# Shared Singleton
redis_manager = RedisCacheManager(settings.REDIS_URL)

async def get_redis_client() -> AsyncGenerator[RedisCacheManager, None]:
    yield redis_manager
