const mongoose = require('mongoose');

const cameraSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  deviceSerial: {
    type: String,
    required: [true, 'Device serial is required'],
    trim: true,
    maxlength: [50, 'Device serial cannot exceed 50 characters']
  },
  deviceName: {
    type: String,
    required: [true, 'Device name is required'],
    trim: true,
    maxlength: [100, 'Device name cannot exceed 100 characters']
  },
  verificationCode: {
    type: String,
    trim: true,
    maxlength: [20, 'Verification code cannot exceed 20 characters']
  },
  isEncrypted: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastSeen: {
    type: Date,
    default: null
  },
  capabilities: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Index for efficient queries
cameraSchema.index({ user: 1, deviceSerial: 1 }, { unique: true });
cameraSchema.index({ deviceSerial: 1 });

// Method to get camera without sensitive data
cameraSchema.methods.toJSON = function() {
  const camera = this.toObject();
  delete camera.verificationCode;
  return camera;
};

// Static method to find cameras by user
cameraSchema.statics.findByUser = function(userId) {
  return this.find({ user: userId, isActive: true }).sort({ createdAt: -1 });
};

// Static method to find camera by user and device serial
cameraSchema.statics.findByUserAndSerial = function(userId, deviceSerial) {
  return this.findOne({ user: userId, deviceSerial, isActive: true });
};

module.exports = mongoose.model('Camera', cameraSchema); 