"""Runtime context for the standalone PetSwipe MCP server."""

from __future__ import annotations

import asyncio
from typing import Any, Dict, Optional

from agentic_ai.service.engine import AgenticEngine


class RuntimeContext:
    """Lazy runtime holder for config and engine lifecycle."""

    def __init__(self, config: Dict[str, Any]):
        self._config = config
        self._engine: Optional[AgenticEngine] = None
        self._lock = asyncio.Lock()

    @property
    def config(self) -> Dict[str, Any]:
        return self._config

    async def engine(self) -> AgenticEngine:
        if self._engine is not None:
            return self._engine

        async with self._lock:
            if self._engine is None:
                self._engine = AgenticEngine(self._config)
        return self._engine

    async def shutdown(self) -> None:
        if self._engine is not None:
            await self._engine.close()
