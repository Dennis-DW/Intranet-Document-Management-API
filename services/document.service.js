const Document = require('../models/document.model');
const DocumentVersion = require('../models/documentVersion.model');
const User = require('../models/user.model');
const AuditLog = require('../models/auditLog.model');
const fs = require('fs');
const path = require('path');
const notificationService = require('./notification.service');

// --- Private Helper Functions ---

/**
 * Builds the base Mongoose query for document access based on user role.
 * @param {object} user - The authenticated user object.
 * @returns {object} A Mongoose query object.
 */
async function buildAccessQuery(user) {
  if (user.role === 'Admin') {
    return {}; // Admin sees all
  }
 
   // All authenticated users can see public documents and their own documents.
   const accessConditions = [
     { accessLevel: 'public' },
     { owner: user.id }
   ];
 
  if (user.role === 'Manager') {
    const teamMemberIds = (await User.find({ manager: user.id })).map(u => u._id);
    // A manager can also see team documents from their direct reports.
    // Their own team docs are already covered by the `owner: user.id` condition.
    accessConditions.push({ accessLevel: 'team', owner: { $in: teamMemberIds } });
  } else { // 'User' role
    if (user.manager) {
      // A user can see team documents from their manager.
      accessConditions.push({ accessLevel: 'team', owner: user.manager });
    }
  }
  return { $or: accessConditions };
}

// Common aggregation stages to populate related data and reshape the output
const aggregationPopulationStages = (includeTextScore = false) => {
  const projectStage = {
    _id: 1,
    originalFilename: 1,
    accessLevel: 1,
    tags: 1,
    createdAt: 1,
    updatedAt: 1,
    owner: { _id: '$ownerDetails._id', username: '$ownerDetails.username' },
    latestVersion: {
      _id: '$latestVersionDetails._id',
      versionNumber: '$latestVersionDetails.versionNumber',
      size: '$latestVersionDetails.size',
      mimetype: '$latestVersionDetails.mimetype',
      createdAt: '$latestVersionDetails.createdAt',
      status: '$latestVersionDetails.status',
      uploadedBy: { _id: '$uploaderDetails._id', username: '$uploaderDetails.username' }
    }
  };

  if (includeTextScore) {
    projectStage.score = { $meta: "textScore" };
  }

  return [
    { $lookup: { from: 'users', localField: 'owner', foreignField: '_id', as: 'ownerDetails' } },
    { $unwind: { path: '$ownerDetails', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'users', localField: 'latestVersionDetails.uploadedBy', foreignField: '_id', as: 'uploaderDetails' } },
    { $unwind: { path: '$uploaderDetails', preserveNullAndEmptyArrays: true } },
    { $project: projectStage }
  ];
}

// --- Public Service Functions ---

/**
 * Creates a new document and its first version.
 * The version will have a default status of 'pending_scan'.
 */
async function createDocument(file, user, accessLevel, tags) {
  const document = new Document({
    originalFilename: file.originalname,
    owner: user.id,
    accessLevel: accessLevel,
    tags: tags,
  });

  const documentVersion = new DocumentVersion({
    document: document._id,
    versionNumber: 1,
    storedFilename: file.filename,
    mimetype: file.mimetype,
    size: file.size,
    uploadedBy: user.id,
  });

  document.latestVersion = documentVersion._id;

  await documentVersion.save();
  await document.save();

  await AuditLog.create({ user: user.id, document: document._id, action: 'upload' });

  // --- NEW: Trigger notification for team ---
  await notificationService.notifyTeamOfNewDocument(document);

  return { document, version: documentVersion };
}

/**
 * Creates a new version for an existing document.
 */
async function createNewVersion(documentId, file, user) {
    // Authorization is now handled by middleware, so we can remove the check here.
    const document = await Document.findById(documentId);
    if (!document) {
      throw { status: 404, message: 'Document not found.' };
    }

    const latestVersion = await DocumentVersion.findById(document.latestVersion);
    const newVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

    const newVersion = new DocumentVersion({
      document: document._id,
      versionNumber: newVersionNumber,
      storedFilename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
      uploadedBy: user.id,
    });

    await newVersion.save();
    document.latestVersion = newVersion._id;
    await document.save();

    await AuditLog.create({ user: user.id, document: document._id, action: 'version_upload' });

    return newVersion;
}


