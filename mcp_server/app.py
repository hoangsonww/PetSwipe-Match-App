"""FastMCP application factory for PetSwipe standalone MCP server."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from mcp.server.fastmcp import FastMCP

from .runtime import RuntimeContext
from .settings import MCPServerSettings
from .tools import register_ops_tools, register_workflow_tools


def create_mcp_app(settings: MCPServerSettings) -> FastMCP:
    """Create and configure the standalone MCP server application."""
    runtime = RuntimeContext(settings.config)

    @asynccontextmanager
    async def lifespan(_: FastMCP) -> AsyncIterator[None]:
        try:
            yield
        finally:
            await runtime.shutdown()

    app = FastMCP(
        name=settings.server_name,
        host=settings.host,
        port=settings.port,
        streamable_http_path=settings.path,
        log_level=settings.log_level,  # type: ignore[arg-type]
        debug=settings.debug,
        lifespan=lifespan,
    )

    register_workflow_tools(app, runtime)
    register_ops_tools(app, runtime, settings)
    return app
