"""Logging utilities."""

import logging
import sys
import json
from typing import Optional, Dict, Any


class JsonFormatter(logging.Formatter):
    """Simple JSON log formatter."""

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": self.formatTime(record, datefmt="%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(payload)


def setup_logging(level: str = "INFO", config: Optional[Dict[str, Any]] = None) -> None:
    """
    Setup logging configuration.

    Args:
        level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    """
    log_level = getattr(logging, level.upper())
    handlers = [logging.StreamHandler(sys.stdout)]

    log_file = None
    if config:
        log_file = config.get("file", {}).get("path")
    if log_file:
        handlers.append(logging.FileHandler(log_file))

    formatter: logging.Formatter
    if config and config.get("format") == "json":
        formatter = JsonFormatter()
    else:
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )

    for handler in handlers:
        handler.setFormatter(formatter)

    logging.basicConfig(level=log_level, handlers=handlers)


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance.

    Args:
        name: Logger name

    Returns:
        Logger instance
    """
    return logging.getLogger(name)
