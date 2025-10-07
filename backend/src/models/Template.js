const mongoose = require("mongoose");

const templateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  style: { type: String, required: true },
  thumbnail: { type: String, required: true },
  filePath: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model("Template", templateSchema);
