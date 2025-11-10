const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const User = require('../models/user.model'); // Adjust path if needed

// Load environment variables
dotenv.config();

const ADMIN_EMAIL = 'admin@company.com';
const ADMIN_USERNAME = 'admin';

/**
 * This script creates the initial Admin user.
 * Run from terminal: node seedAdmin.js <YourSecurePassword>
 */
async function createAdmin() {
  // 1. Get password from command line argument
  const password = process.argv[2];

  if (!password) {
    console.error('Error: Please provide a password as a command-line argument.');
    console.log('Usage: node seedAdmin.js <your-secure-password>');
    process.exit(1);
  }

  if (password.length < 8) {
    console.warn('Warning: Your password is less than 8 characters. Please use a stronger password for production.');
  }

  if (!process.env.DB_URI) {
    console.error('Error: DB_URI is not defined in your .env file.');
    process.exit(1);
  }

  try {
    // 2. Connect to the database
    console.log('Connecting to database...');
    await mongoose.connect(process.env.DB_URI);
    console.log('Database connected successfully.');

    // 3. Check if admin user already exists
    const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });

    if (existingAdmin) {
      console.warn(`An admin with the email ${ADMIN_EMAIL} already exists.`);
      mongoose.disconnect();
      process.exit(0);
    }

    // 4. Hash the password
    console.log('Hashing password...');
    const saltRounds = 10; // Standard salt rounds
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 5. Create and save the new admin user
    const adminUser = new User({
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: 'Admin',
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(ADMIN_USERNAME)}&background=random`,
    });

    await adminUser.save();
    
    console.log('***************************************');
    console.log('Successfully created Admin user:');
    console.log(`  Username: ${adminUser.username}`);
    console.log(`  Email: ${adminUser.email}`);
    console.log('***************************************');

  } catch (error) {
    console.error('Error creating admin user:', error.message);
  } finally {
    // 6. Disconnect from the database
    await mongoose.disconnect();
    console.log('Database connection closed.');
    process.exit(0);
  }
}

// Run the function
createAdmin();