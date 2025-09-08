"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheGet = cacheGet;
exports.cacheSet = cacheSet;
exports.cacheDelete = cacheDelete;
const redisClient_1 = require("./redisClient");
const KEY_PREFIX = "petswipe:";
async function cacheGet(key) {
    const fullKey = KEY_PREFIX + key;
    const raw = await redisClient_1.redisClient.get(fullKey);
    if (!raw)
        return null;
    try {
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
async function cacheSet(key, value, ttlSeconds) {
    const fullKey = KEY_PREFIX + key;
    const serialized = JSON.stringify(value);
    if (ttlSeconds && ttlSeconds > 0) {
        await redisClient_1.redisClient.set(fullKey, serialized, "EX", ttlSeconds);
    }
    else {
        await redisClient_1.redisClient.set(fullKey, serialized);
    }
}
async function cacheDelete(key) {
    const fullKey = KEY_PREFIX + key;
    await redisClient_1.redisClient.del(fullKey);
}
