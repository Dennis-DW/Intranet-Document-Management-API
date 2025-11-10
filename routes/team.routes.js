const express = require('express');
const router = express.Router();
const authenticationMiddleware = require('../middleware/authentication');
const { authorizeRoles } = require('../middleware/authorization');
const teamController = require('../controllers/team.controller');

// All routes in this file are private and require at least 'Manager' role
router.use(authenticationMiddleware, authorizeRoles(['Manager', 'Admin']));

// --- Team Management Endpoints ---

// @route   GET /api/team
// @desc    Get all users in the manager's team
// @access  Private (Manager, Admin)
router.get('/', teamController.getTeam);

// @route   GET /api/team/available
// @desc    Get all users who are not assigned to any team
// @access  Private (Manager, Admin)
router.get('/available', teamController.getAvailableUsers);

// @route   PUT /api/team/add/:userId
// @desc    Add a user to the manager's team
// @access  Private (Manager, Admin)
router.put('/add/:userId', teamController.addUserToTeam);

// @route   PUT /api/team/remove/:userId
// @desc    Remove a user from the manager's team
// @access  Private (Manager, Admin)
router.put('/remove/:userId', teamController.removeUserFromTeam);

module.exports = router;