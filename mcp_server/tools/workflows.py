"""Workflow-oriented MCP tools."""

from __future__ import annotations

from typing import Any, Dict

from mcp.server.fastmcp import FastMCP

from ..runtime import RuntimeContext
from ..serialization import to_jsonable


def register_workflow_tools(server: FastMCP, runtime: RuntimeContext) -> None:
    """Register workflow and core agent behavior tools."""

    @server.tool(
        name="list_workflows",
        description="List available workflow names from the PetSwipe agentic engine.",
    )
    async def list_workflows() -> Dict[str, Any]:
        engine = await runtime.engine()
        return {"workflows": engine.list_workflows()}

    @server.tool(
        name="execute_workflow",
        description="Execute a workflow by name with raw input data.",
    )
    async def execute_workflow(workflow: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
        engine = await runtime.engine()
        return to_jsonable(await engine.execute_workflow(workflow, input_data))

    @server.tool(
        name="analyze_pet",
        description="Analyze a pet profile and return AI-enriched analysis metadata.",
    )
    async def analyze_pet(pet: Dict[str, Any]) -> Dict[str, Any]:
        engine = await runtime.engine()
        return to_jsonable(await engine.analyze_pet(pet))

    @server.tool(
        name="profile_user",
        description="Build a user profile from user data and optional swipe history.",
    )
    async def profile_user(
        user: Dict[str, Any], swipe_history: list[Dict[str, Any]] | None = None
    ) -> Dict[str, Any]:
        engine = await runtime.engine()
        return to_jsonable(await engine.profile_user(user, swipe_history or []))

    @server.tool(
        name="match_pets",
        description="Match a user against pet candidates and return compatibility data.",
    )
    async def match_pets(
        user: Dict[str, Any],
        swipe_history: list[Dict[str, Any]] | None = None,
        pet_candidates: list[Dict[str, Any]] | None = None,
    ) -> Dict[str, Any]:
        engine = await runtime.engine()
        return to_jsonable(
            await engine.match_pets(user, swipe_history or [], pet_candidates or [])
        )

    @server.tool(
        name="recommend_pets",
        description="Generate personalized pet recommendations for a user.",
    )
    async def recommend_pets(
        user: Dict[str, Any],
        swipe_history: list[Dict[str, Any]] | None = None,
        pet_candidates: list[Dict[str, Any]] | None = None,
    ) -> Dict[str, Any]:
        engine = await runtime.engine()
        return to_jsonable(
            await engine.recommend(user, swipe_history or [], pet_candidates or [])
        )

    @server.tool(
        name="chat",
        description="Execute conversation workflow for a user message with optional context.",
    )
    async def chat(message: str, context: Dict[str, Any] | None = None) -> Dict[str, Any]:
        engine = await runtime.engine()
        return to_jsonable(await engine.chat(message, context or {}))
