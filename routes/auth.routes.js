const express = require('express');
const router = express.Router();
const multer = require('multer');
const { body } = require('express-validator');

// Import middleware
const authenticationMiddleware = require('../middleware/authentication');
const { authorize } = require('../middleware/authorization');
const rateLimiter = require('../middleware/rateLimiter');
const { handleValidationErrors, registerValidationRules } = require('../middleware/validators');

// Import controller logic
const authController = require('../controllers/auth.controller');

// Configure multer for CSV upload
const upload = multer({ dest: 'uploads/temp' }); 

// --- Authentication API Routes ---

// @route   POST /api/auth/register
// @desc    Registers a single new user
// @access  Private (Admin)
router.post(
  '/register',
  authenticationMiddleware,
  authorize('Admin'),
  registerValidationRules, // Use the strong validation rules
  handleValidationErrors,
  authController.register
);

// @route   POST /api/auth/bulk-register
// @desc    Bulk registers new users from a CSV file
// @access  Private (Admin)
router.post(
  '/bulk-register',
  authenticationMiddleware,
  authorize('Admin'),
  upload.single('userfile'), // 'userfile' is the form field name
  authController.bulkRegisterUsers
);

// @route   POST /api/auth/login
// @desc    Logs in a user
// @access  Public
router.post(
  '/login',
  rateLimiter.loginLimiter, 
  [
    body('email', 'Please include a valid email').trim().isEmail(),
    body('password', 'Password is required').notEmpty(),
    handleValidationErrors,
  ],
  authController.login
);

// @route   POST /api/auth/logout
// @desc    Logs out a user
// @access  Private
router.post(
  '/logout',
  authenticationMiddleware, // Requires auth to know *who* to log out
  authController.logout
);

// @route   POST /api/auth/refresh
// @desc    Issues a new access token
// @access  Private (requires refresh token cookie)
router.post(
  '/refresh',
  authController.refresh // This route uses the refresh token, not access token
);

// @route   GET /api/auth/me
// @desc    Get current logged in user's details
// @access  Private
router.get(
  '/me',
  authenticationMiddleware,
  authController.getMe
);

module.exports = router;