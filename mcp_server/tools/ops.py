"""Operational and observability MCP tools."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict

from mcp.server.fastmcp import FastMCP

from ..runtime import RuntimeContext
from ..serialization import to_jsonable
from ..settings import MCPServerSettings


def register_ops_tools(
    server: FastMCP, runtime: RuntimeContext, settings: MCPServerSettings
) -> None:
    """Register health, costs, and runtime metadata tools."""

    @server.tool(
        name="health",
        description="Get health and runtime metadata for the PetSwipe MCP server.",
    )
    async def health() -> Dict[str, Any]:
        engine = await runtime.engine()
        workflows = engine.list_workflows()
        return {
            "status": "healthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "workflows": workflows,
            "workflow_count": len(workflows),
            "mcp_client_enabled": engine.mcp_client_enabled,
            "transport": settings.transport,
            "server_name": settings.server_name,
        }

    @server.tool(
        name="cost_summary",
        description="Get aggregate token and cost summary from the cost tracker.",
    )
    async def cost_summary(since_minutes: int | None = None) -> Dict[str, Any]:
        engine = await runtime.engine()
        return to_jsonable(engine.cost_tracker.summary(since_minutes=since_minutes))

    @server.tool(
        name="recent_cost_entries",
        description="Get recent cost tracking entries.",
    )
    async def recent_cost_entries(limit: int = 100) -> Dict[str, Any]:
        engine = await runtime.engine()
        return {"entries": to_jsonable(engine.cost_tracker.recent(limit=limit))}

    @server.tool(
        name="server_metadata",
        description="Get standalone MCP server transport and endpoint metadata.",
    )
    async def server_metadata() -> Dict[str, Any]:
        return {
            "server_name": settings.server_name,
            "transport": settings.transport,
            "host": settings.host,
            "port": settings.port,
            "path": settings.path,
            "log_level": settings.log_level,
            "config_path": settings.config_path,
        }
