const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User"); // tạo model user nếu chưa có
require("dotenv").config();

// ===== Login =====
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email và mật khẩu là bắt buộc" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "Người dùng không tồn tại" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Mật khẩu không đúng" });

    // Tạo JWT
    const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      success: true,
      user: { userId: user._id, email: user.email, name: user.name },
      token,
    });
  } catch (err) {
    console.error("❌ Lỗi login:", err);
    res.status(500).json({ error: "Lỗi máy chủ" });
  }
});

// ===== Register =====
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "Tên, email và mật khẩu là bắt buộc" });

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ error: "Email đã được sử dụng" });

    const hashed = await bcrypt.hash(password, 10);
    user = await User.create({ name, email, password: hashed });

    const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ success: true, user: { userId: user._id, email: user.email, name: user.name }, token });
  } catch (err) {
    console.error("❌ Lỗi register:", err);
    res.status(500).json({ error: "Lỗi máy chủ" });
  }
});

module.exports = router;
