"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.REDIS_PASSWORD = exports.REDIS_PORT = exports.REDIS_HOST = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
/**
 * Reads Redis (AWS ElastiCache) connection parameters from environment variables.
 *
 * Expected env vars:
 *   REDIS_HOST       e.g. "my-redis-cluster.xxxxxx.use1.cache.amazonaws.com"
 *   REDIS_PORT       e.g. "6379"
 *   REDIS_PASSWORD   e.g. "supersecretpassword"
 */
exports.REDIS_HOST = process.env.REDIS_HOST || "localhost";
exports.REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379", 10);
exports.REDIS_PASSWORD = process.env.REDIS_PASSWORD || "";
