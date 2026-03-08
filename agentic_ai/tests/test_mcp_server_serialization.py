"""Tests for standalone MCP server helpers."""

from types import SimpleNamespace

import pytest

from mcp_server.serialization import to_jsonable
from mcp_server.settings import MCPServerSettings


class _DummyModel:
    def model_dump(self):
        return {"x": 1, "nested": {"y": [1, 2, 3]}}


def test_to_jsonable_model_dump():
    payload = to_jsonable({"m": _DummyModel()})
    assert payload == {"m": {"x": 1, "nested": {"y": [1, 2, 3]}}}


def test_mcp_server_settings_from_cli():
    args = SimpleNamespace(
        transport="stdio",
        host=None,
        port=None,
        path=None,
        config="agentic_ai/config/config.yaml",
    )
    settings = MCPServerSettings.from_cli_args(args)
    assert settings.server_name == "petswipe-agentic"
    assert settings.transport == "stdio"
    assert settings.path == "/mcp"


def test_mcp_server_settings_invalid_log_level(tmp_path):
    config_path = tmp_path / "invalid-mcp-log-level.yaml"
    config_path.write_text(
        "\n".join(
            [
                "mcp:",
                "  server_name: petswipe-agentic",
                "  transport: stdio",
                "  host: 0.0.0.0",
                "  port: 8766",
                "  path: /mcp",
                "  log_level: noisy",
                "costs:",
                "  enabled: false",
            ]
        ),
        encoding="utf-8",
    )

    with pytest.raises(ValueError):
        MCPServerSettings.from_cli_args(
            SimpleNamespace(
                transport=None,
                host=None,
                port=None,
                path=None,
                config=str(config_path),
            )
        )


def test_mcp_server_settings_invalid_port(tmp_path):
    config_path = tmp_path / "invalid-mcp-port.yaml"
    config_path.write_text(
        "\n".join(
            [
                "mcp:",
                "  server_name: petswipe-agentic",
                "  transport: stdio",
                "  host: 0.0.0.0",
                "  port: 70000",
                "  path: /mcp",
                "  log_level: INFO",
                "costs:",
                "  enabled: false",
            ]
        ),
        encoding="utf-8",
    )

    with pytest.raises(ValueError):
        MCPServerSettings.from_cli_args(
            SimpleNamespace(
                transport=None,
                host=None,
                port=None,
                path=None,
                config=str(config_path),
            )
        )
