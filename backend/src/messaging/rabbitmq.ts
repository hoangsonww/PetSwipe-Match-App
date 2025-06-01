import amqp, { Connection, Channel } from "amqplib";
import {
  RABBITMQ_HOST,
  RABBITMQ_PORT,
  RABBITMQ_USERNAME,
  RABBITMQ_PASSWORD,
} from "../config/rabbitmq.config";

let connection: Connection | null = null;
let channel: Channel | null = null;

/**
 * Establishes a connection to RabbitMQ and creates a single channel.
 * Subsequent calls return the same channel.
 */
export async function getRabbitChannel(): Promise<Channel> {
  if (channel) return channel;

  const url = `amqp://${RABBITMQ_USERNAME}:${RABBITMQ_PASSWORD}@${RABBITMQ_HOST}:${RABBITMQ_PORT}`;
  // @ts-ignore
  connection = await amqp.connect(url);
  // @ts-ignore
  channel = await connection?.createChannel();
  if (!channel) {
    throw new Error("Failed to create RabbitMQ channel");
  }
  return channel;
}

/**
 * Closes RabbitMQ connection (for graceful shutdown).
 */
export async function closeRabbitConnection(): Promise<void> {
  try {
    if (channel) {
      await channel.close();
      channel = null;
    }
    if (connection) {
      // @ts-ignore
      await connection.close();
      connection = null;
    }
  } catch (err) {
    console.error("Error closing RabbitMQ connection:", err);
  }
}
