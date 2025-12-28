import { ScoredPet, DiversityCaps } from "./scoringService";

/**
 * Apply diversity constraints using MMR (Maximal Marginal Relevance) approach
 * Ensures variety by type, shelter, and breed within windows
 */
export function applyDiversityConstraints(
  scoredPets: ScoredPet[], 
  caps: DiversityCaps
): ScoredPet[] {
  
  if (scoredPets.length === 0) return [];
  
  // Sort by score initially
  const candidates = [...scoredPets].sort((a, b) => b.score - a.score);
  const result: ScoredPet[] = [];
  
  // Track diversity metrics for the current window
  const getWindowCounts = (windowSize: number) => {
    const window = result.slice(-windowSize);
    const shelterCounts = new Map<string, number>();
    const typeCounts = new Map<string, number>();
    
    window.forEach(pet => {
      const shelter = pet.shelterName || 'unknown';
      const type = pet.type;
      shelterCounts.set(shelter, (shelterCounts.get(shelter) || 0) + 1);
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
    });
    
    return { shelterCounts, typeCounts };
  };
  
  for (const candidate of candidates) {
    const shelterName = candidate.shelterName || 'unknown';
    const petType = candidate.type;
    
    // Check constraints within the current window
    const { shelterCounts, typeCounts } = getWindowCounts(caps.windowSize);
    
    // Shelter constraint: no more than maxPerShelter in current window
    const currentShelterCount = shelterCounts.get(shelterName) || 0;
    if (currentShelterCount >= caps.maxPerShelter) {
      continue; // Skip this pet
    }
    
    // Consecutive type constraint: check recent additions
    const recentPets = result.slice(-caps.maxConsecutiveSameType);
    if (recentPets.length >= caps.maxConsecutiveSameType && 
        recentPets.every(p => p.type === petType)) {
      continue; // Skip to avoid too many consecutive same types
    }
    
    // Add the pet
    result.push(candidate);
  }
  
  return result;
}

/**
 * Simple shuffle for final randomization within score tiers
 */
export function shuffleWithinTiers(pets: ScoredPet[], tierSize: number = 5): ScoredPet[] {
  if (pets.length <= tierSize) {
    return shuffleArray(pets);
  }
  
  const result: ScoredPet[] = [];
  
  for (let i = 0; i < pets.length; i += tierSize) {
    const tier = pets.slice(i, i + tierSize);
    result.push(...shuffleArray(tier));
  }
  
  return result;
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}