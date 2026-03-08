"""Configuration models for the standalone PetSwipe MCP server."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Literal, Optional

from agentic_ai.utils.config import load_config


TransportType = Literal["stdio", "streamable-http"]


@dataclass(frozen=True)
class MCPServerSettings:
    """Runtime settings for standalone MCP server execution."""

    server_name: str
    transport: TransportType
    host: str
    port: int
    path: str
    log_level: str
    debug: bool
    config_path: Optional[str]
    config: Dict[str, Any]

    @classmethod
    def from_cli_args(cls, args: Any) -> "MCPServerSettings":
        config_path = getattr(args, "config", None)
        config = load_config(config_path) if config_path else load_config()
        mcp_cfg = config.get("mcp", {})

        transport = getattr(args, "transport", None) or mcp_cfg.get("transport", "stdio")
        if transport not in {"stdio", "streamable-http"}:
            raise ValueError(f"Unsupported MCP transport '{transport}'")

        host = getattr(args, "host", None) or mcp_cfg.get("host", "0.0.0.0")
        port = getattr(args, "port", None)
        if port is None:
            port = mcp_cfg.get("port", 8766)

        path = getattr(args, "path", None) or mcp_cfg.get("path", "/mcp")
        if not path.startswith("/"):
            path = f"/{path}"
        if path == "/":
            raise ValueError("MCP HTTP path cannot be root '/'; use a dedicated path such as '/mcp'")

        log_level = str(mcp_cfg.get("log_level", "INFO")).upper()
        valid_log_levels = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        if log_level not in valid_log_levels:
            raise ValueError(
                f"Unsupported mcp.log_level '{log_level}'. "
                f"Use one of: {', '.join(sorted(valid_log_levels))}"
            )
        debug = bool(mcp_cfg.get("debug", False))
        server_name = mcp_cfg.get("server_name", "petswipe-agentic")
        if not str(server_name).strip():
            raise ValueError("mcp.server_name must be a non-empty string")
        if int(port) <= 0 or int(port) > 65535:
            raise ValueError(f"Invalid MCP server port '{port}'. Must be in range 1-65535.")

        return cls(
            server_name=server_name,
            transport=transport,
            host=host,
            port=int(port),
            path=path,
            log_level=log_level,
            debug=debug,
            config_path=str(Path(config_path).expanduser()) if config_path else None,
            config=config,
        )
