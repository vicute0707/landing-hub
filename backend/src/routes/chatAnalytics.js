/**
 * Chat Analytics API Routes
 * Provides data for admin dashboard charts and trend analysis
 */

const express = require('express');
const router = express.Router();
const ChatRoom = require('../models/ChatRoom');
const ChatMessage = require('../models/ChatMessage');
const Page = require('../models/Page');
const MarketplacePage = require('../models/MarketplacePage');
const Transaction = require('../models/Transaction');
const {
  analyzeChatTrends,
  analyzeMarketplace,
  getSmartRecommendations,
  analyzeChatConversation,
  generateSuggestedReply
} = require('../services/analyticsAIService');

/**
 * GET /api/chat-analytics/trends
 * Chat volume and response time trends over the last 30 days
 */
router.get('/trends', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Chat volume by day
    const chatVolume = await ChatRoom.aggregate([
      {
        $match: {
          created_at: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$created_at' }
          },
          totalChats: { $sum: 1 },
          openChats: {
            $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] }
          },
          resolvedChats: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json({
      success: true,
      data: chatVolume
    });
  } catch (error) {
    console.error('Error fetching chat trends:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/chat-analytics/marketplace-trends
 * Marketplace sales and category trends
 */
router.get('/marketplace-trends', async (req, res) => {
  try {
    const { days = 30 } = req.query;

    // Sales by category
    const categoryStats = await MarketplacePage.aggregate([
      {
        $match: { status: 'ACTIVE' }
      },
      {
        $group: {
          _id: '$category',
          totalSales: { $sum: '$sold_count' },
          totalViews: { $sum: '$views' },
          pageCount: { $sum: 1 },
          avgPrice: { $avg: '$price' }
        }
      },
      {
        $sort: { totalSales: -1 }
      }
    ]);

    // Top templates
    const topTemplates = await MarketplacePage.find({ status: 'ACTIVE' })
      .sort({ sold_count: -1 })
      .limit(10)
      .select('title category price sold_count views rating')
      .lean();

    res.json({
      success: true,
      data: {
        categoryStats,
        topTemplates
      }
    });
  } catch (error) {
    console.error('Error fetching marketplace trends:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/chat-analytics/summary
 * Overview stats for admin dashboard
 */
router.get('/summary', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayChats, openChats, todayMessages, totalUsers, totalChats, resolvedToday] = await Promise.all([
      ChatRoom.countDocuments({ created_at: { $gte: today } }),
      ChatRoom.countDocuments({ status: { $in: ['open', 'assigned'] } }),
      ChatMessage.countDocuments({ created_at: { $gte: today } }),
      ChatRoom.distinct('user_id').then(users => users.length),
      ChatRoom.countDocuments(),
      ChatRoom.countDocuments({ status: 'resolved', updated_at: { $gte: today } })
    ]);

    // 🤖 AI Recommendations
    const recommendations = await getSmartRecommendations({
      openChats,
      todayChats,
      todayMessages,
      totalChats,
      resolvedToday
    });

    res.json({
      success: true,
      data: {
        todayChats,
        openChats,
        todayMessages,
        totalUsers,
        aiRecommendations: recommendations
      }
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/chat-analytics/ai-insights
 * AI-powered insights and analysis
 */
router.get('/ai-insights', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get chat statistics
    const [totalChats, openChats, resolvedChats, dailyTrends] = await Promise.all([
      ChatRoom.countDocuments({ created_at: { $gte: startDate } }),
      ChatRoom.countDocuments({ status: 'open', created_at: { $gte: startDate } }),
      ChatRoom.countDocuments({ status: 'resolved', created_at: { $gte: startDate } }),
      ChatRoom.aggregate([
        { $match: { created_at: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } },
        { $limit: 7 }
      ])
    ]);

    // Get marketplace statistics
    const [totalTemplates, categoryStats, topTemplate] = await Promise.all([
      MarketplacePage.countDocuments({ status: 'ACTIVE' }),
      MarketplacePage.aggregate([
        { $match: { status: 'ACTIVE' } },
        {
          $group: {
            _id: '$category',
            totalSales: { $sum: '$sold_count' },
            avgPrice: { $avg: '$price' },
            count: { $sum: 1 }
          }
        },
        { $sort: { totalSales: -1 } }
      ]),
      MarketplacePage.findOne({ status: 'ACTIVE' }).sort({ sold_count: -1 }).select('title sold_count')
    ]);

    // 🤖 AI Analysis
    const [chatInsights, marketplaceInsights] = await Promise.all([
      analyzeChatTrends({
        days,
        totalChats,
        openChats,
        resolvedChats,
        dailyTrends
      }),
      analyzeMarketplace({
        totalTemplates,
        totalSales: categoryStats.reduce((sum, cat) => sum + (cat.totalSales || 0), 0),
        topTemplate: topTemplate || {},
        topCategory: categoryStats[0]?._id || 'N/A',
        categories: categoryStats
      })
    ]);

    res.json({
      success: true,
      data: {
        chatInsights,
        marketplaceInsights
      }
    });
  } catch (error) {
    console.error('Error fetching AI insights:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/chat-analytics/conversation-analysis
 * Analyze specific conversation for admin
 */
router.post('/conversation-analysis', async (req, res) => {
  try {
    const { roomId } = req.body;

    const [room, messages] = await Promise.all([
      ChatRoom.findById(roomId),
      ChatMessage.find({ room_id: roomId }).sort({ created_at: 1 }).limit(20)
    ]);

    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }

    const analysis = await analyzeChatConversation(messages, room);

    res.json({
      success: true,
      data: { analysis }
    });
  } catch (error) {
    console.error('Error analyzing conversation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/chat-analytics/suggest-reply
 * Generate suggested reply for admin
 */
router.post('/suggest-reply', async (req, res) => {
  try {
    const { message, roomId } = req.body;

    const room = await ChatRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }

    const suggestedReply = await generateSuggestedReply(message, {
      subject: room.subject,
      tags: room.tags
    });

    res.json({
      success: true,
      data: { suggestedReply }
    });
  } catch (error) {
    console.error('Error generating suggested reply:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
