/**
 * Chat Feedback & Manual Escalation Routes
 */

const express = require('express');
const router = express.Router();
const ChatMessage = require('../models/ChatMessage');
const ChatRoom = require('../models/ChatRoom');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * POST /api/chat/feedback
 * User feedback on AI responses
 */
router.post('/feedback', authMiddleware, async (req, res) => {
  try {
    const { messageId, isHelpful, roomId } = req.body;

    const message = await ChatMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    // Update AI metadata with feedback
    message.ai_metadata = {
      ...message.ai_metadata,
      feedback: isHelpful ? 'helpful' : 'not_helpful',
      feedback_at: new Date()
    };

    await message.save();

    // If not helpful, increase room priority
    if (!isHelpful) {
      const room = await ChatRoom.findById(roomId);
      if (room && room.priority === 'low') {
        room.priority = 'normal';
        await room.save();
      }
    }

    console.log(`📊 Feedback received: Message ${messageId} - ${isHelpful ? 'HELPFUL' : 'NOT HELPFUL'}`);

    res.json({
      success: true,
      message: 'Cảm ơn phản hồi của bạn!'
    });
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/chat/request-admin
 * User manually requests admin connection
 */
router.post('/request-admin', authMiddleware, async (req, res) => {
  try {
    const { roomId, reason } = req.body;
    const userId = req.user.userId;

    const room = await ChatRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }

    // Check if user owns this room
    if (room.user_id.toString() !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Update room priority and add tag
    room.priority = room.priority === 'low' ? 'normal' : room.priority;
    if (!room.tags.includes('user_requested_admin')) {
      room.tags.push('user_requested_admin');
    }

    await room.save();

    // Create system message
    const systemMessage = new ChatMessage({
      room_id: roomId,
      sender_id: userId,
      sender_type: 'bot',
      message: '👨‍💼 Bạn đã yêu cầu kết nối với Admin. Chúng tôi sẽ hỗ trợ bạn ngay! Vui lòng chờ trong giây lát...',
      message_type: 'system'
    });

    await systemMessage.save();

    // Import socket.io instance (will be set by server.js)
    const io = req.app.get('io');
    if (io) {
      // Broadcast to room
      io.to(`chat_room_${roomId}`).emit('chat:new_message', {
        message: systemMessage
      });

      // Notify all admins
      const admins = await User.find({ role: 'admin' });
      const user = await User.findById(userId);

      admins.forEach(admin => {
        io.to(`user_${admin._id.toString()}`).emit('chat:admin_needed', {
          room: {
            _id: room._id,
            user_id: user._id,
            subject: room.subject,
            priority: room.priority,
            tags: room.tags,
            last_message_at: room.last_message_at
          },
          user: {
            _id: user._id,
            name: user.name,
            email: user.email
          },
          reason: 'User requested admin support'
        });
      });

      console.log(`🔔 User ${user.name} manually requested admin for room ${roomId}`);
    }

    res.json({
      success: true,
      message: 'Đã gửi yêu cầu đến Admin',
      systemMessage
    });
  } catch (error) {
    console.error('Request admin error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
