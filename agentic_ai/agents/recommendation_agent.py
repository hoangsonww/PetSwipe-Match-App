"""
Recommendation Agent
====================

Generates personalized pet recommendations using advanced AI algorithms,
collaborative filtering, and content-based filtering techniques.
"""

from typing import Dict, Any, List
from .base_agent import BaseAgent, AgentState
from langchain.prompts import ChatPromptTemplate
import json
from ..utils.llm import build_chat_llm


class RecommendationAgent(BaseAgent):
    """
    Agent responsible for generating personalized recommendations.

    Capabilities:
    - Generate personalized pet recommendations
    - Apply collaborative filtering
    - Explain recommendations
    - Diversify results
    """

    def __init__(self, config: Dict[str, Any]):
        super().__init__(
            name="Recommender",
            description="Generates personalized pet recommendations",
            config=config
        )

        self.llm = build_chat_llm(config, "recommendation", default_temperature=0.8)

        self.recommendation_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a pet recommendation expert. Generate personalized
            recommendations with detailed explanations. Consider user preferences,
            personality, lifestyle, and match scores. Return structured JSON with:
            { "recommendations": [ { "pet": {...}, "score": float, "reasons": [string] } ] }"""),
            ("human", "Generate recommendations for:\nUser: {user_data}\nMatches: {matches}")
        ])

        self.diversity_factor = config.get("diversity_factor", 0.3)

    async def process(self, state: AgentState) -> AgentState:
        """
        Process matches to generate personalized recommendations.

        Args:
            state: Current agent state with matches

        Returns:
            Updated state with recommendations
        """
        try:
            matches = state.data.get("matches", [])
            user_profile = state.data.get("user_profile", {})

            if not matches:
                state.add_error("No matches provided for recommendations")
                return state

            # Generate recommendations
            recommendations = await self._generate_recommendations(
                user_profile,
                matches
            )

            # Diversify recommendations
            diversified = self._diversify_recommendations(recommendations)

            # Add explanations
            explained = await self._add_explanations(user_profile, diversified)

            # Update state
            state.update_data("recommendations", explained)
            state.update_data("recommendation_count", len(explained))

            state.update_metadata("recommender_version", "1.0.0")
            state.update_metadata("recommendations_completed", True)

            self.logger.info(f"Generated {len(explained)} recommendations")

            return state

        except Exception as e:
            self.logger.error(f"Recommendation generation failed: {str(e)}")
            state.add_error(f"Recommendation error: {str(e)}")
            return state

    async def _generate_recommendations(
        self,
        user_profile: Dict[str, Any],
        matches: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Generate AI-powered recommendations.

        Args:
            user_profile: User profile data
            matches: List of matches

        Returns:
            List of recommendations
        """
        # Format data for LLM
        user_summary = {
            "preferences": user_profile.get("preferences", {}),
            "behavior": user_profile.get("swipe_analysis", {})
        }

        match_summary = [
            {
                "pet_name": m.get("pet", {}).get("name"),
                "pet_type": m.get("pet", {}).get("type"),
                "score": m.get("score"),
                "reasons": m.get("reasons")
            }
            for m in matches[:10]  # Top 10 matches
        ]

        messages = self.recommendation_prompt.format_messages(
            user_data=json.dumps(user_summary, indent=2),
            matches=json.dumps(match_summary, indent=2)
        )

        response = await self.llm.apredict_messages(messages)

        # Parse recommendations
        try:
            recommendations = json.loads(response.content)
            if isinstance(recommendations, dict):
                recommendations = recommendations.get("recommendations", [])
        except json.JSONDecodeError:
            # Fallback to matches if parsing fails
            recommendations = matches

        return recommendations

    def _diversify_recommendations(
        self,
        recommendations: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Diversify recommendations to avoid echo chamber effect.

        Args:
            recommendations: List of recommendations

        Returns:
            Diversified list
        """
        if not recommendations:
            return []

        diversified = []
        seen_types = set()

        # First pass: add diverse types
        for rec in recommendations:
            pet_type = rec.get("pet", {}).get("type", "Unknown")

            if pet_type not in seen_types or len(diversified) >= len(recommendations) * 0.7:
                diversified.append(rec)
                seen_types.add(pet_type)

        # Second pass: fill remaining slots with highest scores
        remaining = [r for r in recommendations if r not in diversified]
        remaining_sorted = sorted(remaining, key=lambda x: x.get("score", 0), reverse=True)

        diversified.extend(remaining_sorted[:max(0, len(recommendations) - len(diversified))])

        return diversified

    async def _add_explanations(
        self,
        user_profile: Dict[str, Any],
        recommendations: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Add detailed explanations to recommendations.

        Args:
            user_profile: User profile
            recommendations: List of recommendations

        Returns:
            Recommendations with explanations
        """
        explained = []

        for rec in recommendations:
            pet = rec.get("pet", {})
            score = rec.get("score", 0)

            explanation = {
                "pet_id": pet.get("id"),
                "pet_name": pet.get("name"),
                "pet_type": pet.get("type"),
                "score": score,
                "match_reasons": rec.get("reasons", []),
                "recommendation_strength": self._get_strength_label(score),
                "why_recommended": self._generate_why_text(user_profile, pet, score),
                "pet_highlights": pet.get("pet_analysis", {}).get("personality_traits", [])[:3]
            }

            explained.append(explanation)

        return explained

    def _get_strength_label(self, score: float) -> str:
        """Get recommendation strength label."""
        if score >= 0.9:
            return "Perfect Match"
        elif score >= 0.75:
            return "Excellent Match"
        elif score >= 0.6:
            return "Good Match"
        else:
            return "Potential Match"

    def _generate_why_text(
        self,
        user_profile: Dict[str, Any],
        pet: Dict[str, Any],
        score: float
    ) -> str:
        """Generate human-readable explanation."""
        preferred_types = user_profile.get("preferences", {}).get("pet_types", [])
        pet_type = pet.get("type", "")

        if pet_type in preferred_types:
            return f"Based on your love for {pet_type}s and this pet's wonderful personality, we think you'll be a great match!"
        elif score > 0.8:
            return f"While {pet.get('name')} might not be your usual type, the compatibility analysis shows exceptional potential!"
        else:
            return f"{pet.get('name')} has qualities that align well with your preferences and lifestyle."
