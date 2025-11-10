const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const auditLogSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  document: {
    type: Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
  },
  action: {
    type: String,
    enum: ['upload', 'download', 'delete', 'access_change', 'version_upload', 'metadata_update'],
    required: true,
  },
}, { timestamps: true }); // timestamps adds createdAt, which is when the action happened

module.exports = mongoose.model('AuditLog', auditLogSchema);