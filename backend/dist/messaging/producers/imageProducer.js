"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueueImageResizeJob = enqueueImageResizeJob;
const rabbitmq_1 = require("../rabbitmq");
const rabbitmq_config_1 = require("../../config/rabbitmq.config");
/**
 * Publishes an “image resize” job to RabbitMQ.
 * The consumer (e.g. Image Processor) will pick it up.
 */
async function enqueueImageResizeJob(payload) {
    const channel = await (0, rabbitmq_1.getRabbitChannel)();
    // Ensure the queue exists (durable)
    await channel.assertQueue(rabbitmq_config_1.IMAGE_QUEUE_NAME, { durable: true });
    // Send the message
    const buffer = Buffer.from(JSON.stringify(payload));
    channel.sendToQueue(rabbitmq_config_1.IMAGE_QUEUE_NAME, buffer, { persistent: true });
}
