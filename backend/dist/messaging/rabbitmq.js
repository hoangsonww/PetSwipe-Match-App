"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRabbitChannel = getRabbitChannel;
exports.closeRabbitConnection = closeRabbitConnection;
const amqplib_1 = __importDefault(require("amqplib"));
const rabbitmq_config_1 = require("../config/rabbitmq.config");
let connection = null;
let channel = null;
/**
 * Establishes a connection to RabbitMQ and creates a single channel.
 * Subsequent calls return the same channel.
 */
async function getRabbitChannel() {
    if (channel)
        return channel;
    const url = `amqp://${rabbitmq_config_1.RABBITMQ_USERNAME}:${rabbitmq_config_1.RABBITMQ_PASSWORD}@${rabbitmq_config_1.RABBITMQ_HOST}:${rabbitmq_config_1.RABBITMQ_PORT}`;
    // @ts-ignore
    connection = await amqplib_1.default.connect(url);
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
async function closeRabbitConnection() {
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
    }
    catch (err) {
        console.error("Error closing RabbitMQ connection:", err);
    }
}
