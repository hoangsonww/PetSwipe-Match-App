"""
Utility tests.
"""

import asyncio

import pytest

from agentic_ai.utils.cache import CacheClient
from agentic_ai.utils.config import resolve_agent_config
from agentic_ai.utils.security import RateLimiter


def test_resolve_agent_config_env_key(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "env-key")
    config = {"models": {"default_model": "gpt-4o-mini"}}
    resolved = resolve_agent_config(config, "pet_analyzer")
    assert resolved["openai_api_key"] == "env-key"


@pytest.mark.asyncio
async def test_cache_client_memory_ttl():
    cache = CacheClient({"enabled": True, "backend": "memory", "ttl": 1})
    await cache.set_json("k1", {"value": 1}, ttl=1)
    assert await cache.get_json("k1") == {"value": 1}
    await asyncio.sleep(1.1)
    assert await cache.get_json("k1") is None


@pytest.mark.asyncio
async def test_rate_limiter():
    limiter = RateLimiter(2)
    assert await limiter.allow("client")
    assert await limiter.allow("client")
    assert not await limiter.allow("client")
