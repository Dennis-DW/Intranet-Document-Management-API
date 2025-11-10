const isGcsConfigured = !!(
  process.env.GCS_PROJECT_ID &&
  process.env.GCS_BUCKET_NAME &&
  process.env.GCS_KEYFILE_PATH
);

if (isGcsConfigured) {
  console.log('[Storage] Google Cloud Storage is configured. Avatar uploads will be sent to the cloud.');
} else {
  console.warn('[Storage] Google Cloud Storage is NOT configured. Avatar uploads will be saved locally.');
}

module.exports = {
  isGcsConfigured,
  gcsBucketName: process.env.GCS_BUCKET_NAME,
};