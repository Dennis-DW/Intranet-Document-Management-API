const express = require('express');
const router = express.Router();

const authenticationMiddleware = require('../middleware/authentication');
const notificationController = require('../controllers/notification.controller');

// All routes in this file are for the authenticated user
router.use(authenticationMiddleware);

// @route   GET /api/notifications
router.get('/', notificationController.getMyNotifications);

// @route   PUT /api/notifications/read
router.put('/read', notificationController.markNotificationsAsRead);

module.exports = router;