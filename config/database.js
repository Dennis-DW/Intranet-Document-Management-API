// /config/database.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Ensure environment variables are loaded
dotenv.config();

/**
 * Asynchronously connects to the MongoDB database using the connection
 * string from the environment variables.
 */
const connectDB = async () => {
  try {
    // The connection string is retrieved from the .env file
    // Mongoose options are set to avoid deprecation warnings
    await mongoose.connect(process.env.DB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully.');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    // Exit process with failure if connection fails
    process.exit(1);
  }
};

module.exports = connectDB;