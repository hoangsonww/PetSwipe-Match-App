"""Caching utilities."""

import json
import time
import asyncio
from dataclasses import dataclass
from typing import Any, Dict, Optional

try:
    import redis.asyncio as redis
except Exception:  # pragma: no cover - optional dependency
    redis = None


@dataclass
class CacheEntry:
    value: Any
    expires_at: Optional[float]


class CacheClient:
    """Cache client with Redis and in-memory backends."""

    def __init__(self, config: Dict[str, Any]):
        self.enabled = config.get("enabled", False)
        self.backend = config.get("backend", "memory")
        self.redis_url = config.get("redis_url")
        self.default_ttl = config.get("ttl", 3600)
        self._memory: Dict[str, CacheEntry] = {}
        self._lock = asyncio.Lock()
        self._redis = None

        if self.enabled and self.backend == "redis" and redis:
            self._redis = redis.from_url(self.redis_url, decode_responses=True)

    async def get_json(self, key: str) -> Optional[Any]:
        if not self.enabled:
            return None

        if self.backend == "redis" and self._redis:
            raw = await self._redis.get(key)
            return json.loads(raw) if raw else None

        async with self._lock:
            entry = self._memory.get(key)
            if not entry:
                return None
            if entry.expires_at and time.time() > entry.expires_at:
                self._memory.pop(key, None)
                return None
            return entry.value

    async def set_json(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        if not self.enabled:
            return

        ttl = ttl if ttl is not None else self.default_ttl

        if self.backend == "redis" and self._redis:
            payload = json.dumps(value)
            await self._redis.set(key, payload, ex=ttl)
            return

        expires_at = time.time() + ttl if ttl else None
        async with self._lock:
            self._memory[key] = CacheEntry(value=value, expires_at=expires_at)

    async def close(self) -> None:
        if self._redis:
            await self._redis.close()
