"""Serialization helpers for MCP tool responses."""

from __future__ import annotations

from typing import Any


def to_jsonable(value: Any) -> Any:
    """Convert mixed python/pydantic objects into JSON-serializable structures."""
    if hasattr(value, "model_dump"):
        return to_jsonable(value.model_dump())

    if isinstance(value, dict):
        return {str(k): to_jsonable(v) for k, v in value.items()}

    if isinstance(value, (list, tuple, set)):
        return [to_jsonable(v) for v in value]

    return value
