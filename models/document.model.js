const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const documentSchema = new Schema({
  originalFilename: {
    type: String,
    required: true,
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  accessLevel: {
    type: String,
    enum: ['private', 'team', 'public'],
    default: 'private',
  },
  tags: {
    type: [String],
    index: true, // Index for faster tag-based filtering
  },
  latestVersion: {
    type: Schema.Types.ObjectId,
    ref: 'DocumentVersion',
  }
}, { timestamps: true });

// Add a text index on the filename and tags for full-text search
documentSchema.index({ originalFilename: 'text', tags: 'text' });

module.exports = mongoose.model('Document', documentSchema);