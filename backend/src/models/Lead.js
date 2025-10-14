// server/models/Lead.js (ĐÃ CẬP NHẬT)

const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['NOTE', 'CALL', 'EMAIL', 'MEETING'], 
    default: 'NOTE' 
  },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const leadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  status: { type: String, default: 'new', enum: ['new', 'processing', 'converted', 'lost'] },
  source: { type: String, default: 'Manual' },
  score: { type: Number, default: 0 },
  activities: [ActivitySchema],
  createdAt: { type: Date, default: Date.now },

  // ✅ BỔ SUNG CÁC TRƯỜNG MỚI TẠI ĐÂY
  company: { type: String },
  subject: { type: String },
  newsletter: { type: Boolean, default: false },
  // ===============================
});

module.exports = mongoose.model('Lead', leadSchema);