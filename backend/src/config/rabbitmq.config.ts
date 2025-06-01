import dotenv from "dotenv";
dotenv.config();

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

export const RABBITMQ_HOST = process.env.RABBITMQ_HOST || "localhost";
export const RABBITMQ_PORT = parseInt(process.env.RABBITMQ_PORT || "5672", 10);
export const RABBITMQ_USERNAME = process.env.RABBITMQ_USERNAME || "guest";
export const RABBITMQ_PASSWORD = process.env.RABBITMQ_PASSWORD || "guest";

export const IMAGE_QUEUE_NAME = process.env.IMAGE_QUEUE_NAME || "resize-image";
export const EMAIL_QUEUE_NAME = process.env.EMAIL_QUEUE_NAME || "send-email";
