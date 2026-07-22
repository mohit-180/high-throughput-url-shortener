import asyncio
import redis.asyncio as redis

async def test():
    client = redis.from_url(
        "redis://127.0.0.1:6379/0",
        encoding="utf-8",
        decode_responses=True,
        socket_timeout=2,
        socket_connect_timeout=2,
    )

    try:
        result = await client.ping()
        print("PING:", result)
    finally:
        await client.aclose()

asyncio.run(test())