const fs = require('fs');

/**
 * Handles file cleanup and sends appropriate error response.
 * @param {Error} error - The error object.
 * @param {string} filePath - The path of the file to clean up.
 * @param {object} res - The Express response object.
 */
function handleUploadError(error, filePath, res) {
  // Cleanup the uploaded file if it exists
  if (filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[Cleanup] Deleted file: ${filePath}`);
      }
    } catch (cleanupError) {
      console.error(`[Cleanup FAILED] Could not delete file: ${filePath}`, cleanupError);
    }
  }

  // Send specific error responses
  if (error.message && error.message.includes('File is malicious')) {
    return res.status(400).send(error.message);
  }
  if (error.message && error.message.includes('rate limit exceeded')) {
    return res.status(429).send(error.message);
  }
  
  // Handle custom service errors with status codes
  if (error.status) {
    return res.status(error.status).send(error.message);
  }

  // Generic server error
  console.error('[Controller Error]', error);
  res.status(500).send('An error occurred during the process.');
}

module.exports = {
  handleUploadError,
};