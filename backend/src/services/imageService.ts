import path from "path";
import {
  enqueueImageResizeJob,
  ImageJobPayload,
} from "../messaging/producers/imageProducer";
import { getRepository } from "typeorm";
import { Pet } from "../entities/Pet";

/**
 * imageService.ts
 *
 * Example service that, when a user uploads a new pet photo,
 * it:
 *   1) Stores the original into S3 (handled elsewhere)
 *   2) Then enqueues a resize job via RabbitMQ
 *   3) Updates the Pet entity in Postgres to include a “thumbnailPending = true” flag
 */
export async function handlePetPhotoUpload(
  petId: string,
  s3Key: string,
): Promise<void> {
  // 1) Optionally: update Pet record to show a new photo is pending
  const petRepo = getRepository(Pet);
  const pet = await petRepo.findOne({ where: { id: petId } });
  if (!pet) throw new Error(`Pet with id ${petId} not found`);
  await petRepo.save(pet);

  // 2) Enqueue a RabbitMQ job to resize the image
  const payload: ImageJobPayload = {
    petId,
    s3Key,
    sizes: [
      { width: 100, height: 100 },
      { width: 300, height: 300 },
      { width: 600, height: 600 },
    ],
  };
  await enqueueImageResizeJob(payload);
}
