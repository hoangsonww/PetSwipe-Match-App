"""
Assembly Line Pipeline
======================

LangGraph-based assembly line architecture for orchestrating multiple agents
in a sequential or parallel processing pipeline.
"""

from typing import Dict, Any, List, Optional, Callable
from langgraph.graph import Graph, StateGraph, END
from langgraph.prebuilt import ToolExecutor
from datetime import datetime
import asyncio
import logging

from ..agents.base_agent import BaseAgent, AgentState
from ..utils.context import (
    set_agent,
    set_request_id,
    set_workflow,
    reset_agent,
    reset_request_id,
    reset_workflow,
)


class AssemblyLinePipeline:
    """
    Assembly line pipeline for orchestrating multiple agents using LangGraph.

    The assembly line processes data through a series of agents, where each
    agent performs a specific task and passes the result to the next agent.
    """

    def __init__(
        self,
        name: str = "PetSwipeAgenticPipeline",
        config: Optional[Dict[str, Any]] = None
    ):
        self.name = name
        self.config = config or {}
        self.logger = logging.getLogger(f"pipeline.{name}")

        # Agent registry
        self.agents: Dict[str, BaseAgent] = {}
        self.agent_order: List[str] = []

        # Graph for orchestration
        self.graph: Optional[StateGraph] = None
        self.compiled_graph = None

        # Execution history
        self.execution_history: List[Dict[str, Any]] = []

    def add_agent(
        self,
        agent: BaseAgent,
        dependencies: Optional[List[str]] = None
    ) -> "AssemblyLinePipeline":
        """
        Add an agent to the pipeline.

        Args:
            agent: Agent instance
            dependencies: List of agent names this agent depends on

        Returns:
            Self for method chaining
        """
        self.agents[agent.name] = agent
        self.agent_order.append(agent.name)

        self.logger.info(f"Added agent: {agent.name}")

        return self

    def build(self) -> "AssemblyLinePipeline":
        """
        Build the LangGraph workflow.

        Returns:
            Self for method chaining
        """
        self.logger.info(f"Building pipeline: {self.name}")

        # Create state graph
        self.graph = StateGraph(dict)

        # Add nodes for each agent
        for agent_name in self.agent_order:
            self.graph.add_node(agent_name, self._create_agent_node(agent_name))

        # Add edges (sequential flow)
        for i in range(len(self.agent_order) - 1):
            current = self.agent_order[i]
            next_agent = self.agent_order[i + 1]
            self.graph.add_edge(current, next_agent)

        # Set entry and exit points
        if self.agent_order:
            self.graph.set_entry_point(self.agent_order[0])
            self.graph.add_edge(self.agent_order[-1], END)

        # Compile the graph
        self.compiled_graph = self.graph.compile()

        self.logger.info(f"Pipeline built with {len(self.agents)} agents")

        return self

    def _create_agent_node(self, agent_name: str) -> Callable:
        """
        Create a node function for an agent.

        Args:
            agent_name: Name of the agent

        Returns:
            Node function
        """
        async def node_function(state: Dict[str, Any]) -> Dict[str, Any]:
            """Execute agent and update state."""
            agent = self.agents[agent_name]

            self.logger.info(f"Executing agent: {agent_name}")
            start_time = datetime.now()
            agent_token = set_agent(agent_name)

            try:
                # Create agent state
                agent_state = AgentState(
                    agent_name=agent_name,
                    timestamp=start_time,
                    data=state.get("data", {}),
                    metadata=state.get("metadata", {}),
                    errors=state.get("errors", [])
                )

                # Process through agent
                result_state = await agent.process(agent_state)

                # Calculate processing time
                processing_time = (datetime.now() - start_time).total_seconds()

                # Update state
                state["data"] = result_state.data
                state["metadata"] = result_state.metadata
                state["errors"] = result_state.errors

                # Track agent execution
                if "agent_results" not in state:
                    state["agent_results"] = []

                state["agent_results"].append({
                    "agent": agent_name,
                    "success": len(result_state.errors) == 0,
                    "processing_time": processing_time,
                    "timestamp": result_state.timestamp.isoformat(),
                    "errors": result_state.errors
                })

                self.logger.info(
                    f"Agent {agent_name} completed in {processing_time:.2f}s"
                )

                return state
            finally:
                reset_agent(agent_token)

        return node_function

    async def execute(
        self,
        input_data: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Execute the pipeline with input data.

        Args:
            input_data: Input data for the pipeline
            metadata: Optional metadata

        Returns:
            Final pipeline output
        """
        if not self.compiled_graph:
            raise RuntimeError("Pipeline not built. Call build() first.")

        self.logger.info(f"Starting pipeline execution: {self.name}")
        start_time = datetime.now()

        # Create initial state
        initial_state = {
            "data": input_data,
            "metadata": metadata or {},
            "errors": [],
            "agent_results": [],
            "pipeline_id": f"{self.name}_{start_time.timestamp()}"
        }
        workflow_token = set_workflow(self.name)
        request_token = set_request_id(initial_state["pipeline_id"])

        try:
            # Execute the graph with optional timeout
            timeout = self._get_timeout()
            if timeout:
                final_state = await asyncio.wait_for(
                    self.compiled_graph.ainvoke(initial_state),
                    timeout=timeout
                )
            else:
                final_state = await self.compiled_graph.ainvoke(initial_state)

            # Calculate total time
            total_time = (datetime.now() - start_time).total_seconds()

            # Prepare result
            result = {
                "success": len(final_state.get("errors", [])) == 0,
                "data": final_state.get("data", {}),
                "metadata": final_state.get("metadata", {}),
                "errors": final_state.get("errors", []),
                "agent_results": final_state.get("agent_results", []),
                "pipeline_id": final_state.get("pipeline_id"),
                "total_time": total_time,
                "timestamp": datetime.now().isoformat()
            }

            # Store in history
            self.execution_history.append(result)

            self.logger.info(
                f"Pipeline completed successfully in {total_time:.2f}s"
            )

            return result

        except Exception as e:
            self.logger.error(f"Pipeline execution failed: {str(e)}")

            return {
                "success": False,
                "data": input_data,
                "metadata": metadata or {},
                "errors": [str(e)],
                "agent_results": [],
                "pipeline_id": initial_state["pipeline_id"],
                "total_time": (datetime.now() - start_time).total_seconds(),
                "timestamp": datetime.now().isoformat()
            }
        finally:
            reset_workflow(workflow_token)
            reset_request_id(request_token)

    def _get_timeout(self) -> Optional[int]:
        workflows_cfg = self.config.get("workflows", {})
        key = self.name.replace("Workflow", "").lower()
        return workflows_cfg.get(key, {}).get("timeout")

    async def execute_batch(
        self,
        batch_input: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Execute pipeline for multiple inputs in parallel.

        Args:
            batch_input: List of input data dictionaries

        Returns:
            List of results
        """
        self.logger.info(f"Executing batch of {len(batch_input)} items")

        tasks = [self.execute(input_data) for input_data in batch_input]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        return [
            r if not isinstance(r, Exception) else {"success": False, "error": str(r)}
            for r in results
        ]

    def get_execution_history(
        self,
        limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Get pipeline execution history.

        Args:
            limit: Maximum number of records to return

        Returns:
            List of execution records
        """
        if limit:
            return self.execution_history[-limit:]
        return self.execution_history

    def visualize(self) -> str:
        """
        Generate a visualization of the pipeline.

        Returns:
            Mermaid diagram string
        """
        mermaid = ["graph LR"]

        for i, agent_name in enumerate(self.agent_order):
            node_id = f"A{i}"
            agent = self.agents[agent_name]
            mermaid.append(f'    {node_id}["{agent.name}<br/>{agent.description}"]')

            if i > 0:
                prev_node = f"A{i-1}"
                mermaid.append(f"    {prev_node} --> {node_id}")

        return "\n".join(mermaid)

    def get_metrics(self) -> Dict[str, Any]:
        """
        Get pipeline performance metrics.

        Returns:
            Metrics dictionary
        """
        if not self.execution_history:
            return {"message": "No execution history available"}

        total_executions = len(self.execution_history)
        successful = sum(1 for e in self.execution_history if e.get("success"))
        avg_time = sum(e.get("total_time", 0) for e in self.execution_history) / total_executions
        total_errors = sum(len(e.get("errors", [])) for e in self.execution_history)

        return {
            "total_executions": total_executions,
            "successful_executions": successful,
            "success_rate": successful / total_executions,
            "average_execution_time": avg_time,
            "total_errors": total_errors,
            "agents_count": len(self.agents)
        }
