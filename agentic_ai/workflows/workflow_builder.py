"""
Workflow Builder
================

Utility for building and configuring workflows with agents.
"""

from typing import Dict, Any, List, Optional
from .assembly_line import AssemblyLinePipeline
from ..agents import (
    PetAnalyzerAgent,
    UserProfilerAgent,
    MatchingAgent,
    RecommendationAgent,
    ConversationAgent,
    MonitoringAgent
)


class WorkflowBuilder:
    """
    Builder class for creating pre-configured workflows.
    """

    @staticmethod
    def build_recommendation_workflow(config: Dict[str, Any]) -> AssemblyLinePipeline:
        """
        Build a workflow for pet recommendations.

        Pipeline flow:
        1. User Profiler - Analyze user preferences
        2. Pet Analyzer - Analyze available pets
        3. Matching Agent - Match users with pets
        4. Recommendation Agent - Generate recommendations
        5. Monitoring Agent - Track performance

        Args:
            config: Configuration dictionary

        Returns:
            Configured pipeline
        """
        pipeline = AssemblyLinePipeline(
            name="RecommendationWorkflow",
            config=config
        )

        # Add agents in order
        pipeline.add_agent(UserProfilerAgent(config))
        pipeline.add_agent(PetAnalyzerAgent(config))
        pipeline.add_agent(MatchingAgent(config))
        pipeline.add_agent(RecommendationAgent(config))
        pipeline.add_agent(MonitoringAgent(config))

        # Build the graph
        pipeline.build()

        return pipeline

    @staticmethod
    def build_conversation_workflow(config: Dict[str, Any]) -> AssemblyLinePipeline:
        """
        Build a workflow for conversations.

        Pipeline flow:
        1. User Profiler - Get user context
        2. Conversation Agent - Generate response
        3. Monitoring Agent - Track performance

        Args:
            config: Configuration dictionary

        Returns:
            Configured pipeline
        """
        pipeline = AssemblyLinePipeline(
            name="ConversationWorkflow",
            config=config
        )

        # Add agents
        pipeline.add_agent(UserProfilerAgent(config))
        pipeline.add_agent(ConversationAgent(config))
        pipeline.add_agent(MonitoringAgent(config))

        # Build the graph
        pipeline.build()

        return pipeline

    @staticmethod
    def build_analysis_workflow(config: Dict[str, Any]) -> AssemblyLinePipeline:
        """
        Build a workflow for pet analysis.

        Pipeline flow:
        1. Pet Analyzer - Analyze pet profiles
        2. Monitoring Agent - Track performance

        Args:
            config: Configuration dictionary

        Returns:
            Configured pipeline
        """
        pipeline = AssemblyLinePipeline(
            name="AnalysisWorkflow",
            config=config
        )

        # Add agents
        pipeline.add_agent(PetAnalyzerAgent(config))
        pipeline.add_agent(MonitoringAgent(config))

        # Build the graph
        pipeline.build()

        return pipeline

    @staticmethod
    def build_profile_workflow(config: Dict[str, Any]) -> AssemblyLinePipeline:
        """
        Build a workflow for user profiling.

        Pipeline flow:
        1. User Profiler - Analyze user preferences
        2. Monitoring Agent - Track performance
        """
        pipeline = AssemblyLinePipeline(
            name="ProfileWorkflow",
            config=config
        )

        pipeline.add_agent(UserProfilerAgent(config))
        pipeline.add_agent(MonitoringAgent(config))
        pipeline.build()

        return pipeline

    @staticmethod
    def build_match_workflow(config: Dict[str, Any]) -> AssemblyLinePipeline:
        """
        Build a workflow for user-pet matching.

        Pipeline flow:
        1. User Profiler - Analyze user preferences
        2. Pet Analyzer - Analyze available pets
        3. Matching Agent - Match users with pets
        4. Monitoring Agent - Track performance
        """
        pipeline = AssemblyLinePipeline(
            name="MatchWorkflow",
            config=config
        )

        pipeline.add_agent(UserProfilerAgent(config))
        pipeline.add_agent(PetAnalyzerAgent(config))
        pipeline.add_agent(MatchingAgent(config))
        pipeline.add_agent(MonitoringAgent(config))
        pipeline.build()

        return pipeline

    @staticmethod
    def build_custom_workflow(
        name: str,
        agents: List[str],
        config: Dict[str, Any]
    ) -> AssemblyLinePipeline:
        """
        Build a custom workflow with specified agents.

        Args:
            name: Workflow name
            agents: List of agent names to include
            config: Configuration dictionary

        Returns:
            Configured pipeline
        """
        pipeline = AssemblyLinePipeline(name=name, config=config)

        # Agent mapping
        agent_classes = {
            "pet_analyzer": PetAnalyzerAgent,
            "user_profiler": UserProfilerAgent,
            "matching": MatchingAgent,
            "recommendation": RecommendationAgent,
            "conversation": ConversationAgent,
            "monitoring": MonitoringAgent
        }

        # Add requested agents
        for agent_name in agents:
            if agent_name in agent_classes:
                agent_class = agent_classes[agent_name]
                pipeline.add_agent(agent_class(config))

        # Build the graph
        pipeline.build()

        return pipeline
