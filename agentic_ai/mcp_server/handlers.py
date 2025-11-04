"""
Request Handlers
================

Handles different types of MCP requests.
"""

from typing import Dict, Any
import logging
from datetime import datetime

from .protocol import MCPProtocol
from ..workflows import WorkflowBuilder


class RequestHandler:
    """
    Handles MCP requests and routes them to appropriate workflows.
    """

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.logger = logging.getLogger("mcp_handler")
        self.protocol = MCPProtocol()

        # Initialize workflows
        self.workflows = {
            "recommendation": WorkflowBuilder.build_recommendation_workflow(config),
            "conversation": WorkflowBuilder.build_conversation_workflow(config),
            "analysis": WorkflowBuilder.build_analysis_workflow(config)
        }

    async def handle_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle incoming MCP request.

        Args:
            request: Request dictionary

        Returns:
            Response dictionary
        """
        request_type = request.get("type")
        request_id = request.get("id")

        self.logger.info(f"Handling request: {request_type} (ID: {request_id})")

        try:
            # Route request to appropriate handler
            if request_type == "execute_workflow":
                return await self._handle_workflow_execution(request)
            elif request_type == "get_recommendations":
                return await self._handle_recommendations(request)
            elif request_type == "chat":
                return await self._handle_chat(request)
            elif request_type == "analyze_pet":
                return await self._handle_pet_analysis(request)
            elif request_type == "health":
                return await self._handle_health_check(request)
            elif request_type == "metrics":
                return await self._handle_metrics(request)
            else:
                return self.protocol.create_error_response(
                    request_id,
                    "UNKNOWN_REQUEST_TYPE",
                    f"Unknown request type: {request_type}"
                )

        except Exception as e:
            self.logger.error(f"Error handling request: {str(e)}")
            return self.protocol.create_error_response(
                request_id,
                "HANDLER_ERROR",
                str(e)
            )

    async def _handle_workflow_execution(
        self,
        request: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle workflow execution request."""
        workflow_name = request.get("data", {}).get("workflow")
        input_data = request.get("data", {}).get("input", {})

        if workflow_name not in self.workflows:
            return self.protocol.create_error_response(
                request.get("id"),
                "UNKNOWN_WORKFLOW",
                f"Workflow not found: {workflow_name}"
            )

        workflow = self.workflows[workflow_name]
        result = await workflow.execute(input_data)

        return self.protocol.create_success_response(
            request.get("id"),
            result
        )

    async def _handle_recommendations(
        self,
        request: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle recommendation request."""
        user_data = request.get("data", {}).get("user", {})
        swipe_history = request.get("data", {}).get("swipe_history", [])
        pet_candidates = request.get("data", {}).get("pet_candidates", [])

        workflow = self.workflows["recommendation"]

        input_data = {
            "user": user_data,
            "swipe_history": swipe_history,
            "pet_candidates": pet_candidates
        }

        result = await workflow.execute(input_data)

        return self.protocol.create_success_response(
            request.get("id"),
            {
                "recommendations": result.get("data", {}).get("recommendations", []),
                "metadata": result.get("metadata", {})
            }
        )

    async def _handle_chat(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle chat request."""
        message = request.get("data", {}).get("message", "")
        context = request.get("data", {}).get("context", {})

        workflow = self.workflows["conversation"]

        input_data = {
            "message": message,
            "context": context
        }

        result = await workflow.execute(input_data)

        return self.protocol.create_success_response(
            request.get("id"),
            {
                "response": result.get("data", {}).get("response", ""),
                "conversation_history": result.get("data", {}).get("conversation_history", [])
            }
        )

    async def _handle_pet_analysis(
        self,
        request: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle pet analysis request."""
        pet_data = request.get("data", {}).get("pet", {})

        workflow = self.workflows["analysis"]

        input_data = {"pet": pet_data}

        result = await workflow.execute(input_data)

        return self.protocol.create_success_response(
            request.get("id"),
            {
                "analysis": result.get("data", {}).get("pet_analysis", {}),
                "metadata": result.get("metadata", {})
            }
        )

    async def _handle_health_check(
        self,
        request: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle health check request."""
        health_status = {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "workflows": {
                name: "active" for name in self.workflows.keys()
            }
        }

        return self.protocol.create_success_response(
            request.get("id"),
            health_status
        )

    async def _handle_metrics(
        self,
        request: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle metrics request."""
        metrics = {}

        for name, workflow in self.workflows.items():
            metrics[name] = workflow.get_metrics()

        return self.protocol.create_success_response(
            request.get("id"),
            {"workflows": metrics}
        )
