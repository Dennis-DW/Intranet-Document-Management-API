const mongoose = require('mongoose');

// @desc    Check API and database health
// @route   GET /api/health
// @access  Public
const checkHealth = (req, res) => {
  const dbState = mongoose.connection.readyState;
  // 0: disconnected; 1: connected; 2: connecting; 3: disconnecting
  const isDbConnected = dbState === 1;

  if (isDbConnected) {
    res.status(200).json({
      status: 'ok',
      database: 'connected',
      uptime: process.uptime(),
    });
  } else {
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      dbState: dbState,
    });
  }
};

module.exports = {
  checkHealth,
};