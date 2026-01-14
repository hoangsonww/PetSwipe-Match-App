import { AppDataSource } from "../index";
import { Pet } from "../entities/Pet";
import { AppUser } from "../entities/User";

const petRepo = () => AppDataSource.getRepository(Pet);

export interface CandidateFilters {
  petType?: string;
  minAgeMonths?: number;
  maxAgeMonths?: number;
  maxDistance?: number; // For future location-based filtering
}

/**
 * Find candidate pets for a user, excluding those already swiped
 * Returns up to N candidates suitable for scoring
 */
export async function findCandidatesForUser(
  userId: string, 
  limit: number = 300,
  filters?: CandidateFilters
): Promise<Pet[]> {
  
  const queryBuilder = petRepo()
    .createQueryBuilder("pet")
    .leftJoin("pet.swipes", "swipe", "swipe.userId = :userId", { userId })
    .where("swipe.id IS NULL") // Exclude already swiped pets
    .andWhere("pet.isDeleted = false") // Exclude soft deleted
    .andWhere("pet.adoptableStatus = :status", { status: "available" }) // Only adoptable pets
    .orderBy("pet.createdAt", "DESC") // Prefer newer pets for diversity
    .limit(limit);

  // Apply optional filters
  if (filters?.petType) {
    queryBuilder.andWhere("LOWER(pet.type) = LOWER(:petType)", { petType: filters.petType });
  }
  
  if (filters?.minAgeMonths !== undefined) {
    queryBuilder.andWhere("pet.ageMonths >= :minAge", { minAge: filters.minAgeMonths });
  }
  
  if (filters?.maxAgeMonths !== undefined) {
    queryBuilder.andWhere("pet.ageMonths <= :maxAge", { maxAge: filters.maxAgeMonths });
  }

  return await queryBuilder.getMany();
}

/**
 * Get like rate statistics for pets (for popularity scoring)
 */
export async function getPetLikeRates(petIds: string[]): Promise<Map<string, number>> {
  if (petIds.length === 0) return new Map();
  
  const results = await AppDataSource
    .getRepository("Swipe")
    .createQueryBuilder("swipe")
    .select([
      "swipe.petId",
      "COUNT(*) as total_swipes",
      "COUNT(CASE WHEN swipe.liked = true THEN 1 END) as liked_swipes"
    ])
    .where("swipe.petId IN (:...petIds)", { petIds })
    .groupBy("swipe.petId")
    .getRawMany();

  const likeRates = new Map<string, number>();
  
  results.forEach((result: any) => {
    const total = parseInt(result.total_swipes) || 0;
    const liked = parseInt(result.liked_swipes) || 0;
    const rate = total > 0 ? liked / total : 0.3; // Default rate for pets with no swipes
    likeRates.set(result.swipe_petId, rate);
  });

  // Set default rate for pets not in results
  petIds.forEach(petId => {
    if (!likeRates.has(petId)) {
      likeRates.set(petId, 0.3);
    }
  });

  return likeRates;
}