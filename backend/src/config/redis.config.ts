import dotenv from "dotenv";
dotenv.config();

/**
 * Reads Redis (AWS ElastiCache) connection parameters from environment variables.
 *
 * Expected env vars:
 *   REDIS_HOST       e.g. "my-redis-cluster.xxxxxx.use1.cache.amazonaws.com"
 *   REDIS_PORT       e.g. "6379"
 *   REDIS_PASSWORD   e.g. "supersecretpassword"
 */

export const REDIS_HOST = process.env.REDIS_HOST || "localhost";
export const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379", 10);
export const REDIS_PASSWORD = process.env.REDIS_PASSWORD || "";
