"""
Pet Analyzer Agent
==================

Analyzes pet profiles, extracts features, and enriches pet data
using AI-powered analysis and natural language processing.
"""

from typing import Dict, Any
from .base_agent import BaseAgent, AgentState
from langchain.prompts import ChatPromptTemplate
from langchain.schema import SystemMessage
import json
from ..utils.llm import build_chat_llm


class PetAnalyzerAgent(BaseAgent):
    """
    Agent responsible for analyzing and enriching pet data.

    Capabilities:
    - Extract key features from pet descriptions
    - Analyze personality traits
    - Generate compatibility scores
    - Enrich metadata with AI insights
    """

    def __init__(self, config: Dict[str, Any]):
        super().__init__(
            name="PetAnalyzer",
            description="Analyzes pet profiles and extracts intelligent features",
            config=config
        )

        # Initialize LangChain LLM
        self.llm = build_chat_llm(config, "pet_analyzer", default_temperature=0.7)

        # Define analysis prompt template
        self.analysis_prompt = ChatPromptTemplate.from_messages([
            SystemMessage(content="""You are an expert pet analyst. Analyze pet profiles
            and extract key features including personality traits, care requirements,
            compatibility factors, and behavioral characteristics. Return structured JSON.

            Required JSON keys:
            - personality_traits (list of strings)
            - care_requirements (list of strings)
            - compatibility_factors (list of strings)
            - summary (string)
            """),
            ("human", "Analyze this pet profile:\n{pet_data}")
        ])

    async def process(self, state: AgentState) -> AgentState:
        """
        Process pet data through AI analysis.

        Args:
            state: Current agent state with pet data

        Returns:
            Updated state with analyzed pet features
        """
        try:
            pet_data = state.data.get("pet", {})

            if not pet_data:
                state.add_error("No pet data provided")
                return state

            # Prepare pet data for analysis
            pet_description = self._format_pet_data(pet_data)

            # Perform AI analysis
            analysis_result = await self._analyze_pet(pet_description)

            # Update state with analysis results
            state.update_data("pet_analysis", analysis_result)
            state.update_metadata("analyzer_version", "1.0.0")
            state.update_metadata("analysis_completed", True)

            self.logger.info(f"Successfully analyzed pet: {pet_data.get('name', 'Unknown')}")

            return state

        except Exception as e:
            self.logger.error(f"Pet analysis failed: {str(e)}")
            state.add_error(f"Analysis error: {str(e)}")
            return state

    async def _analyze_pet(self, pet_description: str) -> Dict[str, Any]:
        """
        Perform AI-powered pet analysis.

        Args:
            pet_description: Formatted pet data string

        Returns:
            Analysis results dictionary
        """
        # Format the prompt
        messages = self.analysis_prompt.format_messages(pet_data=pet_description)

        # Get LLM response
        response = await self.llm.apredict_messages(messages)

        # Parse the response
        try:
            analysis = json.loads(response.content)
        except json.JSONDecodeError:
            # Fallback to raw text if JSON parsing fails
            analysis = {
                "raw_analysis": response.content,
                "personality_traits": [],
                "care_requirements": [],
                "compatibility_factors": []
            }

        return analysis

    def _format_pet_data(self, pet_data: Dict[str, Any]) -> str:
        """
        Format pet data for LLM analysis.

        Args:
            pet_data: Raw pet data dictionary

        Returns:
            Formatted string representation
        """
        return f"""
        Name: {pet_data.get('name', 'Unknown')}
        Type: {pet_data.get('type', 'Unknown')}
        Description: {pet_data.get('description', 'No description available')}
        Shelter: {pet_data.get('shelterName', 'Unknown')}
        Additional Info: {json.dumps(pet_data.get('metadata', {}), indent=2)}
        """

    async def batch_analyze(self, pets: list[Dict[str, Any]]) -> list[Dict[str, Any]]:
        """
        Analyze multiple pets in batch.

        Args:
            pets: List of pet data dictionaries

        Returns:
            List of analysis results
        """
        results = []

        for pet in pets:
            state = AgentState(
                agent_name=self.name,
                timestamp=None,
                data={"pet": pet},
                metadata={},
                errors=[]
            )

            analyzed_state = await self.process(state)
            results.append(analyzed_state.data)

        return results
