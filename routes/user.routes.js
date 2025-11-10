const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { body } = require('express-validator');

const authenticationMiddleware = require('../middleware/authentication');
const userController = require('../controllers/user.controller');
const storageConfig = require('../config/storage.config');
const { handleValidationErrors } = require('../middleware/validators');

// --- Multer Configuration for Avatar Uploads ---
let avatarStorage;

if (storageConfig.isGcsConfigured) {
  // Use memoryStorage when uploading to GCS, as we don't need to save to disk first.
  avatarStorage = multer.memoryStorage();
} else {
  // Use diskStorage for local file saving.
  avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/avatars/');
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = req.user.id;
      const extension = path.extname(file.originalname);
      cb(null, `${uniqueSuffix}${extension}`);
    }
  });
}

const avatarFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images are allowed.'), false);
  }
};

const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: avatarFileFilter,
  limits: { fileSize: 1024 * 1024 * 5 } // 5MB limit
});

// All routes in this file are for the authenticated user
router.use(authenticationMiddleware);

// @route   PUT /api/users/me
router.put('/me', userController.updateMyProfile);

// @route   POST /api/users/me/password
router.post('/me/password', [
  body('currentPassword').notEmpty().withMessage('Current password is required.'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters long.'),
  handleValidationErrors
], userController.changeMyPassword);

// @route   POST /api/users/me/avatar
router.post('/me/avatar', uploadAvatar.single('avatar'), userController.updateMyAvatar);

module.exports = router;