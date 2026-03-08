"""CLI entrypoint for standalone PetSwipe MCP server."""

from __future__ import annotations

import argparse
import logging
import sys
from typing import Any

from .app import create_mcp_app
from .settings import MCPServerSettings


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Standalone MCP server for PetSwipe agentic workflows"
    )
    parser.add_argument(
        "--transport",
        choices=["stdio", "streamable-http"],
        default=None,
        help="MCP transport override (defaults to config mcp.transport)",
    )
    parser.add_argument("--host", default=None, help="HTTP transport host override")
    parser.add_argument("--port", type=int, default=None, help="HTTP transport port override")
    parser.add_argument("--path", default=None, help="HTTP MCP path override")
    parser.add_argument(
        "--config",
        default=None,
        help="Config file path override. If omitted, AGENTIC_AI_CONFIG or package default is used.",
    )
    return parser


def _configure_logging(log_level: str) -> None:
    logging.basicConfig(
        level=getattr(logging, log_level, logging.INFO),
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
        stream=sys.stderr,
    )


def run(args: Any) -> None:
    settings = MCPServerSettings.from_cli_args(args)
    _configure_logging(settings.log_level)
    logger = logging.getLogger("petswipe_mcp")
    logger.info(
        "Starting standalone MCP server name=%s transport=%s host=%s port=%s path=%s",
        settings.server_name,
        settings.transport,
        settings.host,
        settings.port,
        settings.path,
    )

    app = create_mcp_app(settings)
    app.run(transport=settings.transport)


def main() -> None:
    run(_build_parser().parse_args())


if __name__ == "__main__":
    main()
