const User = require('../models/user.model');
const Document = require('../models/document.model');
const DocumentVersion = require('../models/documentVersion.model');
const AuditLog = require('../models/auditLog.model');
const RefreshToken = require('../models/refreshToken.model');
const cache = require('../services/cache.service');

// @desc    Get aggregated statistics for an admin dashboard
// @route   GET /api/stats/dashboard
// @access  Private (Admin)
const getDashboardStats = async (req, res) => {
  const cacheKey = 'dashboard_stats';
  const cachedStats = cache.get(cacheKey);

  if (cachedStats) {
    return res.json(cachedStats);
  }

  try {
    // Use Promise.all to run queries concurrently for better performance
    const [
      totalUsers,
      usersByRole,
      totalDocuments,
      storageUsed,
      docsByAccess,
      docsByType,
      auditLogs,
      activeSessions,
      mostDownloaded,
    ] = await Promise.all([
      User.countDocuments(),
      User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]),
      Document.countDocuments(),
      DocumentVersion.aggregate([
        { $group: { _id: null, totalSize: { $sum: '$size' } } } // Sum of all versions
      ]),
      Document.aggregate([
        { $group: { _id: '$accessLevel', count: { $sum: 1 } } }
      ]),
      Document.aggregate([
        { $group: { _id: '$mimetype', count: { $sum: 1 } } }
      ]),
      AuditLog.aggregate([
        { $group: { _id: '$action', count: { $sum: 1 } } }
      ]),
      RefreshToken.countDocuments(),
      AuditLog.aggregate([
        { $match: { action: 'download' } },
        { $group: { _id: '$document', downloadCount: { $sum: 1 } } },
        { $sort: { downloadCount: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'documents', localField: '_id', foreignField: '_id', as: 'documentDetails' } },
        { $unwind: '$documentDetails' },
        { $project: { _id: 0, document: '$documentDetails.originalFilename', downloadCount: 1 } }
      ]),
    ]);

    // Format the results into a clean object
    const formattedStats = {
      users: {
        total: totalUsers,
        byRole: usersByRole.reduce((acc, role) => {
          acc[role._id] = role.count;
          return acc;
        }, {}),
      },
      documents: {
        total: totalDocuments,
        totalSizeInBytes: storageUsed[0]?.totalSize || 0,
        byAccessLevel: docsByAccess.reduce((acc, level) => {
          acc[level._id] = level.count;
          return acc;
        }, {}),
        byMimeType: docsByType.reduce((acc, type) => {
          acc[type._id] = type.count;
          return acc;
        }, {}),
      },
      activity: {
        ...auditLogs.reduce((acc, log) => {
          acc[`${log._id}s`] = log.count;
          return acc;
        }, {}),
        activeSessions: activeSessions,
        mostDownloaded: mostDownloaded,
      },
    };

    // Cache the result for 5 minutes (300 seconds)
    cache.set(cacheKey, formattedStats, 300);

    res.json(formattedStats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).send('Server Error');
  }
};

module.exports = {
  getDashboardStats,
};