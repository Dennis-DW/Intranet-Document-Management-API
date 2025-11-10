const { Storage } = require('@google-cloud/storage');
const { isGcsConfigured, gcsBucketName } = require('../config/storage.config');

let storage;
let bucket;

// --- Conditionally Initialize GCS ---
// This code now only runs if GCS variables are set in the .env file,
// preventing the startup crash when they are missing.
if (isGcsConfigured) {
  storage = new Storage({
    keyFilename: process.env.GCS_KEYFILE_PATH,
    projectId: process.env.GCS_PROJECT_ID,
  });
  bucket = storage.bucket(gcsBucketName);
}

/**
 * Uploads a file buffer to Google Cloud Storage and makes it public.
 * @param {Buffer} buffer The file buffer from multer's memory storage.
 * @param {string} destination The destination path within the bucket (e.g., 'avatars/user-id.jpg').
 * @returns {Promise<string>} The public URL of the uploaded file.
 */
async function uploadToGCS(buffer, destination) {
  if (!isGcsConfigured) {
    throw new Error('GCS_BUCKET_NAME environment variable is not set.');
  }

  const file = bucket.file(destination);

  return new Promise((resolve, reject) => {
    const stream = file.createWriteStream({
      resumable: false,
      metadata: {
        // Automatically set cache control for browser caching
        cacheControl: 'public, max-age=31536000',
      },
    });

    stream.on('error', (err) => reject(err));
    stream.on('finish', async () => {
      try {
        // Make the file public
        await file.makePublic();
        resolve(file.publicUrl());
      } catch (err) {
        reject(err);
      }
    });

    stream.end(buffer);
  });
}

/**
 * Deletes a file from Google Cloud Storage if it exists.
 * @param {string} publicUrl The public URL of the file to delete.
 */
async function deleteFromGCS(publicUrl) {
  if (!isGcsConfigured || !publicUrl || !publicUrl.startsWith(`https://storage.googleapis.com/${gcsBucketName}/`)) {
    return; // Not a GCS URL from our bucket, so do nothing.
  }
  try {
    const filename = publicUrl.split(`${gcsBucketName}/`)[1];
    await bucket.file(filename).delete({ ignoreNotFound: true });
    console.log(`[GCS Delete] Deleted: ${filename}`);
  } catch (error) {
    console.error(`[GCS Delete] Error deleting ${publicUrl}:`, error);
  }
}

module.exports = {
  uploadToGCS,
  deleteFromGCS,
};