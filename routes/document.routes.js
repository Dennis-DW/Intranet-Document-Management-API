const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// Import middleware
const authenticationMiddleware = require('../middleware/authentication');
const { authorizeRoles, authorizeOwnerOrRoles } = require('../middleware/authorization');

// Import controller logic
const documentController = require('../controllers/document.controller');

// --- Multer Configuration for File Uploads ---
// Based on the blueprint's security requirements

// 1. Configure Disk Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Files are stored in the /uploads/ directory
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Generate a unique filename to prevent collisions and path traversal
    // e.g., '1a2b3c4d-original-filename.pdf'
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const extension = path.extname(file.originalname);
    const safeOriginalName = file.originalname
      .replace(/[^a-zA-Z0-9._-]/g, '_'); // Sanitize original name
    
    cb(null, `${uniqueSuffix}-${safeOriginalName}`);
  }
});

// 2. Configure File Filtering for Security
const fileFilter = (req, file, cb) => {
  // Define an allowed list of MIME types as per blueprint
  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    // Accept the file
    cb(null, true);
  } else {
    // Reject the file
    cb(new Error('Invalid file type. Only PDF, JPG, PNG, and Word documents are allowed.'), false);
  }
};

// 3. Initialize Multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 20 // 20MB file size limit (as per blueprint)
  }
});

// --- Document API Routes ---

// @route   GET /api/documents
// @desc    Lists all documents visible to the authenticated user
// @access  Private (Requires authentication)
router.get(
  '/',
  authenticationMiddleware,
  documentController.listDocuments
);

router.post(
  '/upload',
  authenticationMiddleware,
  authorizeRoles(['Admin', 'Manager']), // <-- This line is added
  upload.single('document'), // 'document' is the field name in the form-data
  documentController.uploadDocument
);

router.get(
  '/versions/:versionId/download',
  authenticationMiddleware,
  documentController.downloadDocument
);

router.delete(
  '/:id',
  authenticationMiddleware,
  authorizeOwnerOrRoles(['Admin']), // Owner or Admin can delete
  documentController.deleteDocument,
);

// @route   GET /api/documents/search
router.get(
  '/search',
  authenticationMiddleware,
  documentController.searchDocuments
);

// @route   GET /api/documents/:id/versions
router.get(
  '/:id/versions',
  authenticationMiddleware,
  documentController.listVersions
);

// @route   POST /api/documents/:id/versions
router.post(
  '/:id/versions', // Using :id to be consistent with other routes like DELETE and PUT
  authenticationMiddleware,
  authorizeOwnerOrRoles(['Admin']), // Owner or Admin can add a new version
  upload.single('document'),
  documentController.uploadNewVersion
);

// @route   PUT /api/documents/:id
// @desc    Updates a document's properties (accessLevel, tags)
// @access  Private (Owner or Admin)
router.put(
  '/:id',
  authenticationMiddleware,
  authorizeOwnerOrRoles(['Admin']), // Owner or Admin can update
  documentController.updateDocument,
);
module.exports = router;