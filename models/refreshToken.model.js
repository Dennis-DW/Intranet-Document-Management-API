const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Schema to store valid refresh tokens in the database.
 * This allows for a "stateful" check of refresh tokens,
 * enabling secure logout and session invalidation.
 */
const refreshTokenSchema = new Schema({
  token: {
    type: String,
    required: true,
    unique: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Set an expiry date on the token in the database
  // This can be used by a scheduled job to clean up old tokens
  expiresAt: {
    type: Date,
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
