"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserById = getUserById;
exports.updateUserProfile = updateUserProfile;
const typeorm_1 = require("typeorm");
const User_1 = require("../entities/User");
const cacheService_1 = require("../cache/cacheService");
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
async function getUserById(userId) {
    const cacheKey = `user:${userId}`;
    // 1) Try cache
    const cached = await (0, cacheService_1.cacheGet)(cacheKey);
    if (cached) {
        console.log(`[UserService] Returning cached data for user ${userId}`);
        return cached;
    }
    // 2) Otherwise, fetch from DB
    const userRepo = (0, typeorm_1.getRepository)(User_1.AppUser);
    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user)
        return null;
    // 3) Store in Redis for next time
    await (0, cacheService_1.cacheSet)(cacheKey, user, USER_CACHE_TTL);
    return user;
}
/**
 * Updates a user’s profile and invalidates the cache.
 */
async function updateUserProfile(userId, updates) {
    const userRepo = (0, typeorm_1.getRepository)(User_1.AppUser);
    let user = await userRepo.findOne({ where: { id: userId } });
    if (!user)
        throw new Error(`User ${userId} not found`);
    Object.assign(user, updates);
    user = await userRepo.save(user);
    // Invalidate cache
    await (0, cacheService_1.cacheDelete)(`user:${userId}`);
    // Cache new value
    await (0, cacheService_1.cacheSet)(`user:${userId}`, user, USER_CACHE_TTL);
    return user;
}
