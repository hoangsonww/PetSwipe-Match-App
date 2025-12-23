"""Cost tracking utilities."""

import json
import logging
from collections import deque
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Deque, Dict, List, Optional

from langchain.callbacks.base import BaseCallbackHandler
from langchain.schema import LLMResult

from .context import get_context


@dataclass
class ModelPricing:
    input_per_1k: float
    output_per_1k: float
    cached_input_per_1k: Optional[float] = None
    cache_write_per_1k: Optional[float] = None
    cache_write_5m_per_1k: Optional[float] = None
    cache_write_1h_per_1k: Optional[float] = None
    unit_label: Optional[str] = None
    unit_cost: Optional[float] = None
    unit_costs: Optional[Dict[str, float]] = None


class PricingRegistry:
    """Resolve model pricing from configuration."""

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        costs = config.get("costs", {})
        self.models = costs.get("models", {})
        self.default_model = costs.get("default_model")

    def resolve(self, model: str, prompt_tokens: int = 0, modality: str = "text") -> ModelPricing:
        model_config = self.models.get(model)
        if not model_config and self.default_model:
            model_config = self.models.get(self.default_model)
        if not model_config:
            return ModelPricing(input_per_1k=0.0, output_per_1k=0.0)

        model_config = self._select_modality(model_config, modality)
        tier_config = self._select_tier(model_config, prompt_tokens)

        return ModelPricing(
            input_per_1k=float(tier_config.get("input_per_1k", 0.0)),
            output_per_1k=float(tier_config.get("output_per_1k", 0.0)),
            cached_input_per_1k=_optional_float(tier_config.get("cached_input_per_1k")),
            cache_write_per_1k=_optional_float(tier_config.get("cache_write_per_1k")),
            cache_write_5m_per_1k=_optional_float(tier_config.get("cache_write_5m_per_1k")),
            cache_write_1h_per_1k=_optional_float(tier_config.get("cache_write_1h_per_1k")),
            unit_label=tier_config.get("unit_label"),
            unit_cost=_optional_float(tier_config.get("unit_cost")),
            unit_costs=_optional_costs(tier_config.get("unit_costs")),
        )

    def _select_modality(self, config: Dict[str, Any], modality: str) -> Dict[str, Any]:
        modalities = config.get("modalities")
        if not modalities:
            return config
        if modality in modalities:
            return modalities[modality]
        if "text" in modalities:
            return modalities["text"]
        return next(iter(modalities.values()))

    def _select_tier(self, config: Dict[str, Any], prompt_tokens: int) -> Dict[str, Any]:
        tiers = config.get("tiers")
        if not tiers:
            return config
        for tier in tiers:
            min_tokens = tier.get("min_prompt_tokens", 0)
            max_tokens = tier.get("max_prompt_tokens")
            if prompt_tokens >= min_tokens and (max_tokens is None or prompt_tokens <= max_tokens):
                return tier
        return tiers[-1]


def _optional_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _optional_costs(value: Any) -> Optional[Dict[str, float]]:
    if not isinstance(value, dict):
        return None
    parsed = {}
    for key, raw in value.items():
        cost = _optional_float(raw)
        if cost is not None:
            parsed[str(key)] = cost
    return parsed or None


