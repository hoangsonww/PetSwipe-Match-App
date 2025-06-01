import { redisClient } from "./redisClient";

const KEY_PREFIX = "petswipe:";

export async function cacheGet<T = any>(key: string): Promise<T | null> {
  const fullKey = KEY_PREFIX + key;
  const raw = await redisClient.get(fullKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: any,
  ttlSeconds?: number
): Promise<void> {
  const fullKey = KEY_PREFIX + key;
  const serialized = JSON.stringify(value);
  if (ttlSeconds && ttlSeconds > 0) {
    await redisClient.set(fullKey, serialized, "EX", ttlSeconds);
  } else {
    await redisClient.set(fullKey, serialized);
  }
}

export async function cacheDelete(key: string): Promise<void> {
  const fullKey = KEY_PREFIX + key;
  await redisClient.del(fullKey);
}
