"""Agentic AI service engine."""

import hashlib
import json
import logging
from typing import Any, Dict, Optional

from ..utils.cache import CacheClient
from ..utils.metrics import MetricsCollector
from ..utils.costs import CostTracker
from ..workflows import WorkflowBuilder
from ..workflows.state_manager import StateManager


class AgenticEngine:
    """Orchestrates workflows, caching, and metrics for API usage."""

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.logger = logging.getLogger("agentic_engine")
        self.metrics = MetricsCollector() if config.get("monitoring", {}).get("enabled") else None
        self.cost_tracker = CostTracker(config, metrics=self.metrics)
        self.cache = CacheClient(config.get("cache", {}))
        storage_cfg = config.get("storage", {})
        storage_type = storage_cfg.get("type", "local")
        self.state_manager = (
            StateManager(storage_cfg.get("local_path"))
            if storage_type == "local"
            else None
        )

        runtime = config.setdefault("runtime", {})
        runtime["cost_tracker"] = self.cost_tracker

        self.workflows = {
            "recommendation": WorkflowBuilder.build_recommendation_workflow(config),
            "conversation": WorkflowBuilder.build_conversation_workflow(config),
            "analysis": WorkflowBuilder.build_analysis_workflow(config),
            "profile": WorkflowBuilder.build_profile_workflow(config),
            "match": WorkflowBuilder.build_match_workflow(config),
        }

    async def close(self) -> None:
        await self.cache.close()

    async def analyze_pet(self, pet: Dict[str, Any]) -> Dict[str, Any]:
        cache_key = self._cache_key("analysis", pet, pet.get("id"))
        cached = await self.cache.get_json(cache_key) if cache_key else None
        if cached:
            return cached

        result = await self._execute("analysis", {"pet": pet})
        data = {
            "analysis": result.get("data", {}).get("pet_analysis", {}),
            "metadata": result.get("metadata", {}),
        }
        if cache_key:
            await self.cache.set_json(cache_key, data)
        return data

    async def profile_user(self, user: Dict[str, Any], swipe_history: list) -> Dict[str, Any]:
        cache_key = self._cache_key(
            "profile",
            {"user": user, "swipe_history": swipe_history},
            user.get("id"),
        )
        cached = await self.cache.get_json(cache_key) if cache_key else None
        if cached:
            return cached

        result = await self._execute(
            "profile",
            {"user": user, "swipe_history": swipe_history},
        )
        data = {
            "user_profile": result.get("data", {}).get("user_profile", {}),
            "metadata": result.get("metadata", {}),
        }
        if cache_key:
            await self.cache.set_json(cache_key, data)
        return data

    async def match_pets(
        self,
        user: Dict[str, Any],
        swipe_history: list,
        pet_candidates: list,
    ) -> Dict[str, Any]:
        cache_key = self._cache_key(
            "match",
            {"user": user, "pet_candidates": pet_candidates},
            None,
        )
        cached = await self.cache.get_json(cache_key) if cache_key else None
        if cached:
            return cached

        result = await self._execute(
            "match",
            {
                "user": user,
                "swipe_history": swipe_history,
                "pet_candidates": pet_candidates,
            },
        )
        data = {
            "matches": result.get("data", {}).get("matches", []),
            "metadata": result.get("metadata", {}),
        }
        if cache_key:
            await self.cache.set_json(cache_key, data)
        return data

    async def recommend(
        self,
        user: Dict[str, Any],
        swipe_history: list,
        pet_candidates: list,
    ) -> Dict[str, Any]:
        cache_key = self._cache_key(
            "recommendation",
            {"user": user, "pet_candidates": pet_candidates},
            None,
        )
        cached = await self.cache.get_json(cache_key) if cache_key else None
        if cached:
            return cached

        result = await self._execute(
            "recommendation",
            {
                "user": user,
                "swipe_history": swipe_history,
                "pet_candidates": pet_candidates,
            },
        )
        data = {
            "recommendations": result.get("data", {}).get("recommendations", []),
            "metadata": result.get("metadata", {}),
        }
        if cache_key:
            await self.cache.set_json(cache_key, data)
        return data

    async def chat(self, message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        result = await self._execute(
            "conversation",
            {"message": message, "context": context},
        )
        return {
            "response": result.get("data", {}).get("response", ""),
            "conversation_history": result.get("data", {}).get("conversation_history", []),
        }

    async def _execute(self, workflow: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
        wf = self.workflows[workflow]
        if self.metrics:
            self.metrics.increment_active_requests()
        try:
            result = await wf.execute(input_data)
        finally:
            if self.metrics:
                self.metrics.decrement_active_requests()

        status = "success" if result.get("success") else "error"
        if self.metrics:
            self.metrics.record_request(workflow, status)
            for agent_result in result.get("agent_results", []):
                self.metrics.record_processing_time(
                    workflow,
                    agent_result.get("agent", "unknown"),
                    agent_result.get("processing_time", 0.0),
                )
                for error in agent_result.get("errors", []):
                    self.metrics.record_error(
                        agent_result.get("agent", "unknown"),
                        type(error).__name__,
                    )

        if self.state_manager:
            await self.state_manager.save_state(workflow, result)
        return result

    def _cache_key(self, prefix: str, payload: Dict[str, Any], entity_id: Optional[str]) -> Optional[str]:
        if not self.cache.enabled:
            return None
        if entity_id:
            return f"{prefix}:{entity_id}"
        try:
            raw = json.dumps(payload, sort_keys=True, default=str)
        except TypeError:
            return None
        digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()
        return f"{prefix}:{digest}"
