const Notification = require('../models/notification.model');
const User = require('../models/user.model');

/**
 * Creates notifications for all members of a team when a new team document is uploaded.
 * @param {object} document - The newly uploaded document object.
 */
async function notifyTeamOfNewDocument(document) {
  if (document.accessLevel !== 'team') return;

  const owner = await User.findById(document.owner);
  if (!owner) return;

  // Find all users managed by the document owner
  const teamMembers = await User.find({ manager: owner._id });

  const message = `${owner.username} uploaded a new team document: "${document.originalFilename}"`;
  
  const notifications = teamMembers.map(member => ({
    user: member._id,
    message: message,
    link: `/documents/${document._id}`, // Example link for frontend
  }));

  if (notifications.length > 0) {
    await Notification.insertMany(notifications);
    console.log(`[Notification] Sent ${notifications.length} notifications for new team document.`);
  }
}

/**
 * Creates a notification for a user when they are added to a team.
 * @param {object} user - The user who was added.
 * @param {object} manager - The manager of the team.
 */
async function notifyUserAddedToTeam(user, manager) {
  const message = `You have been added to ${manager.username}'s team.`;
  await Notification.create({
    user: user._id,
    message: message,
    link: '/team',
  });
  console.log(`[Notification] Sent notification to ${user.username} for being added to a team.`);
}

module.exports = {
  notifyTeamOfNewDocument,
  notifyUserAddedToTeam,
};