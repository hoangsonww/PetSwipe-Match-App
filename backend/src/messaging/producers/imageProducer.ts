import { getRabbitChannel } from "../rabbitmq";
import { IMAGE_QUEUE_NAME } from "../../config/rabbitmq.config";

export interface ImageJobPayload {
  petId: string;
  s3Key: string;
  sizes: Array<{ width: number; height: number }>;
}

/**
 * Publishes an “image resize” job to RabbitMQ.
 * The consumer (e.g. Image Processor) will pick it up.
 */
export async function enqueueImageResizeJob(
  payload: ImageJobPayload,
): Promise<void> {
  const channel = await getRabbitChannel();
  // Ensure the queue exists (durable)
  await channel.assertQueue(IMAGE_QUEUE_NAME, { durable: true });
  // Send the message
  const buffer = Buffer.from(JSON.stringify(payload));
  channel.sendToQueue(IMAGE_QUEUE_NAME, buffer, { persistent: true });
}
