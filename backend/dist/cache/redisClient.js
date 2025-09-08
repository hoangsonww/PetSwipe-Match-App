"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisClient = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const redis_config_1 = require("../config/redis.config");
// Create a single shared Redis client
exports.redisClient = new ioredis_1.default({
    host: redis_config_1.REDIS_HOST,
    port: redis_config_1.REDIS_PORT,
    password: redis_config_1.REDIS_PASSWORD || undefined,
    tls: redis_config_1.REDIS_PASSWORD ? {} : undefined, // If ElastiCache is in TLS mode
});
exports.redisClient.on("connect", () => {
    console.log(`[Redis] Connected to ${redis_config_1.REDIS_HOST}:${redis_config_1.REDIS_PORT}`);
});
exports.redisClient.on("error", (err) => {
    console.error("[Redis] Error:", err);
});
