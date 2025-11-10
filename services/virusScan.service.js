const VirusTotalApi = require('virustotal-api');

/**
 * Custom error class for definitive malicious file detections.
 * This allows the worker to distinguish between a failed scan (which can be retried)
 * and a successful scan that found a threat (which should not be retried).
 */
class MaliciousFileError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MaliciousFileError';
  }
}

const apiKey = process.env.VIRUSTOTAL_API_KEY;

if (!apiKey) {
  console.warn(`
    ****************************************************************************
    *** WARNING: VIRUSTOTAL_API_KEY is missing from your .env file.          ***
    *** File virus scanning will be SKIPPED.                                 ***
    *** To enable scanning, get a key from virustotal.com and add it to .env ***
    ****************************************************************************
  `);
}

const virusTotal = apiKey ? new VirusTotalApi(apiKey) : null;

/**
 * Scans a file using the VirusTotal API.
 * This function is now wrapped in a Promise to correctly handle the
 * callback-based nature of the 'virustotal-api' library.
 *
 * @param {string} filePath The path to the file to scan.
 * @returns {Promise<object>} A promise that resolves if the file is clean,
 *                            or rejects if the file is malicious or an API error occurs.
 */
async function scanFile(filePath) {
  if (!virusTotal) {
    console.warn(`[VirusScan] Skipping scan for ${filePath} as VirusTotal API is not configured.`);
    return; // Resolve promise with no value, indicating a clean (skipped) scan.
  }

  return new Promise((resolve, reject) => {
    console.log(`[VirusScan] Scanning file: ${filePath}`);

    virusTotal.fileScan(filePath, (err, stats) => {
      if (err) {
        console.error(`[VirusScan] API Error for ${filePath}:`, err.message);
        // Reject with a standard error for transient issues (e.g., network, API limits)
        return reject(new Error(`VirusTotal API error: ${err.message}`));
      }

      const maliciousCount = stats.positives || 0;
      if (maliciousCount > 0) {
        const message = `File is malicious. Flagged by ${maliciousCount} engines.`;
        console.error(`[VirusScan] MALICIOUS FILE DETECTED: ${filePath}. ${message}`);
        // Reject with our custom error for definitive failures
        return reject(new MaliciousFileError(message));
      }

      console.log(`[VirusScan] File is clean: ${filePath}`);
      resolve(stats);
    });
  });
}

module.exports = { scanFile, MaliciousFileError };