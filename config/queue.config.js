const { Queue } = require('bullmq');
const IORedis = require('ioredis');

// You'd typically get this from .env
const connection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null // Required for BullMQ
});

const VIRUS_SCAN_QUEUE_NAME = 'virus-scan-queue';

const virusScanQueue = new Queue(VIRUS_SCAN_QUEUE_NAME, { connection });

module.exports = {
  connection,
  virusScanQueue,
  VIRUS_SCAN_QUEUE_NAME,
};