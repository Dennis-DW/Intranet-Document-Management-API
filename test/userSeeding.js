const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const DocumentVersion = require('../models/documentVersion.model');
const User = require('../models/user.model');
const Document = require('../models/document.model');
const AuditLog = require('../models/auditLog.model');
const RefreshToken = require('../models/refreshToken.model');
const Notification = require('../models/notification.model');

// Load environment variables
dotenv.config();

/**
 * !!! WARNING !!!
 * This script is for development/testing ONLY.
 * It will WIPE all Users, Documents, AuditLogs, and RefreshTokens from your database.
 * * Run from terminal: node test/userSeeding.js
 */
async function seedDatabase() {
  if (!process.env.DB_URI) {
    console.error('Error: DB_URI is not defined in your .env file.');
    process.exit(1);
  }

  try {
    // 1. Connect to the database
    console.log('Connecting to database...');
    await mongoose.connect(process.env.DB_URI);
    console.log('Database connected successfully.');

    // 2. --- WARNING: WIPE DATABASE ---
    console.warn('Clearing existing data (Users, Documents, AuditLogs, RefreshTokens, Notifications)...');
    await User.deleteMany({});
    await Document.deleteMany({});
    await DocumentVersion.deleteMany({});
    await AuditLog.deleteMany({});
    await RefreshToken.deleteMany({});
    await Notification.deleteMany({});
    console.log('Data cleared.');

    // 2a. Sync indexes to match schema (removes old/stale indexes)
    console.log('Syncing database indexes with models...');
    await Document.syncIndexes();
    await DocumentVersion.syncIndexes();
    console.log('Indexes synced.');

    // 3. Hash passwords
    console.log('Hashing passwords...');
    const saltRounds = 10;
    const adminPass = await bcrypt.hash('AdminPass123!', saltRounds);
    const managerPass1 = await bcrypt.hash('ManagerPass123!', saltRounds);
    const managerPass2 = await bcrypt.hash('ManagerPass456!', saltRounds);
    const userPass1 = await bcrypt.hash('UserPass123!', saltRounds);
    const userPass2 = await bcrypt.hash('UserPass456!', saltRounds);
    const userPass3 = await bcrypt.hash('UserPass789!', saltRounds);

    // 4. Create users
    console.log('Creating new users...');
    // Use .create to get the returned documents with their IDs
    const [admin, managerJane, managerMike, userBob, userAlice, userCharlie] = await User.create([
      {
        username: 'admin',
        email: 'admin@company.com',
        password: adminPass,
        role: 'Admin',
        avatar: `https://ui-avatars.com/api/?name=admin&background=random`,
      },
      {
        username: 'managerJane',
        email: 'jane@company.com',
        password: managerPass1,
        role: 'Manager',
        avatar: `https://ui-avatars.com/api/?name=managerJane&background=random`,
      },
      {
        username: 'managerMike',
        email: 'mike@company.com',
        password: managerPass2,
        role: 'Manager',
        avatar: `https://ui-avatars.com/api/?name=managerMike&background=random`,
      },
      {
        username: 'userBob',
        email: 'bob@company.com',
        password: userPass1,
        role: 'User',
        manager: null,
        avatar: `https://ui-avatars.com/api/?name=userBob&background=random`,
      },
      {
        username: 'userAlice',
        email: 'alice@company.com',
        password: userPass2,
        role: 'User',
        manager: null,
        avatar: `https://ui-avatars.com/api/?name=userAlice&background=random`,
      },
      {
        username: 'userCharlie',
        email: 'charlie@company.com',
        password: userPass3,
        role: 'User',
        manager: null,
        avatar: `https://ui-avatars.com/api/?name=userCharlie&background=random`,
      },
    ]);
    console.log('Users created.');

    // 5. Assign users to managers to form teams
    console.log('Assigning users to teams...');
    userBob.manager = managerJane._id;
    await userBob.save();

    userAlice.manager = managerMike._id;
    await userAlice.save();
    console.log('Team assignments complete.');

    // 6. Create documents for testing access control logic
    console.log('Creating test documents...');
    
    // Helper to create a document with its first version
    const createDocWithVersion = async (docData, versionData) => {
      const doc = new Document(docData);
      const version = new DocumentVersion({
        ...versionData,
        document: doc._id,
        versionNumber: 1,
        status: 'available', // Mark as available for testing
      });
      doc.latestVersion = version._id;
      await version.save();
      await doc.save();
      return { doc, version };
    };

    await createDocWithVersion(
      { originalFilename: 'public_report.pdf', owner: admin._id, accessLevel: 'public', tags: ['finance', 'annual'] },
      { storedFilename: 'public_report.pdf', mimetype: 'application/pdf', size: 1024, uploadedBy: admin._id }
    );

    await createDocWithVersion(
      { originalFilename: 'janes_private_notes.docx', owner: managerJane._id, accessLevel: 'private', tags: ['personal'] },
      { storedFilename: 'janes_private_notes.docx', mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 2048, uploadedBy: managerJane._id }
    );

    await createDocWithVersion(
      { originalFilename: 'janes_team_project.pdf', owner: managerJane._id, accessLevel: 'team', tags: ['project-alpha'] },
      { storedFilename: 'janes_team_project.pdf', mimetype: 'application/pdf', size: 3072, uploadedBy: managerJane._id }
    );

    await createDocWithVersion(
      { originalFilename: 'mikes_team_tasks.pdf', owner: managerMike._id, accessLevel: 'team', tags: ['project-beta'] },
      { storedFilename: 'mikes_team_tasks.pdf', mimetype: 'application/pdf', size: 4096, uploadedBy: managerMike._id }
    );

    await createDocWithVersion(
      { originalFilename: 'bobs_secret_file.pdf', owner: userBob._id, accessLevel: 'private', tags: ['secret'] },
      { storedFilename: 'bobs_secret_file.pdf', mimetype: 'application/pdf', size: 5120, uploadedBy: userBob._id }
    );

    console.log('Test documents created.');
    
    console.log('\n***************************************************');
    console.log('Successfully seeded database for comprehensive testing!');
    console.log('***************************************************\n');

    console.log('\n--- Login Credentials ---');
    console.log('Admin:');
    console.log('  Email:    admin@company.com');
    console.log('  Password: AdminPass123!');
    console.log('\nManager (Jane):');
    console.log('  Email:    jane@company.com');
    console.log('  Password: ManagerPass123!');
    console.log('\nManager (Mike):');
    console.log('  Email:    mike@company.com');
    console.log('  Password: ManagerPass456!');
    console.log('\nUser (Bob, on Jane\'s team):');
    console.log('  Email:    bob@company.com');
    console.log('  Password: UserPass123!');
    console.log('\nUser (Alice, on Mike\'s team):');
    console.log('  Email:    alice@company.com');
    console.log('  Password: UserPass456!');
    console.log('\nUser (Charlie, unassigned):');
    console.log('  Email:    charlie@company.com');
    console.log('  Password: UserPass789!');
    console.log('\n--- Testing Scenarios ---');
    console.log('1. Team Management:');
    console.log("   - Login as 'jane@company.com'. GET /api/team should show 'userBob'.");
    console.log("   - GET /api/team/available should show 'userCharlie'.");
    console.log("   - Login as 'mike@company.com'. GET /api/team should show 'userAlice'.");
    console.log('\n2. Document & Search:');
    console.log("   - Login as 'bob@company.com'. GET /api/documents should show 'public_report.pdf', 'janes_team_project.pdf', and his own 'bobs_secret_file.pdf'.");
    console.log("   - As Bob, GET /api/documents/search?q=secret should return 'bobs_secret_file.pdf'.");
    console.log("   - As Bob, GET /api/documents/search?q=project-beta should return nothing.");
    console.log("   - Login as 'admin@company.com'. GET /api/documents?limit=100 should show ALL documents.");
    console.log('***************************************************\n');

  } catch (error) {
    console.error('Error seeding database:', error.message);
  } finally {
    // 5. Disconnect from the database
    await mongoose.disconnect();
    console.log('Database connection closed.');
    process.exit(0);
  }
}

// Run the function
seedDatabase();