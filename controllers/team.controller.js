const User = require('../models/user.model');
const notificationService = require('../services/notification.service');

// @desc    Get all users currently on the manager's team
const getTeam = async (req, res) => {
  try {
    // req.user.id is the ID of the logged-in manager
    const team = await User.find({ manager: req.user.id });
    res.json(team);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

// @desc    Get all users who are not assigned to a team (and are not Admins)
const getAvailableUsers = async (req, res) => {
  try {
    // Find users who have no manager and are not 'Admin' or 'Manager'
    const availableUsers = await User.find({ 
      manager: null, 
      role: 'User' 
    });
    res.json(availableUsers);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

// @desc    Add a user to the manager's team
const addUserToTeam = async (req, res) => {
  try {
    const userId = req.params.userId;
    const managerId = req.user.id; // Logged-in manager

    const user = await User.findById(userId);

    // Check if user exists or is an Admin/Manager
    if (!user || user.role === 'Admin' || user.role === 'Manager') {
      return res.status(400).send('User not found or cannot be added to a team.');
    }

    // Check if user is already on a team
    if (user.manager) {
      if (user.manager.toString() === managerId) {
        return res.status(400).send('User is already in your team.');
      }
      return res.status(400).send('User is already in another team.');
    }

    // Add user to team
    user.manager = managerId;
    await user.save();

    // --- NEW: Notify the user they've been added ---
    await notificationService.notifyUserAddedToTeam(user, req.user);

    res.json({ message: 'User added to team successfully.', user });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

// @desc    Remove a user from the manager's team
const removeUserFromTeam = async (req, res) => {
  try {
    const userId = req.params.userId;
    const managerId = req.user.id; // Logged-in manager

    const user = await User.findById(userId);

    // Check if user exists
    if (!user) {
      return res.status(404).send('User not found.');
    }

    // Check if the user is actually on this manager's team
    if (!user.manager || user.manager.toString() !== managerId) {
      return res.status(400).send('User is not on your team.');
    }

    // Remove user from team
    user.manager = null;
    await user.save();

    res.json({ message: 'User removed from team successfully.', user });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

module.exports = {
  getTeam,
  getAvailableUsers,
  addUserToTeam,
  removeUserFromTeam,
};
