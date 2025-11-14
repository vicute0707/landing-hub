const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  admin_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: ['open', 'assigned', 'resolved', 'closed'],
    default: 'open',
    index: true
  },
  subject: {
    type: String,
    default: 'Hỗ trợ chung'
  },
  // Context about what user is doing
  context: {
    page: String, // Current page route
    page_id: String, // If they're working on a specific landing page
    action: String, // 'building', 'marketplace', 'payment', etc.
    metadata: mongoose.Schema.Types.Mixed
  },
  last_message_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  // Track unread messages for each party
  unread_count_user: {
    type: Number,
    default: 0
  },
  unread_count_admin: {
    type: Number,
    default: 0
  },
  // Priority for admin dashboard
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  // Tags for categorization
  tags: [{
    type: String,
    enum: ['general', 'builder', 'marketplace', 'payment', 'deployment', 'account', 'technical', 'other']
  }],
  // User satisfaction rating after resolution
  rating: {
    score: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: String,
    rated_at: Date
  }
}, {
  timestamps: true
});

// Index for efficient queries
chatRoomSchema.index({ user_id: 1, status: 1 });
chatRoomSchema.index({ admin_id: 1, status: 1 });
chatRoomSchema.index({ last_message_at: -1 });

// Methods
chatRoomSchema.methods.assignAdmin = function(adminId) {
  this.admin_id = adminId;
  this.status = 'assigned';
  return this.save();
};

chatRoomSchema.methods.markResolved = function() {
  this.status = 'resolved';
  return this.save();
};

chatRoomSchema.methods.incrementUnreadUser = function() {
  this.unread_count_user += 1;
  this.last_message_at = new Date();
  return this.save();
};

chatRoomSchema.methods.incrementUnreadAdmin = function() {
  this.unread_count_admin += 1;
  this.last_message_at = new Date();
  return this.save();
};

chatRoomSchema.methods.resetUnreadUser = function() {
  this.unread_count_user = 0;
  return this.save();
};

chatRoomSchema.methods.resetUnreadAdmin = function() {
  this.unread_count_admin = 0;
  return this.save();
};

// Static methods
chatRoomSchema.statics.findOpenRooms = function() {
  return this.find({ status: { $in: ['open', 'assigned'] } })
    .sort({ last_message_at: -1 })
    .populate('user_id', 'name email')
    .populate('admin_id', 'name email');
};

chatRoomSchema.statics.findUserRooms = function(userId) {
  return this.find({ user_id: userId })
    .sort({ last_message_at: -1 })
    .populate('admin_id', 'name');
};

chatRoomSchema.statics.findAdminRooms = function(adminId) {
  return this.find({ admin_id: adminId, status: { $in: ['assigned', 'open'] } })
    .sort({ last_message_at: -1 })
    .populate('user_id', 'name email');
};

module.exports = mongoose.model('ChatRoom', chatRoomSchema);
