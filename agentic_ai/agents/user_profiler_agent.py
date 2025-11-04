"""
User Profiler Agent
===================

Analyzes user behavior, preferences, and history to build comprehensive user profiles
for improved pet matching and recommendations.
"""

from typing import Dict, Any, List
from .base_agent import BaseAgent, AgentState
from langchain.chat_models import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
import numpy as np


class UserProfilerAgent(BaseAgent):
    """
    Agent responsible for building and maintaining user profiles.

    Capabilities:
    - Analyze swipe history and patterns
    - Extract user preferences
    - Build behavioral profiles
    - Generate preference embeddings
    """

    def __init__(self, config: Dict[str, Any]):
        super().__init__(
            name="UserProfiler",
            description="Builds comprehensive user profiles from behavior and preferences",
            config=config
        )

        self.llm = ChatOpenAI(
            model=config.get("model", "gpt-4o-mini"),
            temperature=config.get("temperature", 0.5),
            api_key=config.get("openai_api_key")
        )

        self.profile_prompt = ChatPromptTemplate.from_messages([
            ("system", """Analyze user behavior and preferences to build a comprehensive profile.
            Consider swipe patterns, liked pets, time of day activity, and interaction frequency.
            Return structured JSON with user preferences and insights."""),
            ("human", "User data:\n{user_data}")
        ])

    async def process(self, state: AgentState) -> AgentState:
        """
        Process user data to build a comprehensive profile.

        Args:
            state: Current agent state with user data

        Returns:
            Updated state with user profile
        """
        try:
            user_data = state.data.get("user", {})
            swipe_history = state.data.get("swipe_history", [])

            if not user_data:
                state.add_error("No user data provided")
                return state

            # Analyze swipe patterns
            swipe_analysis = self._analyze_swipes(swipe_history)

            # Build preference profile
            preferences = await self._build_preferences(user_data, swipe_analysis)

            # Generate user embeddings
            embeddings = self._generate_embeddings(preferences)

            # Update state
            state.update_data("user_profile", {
                "preferences": preferences,
                "swipe_analysis": swipe_analysis,
                "embeddings": embeddings.tolist() if isinstance(embeddings, np.ndarray) else embeddings
            })

            state.update_metadata("profiler_version", "1.0.0")
            state.update_metadata("profile_completed", True)

            self.logger.info(f"Successfully profiled user: {user_data.get('id', 'Unknown')}")

            return state

        except Exception as e:
            self.logger.error(f"User profiling failed: {str(e)}")
            state.add_error(f"Profiling error: {str(e)}")
            return state

    def _analyze_swipes(self, swipe_history: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze user swipe patterns.

        Args:
            swipe_history: List of swipe records

        Returns:
            Swipe analysis dictionary
        """
        if not swipe_history:
            return {
                "total_swipes": 0,
                "like_ratio": 0.0,
                "preferred_types": [],
                "patterns": {}
            }

        total_swipes = len(swipe_history)
        likes = sum(1 for swipe in swipe_history if swipe.get("liked"))
        like_ratio = likes / total_swipes if total_swipes > 0 else 0

        # Analyze preferred pet types
        pet_types = {}
        for swipe in swipe_history:
            if swipe.get("liked"):
                pet_type = swipe.get("pet", {}).get("type", "Unknown")
                pet_types[pet_type] = pet_types.get(pet_type, 0) + 1

        preferred_types = sorted(pet_types.items(), key=lambda x: x[1], reverse=True)

        return {
            "total_swipes": total_swipes,
            "like_ratio": like_ratio,
            "preferred_types": [pt[0] for pt in preferred_types[:3]],
            "type_distribution": dict(preferred_types),
            "patterns": {
                "selective": like_ratio < 0.3,
                "open": like_ratio > 0.7,
                "balanced": 0.3 <= like_ratio <= 0.7
            }
        }

    async def _build_preferences(
        self,
        user_data: Dict[str, Any],
        swipe_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Build user preference profile using AI analysis.

        Args:
            user_data: User information
            swipe_analysis: Analyzed swipe patterns

        Returns:
            User preferences dictionary
        """
        formatted_data = f"""
        User ID: {user_data.get('id')}
        Bio: {user_data.get('bio', 'No bio')}
        Age: {user_data.get('age', 'Unknown')}
        Swipe Analysis: {swipe_analysis}
        """

        messages = self.profile_prompt.format_messages(user_data=formatted_data)
        response = await self.llm.apredict_messages(messages)

        # Parse response or use swipe analysis as fallback
        preferences = {
            "pet_types": swipe_analysis.get("preferred_types", []),
            "user_behavior": swipe_analysis.get("patterns", {}),
            "like_ratio": swipe_analysis.get("like_ratio", 0.0),
            "ai_insights": response.content
        }

        return preferences

    def _generate_embeddings(self, preferences: Dict[str, Any]) -> np.ndarray:
        """
        Generate user embeddings for similarity matching.

        Args:
            preferences: User preferences dictionary

        Returns:
            NumPy array of embeddings
        """
        # Simplified embedding generation
        # In production, use proper embedding models
        features = [
            preferences.get("like_ratio", 0.0),
            len(preferences.get("pet_types", [])),
            1.0 if preferences.get("user_behavior", {}).get("selective") else 0.0,
            1.0 if preferences.get("user_behavior", {}).get("open") else 0.0,
            1.0 if preferences.get("user_behavior", {}).get("balanced") else 0.0
        ]

        return np.array(features, dtype=np.float32)
