const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Import all models
const User = require('../models/user.model');
const Document = require('../models/document.model');
const DocumentVersion = require('../models/documentVersion.model');
const AuditLog = require('../models/auditLog.model');
const RefreshToken = require('../models/refreshToken.model');
const Notification = require('../models/notification.model');

// Load environment variables
dotenv.config();

/**
 * !!! WARNING !!!
 * This script will WIPE all data from the main collections in your database.
 * Run from terminal: npm run clear:db
 */
async function clearDatabase() {
  if (!process.env.DB_URI) {
    console.error('Error: DB_URI is not defined in your .env file.');
    process.exit(1);
  }

  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.DB_URI);
    console.log('Database connected successfully.');

    console.warn('Clearing data from collections: User, Document, DocumentVersion, AuditLog, RefreshToken, Notification...');
    
    const promises = [
      User.deleteMany({}),
      Document.deleteMany({}),
      DocumentVersion.deleteMany({}),
      AuditLog.deleteMany({}),
      RefreshToken.deleteMany({}),
      Notification.deleteMany({})
    ];

    await Promise.all(promises);
    
    console.log('All specified collections have been cleared.');

  } catch (error) {
    console.error('Error clearing database:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed.');
    process.exit(0);
  }
}

// Run the function
clearDatabase();