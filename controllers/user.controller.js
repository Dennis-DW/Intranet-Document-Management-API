const User = require('../models/user.model');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const storageConfig = require('../config/storage.config');
const storageService = require('../services/storage.service');

// @desc    Update current user's profile (username, email)
// @route   PUT /api/users/me
// @access  Private
const updateMyProfile = async (req, res) => {
  const { username, email } = req.body;
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send('User not found.');
    }

    // Check for conflicts if username/email is being changed
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) return res.status(400).send('Username is already taken.');
      user.username = username;
    }
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) return res.status(400).send('Email is already in use.');
      user.email = email;
    }

    await user.save();
    res.json(user);
  } catch (error) {
    console.error('[Update Profile Error]', error);
    res.status(500).send('Server Error');
  }
};

// @desc    Change current user's password
// @route   POST /api/users/me/password
// @access  Private
const changeMyPassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send('User not found.');
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).send('Incorrect current password.');
    }

    // Hash and save new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.send('Password changed successfully.');
  } catch (error) {
    console.error('[Change Password Error]', error);
    res.status(500).send('Server Error');
  }
};

// @desc    Update current user's avatar
// @route   POST /api/users/me/avatar
// @access  Private
const updateMyAvatar = async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No image file uploaded.');
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).send('User not found.');
    }

    // --- Delete old avatar before uploading new one ---
    if (user.avatar) {
      if (user.avatar.startsWith('https://storage.googleapis.com/')) {
        // It's a GCS file, delete from cloud
        await storageService.deleteFromGCS(user.avatar);
      } else if (user.avatar.startsWith('/uploads/avatars/')) {
        // It's a local file, delete from disk
        const oldAvatarPath = path.join(__dirname, '..', user.avatar);
        if (fs.existsSync(oldAvatarPath)) {
          fs.unlinkSync(oldAvatarPath);
        }
      }
    }

    // --- Save new avatar based on configuration ---
    if (storageConfig.isGcsConfigured) {
      // GCS Upload Path
      const extension = path.extname(req.file.originalname);
      const destination = `avatars/${user._id}${extension}`;
      const publicUrl = await storageService.uploadToGCS(req.file.buffer, destination);
      user.avatar = publicUrl;
    } else {
      // Local Upload Path
      user.avatar = `/uploads/avatars/${req.file.filename}`;
    }

    await user.save();
    res.json(user);
  } catch (error) {
    console.error('[Update Avatar Error]', error);
    res.status(500).send('Server Error');
  }
};

module.exports = {
  updateMyProfile,
  changeMyPassword,
  updateMyAvatar,
};