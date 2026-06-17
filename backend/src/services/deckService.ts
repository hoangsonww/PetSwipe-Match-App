import { AppUser } from "../entities/User";
import { DeckAudit } from "../entities/DeckAudit";
import { AppDataSource } from "../index";
import { findCandidatesForUser, getPetLikeRates, CandidateFilters } from "./candidateService";
import { getScoringWeights, getDiversityCaps, scorePet, ScoredPet } from "./scoringService";
import { applyDiversityConstraints, shuffleWithinTiers } from "./diversityService";
import { cacheGet, cacheSet } from "../cache/cacheService";

const deckAuditRepo = () => AppDataSource.getRepository(DeckAudit);

export interface DeckRequest {
  userId: string;
  limit?: number;
  filters?: CandidateFilters;
  strategy?: string;
}

export interface DeckResponse {
  items: DeckItem[];
  meta: {
    limit: number;
    generatedAt: string;
    strategy: string;
    totalCandidates?: number;
    cacheHit?: boolean;
  };
}

export interface DeckItem {
  id: string;
  name: string;
  type: string;
  ageMonths?: number;
  breed?: string;
  photoUrl?: string;
  shelterName?: string;
  shelterContact?: string;
  shelterAddress?: string;
  description?: string;
  score: number;
  rank: number;
  createdAt: string;
}

/**
 * Generate a personalized, diverse deck for a user
 */
export async function generateDeck(request: DeckRequest): Promise<DeckResponse> {
  const { userId, limit = 30, filters, strategy = "v1-rule-mmr" } = request;
  
  // Check cache first
  const cacheKey = `deck:${userId}`;
  const cached = await cacheGet<string[]>(cacheKey);
  
  if (cached && cached.length >= limit) {
    // Serve from cache
    const petIds = cached.slice(0, limit);
    const pets = await AppDataSource.getRepository("Pet")
      .createQueryBuilder("pet")
      .where("pet.id IN (:...ids)", { ids: petIds })
      .getMany();
    
    // Maintain order from cache
    const orderedPets = petIds.map(id => pets.find(p => p.id === id)).filter(Boolean) as any[];
    
    return {
      items: orderedPets.map((pet, index) => formatDeckItem(pet, 0.5, index + 1)),
      meta: {
        limit,
        generatedAt: new Date().toISOString(),
        strategy,
        cacheHit: true,
      },
    };
  }
  
  // Generate new deck
  const user = await AppDataSource.getRepository("AppUser").findOne({ where: { id: userId } });
  if (!user) {
    throw new Error("User not found");
  }
  
  // Step 1: Get candidates (broad filtered set)
  const candidateLimit = Math.min(300, Math.max(limit * 10, 100));
  const candidates = await findCandidatesForUser(userId, candidateLimit, filters);
  
  if (candidates.length === 0) {
    return {
      items: [],
      meta: {
        limit,
        generatedAt: new Date().toISOString(),
        strategy,
        totalCandidates: 0,
      },
    };
  }
  
  // Step 2: Get like rates for popularity scoring
  const petIds = candidates.map(p => p.id);
  const likeRates = await getPetLikeRates(petIds);
  
  // Step 3: Score each candidate
  const weights = await getScoringWeights();
  const scoredPets = candidates.map(pet => 
    scorePet(user as AppUser, pet, weights, likeRates.get(pet.id) || 0.3)
  );
  
  // Step 4: Apply diversity constraints
  const diversityCaps = await getDiversityCaps();
  const diversified = applyDiversityConstraints(scoredPets, diversityCaps);
  
  // Step 5: Final shuffle within tiers for unpredictability
  const finalDeck = shuffleWithinTiers(diversified, 5);
  
  // Step 6: Cache the full deck (store more than requested for future batches)
  const cacheSize = Math.min(finalDeck.length, limit * 3);
  const deckIds = finalDeck.slice(0, cacheSize).map(p => p.id);
  await cacheSet(cacheKey, deckIds, 600); // 10 minute TTL
  
  // Step 7: Audit logging
  await deckAuditRepo().save({
    user: user as AppUser,
    size: finalDeck.length,
    strategy,
    meta: {
      candidatesFound: candidates.length,
      weights,
      diversityCaps,
    },
  });
  
  // Step 8: Format response
  const items = finalDeck.slice(0, limit).map((pet, index) => 
    formatDeckItem(pet, pet.score, index + 1)
  );
  
  return {
    items,
    meta: {
      limit,
      generatedAt: new Date().toISOString(),
      strategy,
      totalCandidates: candidates.length,
      cacheHit: false,
    },
  };
}

/**
 * Format a pet for deck response
 */
function formatDeckItem(pet: ScoredPet, score: number, rank: number): DeckItem {
  return {
    id: pet.id,
    name: pet.name,
    type: pet.type,
    ageMonths: pet.ageMonths,
    breed: pet.approxBreed || undefined,
    photoUrl: pet.photoUrl || undefined,
    shelterName: pet.shelterName || undefined,
    shelterContact: pet.shelterContact || undefined,
    shelterAddress: pet.shelterAddress || undefined,
    description: pet.description || undefined,
    score: Math.round(score * 100) / 100,
    rank,
    createdAt: pet.createdAt.toISOString(),
  };
}

/**
 * Remove pet from user's cached deck (called after swipe)
 */
export async function removePetFromDeck(userId: string, petId: string): Promise<void> {
  const cacheKey = `deck:${userId}`;
  const cached = await cacheGet<string[]>(cacheKey);
  
  if (cached) {
    const filtered = cached.filter(id => id !== petId);
    if (filtered.length !== cached.length) {
      await cacheSet(cacheKey, filtered, 600);
    }
  }
}

/**
 * Clear user's deck cache (for testing or manual refresh)
 */
export async function clearUserDeck(userId: string): Promise<void> {
  const cacheKey = `deck:${userId}`;
  await cacheSet(cacheKey, [], 1); // Set to expire quickly
}