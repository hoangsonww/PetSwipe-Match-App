"""Security utilities."""

import asyncio
import time
from dataclasses import dataclass
from typing import Any, Dict, Optional


class APIKeyAuth:
    """API key validation helper."""

    def __init__(self, config: Dict[str, Any]):
        self.enabled = config.get("api_key_required", False)
        self.api_key = config.get("api_key")
        self.header = config.get("api_key_header", "X-API-Key")

    def validate(self, supplied_key: Optional[str]) -> bool:
        if not self.enabled:
            return True
        return bool(self.api_key) and supplied_key == self.api_key


@dataclass
class TokenBucket:
    tokens: float
    last_refill: float


class RateLimiter:
    """Token bucket rate limiter per key."""

    def __init__(self, requests_per_minute: int):
        self.capacity = max(1, requests_per_minute)
        self.refill_rate = self.capacity / 60.0
        self.buckets: Dict[str, TokenBucket] = {}
        self.lock = asyncio.Lock()

    async def allow(self, key: str) -> bool:
        now = time.monotonic()
        async with self.lock:
            bucket = self.buckets.get(key)
            if not bucket:
                self.buckets[key] = TokenBucket(tokens=self.capacity - 1, last_refill=now)
                return True

            elapsed = now - bucket.last_refill
            new_tokens = min(self.capacity, bucket.tokens + elapsed * self.refill_rate)
            if new_tokens < 1:
                bucket.tokens = new_tokens
                bucket.last_refill = now
                return False

            bucket.tokens = new_tokens - 1
            bucket.last_refill = now
            return True
