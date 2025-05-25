import AWS from "aws-sdk";
import config from "../config";

const s3 = new AWS.S3({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

/**
 * Uploads a buffer to S3 under avatars/ and returns the public URL.
 */
export async function uploadAvatar(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<string> {
  const key = `avatars/${Date.now()}_${filename}`;

  await s3
    .putObject({
      Bucket: config.aws.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
    .promise();

  return `https://${config.aws.bucket}.s3.${config.aws.region}.amazonaws.com/${key}`;
}

/**
 * Uploads a buffer to S3 under a given prefix and returns the public URL.
 */
export async function uploadToS3(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  prefix: string = "uploads",
): Promise<string> {
  const key = `${prefix}/${Date.now()}_${filename}`;

  await s3
    .putObject({
      Bucket: config.aws.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
    .promise();

  return `https://${config.aws.bucket}.s3.${config.aws.region}.amazonaws.com/${key}`;
}
