"""LLM factory utilities."""

from typing import Any, Dict, Optional
from langchain.chat_models import ChatOpenAI

from .config import resolve_agent_config
from .costs import CostTrackingCallbackHandler


def build_chat_llm(
    config: Dict[str, Any],
    agent_key: str,
    default_temperature: Optional[float] = None,
) -> ChatOpenAI:
    """Create a configured ChatOpenAI instance."""
    resolved = resolve_agent_config(config, agent_key)
    temperature = resolved.get("temperature")
    if temperature is None:
        temperature = default_temperature if default_temperature is not None else 0.7

    model = resolved.get("model") or "gpt-4o-mini"
    costs_cfg = config.get("costs", {})
    if costs_cfg.get("require_known_models", True):
        pricing = costs_cfg.get("models", {})
        if model not in pricing:
            raise ValueError(f"Unknown model pricing for '{model}'")
    max_tokens = resolved.get("max_tokens") or 2048
    request_timeout = resolved.get("request_timeout") or 30
    max_retries = resolved.get("max_retries") or 2

    callbacks = []
    runtime = config.get("runtime", {})
    tracker = runtime.get("cost_tracker") if isinstance(runtime, dict) else None
    if tracker:
        callbacks.append(CostTrackingCallbackHandler(tracker, model_name=model))

    return ChatOpenAI(
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
        request_timeout=request_timeout,
        max_retries=max_retries,
        api_key=resolved.get("openai_api_key"),
        callbacks=callbacks or None,
    )
