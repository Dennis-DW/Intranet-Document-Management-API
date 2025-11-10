const Document = require('../models/document.model');
const DocumentVersion = require('../models/documentVersion.model');
const AuditLog = require('../models/auditLog.model');
const path = require('path');
const virusScanService = require('../services/virusScan.service');
const documentService = require('../services/document.service');
const { virusScanQueue } = require('../config/queue.config');
const { handleUploadError } = require('../utils/controller.helpers');

// @desc    Upload a new document
// @route   POST /api/documents/upload
// @access  Private (Admin or Manager)
const uploadDocument = async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const filePath = req.file.path; // This will be undefined with memoryStorage, which is fine

  try {
    const validAccessLevels = ['private', 'team', 'public'];
    let accessLevel = req.body.accessLevel || 'private';
    if (!validAccessLevels.includes(accessLevel)) {
      accessLevel = 'private';
    }
    const tags = req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : [];
    
    // The service now creates the DB entries first
    const { document, version } = await documentService.createDocument(req.file, req.user, accessLevel, tags);
    
    // Add a job to the queue for background processing
    await virusScanQueue.add('scan-new-file', { versionId: version._id, filePath });

    // Respond immediately with 202 Accepted
    res.status(202).json({
      message: "File accepted for processing. It will be available after a virus scan.",
      document: document
    });
  } catch (error) {
    handleUploadError(error, filePath, res);
  }
};

// @desc    Upload a new version of an existing document
// @route   POST /api/documents/:id/versions
// @access  Private (Owner or Admin)
const uploadNewVersion = async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const filePath = req.file.path; // This will be undefined with memoryStorage

  try {
    const newVersion = await documentService.createNewVersion(req.params.id, req.file, req.user);

    // Add job to the queue
    await virusScanQueue.add('scan-new-version', { versionId: newVersion._id, filePath });

    // Respond immediately
    res.status(202).json({
      message: "New version accepted for processing. It will be available after a virus scan.",
      version: newVersion
    });
  } catch (error) {
    handleUploadError(error, filePath, res);
  }
};

// @desc    List documents visible to the user
// @route   GET /api/documents
// @access  Private (Authenticated)
const listDocuments = async (req, res) => {
  try {
    const { tag, page = 1, limit = 20 } = req.query;
    const pageInt = parseInt(page, 10);
    const limitInt = parseInt(limit, 10);

    const documents = await documentService.findDocuments(req.user, tag, pageInt, limitInt);
    res.json(documents);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

// @desc    Search for documents by filename or tag
// @route   GET /api/documents/search
// @access  Private (Authenticated)
const searchDocuments = async (req, res) => {
  try {
    const { q: searchQuery, page = 1, limit = 20 } = req.query;
    if (!searchQuery) {
      return res.status(400).send('Search query "q" is required.');
    }
    const pageInt = parseInt(page, 10);
    const limitInt = parseInt(limit, 10);

    const documents = await documentService.searchDocuments(req.user, searchQuery, pageInt, limitInt);
    res.json(documents);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

// @desc    List all versions of a specific document
// @route   GET /api/documents/:id/versions
// @access  Private (Authenticated, with access checks)
const listVersions = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).send('Document not found.');
    }
    
    const hasAccess = await documentService.checkDocumentAccess(document, req.user);
    if (!hasAccess) {
      return res.status(403).send('Forbidden: You do not have access to this document.');
    }

    const versions = await DocumentVersion.find({ document: req.params.id })
      .populate('uploadedBy', 'username')
      .sort({ versionNumber: -1 });

    res.json(versions);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

// @desc    Download a specific document version
// @route   GET /api/documents/versions/:versionId/download
// @access  Private (Authenticated)
const downloadDocument = async (req, res) => {
  try {
    const version = await DocumentVersion.findById(req.params.versionId);
    if (!version) {
      return res.status(404).send('Document version not found.');
    }

    // Check the status of the version before allowing download
    if (version.status === 'pending_scan') {
      return res.status(422).send('File is pending virus scan and is not yet available for download.');
    }

    if (version.status === 'quarantined') {
      return res.status(410).send('This file has been quarantined and is not available for download.');
    }

    const document = await Document.findById(version.document);
    if (!document) {
      return res.status(404).send('Parent document not found.');
    }

    const hasAccess = await documentService.checkDocumentAccess(document, req.user);
    if (!hasAccess) {
      return res.status(403).send('Forbidden: You do not have access to this document.');
    }

    const filePath = path.join(__dirname, '..', 'uploads', version.storedFilename);

    res.download(filePath, document.originalFilename, async (err) => {
      if (err) {
        if (!res.headersSent) {
          console.error(`[Download Error] File not found on disk: ${filePath}`, err);
          return res.status(404).send('File not found on server.');
        }
      } else {
        try {
          await AuditLog.create({ user: req.user.id, document: document._id, action: 'download' });
        } catch (auditError) {
          console.error('Failed to create download audit log:', auditError);
        }
      }
    });
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res.status(500).send('Server Error');
    }
  }
};

// @desc    Delete a specific document and all its versions
// @route   DELETE /api/documents/:id
// @access  Private (Owner or Admin)
const deleteDocument = async (req, res) => {
  try {
    const result = await documentService.deleteDocumentAndVersions(req.params.id, req.user);
    res.status(200).json(result);
  } catch (error) {
    handleUploadError(error, null, res); // Use the same helper for consistent error responses
  }
};

// @desc    Update a document's access level or tags
// @route   PUT /api/documents/:id
// @access  Private (Owner or Admin)
const updateDocument = async (req, res) => {
  try {
    const documentId = req.params.id;
    const { accessLevel, tags } = req.body;
    const user = req.user;

    // Authorization is now handled by middleware.
    // We can proceed directly with the update logic.
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).send('Document not found.');
    }

    let hasChanged = false;
    const oldAccessLevel = document.accessLevel;

    // Update access level if provided
    if (accessLevel) {
      const validAccessLevels = ['private', 'team', 'public'];
      if (!validAccessLevels.includes(accessLevel)) {
        return res.status(400).send('Invalid accessLevel.');
      }
      if (document.accessLevel !== accessLevel) {
        document.accessLevel = accessLevel;
        hasChanged = true;
      }
    }

    // Update tags if provided
    if (tags) {
      document.tags = Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim());
      hasChanged = true;
    }

    if (hasChanged) {
      await document.save();
      // Log if access level changed specifically
      if (accessLevel && oldAccessLevel !== accessLevel) {
        await AuditLog.create({ user: user.id, document: document._id, action: 'access_change' });
      } else {
        // Log for other metadata changes like tags
        await AuditLog.create({ user: user.id, document: document._id, action: 'metadata_update' });
      }
    }

    res.status(200).json({
      message: 'Document updated successfully.',
      document,
    });

  } catch (error) {
    console.error('[Update Document Error]', error);
    res.status(500).send('Server Error');
  }
};

module.exports = {
  uploadDocument,
  uploadNewVersion,
  listDocuments,
  searchDocuments,
  listVersions,
  downloadDocument,
  deleteDocument,
  updateDocument,
};
