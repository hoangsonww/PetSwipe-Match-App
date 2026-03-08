"""Tests for MCP client configuration parsing."""

import pytest

from agentic_ai.mcp_client import MCPClientConfig


def test_mcp_client_config_stdio() -> None:
    raw = {
        "transport": "stdio",
        "timeout_seconds": 45,
        "stdio": {
            "command": "python",
            "args": ["-m", "mcp_server.server", "--transport", "stdio"],
            "cwd": ".",
            "env": {"FOO": "bar"},
        },
    }
    cfg = MCPClientConfig.from_dict(raw)
    assert cfg.transport == "stdio"
    assert cfg.timeout_seconds == 45
    assert cfg.command == "python"
    assert cfg.args[0] == "-m"
    assert cfg.cwd == "."
    assert cfg.env == {"FOO": "bar"}


def test_mcp_client_config_streamable_http() -> None:
    raw = {
        "transport": "streamable-http",
        "streamable_http": {
            "url": "http://127.0.0.1:8766/mcp",
            "headers": {"Authorization": "Bearer token"},
        },
    }
    cfg = MCPClientConfig.from_dict(raw)
    assert cfg.transport == "streamable-http"
    assert cfg.url == "http://127.0.0.1:8766/mcp"
    assert cfg.headers == {"Authorization": "Bearer token"}


def test_mcp_client_config_invalid_transport() -> None:
    with pytest.raises(ValueError):
        MCPClientConfig.from_dict({"transport": "sse"})


def test_mcp_client_config_invalid_timeout() -> None:
    with pytest.raises(ValueError):
        MCPClientConfig.from_dict(
            {
                "transport": "stdio",
                "timeout_seconds": 0,
                "stdio": {"command": "python", "args": []},
            }
        )


def test_mcp_client_config_invalid_http_url() -> None:
    with pytest.raises(ValueError):
        MCPClientConfig.from_dict(
            {
                "transport": "streamable-http",
                "streamable_http": {"url": "localhost:8766/mcp"},
            }
        )


def test_mcp_client_config_target_summary() -> None:
    cfg = MCPClientConfig.from_dict(
        {
            "transport": "stdio",
            "stdio": {"command": "python", "args": ["-m", "mcp_server.server"]},
        }
    )
    assert cfg.target_summary().startswith("stdio:python")
