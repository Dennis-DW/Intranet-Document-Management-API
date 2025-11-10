const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  message: {
    type: String,
    required: true,
  },
  link: {
    type: String, // e.g., '/documents/some-id' for frontend routing
  },
  read: {
    type: Boolean,
    default: false,
    index: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);