class CostTracker:
    """Track token usage and cost for LLM calls."""

    def __init__(self, config: Dict[str, Any], metrics: Any = None):
        self.config = config
        self.metrics = metrics
        self.logger = logging.getLogger("cost_tracker")
        self.registry = PricingRegistry(config)
        costs_cfg = config.get("costs", {})
        self.enabled = costs_cfg.get("enabled", True)
        self.max_entries = int(costs_cfg.get("max_entries", 10000))
        self.export_path = costs_cfg.get("export_path")
        self.entries: Deque[Dict[str, Any]] = deque(maxlen=self.max_entries)

        if self.export_path:
            Path(self.export_path).parent.mkdir(parents=True, exist_ok=True)

    def record(
        self,
        model: str,
        prompt_tokens: int,
        completion_tokens: int,
        total_tokens: int,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[Dict[str, Any]]:
        if not self.enabled:
            return None

        modality = metadata.get("modality", "text") if metadata else "text"
        pricing = self.registry.resolve(model, prompt_tokens=prompt_tokens, modality=modality)
        cached_rate = (
            pricing.cached_input_per_1k
            if pricing.cached_input_per_1k is not None
            else pricing.input_per_1k
        )
        cached_tokens = min(metadata.get("cached_tokens", 0), prompt_tokens) if metadata else 0
        cache_write_tokens = min(
            metadata.get("cache_write_tokens", 0),
            max(prompt_tokens - cached_tokens, 0),
        ) if metadata else 0
        cache_write_5m_tokens = min(
            metadata.get("cache_write_5m_tokens", 0),
            max(prompt_tokens - cached_tokens, 0),
        ) if metadata else 0
        cache_write_1h_tokens = min(
            metadata.get("cache_write_1h_tokens", 0),
            max(prompt_tokens - cached_tokens, 0),
        ) if metadata else 0

        billable_prompt = max(
            prompt_tokens - cached_tokens - cache_write_tokens - cache_write_5m_tokens - cache_write_1h_tokens,
            0,
        )
        cache_write_rate = pricing.cache_write_per_1k or pricing.input_per_1k
        cache_write_5m_rate = pricing.cache_write_5m_per_1k or cache_write_rate
        cache_write_1h_rate = pricing.cache_write_1h_per_1k or cache_write_rate
        unit_count = metadata.get("unit_count", 0) if metadata else 0
        unit_tier = metadata.get("unit_tier") if metadata else None
        unit_cost = pricing.unit_cost
        if pricing.unit_costs and unit_tier in pricing.unit_costs:
            unit_cost = pricing.unit_costs[unit_tier]
        cost = (
            (billable_prompt / 1000.0) * pricing.input_per_1k
            + (cached_tokens / 1000.0) * cached_rate
            + (cache_write_tokens / 1000.0) * cache_write_rate
            + (cache_write_5m_tokens / 1000.0) * cache_write_5m_rate
            + (cache_write_1h_tokens / 1000.0) * cache_write_1h_rate
            + (completion_tokens / 1000.0) * pricing.output_per_1k
            + (unit_count * unit_cost if unit_cost and unit_count else 0.0)
        )

        context = get_context()
        entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "workflow": context.get("workflow"),
            "agent": context.get("agent"),
            "request_id": context.get("request_id"),
            "model": model,
            "prompt_tokens": prompt_tokens,
            "cached_tokens": cached_tokens,
            "cache_write_tokens": cache_write_tokens,
            "cache_write_5m_tokens": cache_write_5m_tokens,
            "cache_write_1h_tokens": cache_write_1h_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": total_tokens,
            "cost_usd": round(cost, 8),
            "metadata": metadata or {},
        }

        self.entries.append(entry)
        if self.export_path:
            with open(self.export_path, "a", encoding="utf-8") as handle:
                handle.write(json.dumps(entry) + "\n")

        if self.metrics:
            self.metrics.record_cost(
                workflow=entry["workflow"] or "unknown",
                agent=entry["agent"] or "unknown",
                model=model,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                cached_tokens=cached_tokens,
                cost_usd=entry["cost_usd"],
            )

        return entry

    def summary(self, since_minutes: Optional[int] = None) -> Dict[str, Any]:
        entries = list(self.entries)
        if since_minutes is not None:
            cutoff = datetime.utcnow() - timedelta(minutes=since_minutes)
            entries = [
                e for e in entries if datetime.fromisoformat(e["timestamp"].replace("Z", "")) >= cutoff
            ]

        totals = {
            "cost_usd": round(sum(e["cost_usd"] for e in entries), 6),
            "prompt_tokens": sum(e["prompt_tokens"] for e in entries),
            "completion_tokens": sum(e["completion_tokens"] for e in entries),
            "total_tokens": sum(e["total_tokens"] for e in entries),
            "count": len(entries),
        }

        breakdown = {"workflow": {}, "agent": {}, "model": {}}
        for entry in entries:
            for key in ("workflow", "agent", "model"):
                bucket = breakdown[key].setdefault(entry[key] or "unknown", 0.0)
                breakdown[key][entry[key] or "unknown"] = round(bucket + entry["cost_usd"], 6)

        return {"totals": totals, "breakdown": breakdown}

    def recent(self, limit: int = 100) -> List[Dict[str, Any]]:
        entries = list(self.entries)
        return entries[-limit:]


class CostTrackingCallbackHandler(BaseCallbackHandler):
    """LangChain callback handler for cost tracking."""

    def __init__(self, tracker: CostTracker, model_name: Optional[str] = None):
        self.tracker = tracker
        self.model_name = model_name

    def on_llm_end(self, response: LLMResult, **kwargs: Any) -> None:
        if not self.tracker:
            return
        llm_output = response.llm_output or {}
        usage = llm_output.get("token_usage") or llm_output.get("usage") or {}
        if not usage:
            return

        prompt_tokens = int(usage.get("prompt_tokens") or usage.get("input_tokens") or 0)
        completion_tokens = int(
            usage.get("completion_tokens") or usage.get("output_tokens") or 0
        )
        total_tokens = int(usage.get("total_tokens") or prompt_tokens + completion_tokens)
        cached_tokens = 0
        details = usage.get("prompt_tokens_details") or usage.get("input_tokens_details") or {}
        if isinstance(details, dict):
            cached_tokens = int(details.get("cached_tokens") or details.get("cache_read_tokens") or 0)
        cached_tokens = int(usage.get("cached_tokens") or cached_tokens)
        model = (
            llm_output.get("model_name")
            or llm_output.get("model")
            or self.model_name
            or "unknown"
        )

        self.tracker.record(
            model=model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            metadata={"provider": "openai", "cached_tokens": cached_tokens},
        )