/**
 * Lists documents based on user access and optional tag filtering.
 */
async function findDocuments(user, tag, page = 1, limit = 20) {
  const accessQuery = await buildAccessQuery(user);
  const finalQuery = tag ? { $and: [accessQuery, { tags: tag }] } : accessQuery;
  const skip = (page - 1) * limit;

  // Aggregation pipeline is used to filter based on the status of the related 'latestVersion'
  const pipeline = [
    { $match: finalQuery },
    { $lookup: { from: 'documentversions', localField: 'latestVersion', foreignField: '_id', as: 'latestVersionDetails' } },
    { $unwind: '$latestVersionDetails' },
    { $match: { 'latestVersionDetails.status': 'available' } },
  ];

  const countPipeline = [...pipeline, { $count: 'totalDocuments' }];
  const dataPipeline = [
    ...pipeline,
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
    ...aggregationPopulationStages()
  ];

  const [documents, totalResult] = await Promise.all([
    Document.aggregate(dataPipeline),
    Document.aggregate(countPipeline)
  ]);

  const totalDocuments = totalResult.length > 0 ? totalResult[0].totalDocuments : 0;

  return {
    documents,
    pagination: {
      totalDocuments,
      totalPages: Math.ceil(totalDocuments / limit),
      currentPage: page,
      limit,
    }
  };
}

/**
 * Searches documents using text index, respecting user access.
 */
async function searchDocuments(user, searchQuery, page = 1, limit = 20) {
  const accessQuery = await buildAccessQuery(user);
  const skip = (page - 1) * limit;

  const pipeline = [
    { $match: { $and: [accessQuery, { $text: { $search: searchQuery } }] } },
    { $lookup: { from: 'documentversions', localField: 'latestVersion', foreignField: '_id', as: 'latestVersionDetails' } },
    { $unwind: '$latestVersionDetails' },
    { $match: { 'latestVersionDetails.status': 'available' } },
  ];

  const countPipeline = [...pipeline, { $count: 'totalDocuments' }];
  const dataPipeline = [
    ...pipeline,
    { $sort: { score: { $meta: "textScore" } } },
    { $skip: skip },
    { $limit: limit },
    ...aggregationPopulationStages(true) // include text score
  ];

  const [documents, totalResult] = await Promise.all([
    Document.aggregate(dataPipeline),
    Document.aggregate(countPipeline)
  ]);

  const totalDocuments = totalResult.length > 0 ? totalResult[0].totalDocuments : 0;

  return {
    documents,
    pagination: {
      totalDocuments,
      totalPages: Math.ceil(totalDocuments / limit),
      currentPage: page,
      limit,
    }
  };
}

/**
 * Checks if a user has access to a specific document.
 */
async function checkDocumentAccess(document, user) {
    if (!document) return false;
    if (user.role === 'Admin') return true;
    if (document.accessLevel === 'public') return true;
    if (document.owner.toString() === user.id) return true;
    
    if (document.accessLevel === 'team') {
      const owner = await User.findById(document.owner);
      if (!owner) return false;

      if (user.role === 'Manager' && owner.manager && owner.manager.toString() === user.id) {
        return true;
      }
      if (user.role === 'User' && user.manager && document.owner.toString() === user.manager.toString()) {
        return true;
      }
    }
    return false;
}

/**
 * Deletes a document and all its associated versions and files.
 */
async function deleteDocumentAndVersions(documentId, user) {
    // Authorization is now handled by middleware, so we can remove the check here.
    const document = await Document.findById(documentId);
    if (!document) {
        throw { status: 404, message: 'Document not found.' };
    }

    const versions = await DocumentVersion.find({ document: document._id });
    for (const version of versions) {
        const filePath = path.join(__dirname, '..', 'uploads', version.storedFilename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }

    await DocumentVersion.deleteMany({ document: document._id });
    await Document.findByIdAndDelete(documentId);
    await AuditLog.create({ user: user.id, document: document._id, action: 'delete' }); // Create the final log entry

    return { message: 'Document deleted successfully.' };
}

module.exports = {
  createDocument,
  createNewVersion,
  findDocuments,
  searchDocuments,
  checkDocumentAccess,
  deleteDocumentAndVersions,
};