"""Utility exports with lazy loading to avoid eager heavy dependencies."""

from __future__ import annotations

from importlib import import_module
from typing import Any

_EXPORTS = {
    "setup_logging": ("agentic_ai.utils.logger", "setup_logging"),
    "get_logger": ("agentic_ai.utils.logger", "get_logger"),
    "load_config": ("agentic_ai.utils.config", "load_config"),
    "get_config_value": ("agentic_ai.utils.config", "get_config_value"),
    "resolve_agent_config": ("agentic_ai.utils.config", "resolve_agent_config"),
    "MetricsCollector": ("agentic_ai.utils.metrics", "MetricsCollector"),
    "CacheClient": ("agentic_ai.utils.cache", "CacheClient"),
    "APIKeyAuth": ("agentic_ai.utils.security", "APIKeyAuth"),
    "RateLimiter": ("agentic_ai.utils.security", "RateLimiter"),
    "build_chat_llm": ("agentic_ai.utils.llm", "build_chat_llm"),
    "CostTracker": ("agentic_ai.utils.costs", "CostTracker"),
    "CostTrackingCallbackHandler": (
        "agentic_ai.utils.costs",
        "CostTrackingCallbackHandler",
    ),
}

__all__ = list(_EXPORTS.keys())


def __getattr__(name: str) -> Any:
    """Resolve utility attributes lazily."""
    if name not in _EXPORTS:
        raise AttributeError(f"module 'agentic_ai.utils' has no attribute '{name}'")

    module_name, attr_name = _EXPORTS[name]
    module = import_module(module_name)
    value = getattr(module, attr_name)
    globals()[name] = value
    return value
