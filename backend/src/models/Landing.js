const mongoose = require("mongoose");

const LandingSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  htmlPath: { type: String, required: true }, // Đường dẫn truy cập HTML
  thumbnail: { type: String },
  type: { type: String },
  style: { type: String },
  createdAt: { type: Date, default: Date.now },
  landingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Landing' },

});

module.exports = mongoose.model("Landing", LandingSchema);
