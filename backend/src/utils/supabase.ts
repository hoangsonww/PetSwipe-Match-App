import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import config from "../config";

const supabase = createClient(config.supabase.url, config.supabase.key);

/**
 * Uploads a buffer to a given Supabase Storage bucket and returns its public URL.
 * @param bucketName the Supabase bucket to upload into
 * @param buffer raw file data
 * @param filename desired base name (e.g. "photo.jpg")
 * @param contentType MIME type (e.g. "image/jpeg")
 */
async function uploadBufferToBucket(
  bucketName: string,
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<string> {
  const uniquePath = `uploads/${Date.now()}_${uuidv4()}_${filename}`;

  // 1) Upload the file
  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(uniquePath, buffer, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(
      `Supabase upload error (bucket: ${bucketName}): ${uploadError.message}`,
    );
  }

  // 2) Build a public URL
  const { data } = supabase.storage.from(bucketName).getPublicUrl(uniquePath);
  if (!data?.publicUrl) {
    throw new Error(
      `Could not get public URL from Supabase for bucket "${bucketName}", file "${uniquePath}".`,
    );
  }

  return data.publicUrl;
}

/**
 * Upload a user avatar to the "avatars" bucket.
 * @param buffer raw image data
 * @param filename desired base name (e.g. "avatar.png")
 * @param contentType MIME type (e.g. "image/png")
 */
export async function uploadAvatar(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<string> {
  return uploadBufferToBucket("avatars", buffer, filename, contentType);
}

/**
 * Upload a pet picture to the "pets" bucket.
 * @param buffer raw image data
 * @param filename desired base name (e.g. "pet.jpg")
 * @param contentType MIME type (e.g. "image/jpeg")
 */
export async function uploadPetPic(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<string> {
  return uploadBufferToBucket("pets", buffer, filename, contentType);
}
