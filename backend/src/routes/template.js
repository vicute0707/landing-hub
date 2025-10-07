// backend/routes/template.js
const express = require("express"); 
const router = express.Router();
const Template = require("../models/Template");

router.get("/", async (req, res) => {
  try {
    const templates = await Template.find();
    res.json(templates);
  } catch (err) {
    console.error("❌ Lỗi API /api/templates:", err);
    res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
  }
});

module.exports = router;
