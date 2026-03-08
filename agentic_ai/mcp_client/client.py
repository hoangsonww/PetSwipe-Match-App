"""Async MCP client for agent-side tool execution."""

from __future__ import annotations

import asyncio
from contextlib import AsyncExitStack
from typing import Any, Dict, Optional

from mcp import ClientSession
from mcp.client.stdio import StdioServerParameters, stdio_client
from mcp.client.streamable_http import streamablehttp_client

from .config import MCPClientConfig


def _to_jsonable(value: Any) -> Any:
    if hasattr(value, "model_dump"):
        return _to_jsonable(value.model_dump())
    if isinstance(value, dict):
        return {str(k): _to_jsonable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_to_jsonable(v) for v in value]
    return value


class MCPToolClient:
    """Managed async MCP client supporting stdio and streamable-http."""

    def __init__(self, config: MCPClientConfig):
        self.config = config
        self._stack = AsyncExitStack()
        self._session: Optional[ClientSession] = None

    async def __aenter__(self) -> "MCPToolClient":
        await self.connect()
        return self

    async def __aexit__(self, *_exc: object) -> None:
        await self.close()

    @property
    def is_connected(self) -> bool:
        return self._session is not None

    async def connect(self) -> None:
        if self._session is not None:
            return

        if self.config.transport == "stdio":
            if not self.config.command:
                raise ValueError("stdio transport requires command")
            params = StdioServerParameters(
                command=self.config.command,
                args=self.config.args,
                cwd=self.config.cwd,
                env=self.config.env,
            )
            read_stream, write_stream = await self._stack.enter_async_context(stdio_client(params))
        else:
            if not self.config.url:
                raise ValueError("streamable-http transport requires url")
            read_stream, write_stream, _ = await self._stack.enter_async_context(
                streamablehttp_client(
                    self.config.url,
                    headers=self.config.headers,
                    timeout=self.config.timeout_seconds,
                )
            )

        self._session = await self._stack.enter_async_context(
            ClientSession(read_stream, write_stream)
        )
        await self._session.initialize()

    async def close(self) -> None:
        await self._stack.aclose()
        self._session = None

    def _session_or_raise(self) -> ClientSession:
        if self._session is None:
            raise RuntimeError("MCP client is not connected. Call connect() first.")
        return self._session

    async def _run_with_timeout(self, awaitable: Any) -> Any:
        return await asyncio.wait_for(awaitable, timeout=self.config.timeout_seconds)

    async def list_tools(self) -> list[Dict[str, Any]]:
        result = await self._run_with_timeout(self._session_or_raise().list_tools())
        return [_to_jsonable(tool) for tool in result.tools]

    async def call_tool(
        self, name: str, arguments: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        result = await self._run_with_timeout(
            self._session_or_raise().call_tool(name, arguments=arguments or {})
        )
        return _to_jsonable(result)

    async def list_workflows(self) -> Dict[str, Any]:
        return await self.call_tool("list_workflows", {})

    async def execute_workflow(
        self, workflow: str, input_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        return await self.call_tool(
            "execute_workflow", {"workflow": workflow, "input_data": input_data}
        )

    async def ping(self) -> Dict[str, Any]:
        """Best-effort health check for a connected MCP server."""
        try:
            return await self.call_tool("server_metadata", {})
        except Exception:
            return await self.call_tool("health", {})
