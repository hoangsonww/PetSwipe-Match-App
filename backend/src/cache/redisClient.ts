import Redis from "ioredis";
import { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD } from "../config/redis.config";

// Create a single shared Redis client
export const redisClient = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD || undefined,
  tls: REDIS_PASSWORD ? {} : undefined, // If ElastiCache is in TLS mode
});

redisClient.on("connect", () => {
  console.log(`[Redis] Connected to ${REDIS_HOST}:${REDIS_PORT}`);
});

redisClient.on("error", (err: any) => {
  console.error("[Redis] Error:", err);
});
