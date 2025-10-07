const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const Landing = require('../models/Landing');

// GET /api/reports/:userId
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    // Tổng lead
    const totalLeads = await Lead.countDocuments({ userId });

    // Lead theo trạng thái
    const leadStatusAgg = await Lead.aggregate([
      { $match: { userId } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);
    const leadStatus = leadStatusAgg.map(item => ({ status: item._id, count: item.count }));

    // Tổng LP & lead per LP
    const lps = await Landing.find({ userId });
    const leadPerLP = await Lead.aggregate([
      { $match: { userId } },
      { $group: { _id: "$landingId", count: { $sum: 1 } } }
    ]);
    const lpStats = lps.map(lp => {
      const found = leadPerLP.find(l => l._id?.toString() === lp._id.toString());
      return { _id: lp._id, name: lp.name, leadCount: found ? found.count : 0 };
    });

    res.json({ totalLeads, leadStatus, lpStats });
  } catch (err) {
    console.error('❌ Báo cáo lỗi:', err);
    res.status(500).json({ totalLeads: 0, leadStatus: [], lpStats: [] });
  }
});

module.exports = router;
