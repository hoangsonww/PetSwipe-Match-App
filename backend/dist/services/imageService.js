"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlePetPhotoUpload = handlePetPhotoUpload;
const imageProducer_1 = require("../messaging/producers/imageProducer");
const typeorm_1 = require("typeorm");
const Pet_1 = require("../entities/Pet");
/**
 * imageService.ts
 *
 * Example service that, when a user uploads a new pet photo,
 * it:
 *   1) Stores the original into S3 (handled elsewhere)
 *   2) Then enqueues a resize job via RabbitMQ
 *   3) Updates the Pet entity in Postgres to include a “thumbnailPending = true” flag
 */
async function handlePetPhotoUpload(petId, s3Key) {
    // 1) Optionally: update Pet record to show a new photo is pending
    const petRepo = (0, typeorm_1.getRepository)(Pet_1.Pet);
    const pet = await petRepo.findOne({ where: { id: petId } });
    if (!pet)
        throw new Error(`Pet with id ${petId} not found`);
    await petRepo.save(pet);
    // 2) Enqueue a RabbitMQ job to resize the image
    const payload = {
        petId,
        s3Key,
        sizes: [
            { width: 100, height: 100 },
            { width: 300, height: 300 },
            { width: 600, height: 600 },
        ],
    };
    await (0, imageProducer_1.enqueueImageResizeJob)(payload);
}
