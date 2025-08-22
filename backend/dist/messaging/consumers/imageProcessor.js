"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startImageProcessor = startImageProcessor;
const rabbitmq_1 = require("../rabbitmq");
const rabbitmq_config_1 = require("../../config/rabbitmq.config");
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const sharp_1 = __importDefault(require("sharp"));
aws_sdk_1.default.config.update({ region: process.env.AWS_REGION || "us-east-1" });
const s3 = new aws_sdk_1.default.S3();
/**
 * Pulls messages from the “resize-image” queue and processes them:
 * 1) Downloads the original image from S3
 * 2) Uses sharp to resize for each requested size
 * 3) Uploads resized images back to S3 under a “thumbnails/” prefix
 * 4) Acknowledges the message
 */
async function startImageProcessor() {
    const channel = await (0, rabbitmq_1.getRabbitChannel)();
    await channel.assertQueue(rabbitmq_config_1.IMAGE_QUEUE_NAME, { durable: true });
    // Prefetch 1 at a time
    channel.prefetch(1);
    console.log(`[ImageProcessor] Waiting for messages in ${rabbitmq_config_1.IMAGE_QUEUE_NAME}...`);
    channel.consume(rabbitmq_config_1.IMAGE_QUEUE_NAME, async (msg) => {
        if (!msg)
            return;
        try {
            const payload = JSON.parse(msg.content.toString());
            console.log(`[ImageProcessor] Received job for petId=${payload.petId}`);
            // 1. Download the source image from S3
            const orig = await s3
                .getObject({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: payload.s3Key,
            })
                .promise();
            if (!orig.Body)
                throw new Error("Empty image body");
            // 2. For each size, resize and upload
            for (const size of payload.sizes) {
                const resizedBuffer = await (0, sharp_1.default)(orig.Body)
                    .resize(size.width, size.height)
                    .toBuffer();
                const thumbKey = `thumbnails/${payload.petId}_${size.width}x${size.height}.jpg`;
                await s3
                    .putObject({
                    Bucket: process.env.S3_BUCKET_NAME,
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
        }
        catch (err) {
            console.error("[ImageProcessor] Error processing message:", err);
            channel.nack(msg, false, false); // dead-letter or drop
        }
    }, { noAck: false });
}
