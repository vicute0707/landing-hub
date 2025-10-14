// routes/leads.js (PHIÊN BẢN HOÀN CHỈNH)

const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');

// =====================
// GET /api/leads - Lấy tất cả leads
// =====================
router.get('/', async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 }); 
    res.json(leads);
  } catch (error) {
    console.error('❌ Get leads error:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy leads' });
  }
});

// =====================
// POST /api/leads - Tạo lead mới với logic chấm điểm
// =====================
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, notes, source, company, subject, newsletter } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: 'Tên và Email là bắt buộc' });
    }

    // --- Logic chấm điểm chi tiết ---
    let score = 1;
    if (source === 'Contact Page') {
      if (company && company.trim() !== '') score++;
      if (subject && subject.trim() !== '') score++;
      if (notes && notes.trim().length > 0) score++;
      if (newsletter === true) score++;
    } else {
      if (notes && notes.trim().length > 0) score++;
    }
    const finalScore = Math.min(score, 5);
    // --- Kết thúc logic chấm điểm ---
    
    const initialActivity = notes ? [{ type: 'NOTE', content: notes.trim() }] : [];

    const newLead = new Lead({
      name, email, phone, company, subject, newsletter,
      source: source || 'Unknown',
      score: finalScore,
      activities: initialActivity,
      status: 'new',
    });

    await newLead.save();
    console.log(`✅ Lead từ '${source}' được tạo với ${finalScore} điểm.`);
    res.status(201).json(newLead);

  } catch (error) {
    console.error('❌ Lỗi khi tạo lead:', error);
    res.status(400).json({ message: 'Tạo lead thất bại', error: error.message });
  }
});

// =====================
// PUT /api/leads/:id - Cập nhật thông tin Lead
// =====================
router.put('/:id', async (req, res) => {
  try {
    const updatedLead = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updatedLead) return res.status(404).json({ message: 'Không tìm thấy lead' });
    console.log('🔄 Lead updated:', updatedLead._id);
    res.json(updatedLead);
  } catch (error) {
    console.error('❌ Update lead error:', error);
    res.status(500).json({ message: 'Cập nhật lead thất bại', error: error.message });
  }
});

// =====================
// POST /api/leads/:id/activities - Thêm một hoạt động mới cho Lead
// =====================
router.post('/:id/activities', async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Không tìm thấy lead' });

    const newActivity = {
      type: req.body.type || 'NOTE',
      content: req.body.content,
    };
    
    lead.activities.push(newActivity);
    await lead.save();

    console.log('📝 Activity added to lead:', lead._id);
    res.status(201).json(lead.activities[lead.activities.length - 1]);
  } catch (error) {
    console.error('❌ Add activity error:', error);
    res.status(500).json({ message: 'Thêm hoạt động thất bại', error: error.message });
  }
});

// =====================
// DELETE /api/leads/:id - Xóa một lead
// =====================
router.delete('/:id', async (req, res) => {
    try {
        const deletedLead = await Lead.findByIdAndDelete(req.params.id);
        if (!deletedLead) return res.status(404).json({ message: 'Không tìm thấy lead' });
        console.log('🗑️ Lead deleted:', req.params.id);
        res.json({ message: 'Xóa lead thành công' });
    } catch (error) {
        console.error('❌ Delete lead error:', error);
        res.status(500).json({ message: 'Xóa lead thất bại', error: error.message });
    }
});

module.exports = router;