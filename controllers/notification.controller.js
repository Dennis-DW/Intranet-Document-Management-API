const Notification = require('../models/notification.model');

// @desc    Get all notifications for the current user
// @route   GET /api/notifications
// @access  Private
const getMyNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageInt = parseInt(page, 10);
    const limitInt = parseInt(limit, 10);
    const skip = (pageInt - 1) * limitInt;

    const query = { user: req.user.id };

    const [notifications, totalNotifications] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitInt),
      Notification.countDocuments(query)
    ]);

    res.json({
      notifications,
      pagination: {
        totalNotifications,
        totalPages: Math.ceil(totalNotifications / limitInt),
        currentPage: pageInt,
        limit: limitInt,
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

// @desc    Mark all unread notifications as read
// @route   PUT /api/notifications/read
// @access  Private
const markNotificationsAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, read: false },
      { $set: { read: true } }
    );
    res.status(200).send('Notifications marked as read.');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

module.exports = {
  getMyNotifications,
  markNotificationsAsRead,
};