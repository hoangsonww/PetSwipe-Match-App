"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadAvatar = uploadAvatar;
exports.uploadPetPic = uploadPetPic;
const supabase_js_1 = require("@supabase/supabase-js");
const uuid_1 = require("uuid");
const config_1 = __importDefault(require("../config"));
const supabase = (0, supabase_js_1.createClient)(config_1.default.supabase.url, config_1.default.supabase.key);
/**
 * Uploads a buffer to a given Supabase Storage bucket and returns its public URL.
 * @param bucketName the Supabase bucket to upload into
 * @param buffer raw file data
 * @param filename desired base name (e.g. "photo.jpg")
 * @param contentType MIME type (e.g. "image/jpeg")
 */
async function uploadBufferToBucket(bucketName, buffer, filename, contentType) {
    const uniquePath = `uploads/${Date.now()}_${(0, uuid_1.v4)()}_${filename}`;
    const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(uniquePath, buffer, {
        contentType,
        upsert: false,
    });
    if (uploadError) {
        throw new Error(`Supabase upload error (bucket: ${bucketName}): ${uploadError.message}`);
    }
    const { data } = supabase.storage.from(bucketName).getPublicUrl(uniquePath);
    if (!data?.publicUrl) {
        throw new Error(`Could not get public URL from Supabase for bucket "${bucketName}", file "${uniquePath}".`);
    }
    return data.publicUrl;
}
/**
 * Upload a user avatar to the "avatars" bucket.
 * @param buffer raw image data
 * @param filename desired base name (e.g. "avatar.png")
 * @param contentType MIME type (e.g. "image/png")
 */
async function uploadAvatar(buffer, filename, contentType) {
    return uploadBufferToBucket("avatars", buffer, filename, contentType);
}
/**
 * Upload a pet picture to the "pets" bucket.
 * @param buffer raw image data
 * @param filename desired base name (e.g. "pet.jpg")
 * @param contentType MIME type (e.g. "image/jpeg")
 */
async function uploadPetPic(buffer, filename, contentType) {
    return uploadBufferToBucket("pets", buffer, filename, contentType);
}
