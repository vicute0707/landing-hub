const express = require("express");
const router = express.Router();
const User = require("../models/User");

// 🟩 Lấy danh sách user
router.get("/", async (req, res) => {
    try {
        const users = await User.find().select("-password");
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: "Lỗi server", error: err.message });
    }
});

// 🟦 Tạo user mới (chỉ admin mới được gọi API này)
router.post("/", async (req, res) => {
    try {
        const { name, email, password, role, subscription } = req.body;

        // Kiểm tra trùng email
        const exist = await User.findOne({ email });
        if (exist) return res.status(400).json({ message: "Email đã tồn tại" });

        const user = new User({
            name,
            email,
            password: password || null,
            role: role || "user",
            subscription: subscription || "free",
        });

        await user.save();
        res.json({ message: "Tạo tài khoản thành công", user });
    } catch (err) {
        res.status(500).json({ message: "Lỗi server", error: err.message });
    }
});

// 🟨 Cập nhật user
router.put("/:id", async (req, res) => {
    try {
        const { name, email, role, subscription } = req.body;
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { name, email, role, subscription },
            { new: true }
        ).select("-password");
        if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: "Lỗi server", error: err.message });
    }
});

// 🟥 Xóa user
router.delete("/:id", async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: "Đã xóa user" });
    } catch (err) {
        res.status(500).json({ message: "Lỗi server", error: err.message });
    }
});

// 🔒 Toggle khóa / mở khóa tài khoản (chỉ admin)
router.patch("/:id/toggle-disable", async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "Không tìm thấy user" });
        }

        // Không cho tự khóa chính mình (nếu có req.user từ middleware)
        if (req.user && user._id.toString() === req.user.userId) {
            return res.status(400).json({ message: "Không thể khóa tài khoản của chính mình" });
        }

        user.isDisabled = !user.isDisabled;
        await user.save();

        res.json({
            message: user.isDisabled ? "Đã khóa tài khoản" : "Đã mở khóa tài khoản",
            isDisabled: user.isDisabled
        });
    } catch (err) {
        console.error("Toggle disable error:", err);
        res.status(500).json({ message: "Lỗi server", error: err.message });
    }
});

module.exports = router;