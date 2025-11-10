const express = require('express');
const router = express.Router();
const healthController = require('../controllers/health.controller');

// @route   GET /api/health
// @desc    Checks the health of the API and its database connection.
// @access  Public
router.get('/', healthController.checkHealth);

module.exports = router;