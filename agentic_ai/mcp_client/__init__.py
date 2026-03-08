"""MCP client utilities for agent-side tool consumption."""

from .config import MCPClientConfig

__all__ = ["MCPToolClient", "MCPClientConfig"]


def __getattr__(name: str):
    if name == "MCPToolClient":
        from .client import MCPToolClient

        return MCPToolClient
    if name == "MCPClientConfig":
        return MCPClientConfig
    raise AttributeError(f"module 'agentic_ai.mcp_client' has no attribute '{name}'")
