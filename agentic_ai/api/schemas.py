"""API schemas for Agentic AI service."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class PetProfile(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: Optional[str] = None
    name: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    shelterName: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class UserProfile(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    bio: Optional[str] = None
    age: Optional[int] = None


class SwipeRecord(BaseModel):
    model_config = ConfigDict(extra="allow")
    liked: bool
    pet: PetProfile


class PetAnalysisRequest(BaseModel):
    pet: PetProfile


class PetAnalysisResponse(BaseModel):
    analysis: Dict[str, Any]
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ProfileRequest(BaseModel):
    user: UserProfile
    swipe_history: List[SwipeRecord] = Field(default_factory=list)


class ProfileResponse(BaseModel):
    user_profile: Dict[str, Any]
    metadata: Dict[str, Any] = Field(default_factory=dict)


class MatchRequest(BaseModel):
    user: UserProfile
    swipe_history: List[SwipeRecord] = Field(default_factory=list)
    pet_candidates: List[PetProfile] = Field(default_factory=list)


class MatchResponse(BaseModel):
    matches: List[Dict[str, Any]]
    metadata: Dict[str, Any] = Field(default_factory=dict)


class RecommendationRequest(BaseModel):
    user: UserProfile
    swipe_history: List[SwipeRecord] = Field(default_factory=list)
    pet_candidates: List[PetProfile] = Field(default_factory=list)


class RecommendationResponse(BaseModel):
    recommendations: List[Dict[str, Any]]
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ChatRequest(BaseModel):
    message: str
    context: Dict[str, Any] = Field(default_factory=dict)


class ChatResponse(BaseModel):
    response: str
    conversation_history: List[Dict[str, Any]] = Field(default_factory=list)


class CostSummaryResponse(BaseModel):
    totals: Dict[str, Any]
    breakdown: Dict[str, Dict[str, float]]


class CostEntriesResponse(BaseModel):
    entries: List[Dict[str, Any]]
