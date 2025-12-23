"""Uvicorn entrypoint for Agentic AI API."""

import uvicorn

from ..utils.config import load_config


def main() -> None:
    config = load_config()
    server_cfg = config.get("server", {})
    host = server_cfg.get("host", "0.0.0.0")
    port = server_cfg.get("port", 8765)
    workers = server_cfg.get("workers", 1)

    uvicorn.run(
        "agentic_ai.api.app:app",
        host=host,
        port=port,
        workers=workers,
        log_level="info",
    )


if __name__ == "__main__":
    main()
