const mongoose = require("mongoose");

const landingPageSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  templateId: { type: Number, required: true },
  name: String,
  landingPageUrl: String,
  htmlContent: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("LandingPage", landingPageSchema);
