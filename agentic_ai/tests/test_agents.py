"""
Test cases for agents.
"""

import pytest
from agentic_ai.agents import PetAnalyzerAgent, UserProfilerAgent
from agentic_ai.agents.base_agent import AgentState
from datetime import datetime


@pytest.fixture
def config():
    """Test configuration."""
    return {
        "model": "gpt-4o-mini",
        "temperature": 0.7,
        "openai_api_key": "test-key",
        "costs": {
            "enabled": True,
            "require_known_models": True,
            "models": {
                "gpt-4o-mini": {"input_per_1k": 0.00015, "output_per_1k": 0.0006}
            }
        }
    }


@pytest.fixture
def sample_pet():
    """Sample pet data."""
    return {
        "id": "pet-123",
        "name": "Buddy",
        "type": "Dog",
        "description": "Friendly golden retriever",
        "shelterName": "Happy Paws Shelter"
    }


@pytest.fixture
def sample_user():
    """Sample user data."""
    return {
        "id": "user-123",
        "email": "user@example.com",
        "bio": "I love dogs"
    }


def test_agent_state_creation():
    """Test agent state creation."""
    state = AgentState(
        agent_name="TestAgent",
        timestamp=datetime.now(),
        data={"key": "value"},
        metadata={},
        errors=[]
    )

    assert state.agent_name == "TestAgent"
    assert state.data["key"] == "value"
    assert len(state.errors) == 0


def test_agent_state_update():
    """Test agent state updates."""
    state = AgentState(
        agent_name="TestAgent",
        timestamp=datetime.now(),
        data={},
        metadata={},
        errors=[]
    )

    state.update_data("new_key", "new_value")
    state.update_metadata("meta_key", "meta_value")
    state.add_error("test error")

    assert state.data["new_key"] == "new_value"
    assert state.metadata["meta_key"] == "meta_value"
    assert len(state.errors) == 1


@pytest.mark.asyncio
async def test_pet_analyzer_agent(config, sample_pet):
    """Test pet analyzer agent."""
    # This is a placeholder test
    # In production, you would mock the OpenAI API
    agent = PetAnalyzerAgent(config)
    assert agent.name == "PetAnalyzer"


@pytest.mark.asyncio
async def test_user_profiler_agent(config, sample_user):
    """Test user profiler agent."""
    # This is a placeholder test
    # In production, you would mock the OpenAI API
    agent = UserProfilerAgent(config)
    assert agent.name == "UserProfiler"
