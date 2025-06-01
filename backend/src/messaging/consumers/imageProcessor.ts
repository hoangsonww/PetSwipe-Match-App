import { getRabbitChannel } from "../rabbitmq";
import { IMAGE_QUEUE_NAME } from "../../config/rabbitmq.config";
import AWS from "aws-sdk";
import sharp from "sharp";

AWS.config.update({ region: process.env.AWS_REGION || "us-east-1" });
const s3 = new AWS.S3();

/**
 * Pulls messages from the “resize-image” queue and processes them:
 * 1) Downloads the original image from S3
 * 2) Uses sharp to resize for each requested size
 * 3) Uploads resized images back to S3 under a “thumbnails/” prefix
 * 4) Acknowledges the message
 */
export async function startImageProcessor(): Promise<void> {
  const channel = await getRabbitChannel();
  await channel.assertQueue(IMAGE_QUEUE_NAME, { durable: true });
  // Prefetch 1 at a time
  channel.prefetch(1);

  console.log(`[ImageProcessor] Waiting for messages in ${IMAGE_QUEUE_NAME}...`);
  channel.consume(
    IMAGE_QUEUE_NAME,
    async (msg) => {
      if (!msg) return;
      try {
        const payload = JSON.parse(msg.content.toString()) as {
          petId: string;
          s3Key: string;
          sizes: Array<{ width: number; height: number }>;
        };

        console.log(`[ImageProcessor] Received job for petId=${payload.petId}`);

        // 1. Download the source image from S3
        const orig = await s3
          .getObject({
            Bucket: process.env.S3_BUCKET_NAME!,
            Key: payload.s3Key,
          })
          .promise();

        if (!orig.Body) throw new Error("Empty image body");

        // 2. For each size, resize and upload
        for (const size of payload.sizes) {
          const resizedBuffer = await sharp(orig.Body as Buffer)
            .resize(size.width, size.height)
            .toBuffer();

          const thumbKey = `thumbnails/${payload.petId}_${size.width}x${size.height}.jpg`;
          await s3
            .putObject({
              Bucket: process.env.S3_BUCKET_NAME!,
              Key: thumbKey,
              Body: resizedBuffer,
              ContentType: "image/jpeg",
              ACL: "public-read",
            })
            .promise();
          console.log(`[ImageProcessor] Uploaded thumbnail: ${thumbKey}`);
        }

        // 3. Acknowledge
        channel.ack(msg);
      } catch (err) {
        console.error("[ImageProcessor] Error processing message:", err);
        channel.nack(msg, false, false); // dead-letter or drop
      }
    },
    { noAck: false }
  );
}
