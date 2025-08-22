"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadAvatar = uploadAvatar;
exports.uploadToS3 = uploadToS3;
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const config_1 = __importDefault(require("../config"));
const s3 = new aws_sdk_1.default.S3({
    region: config_1.default.aws.region,
    credentials: {
        accessKeyId: config_1.default.aws.accessKeyId,
        secretAccessKey: config_1.default.aws.secretAccessKey,
    },
});
/**
 * Uploads a buffer to S3 under avatars/ and returns the public URL.
 */
async function uploadAvatar(buffer, filename, mimeType) {
    const key = `avatars/${Date.now()}_${filename}`;
    await s3
        .putObject({
        Bucket: config_1.default.aws.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
    })
        .promise();
    return `https://${config_1.default.aws.bucket}.s3.${config_1.default.aws.region}.amazonaws.com/${key}`;
}
/**
 * Uploads a buffer to S3 under a given prefix and returns the public URL.
 */
async function uploadToS3(buffer, filename, mimeType, prefix = "uploads") {
    const key = `${prefix}/${Date.now()}_${filename}`;
    await s3
        .putObject({
        Bucket: config_1.default.aws.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
    })
        .promise();
    return `https://${config_1.default.aws.bucket}.s3.${config_1.default.aws.region}.amazonaws.com/${key}`;
}
