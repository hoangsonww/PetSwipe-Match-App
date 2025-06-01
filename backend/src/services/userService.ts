import { getRepository } from "typeorm";
import { AppUser } from "../entities/User";
import { cacheGet, cacheSet, cacheDelete } from "../cache/cacheService";

/**
 * userService.ts
 *
 * Example of using Redis as a cache for user profiles.
 */

// TTL for cached user profiles (in seconds)
const USER_CACHE_TTL = 300; // 5 minutes

/**
 * Fetches a user by ID, using Redis as a cache.
 */
export async function getUserById(userId: string): Promise<AppUser | null> {
  const cacheKey = `user:${userId}`;
  // 1) Try cache
  const cached = await cacheGet<AppUser>(cacheKey);
  if (cached) {
    console.log(`[UserService] Returning cached data for user ${userId}`);
    return cached;
  }

  // 2) Otherwise, fetch from DB
  const userRepo = getRepository(AppUser);
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) return null;

  // 3) Store in Redis for next time
  await cacheSet(cacheKey, user, USER_CACHE_TTL);
  return user;
}

/**
 * Updates a user’s profile and invalidates the cache.
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<AppUser>,
): Promise<AppUser> {
  const userRepo = getRepository(AppUser);
  let user = await userRepo.findOne({ where: { id: userId } });
  if (!user) throw new Error(`User ${userId} not found`);

  Object.assign(user, updates);
  user = await userRepo.save(user);

  // Invalidate cache
  await cacheDelete(`user:${userId}`);
  // Cache new value
  await cacheSet(`user:${userId}`, user, USER_CACHE_TTL);

  return user;
}
