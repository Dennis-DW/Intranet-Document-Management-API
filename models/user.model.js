const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['User', 'Admin', 'Manager'],
    default: 'User',
  },
  // This field will store the ID of this user's manager.
  // It will be null for Admins, Managers, and unassigned Users.
  manager: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  avatar: {
    type: String,
  },
}, { timestamps: true });

// Prevent an Admin from being assigned a manager
userSchema.pre('save', function(next) {
  if (this.role === 'Admin') {
    this.manager = null;
  }
  next();
});

module.exports = mongoose.model('User', userSchema);