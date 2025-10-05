const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');

// =====================
// 📌 GET /api/leads - Lấy danh sách tất cả leads
// =====================
router.get('/', async (req, res) => {
  try {
    console.log('📥 [GET] /api/leads');
    const leads = await Lead.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      count: leads.length,
      data: leads,
    });
  } catch (error) {
    console.error('❌ Get leads error:', error);
    res.status(500).json({ success: false, message: 'Lấy leads thất bại', error: error.message });
  }
});

// =====================
// 📌 POST /api/leads - Tạo mới lead
// =====================
router.post('/', async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    // Validate cơ bản
    if (!name || !email || !phone) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc (name, email, phone)' });
    }

    const lead = new Lead(req.body);
    await lead.save();

    res.status(201).json({
      success: true,
      message: 'Tạo lead thành công',
      data: lead,
    });
  } catch (error) {
    console.error('❌ Create lead error:', error);
    res.status(400).json({ success: false, message: 'Tạo lead thất bại', error: error.message });
  }
});

// =====================
// PUT /api/leads/:id - Cập nhật lead (status, hoặc thông tin)
router.put('/:id', async (req, res) => {
    console.log("📩 PUT /api/leads/:id nhận được:", req.params.id, req.body); // 🧠 Debug

  try {
    const { name, email, phone, status, notes } = req.body;

    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { name, email, phone, status, notes },
      { new: true, runValidators: true }
    );

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead không tồn tại' });
    }

    res.json({
      success: true,
      message: 'Cập nhật lead thành công',
      data: lead,
    });
  } catch (error) {
    console.error('❌ Update lead error:', error);
    res.status(500).json({ success: false, message: 'Cập nhật thất bại', error: error.message });
  }
});



// =====================
// 📌 DELETE /api/leads/:id - Xóa lead
// =====================
router.delete('/:id', async (req, res) => {
  try {
    console.log(`🗑 [DELETE] /api/leads/${req.params.id}`);
    const lead = await Lead.findByIdAndDelete(req.params.id);

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead không tồn tại' });
    }

    res.json({
      success: true,
      message: 'Xóa lead thành công',
    });
  } catch (error) {
    console.error('❌ Delete lead error:', error);
    res.status(500).json({ success: false, message: 'Xóa thất bại', error: error.message });
  }
});

module.exports = router;
