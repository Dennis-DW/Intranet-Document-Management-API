const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const documentVersionSchema = new Schema({
  document: {
    type: Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
    index: true,
  },
  versionNumber: {
    type: Number,
    required: true,
  },
  storedFilename: { type: String, required: true, unique: true },
  mimetype: { type: String, required: true },
  size: { type: Number, required: true },
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending_scan', 'available', 'quarantined'],
    default: 'pending_scan',
    required: true,
    index: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('DocumentVersion', documentVersionSchema);