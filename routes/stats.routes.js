const express = require('express');
const router = express.Router();

// Import middleware
const authenticationMiddleware = require('../middleware/authentication');
const { authorize } = require('../middleware/authorization');

// Import controller
const statsController = require('../controllers/stats.controller');

// @route   GET /api/stats/dashboard
// @desc    Get aggregated statistics for an admin dashboard
// @access  Private (Admin)
router.get('/dashboard', authenticationMiddleware, authorize('Admin'), statsController.getDashboardStats);


module.exports = router;