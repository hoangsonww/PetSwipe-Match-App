"""Configuration model for MCP client connections."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, Literal, Optional
from urllib.parse import urlparse


TransportType = Literal["stdio", "streamable-http"]


@dataclass(frozen=True)
class MCPClientConfig:
    """Connection config for MCP client transport selection."""

    transport: TransportType = "stdio"
    timeout_seconds: float = 30.0
    command: Optional[str] = None
    args: list[str] = field(default_factory=list)
    cwd: Optional[str] = None
    env: Optional[Dict[str, str]] = None
    url: Optional[str] = None
    headers: Optional[Dict[str, str]] = None

    def __post_init__(self) -> None:
        if self.timeout_seconds <= 0:
            raise ValueError("mcp_client timeout_seconds must be greater than 0")

        if self.transport == "stdio":
            if not self.command:
                raise ValueError("stdio transport requires command")
            return

        if self.transport == "streamable-http":
            if not self.url:
                raise ValueError("streamable-http transport requires url")
            parsed = urlparse(self.url)
            if parsed.scheme not in {"http", "https"} or not parsed.netloc:
                raise ValueError("mcp_client.streamable_http.url must be a valid http(s) URL")
            return

        raise ValueError(f"Unsupported mcp_client transport '{self.transport}'")

    @classmethod
    def from_dict(cls, raw: Dict[str, object]) -> "MCPClientConfig":
        transport = str(raw.get("transport", "stdio")).strip().lower().replace("_", "-")
        timeout_seconds = float(raw.get("timeout_seconds", 30))

        if transport == "stdio":
            stdio = raw.get("stdio", {})
            if not isinstance(stdio, dict):
                raise ValueError("mcp_client.stdio must be an object")

            command = str(stdio.get("command", "python"))
            raw_args = stdio.get("args", [])
            if not isinstance(raw_args, (list, tuple)):
                raise ValueError("mcp_client.stdio.args must be a list")
            args = [str(item) for item in raw_args]
            cwd = stdio.get("cwd")
            env = stdio.get("env")
            if env is not None and not isinstance(env, dict):
                raise ValueError("mcp_client.stdio.env must be an object")
            return cls(
                transport="stdio",
                timeout_seconds=timeout_seconds,
                command=command,
                args=args,
                cwd=str(cwd) if cwd else None,
                env={str(k): str(v) for k, v in env.items()} if isinstance(env, dict) else None,
            )

        if transport == "streamable-http":
            http = raw.get("streamable_http", {})
            if not isinstance(http, dict):
                raise ValueError("mcp_client.streamable_http must be an object")
            url = http.get("url")
            if not url:
                raise ValueError("mcp_client.streamable_http.url is required")
            headers = http.get("headers")
            if headers is not None and not isinstance(headers, dict):
                raise ValueError("mcp_client.streamable_http.headers must be an object")
            return cls(
                transport="streamable-http",
                timeout_seconds=timeout_seconds,
                url=str(url),
                headers=(
                    {str(k): str(v) for k, v in headers.items()}
                    if isinstance(headers, dict)
                    else None
                ),
            )

        raise ValueError(f"Unsupported mcp_client transport '{transport}'")

    def target_summary(self) -> str:
        """Return a safe, human-readable transport target description."""
        if self.transport == "stdio":
            args = " ".join(self.args) if self.args else ""
            return f"stdio:{self.command} {args}".strip()

        parsed = urlparse(self.url or "")
        return f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
