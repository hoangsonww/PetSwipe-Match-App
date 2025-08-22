"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMAIL_QUEUE_NAME = exports.IMAGE_QUEUE_NAME = exports.RABBITMQ_PASSWORD = exports.RABBITMQ_USERNAME = exports.RABBITMQ_PORT = exports.RABBITMQ_HOST = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
/**
 * Reads RabbitMQ connection parameters from environment variables.
 *
 * Expected env vars:
 *   RABBITMQ_HOST       e.g. "rabbitmq-cluster.xxxxxx.use1.cache.amazonaws.com"
 *   RABBITMQ_PORT       e.g. "5672"
 *   RABBITMQ_USERNAME   e.g. "petswipe_user"
 *   RABBITMQ_PASSWORD   e.g. "supersecret"
 *   IMAGE_QUEUE_NAME    e.g. "resize-image-queue"
 */
exports.RABBITMQ_HOST = process.env.RABBITMQ_HOST || "localhost";
exports.RABBITMQ_PORT = parseInt(process.env.RABBITMQ_PORT || "5672", 10);
exports.RABBITMQ_USERNAME = process.env.RABBITMQ_USERNAME || "guest";
exports.RABBITMQ_PASSWORD = process.env.RABBITMQ_PASSWORD || "guest";
exports.IMAGE_QUEUE_NAME = process.env.IMAGE_QUEUE_NAME || "resize-image";
exports.EMAIL_QUEUE_NAME = process.env.EMAIL_QUEUE_NAME || "send-email";
