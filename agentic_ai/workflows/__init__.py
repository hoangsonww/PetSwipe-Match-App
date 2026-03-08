"""Agentic workflow exports with lazy loading."""

from __future__ import annotations

from importlib import import_module
from typing import Any

_EXPORTS = {
    "AssemblyLinePipeline": ("agentic_ai.workflows.assembly_line", "AssemblyLinePipeline"),
    "WorkflowBuilder": ("agentic_ai.workflows.workflow_builder", "WorkflowBuilder"),
    "StateManager": ("agentic_ai.workflows.state_manager", "StateManager"),
}

__all__ = list(_EXPORTS.keys())


def __getattr__(name: str) -> Any:
    if name not in _EXPORTS:
        raise AttributeError(f"module 'agentic_ai.workflows' has no attribute '{name}'")
    module_name, attr_name = _EXPORTS[name]
    module = import_module(module_name)
    value = getattr(module, attr_name)
    globals()[name] = value
    return value
