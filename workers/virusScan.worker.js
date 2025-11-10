const { Worker } = require('bullmq');
const path = require('path');
const fs = require('fs');

// Load environment variables for DB connection etc.
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const connectDB = require('../config/database');
const { connection, VIRUS_SCAN_QUEUE_NAME } = require('../config/queue.config');
const { scanFile, MaliciousFileError } = require('../services/virusScan.service');
const DocumentVersion = require('../models/documentVersion.model');

// Connect to DB before starting worker
connectDB();

console.log(`[Worker] Setting up virus scan worker for queue: ${VIRUS_SCAN_QUEUE_NAME}`);

const worker = new Worker(VIRUS_SCAN_QUEUE_NAME, async job => {
  const { versionId, filePath } = job.data;
  console.log(`[Worker] Processing job ${job.id} for versionId: ${versionId}`);

  try {
    // Perform the scan
    await scanFile(filePath);

    // If scan is clean, update status to 'available'
    await DocumentVersion.findByIdAndUpdate(versionId, { status: 'available' });
    console.log(`[Worker] Job ${job.id}: Scan clean. Version ${versionId} is now available.`);

  } catch (error) {
    // Differentiate between a malicious file and a transient API error
    if (error instanceof MaliciousFileError) {
      // This is a definitive failure. Mark as quarantined and do not retry.
      console.error(`[Worker] Job ${job.id}: Malicious file detected for version ${versionId}. Reason: ${error.message}`);
      await DocumentVersion.findByIdAndUpdate(versionId, { status: 'quarantined' });
      
      // Delete the malicious file from disk
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[Worker] Job ${job.id}: Malicious file deleted: ${filePath}`);
      }
    } else {
      // This is likely a transient error (network, API rate limit, etc.).
      // Re-throw the error to let BullMQ handle the retry logic based on its configuration.
      console.error(`[Worker] Job ${job.id}: Transient scan error for version ${versionId}. Reason: ${error.message}. Will be retried.`);
      throw error;
    }
  }
}, { connection });

worker.on('completed', job => {
  console.log(`[Worker] Job ${job.id} has completed.`);
});

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job.id} has failed with ${err.message}`);
});