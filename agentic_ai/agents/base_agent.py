"""
Base Agent
==========

Abstract base class for all agents in the assembly line architecture.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
from dataclasses import dataclass
import logging
from datetime import datetime


@dataclass
class AgentState:
    """State object passed between agents in the assembly line."""

    agent_name: str
    timestamp: datetime
    data: Dict[str, Any]
    metadata: Dict[str, Any]
    errors: list[str]

    def add_error(self, error: str) -> None:
        """Add an error to the state."""
        self.errors.append(error)

    def update_data(self, key: str, value: Any) -> None:
        """Update data in the state."""
        self.data[key] = value

    def update_metadata(self, key: str, value: Any) -> None:
        """Update metadata in the state."""
        self.metadata[key] = value


class BaseAgent(ABC):
    """
    Base class for all agents in the agentic AI pipeline.

    Each agent in the assembly line processes data and passes it to the next agent.
    Agents follow the Single Responsibility Principle and are composable.
    """

    def __init__(
        self,
        name: str,
        description: str,
        config: Optional[Dict[str, Any]] = None
    ):
        self.name = name
        self.description = description
        self.config = config or {}
        self.logger = logging.getLogger(f"agent.{name}")
        self._initialize()

    def _initialize(self) -> None:
        """Initialize agent-specific resources."""
        self.logger.info(f"Initializing agent: {self.name}")

    @abstractmethod
    async def process(self, state: AgentState) -> AgentState:
        """
        Process the current state and return an updated state.

        Args:
            state: Current agent state

        Returns:
            Updated agent state
        """
        pass

    async def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the agent with input data.

        Args:
            input_data: Input data dictionary

        Returns:
            Output data dictionary
        """
        try:
            # Create initial state
            state = AgentState(
                agent_name=self.name,
                timestamp=datetime.now(),
                data=input_data,
                metadata={},
                errors=[]
            )

            # Process the state
            result_state = await self.process(state)

            return {
                "success": len(result_state.errors) == 0,
                "data": result_state.data,
                "metadata": result_state.metadata,
                "errors": result_state.errors,
                "agent": self.name,
                "timestamp": result_state.timestamp.isoformat()
            }

        except Exception as e:
            self.logger.error(f"Agent {self.name} execution failed: {str(e)}")
            return {
                "success": False,
                "data": input_data,
                "metadata": {},
                "errors": [str(e)],
                "agent": self.name,
                "timestamp": datetime.now().isoformat()
            }

    def validate_config(self, required_keys: list[str]) -> bool:
        """
        Validate that required configuration keys are present.

        Args:
            required_keys: List of required configuration keys

        Returns:
            True if all required keys are present, False otherwise
        """
        missing_keys = [key for key in required_keys if key not in self.config]
        if missing_keys:
            self.logger.error(f"Missing configuration keys: {missing_keys}")
            return False
        return True

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(name='{self.name}')"
