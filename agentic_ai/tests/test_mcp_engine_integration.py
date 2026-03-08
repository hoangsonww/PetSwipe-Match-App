"""Integration and engine behavior tests for MCP + AgenticEngine."""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any, Dict

import pytest

from agentic_ai.mcp_client import MCPClientConfig
from agentic_ai.service.engine import AgenticEngine


class _DummyPipeline:
    async def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "success": True,
            "data": {"echo": input_data},
            "metadata": {"source": "dummy"},
            "agent_results": [],
        }


@pytest.mark.asyncio
async def test_engine_builds_workflow_lazily(monkeypatch):
    calls = {"analysis": 0}

    def fake_build_analysis(_config: Dict[str, Any]) -> _DummyPipeline:
        calls["analysis"] += 1
        return _DummyPipeline()

    config: Dict[str, Any] = {
        "monitoring": {"enabled": False},
        "cache": {"enabled": False},
        "costs": {"enabled": False},
        "storage": {"type": "memory"},
        "mcp_client": {"enabled": False},
    }
    engine = AgenticEngine(config)
    engine._workflow_builders["analysis"] = lambda: fake_build_analysis(config)

    assert calls["analysis"] == 0
    assert "analysis" in engine.list_workflows()

    first = await engine.execute_workflow("analysis", {"pet": {"name": "A"}})
    second = await engine.execute_workflow("analysis", {"pet": {"name": "B"}})

    assert first["success"] is True
    assert second["success"] is True
    assert calls["analysis"] == 1

    await engine.close()


@pytest.mark.asyncio
async def test_engine_mcp_connectivity_disabled():
    config: Dict[str, Any] = {
        "monitoring": {"enabled": False},
        "cache": {"enabled": False},
        "costs": {"enabled": False},
        "storage": {"type": "memory"},
        "mcp_client": {"enabled": False},
    }
    engine = AgenticEngine(config)
    result = await engine.check_mcp_connectivity()
    assert result == {"enabled": False, "status": "disabled"}
    await engine.close()


@pytest.mark.asyncio
async def test_stdio_mcp_client_can_list_workflows():
    pytest.importorskip("mcp")
    from agentic_ai.mcp_client import MCPToolClient

    repo_root = Path(__file__).resolve().parents[2]
    config_path = repo_root / "agentic_ai" / "config" / "config.yaml"

    cfg = MCPClientConfig(
        transport="stdio",
        timeout_seconds=20,
        command=sys.executable,
        args=[
            "-m",
            "mcp_server.server",
            "--transport",
            "stdio",
            "--config",
            str(config_path),
        ],
        cwd=str(repo_root),
        env=dict(os.environ),
    )

    async with MCPToolClient(cfg) as client:
        metadata = await client.ping()
        workflows = await client.list_workflows()

    assert "server_name" in metadata or metadata.get("status") == "healthy"
    assert "workflows" in workflows
    assert "analysis" in workflows["workflows"]
