import { initializeApp, cert, ServiceAccount } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import config from "../config";
import { v4 as uuidv4 } from "uuid";

const firebaseConfig: ServiceAccount = {
  projectId: config.firebase.projectId,
  clientEmail: config.firebase.clientEmail,
  privateKey: config.firebase.privateKey,
};

initializeApp({
  credential: cert(firebaseConfig),
  storageBucket: config.firebase.storageBucket,
});

const bucket = getStorage().bucket();

/**
 * Upload a buffer (image, etc.) to Firebase Storage.
 * @param buffer raw file data
 * @param filename desired base name (e.g. "photo.jpg")
 * @returns public URL
 */
export async function uploadToFirebase(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<string> {
  // give each file a unique path
  const uniqueName = `uploads/${Date.now()}_${uuidv4()}_${filename}`;
  const file = bucket.file(uniqueName);

  await file.save(buffer, {
    metadata: {
      contentType,
      metadata: {
        firebaseStorageDownloadTokens: uuidv4(), // required for public access token
      },
    },
    public: true,
  });

  // Construct the public URL
  const bucketName = config.firebase.storageBucket;
  const token = file.metadata.metadata?.firebaseStorageDownloadTokens;
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(uniqueName)}?alt=media&token=${token}`;
}
