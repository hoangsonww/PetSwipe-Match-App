"""Execution context utilities."""

from contextvars import ContextVar
from typing import Dict


workflow_ctx: ContextVar[str] = ContextVar("workflow", default="unknown")
agent_ctx: ContextVar[str] = ContextVar("agent", default="unknown")
request_ctx: ContextVar[str] = ContextVar("request_id", default="unknown")


def set_workflow(name: str):
    return workflow_ctx.set(name)


def set_agent(name: str):
    return agent_ctx.set(name)


def set_request_id(request_id: str):
    return request_ctx.set(request_id)


def reset_workflow(token) -> None:
    workflow_ctx.reset(token)


def reset_agent(token) -> None:
    agent_ctx.reset(token)


def reset_request_id(token) -> None:
    request_ctx.reset(token)


def get_context() -> Dict[str, str]:
    return {
        "workflow": workflow_ctx.get(),
        "agent": agent_ctx.get(),
        "request_id": request_ctx.get(),
    }
