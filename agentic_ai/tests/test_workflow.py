"""
Test cases for workflows.
"""

import pytest
from agentic_ai.workflows import AssemblyLinePipeline, WorkflowBuilder
from agentic_ai.agents import PetAnalyzerAgent, MonitoringAgent


@pytest.fixture
def config():
    """Test configuration."""
    return {
        "model": "gpt-4o-mini",
        "temperature": 0.7,
        "openai_api_key": "test-key",
        "min_score_threshold": 0.5,
        "costs": {
            "enabled": True,
            "require_known_models": True,
            "models": {
                "gpt-4o-mini": {"input_per_1k": 0.00015, "output_per_1k": 0.0006}
            }
        }
    }


def test_pipeline_creation():
    """Test pipeline creation."""
    pipeline = AssemblyLinePipeline(name="TestPipeline")
    assert pipeline.name == "TestPipeline"
    assert len(pipeline.agents) == 0


def test_pipeline_add_agent(config):
    """Test adding agents to pipeline."""
    pipeline = AssemblyLinePipeline(name="TestPipeline")

    agent1 = PetAnalyzerAgent(config)
    agent2 = MonitoringAgent(config)

    pipeline.add_agent(agent1)
    pipeline.add_agent(agent2)

    assert len(pipeline.agents) == 2
    assert "PetAnalyzer" in pipeline.agents
    assert "Monitor" in pipeline.agents


def test_pipeline_build(config):
    """Test pipeline building."""
    pipeline = AssemblyLinePipeline(name="TestPipeline")

    agent1 = PetAnalyzerAgent(config)
    agent2 = MonitoringAgent(config)

    pipeline.add_agent(agent1)
    pipeline.add_agent(agent2)
    pipeline.build()

    assert pipeline.compiled_graph is not None


def test_workflow_builder(config):
    """Test workflow builder."""
    pipeline = WorkflowBuilder.build_analysis_workflow(config)

    assert pipeline.name == "AnalysisWorkflow"
    assert len(pipeline.agents) > 0


@pytest.mark.asyncio
async def test_pipeline_execution(config):
    """Test pipeline execution."""
    # This is a placeholder test
    # In production, you would mock the agents
    pipeline = WorkflowBuilder.build_analysis_workflow(config)

    # Would execute with mocked data
    # result = await pipeline.execute({"pet": sample_pet})
    # assert result["success"] is True
