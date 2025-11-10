const fs = require('fs');
const csv = require('csv-parser');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../models/user.model');

/**
 * Processes a CSV file to bulk-import users.
 * @param {string} filePath - The path to the temporary CSV file.
 * @returns {object} - A report object with summary and detailed results.
 */
async function processCsvImport(filePath) {
  const usersToCreate = [];
  const reports = [];

  // 1. Asynchronously read the CSV file
  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => usersToCreate.push(data))
      .on('end', resolve)
      .on('error', reject);
  });

  // 2. Process each user row one by one
  for (const row of usersToCreate) {
    const { username, email, role, managerEmail } = row;
    try {
      // 2a. Validate required fields
      if (!username || !email || !role) {
        throw new Error(`Missing required fields (username, email, role)`);
      }
      const validRoles = ['User', 'Manager', 'Admin'];
      if (!validRoles.includes(role)) {
        throw new Error(`Invalid role: ${role}`);
      }

      // 2b. Check for existing user
      const existingUser = await User.findOne({ $or: [{ email }, { username }] });
      if (existingUser) {
        throw new Error(`User already exists: ${username} or ${email}`);
      }

      // 2c. Find Manager ID if managerEmail is provided
      let managerId = null;
      if (managerEmail && managerEmail.trim() !== '') {
        const manager = await User.findOne({ email: managerEmail, role: { $in: ['Manager', 'Admin'] } });
        if (manager) {
          managerId = manager._id;
        } else {
          throw new Error(`Manager not found with email: ${managerEmail}`);
        }
      }

      // 2d. Generate & hash temporary password
      const tempPassword = crypto.randomBytes(12).toString('hex');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(tempPassword, salt);

      // 2e. Create new user object
      const newUser = new User({
        username,
        email,
        password: hashedPassword,
        role,
        manager: managerId,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`,
      });

      await newUser.save();
      
      // 2f. Report success
      // NOTE: In a real system, you'd email this tempPassword, not log it.
      // We log it here for demonstration of *what* was created.
      console.log(`[BulkImport] Created: ${username}, Temp PWD: ${tempPassword}`);
      reports.push({ status: 'success', user: username, email: email });

    } catch (error) {
      // 2g. Report failure
      reports.push({ status: 'error', user: row.username || 'N/A', reason: error.message });
    }
  }

  // 3. Cleanup the uploaded CSV file
  try {
    fs.unlinkSync(filePath);
  } catch (e) {
    console.error("Failed to delete temp CSV file:", filePath, e);
  }

  // 4. Return the final report
  return {
    results: reports,
    summary: {
      total: reports.length,
      success: reports.filter(r => r.status === 'success').length,
      failed: reports.filter(r => r.status === 'error').length,
    }
  };
}

module.exports = {
  processCsvImport,
};