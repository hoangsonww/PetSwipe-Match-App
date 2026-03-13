import { AppDataSource } from "../index";
import { RankingConfig } from "../entities/RankingConfig";
import { Pet } from "../entities/Pet";
import { AppUser } from "../entities/User";
import { Swipe } from "../entities/Swipe";

const configRepo = () => AppDataSource.getRepository(RankingConfig);

// Default scoring weights
const DEFAULT_WEIGHTS = {
  w_type: 0.3,
  w_age: 0.2, 
  w_breed: 0.15,
  w_recency: 0.1,
  w_pop: 0.15,
  w_coldstart: 0.1,
};

// Default diversity caps
const DEFAULT_DIVERSITY_CAPS = {
  maxPerShelter: 3,
  maxConsecutiveSameType: 2,
  windowSize: 20,
};

export interface ScoringWeights {
  w_type: number;
  w_age: number;
  w_breed: number;
  w_recency: number;
  w_pop: number;
  w_coldstart: number;
}

export interface DiversityCaps {
  maxPerShelter: number;
  maxConsecutiveSameType: number;
  windowSize: number;
}

export async function getScoringWeights(): Promise<ScoringWeights> {
  try {
    const config = await configRepo().findOne({ where: { key: "scoring_weights" } });
    return config?.value || DEFAULT_WEIGHTS;
  } catch (error) {
    return DEFAULT_WEIGHTS;
  }
}

export async function getDiversityCaps(): Promise<DiversityCaps> {
  try {
    const config = await configRepo().findOne({ where: { key: "diversity_caps" } });
    return config?.value || DEFAULT_DIVERSITY_CAPS;
  } catch (error) {
    return DEFAULT_DIVERSITY_CAPS;
  }
}

export async function updateScoringWeights(weights: ScoringWeights): Promise<void> {
  await configRepo().save({
    key: "scoring_weights",
    value: weights,
  });
}

export async function updateDiversityCaps(caps: DiversityCaps): Promise<void> {
  await configRepo().save({
    key: "diversity_caps", 
    value: caps,
  });
}

export interface ScoredPet extends Pet {
  score: number;
  scoreComponents?: {
    type: number;
    age: number;
    breed: number;
    recency: number;
    popularity: number;
    coldstart: number;
  };
}

/**
 * Calculate match score for pet type preference
 */
function matchType(user: AppUser, pet: Pet): number {
  // For now, simple preference based on user's past swipes
  // Could be enhanced with explicit user preferences
  return 0.5; // Neutral score, can be improved with user preferences
}

/**
 * Calculate match score for pet age preference 
 */
function matchAge(user: AppUser, pet: Pet): number {
  if (!pet.ageMonths) return 0.3;
  
  // Prefer pets between 6 months to 5 years (peak adoption range)
  const idealMin = 6;
  const idealMax = 60;
  
  if (pet.ageMonths >= idealMin && pet.ageMonths <= idealMax) {
    return 1.0;
  } else if (pet.ageMonths < idealMin) {
    return 0.7; // Young pets are still desirable
  } else {
    // Senior pets, scale down gradually
    return Math.max(0.2, 1.0 - (pet.ageMonths - idealMax) / 120);
  }
}

/**
 * Calculate match score for breed preference
 */
function matchBreed(user: AppUser, pet: Pet): number {
  // For now, slight preference for mixed breeds (often healthier)
  if (!pet.approxBreed) return 0.4;
  
  const breed = pet.approxBreed.toLowerCase();
  if (breed.includes('mix') || breed.includes('mixed')) {
    return 0.7;
  }
  
  return 0.5; // Neutral for specific breeds
}

/**
 * Calculate recency boost for newly added pets
 */
function recencyBoost(createdAt: Date): number {
  const now = new Date();
  const daysSinceCreated = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  
  // Boost new pets added in the last 7 days
  if (daysSinceCreated <= 1) return 1.0;
  if (daysSinceCreated <= 3) return 0.8;
  if (daysSinceCreated <= 7) return 0.6;
  
  return 0.3;
}

/**
 * Calculate popularity boost based on like rate
 * TODO: Implement proper like rate calculation from swipes
 */
function popBoost(likeRate: number): number {
  return Math.min(1.0, Math.max(0.1, likeRate));
}

/**
 * Calculate cold start boost for new users
 */
function coldStartBoost(user: AppUser): number {
  const now = new Date();
  const daysSinceJoined = (now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  
  // Boost variety for users who joined in the last 30 days
  if (daysSinceJoined <= 7) return 1.0;
  if (daysSinceJoined <= 14) return 0.8;
  if (daysSinceJoined <= 30) return 0.6;
  
  return 0.3;
}

/**
 * Score a single pet for a given user
 */
export function scorePet(user: AppUser, pet: Pet, weights: ScoringWeights, likeRate: number = 0.3): ScoredPet {
  const components = {
    type: matchType(user, pet),
    age: matchAge(user, pet),
    breed: matchBreed(user, pet),
    recency: recencyBoost(pet.createdAt),
    popularity: popBoost(likeRate),
    coldstart: coldStartBoost(user),
  };
  
  const score = 
    weights.w_type * components.type +
    weights.w_age * components.age +
    weights.w_breed * components.breed +
    weights.w_recency * components.recency +
    weights.w_pop * components.popularity +
    weights.w_coldstart * components.coldstart;

  return {
    ...pet,
    score,
    scoreComponents: components,
  };
}