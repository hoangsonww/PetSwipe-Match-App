"""
Matching Agent
==============

Performs intelligent matching between users and pets using AI-powered
similarity scoring and compatibility analysis.
"""

from typing import Dict, Any, List, Tuple
from .base_agent import BaseAgent, AgentState
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity


class MatchingAgent(BaseAgent):
    """
    Agent responsible for matching users with pets.

    Capabilities:
    - Calculate compatibility scores
    - Perform semantic matching
    - Apply business rules and filters
    - Rank potential matches
    """

    def __init__(self, config: Dict[str, Any]):
        super().__init__(
            name="Matcher",
            description="Performs intelligent user-pet matching",
            config=config
        )

        agent_cfg = config.get("agents", {}).get("matching", {})
        self.min_score_threshold = agent_cfg.get("min_score_threshold", 0.5)
        self.max_matches = agent_cfg.get("max_matches", 20)
        self.randomness_weight = agent_cfg.get("randomness_weight", 0.1)

    async def process(self, state: AgentState) -> AgentState:
        """
        Process matching between user profile and available pets.

        Args:
            state: Current agent state with user profile and pet candidates

        Returns:
            Updated state with match results
        """
        try:
            user_profile = state.data.get("user_profile", {})
            pet_candidates = state.data.get("pet_candidates", [])

            if not user_profile:
                state.add_error("No user profile provided")
                return state

            if not pet_candidates:
                state.add_error("No pet candidates provided")
                return state

            # Perform matching
            matches = await self._match_pets(user_profile, pet_candidates)

            # Filter and rank matches
            filtered_matches = self._filter_matches(matches)
            ranked_matches = self._rank_matches(filtered_matches)

            # Update state
            state.update_data("matches", ranked_matches[:self.max_matches])
            state.update_data("total_candidates", len(pet_candidates))
            state.update_data("qualified_matches", len(filtered_matches))

            state.update_metadata("matcher_version", "1.0.0")
            state.update_metadata("matching_completed", True)

            self.logger.info(f"Found {len(ranked_matches)} matches for user")

            return state

        except Exception as e:
            self.logger.error(f"Matching failed: {str(e)}")
            state.add_error(f"Matching error: {str(e)}")
            return state

    async def _match_pets(
        self,
        user_profile: Dict[str, Any],
        pet_candidates: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Match user profile against pet candidates.

        Args:
            user_profile: User profile data
            pet_candidates: List of pet candidates with analysis

        Returns:
            List of matches with scores
        """
        matches = []
        for pet in pet_candidates:
            # Calculate compatibility score
            score = self._calculate_compatibility(user_profile, pet)

            # Add to matches
            matches.append({
                "pet": pet,
                "score": score,
                "reasons": self._get_match_reasons(user_profile, pet, score)
            })

        return matches

    def _calculate_compatibility(
        self,
        user_profile: Dict[str, Any],
        pet: Dict[str, Any]
    ) -> float:
        """
        Calculate compatibility score between user and pet.

        Args:
            user_profile: User profile data
            pet: Pet data with analysis

        Returns:
            Compatibility score between 0 and 1
        """
        scores = []

        # Type preference match
        preferred_types = user_profile.get("preferences", {}).get("pet_types", [])
        pet_type = pet.get("type", "")
        type_score = 1.0 if pet_type in preferred_types else 0.5
        scores.append(type_score * 0.4)  # 40% weight

        # Personality match (if available)
        user_behavior = user_profile.get("preferences", {}).get("user_behavior", {})
        pet_traits = pet.get("pet_analysis", {}).get("personality_traits", [])

        if user_behavior.get("selective") and "calm" in pet_traits:
            scores.append(0.8 * 0.3)  # 30% weight
        elif user_behavior.get("open"):
            scores.append(0.9 * 0.3)
        else:
            scores.append(0.6 * 0.3)

        # Care requirements match
        care_requirements = pet.get("pet_analysis", {}).get("care_requirements", [])
        care_score = 1.0 if len(care_requirements) <= 3 else 0.7
        scores.append(care_score * 0.2)  # 20% weight

        # Random factor for variety
        if self.randomness_weight > 0:
            seed_source = str(user_profile.get("id") or user_profile.get("email") or "")
            seed = abs(hash(seed_source + str(pet.get("id", "")))) % (2**32)
            rng = np.random.default_rng(seed)
            scores.append(rng.uniform(0.5, 1.0) * self.randomness_weight)

        return sum(scores)

    def _filter_matches(self, matches: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Filter matches based on minimum threshold.

        Args:
            matches: List of matches with scores

        Returns:
            Filtered list of matches
        """
        return [
            match for match in matches
            if match["score"] >= self.min_score_threshold
        ]

    def _rank_matches(self, matches: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Rank matches by score.

        Args:
            matches: List of matches

        Returns:
            Sorted list of matches
        """
        return sorted(matches, key=lambda x: x["score"], reverse=True)

    def _get_match_reasons(
        self,
        user_profile: Dict[str, Any],
        pet: Dict[str, Any],
        score: float
    ) -> List[str]:
        """
        Generate human-readable match reasons.

        Args:
            user_profile: User profile
            pet: Pet data
            score: Compatibility score

        Returns:
            List of match reasons
        """
        reasons = []

        preferred_types = user_profile.get("preferences", {}).get("pet_types", [])
        if pet.get("type") in preferred_types:
            reasons.append(f"You love {pet.get('type')}s!")

        if score > 0.8:
            reasons.append("Excellent compatibility match")
        elif score > 0.6:
            reasons.append("Good compatibility match")

        pet_traits = pet.get("pet_analysis", {}).get("personality_traits", [])
        if pet_traits:
            reasons.append(f"Personality: {', '.join(pet_traits[:2])}")

        return reasons
