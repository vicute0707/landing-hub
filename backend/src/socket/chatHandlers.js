const ChatRoom = require('../models/ChatRoom');
const ChatMessage = require('../models/ChatMessage');
const { buildAIContext, detectAdminNeed } = require('../services/ai/chatContextService');
const { generateStreamingResponse } = require('../services/ai/multiAIProvider');
const { createNotification } = require('../controllers/notificationController');

/**
 * Initialize chat socket handlers
 */
function initChatHandlers(io, socket) {
    const userId = socket.userId;

    console.log(`💬 User ${userId} connected to chat`);

    // Join user's personal room
    socket.join(`user_${userId}`);

    /**
     * Join a specific chat room
     */
    socket.on('join_room', async (data) => {
        console.log(`📥 [join_room] User ${userId} attempting to join room:`, data);

        try {
            const { roomId } = data;

            if (!roomId) {
                console.log(`❌ [join_room] No roomId provided by user ${userId}`);
                return socket.emit('error', {
                    message: 'Room ID is required'
                });
            }

            // Verify user has access to this room
            const room = await ChatRoom.findOne({
                _id: roomId,
                $or: [{ user_id: userId }, { admin_id: userId }]
            });

            if (!room) {
                console.log(`❌ [join_room] Room ${roomId} not found or user ${userId} has no access`);
                return socket.emit('error', {
                    message: 'Không có quyền truy cập phòng chat này'
                });
            }

            // Join the chat room
            socket.join(`chat_${roomId}`);
            console.log(`✅ [join_room] User ${userId} successfully joined room ${roomId} (socket: ${socket.id})`);

            socket.emit('joined_room', {
                roomId,
                status: room.status
            });
        } catch (error) {
            console.error(`❌ [join_room] Error for user ${userId}:`, error.message);
            socket.emit('error', {
                message: 'Không thể tham gia phòng chat'
            });
        }
    });

    /**
     * Leave a chat room
     */
    socket.on('leave_room', (data) => {
        const { roomId } = data;
        socket.leave(`chat_${roomId}`);
        console.log(`User ${userId} left room ${roomId}`);
    });

    /**
     * Send message (realtime)
     */
    socket.on('send_message', async (data) => {
        try {
            const { roomId, message } = data;

            if (!message || !message.trim()) {
                return socket.emit('error', {
                    message: 'Tin nhắn không được để trống'
                });
            }

            // Verify room access
            const room = await ChatRoom.findOne({
                _id: roomId,
                $or: [{ user_id: userId }, { admin_id: userId }]
            });

            if (!room) {
                return socket.emit('error', {
                    message: 'Không tìm thấy phòng chat'
                });
            }

            // Determine sender type
            const isUser = room.user_id.toString() === userId.toString();
            const senderType = isUser ? 'user' : 'admin';

            // Create message
            const newMessage = new ChatMessage({
                room_id: roomId,
                sender_id: userId,
                sender_type: senderType,
                message: message.trim()
            });

            await newMessage.save();

            // Populate sender info
            await newMessage.populate('sender_id', 'name email');

            // Update room
            room.last_message_at = new Date();
            if (room.status === 'open' && !isUser) {
                room.status = 'assigned';
            }
            await room.save();

            // Broadcast to room with full info
            io.to(`chat_${roomId}`).emit('new_message', {
                id: newMessage._id,
                room_id: roomId, // ✅ Added
                sender_type: senderType,
                sender_id: newMessage.sender_id?._id || userId,
                sender_name: newMessage.sender_id?.name || (senderType === 'admin' ? 'Admin' : 'User'), // ✅ Added
                message: newMessage.message,
                created_at: newMessage.createdAt
            });

            // Send notification to recipient
            const recipientId = isUser ? room.admin_id : room.user_id;
            if (recipientId) {
                await createNotification(
                    recipientId,
                    'chat_message',
                    isUser ? 'Tin nhắn mới từ người dùng' : 'Admin đã trả lời',
                    message.substring(0, 100),
                    {
                        roomId,
                        messageId: newMessage._id,
                        senderId: userId
                    }
                );
            }

            console.log(`📨 Message sent in room ${roomId} by ${senderType}`);
        } catch (error) {
            console.error('Error sending message:', error);
            socket.emit('error', {
                message: 'Không thể gửi tin nhắn'
            });
        }
    });

    /**
     * Send message with AI response (streaming)
     */
    socket.on('send_message_with_ai', async (data) => {
        console.log(`📥 [send_message_with_ai] Received from user ${userId}:`, {
            roomId: data?.roomId,
            messageLength: data?.message?.length,
            hasMessage: !!data?.message
        });

        try {
            const { roomId, message } = data;

            if (!message || !message.trim()) {
                console.log(`❌ [send_message_with_ai] Empty message from user ${userId}`);
                return socket.emit('error', {
                    message: 'Tin nhắn không được để trống'
                });
            }

            // Verify room
            const room = await ChatRoom.findOne({
                _id: roomId,
                user_id: userId
            });

            if (!room) {
                console.log(`❌ [send_message_with_ai] Room not found: ${roomId} for user ${userId}`);
                return socket.emit('error', {
                    message: 'Không tìm thấy phòng chat'
                });
            }

            console.log(`✅ [send_message_with_ai] Room found: ${roomId}, Status: ${room.status}, AI enabled: ${room.ai_enabled !== false} (value: ${room.ai_enabled}), Admin: ${room.admin_id || 'none'}`);

            // If room is closed/resolved, reopen it for new messages
            if (room.status === 'resolved' || room.status === 'closed') {
                console.log(`🔄 [send_message_with_ai] Reopening closed room ${roomId}`);
                room.status = 'open';
                room.ai_enabled = true;
                room.admin_id = null; // Clear admin to allow new support request
                room.resolved_at = null;
                await room.save();
                console.log(`✅ [send_message_with_ai] Room reopened and ready for new conversation`);
            }

            // Save user message
            let userMessage;
            try {
                userMessage = new ChatMessage({
                    room_id: roomId,
                    sender_id: userId,
                    sender_type: 'user',
                    message: message.trim()
                });
                await userMessage.save();

                // Populate sender info for broadcasting
                await userMessage.populate('sender_id', 'name email');
                console.log(`💾 [send_message_with_ai] User message saved: ${userMessage._id}, Sender: ${userMessage.sender_id?.name || 'Unknown'}`);
            } catch (msgError) {
                console.error(`❌ [send_message_with_ai] Failed to save user message:`, msgError.message);
                return socket.emit('error', {
                    message: 'Không thể lưu tin nhắn'
                });
            }

            // Broadcast user message with full info
            try {
                const messageData = {
                    id: userMessage._id,
                    room_id: roomId, // ✅ Added room_id!
                    sender_type: 'user',
                    sender_id: userMessage.sender_id?._id || userId,
                    sender_name: userMessage.sender_id?.name || 'Người dùng', // ✅ Added sender_name!
                    message: userMessage.message,
                    created_at: userMessage.createdAt
                };

                io.to(`chat_${roomId}`).emit('new_message', messageData);
                console.log(`📡 [send_message_with_ai] User message broadcasted to room chat_${roomId}:`, {
                    room: roomId,
                    sender: messageData.sender_name,
                    preview: messageData.message.substring(0, 30)
                });
            } catch (broadcastError) {
                console.error(`⚠️  [send_message_with_ai] Failed to broadcast user message:`, broadcastError.message);
                // Don't fail the operation, message is saved
            }

            // Check if needs admin
            const needsAdmin = detectAdminNeed(message);
            if (needsAdmin && !room.admin_id) {
                console.log(`🚨 [send_message_with_ai] Admin escalation detected for room ${roomId}`);
                try {
                    room.status = 'open';
                    room.priority = 'high';
                    await room.save();
                    console.log(`✅ [send_message_with_ai] Room status updated to open/high priority`);

                    const escalateMsg = new ChatMessage({
                        room_id: roomId,
                        sender_type: 'bot',
                        message: 'Tôi sẽ kết nối bạn với admin để được hỗ trợ tốt hơn nhé! 👨‍💼 Vui lòng chờ trong giây lát...'
                    });
                    await escalateMsg.save();
                    console.log(`💾 [send_message_with_ai] Escalation message saved: ${escalateMsg._id}`);

                    io.to(`chat_${roomId}`).emit('new_message', {
                        id: escalateMsg._id,
                        room_id: roomId, // ✅ Added
                        sender_type: 'bot',
                        sender_name: 'AI Assistant', // ✅ Added
                        message: escalateMsg.message,
                        created_at: escalateMsg.createdAt
                    });

                    // Notify admins
                    io.to('admin_room').emit('new_support_request', {
                        room_id: roomId,
                        user_id: userId,
                        message: message.trim(),
                        priority: 'high'
                    });
                    console.log(`📢 [send_message_with_ai] Admin notification sent to admin_room`);

                    // Create notification for user that request is escalated (non-blocking)
                    try {
                        await createNotification(
                            userId,
                            'chat_escalated',
                            'Yêu cầu hỗ trợ đã được chuyển',
                            'Chúng tôi sẽ kết nối bạn với admin trong giây lát',
                            { roomId }
                        );
                        console.log(`✅ [send_message_with_ai] Escalation notification created`);
                    } catch (notifError) {
                        console.warn('⚠️  [send_message_with_ai] Failed to create notification:', notifError.message);
                        // Don't fail the whole operation if notification fails
                    }

                    console.log(`✅ [send_message_with_ai] Escalation complete, emitting escalated_to_admin event`);
                    return socket.emit('escalated_to_admin', { roomId });
                } catch (escalateError) {
                    console.error(`❌ [send_message_with_ai] Escalation failed:`, escalateError.message, escalateError.stack);
                    socket.emit('error', {
                        message: 'Không thể chuyển yêu cầu tới admin. Vui lòng thử lại.'
                    });
                    // Continue to AI response as fallback
                }
            }

            // Generate AI response if enabled and no admin
            // Default to true if ai_enabled is undefined (for old rooms)
            const aiEnabled = room.ai_enabled !== false;
            if (aiEnabled && !room.admin_id) {
                console.log(`🤖 [send_message_with_ai] Starting AI response for room ${roomId}`);
                try {
                    // Build context
                    const context = await buildAIContext(userId, message, room.context);
                    console.log(`🔍 [send_message_with_ai] AI context built for user ${userId}`);

                    // Get conversation history
                    const history = await ChatMessage.find({ room_id: roomId })
                        .sort({ createdAt: -1 })
                        .limit(10)
                        .lean();

                    // Build messages for AI
                    const aiMessages = [
                        { role: 'system', content: context.systemPrompt }
                    ];

                    if (context.relevantData && Object.keys(context.relevantData).length > 0) {
                        aiMessages.push({
                            role: 'system',
                            content: `Dữ liệu hệ thống:\n${JSON.stringify(context.relevantData, null, 2)}`
                        });
                    }

                    history.reverse().forEach(msg => {
                        if (msg.sender_type === 'user') {
                            aiMessages.push({ role: 'user', content: msg.message });
                        } else if (msg.sender_type === 'bot') {
                            aiMessages.push({ role: 'assistant', content: msg.message });
                        }
                    });

                    // Stream AI response
                    let fullResponse = '';
                    let chunkCount = 0;

                    // Create temporary message ID for streaming
                    const tempMessageId = `temp_${Date.now()}`;

                    console.log(`📡 [send_message_with_ai] Emitting ai_response_start to socket ${socket.id}`);
                    socket.emit('ai_response_start', {
                        roomId,
                        messageId: tempMessageId
                    });

                    console.log(`🚀 [send_message_with_ai] Starting AI streaming response...`);
                    const aiResult = await generateStreamingResponse(
                        aiMessages,
                        (chunk) => {
                            fullResponse += chunk;
                            chunkCount++;

                            // Send chunk to client
                            socket.emit('ai_response_chunk', {
                                roomId,
                                messageId: tempMessageId,
                                chunk,
                                fullText: fullResponse
                            });

                            // Log every 10th chunk
                            if (chunkCount % 10 === 0) {
                                console.log(`📝 [send_message_with_ai] Streamed ${chunkCount} chunks, ${fullResponse.length} chars`);
                            }
                        }
                    );

                    console.log(`✅ [send_message_with_ai] AI streaming complete: ${chunkCount} chunks, provider: ${aiResult.provider}`);

                    // Save complete AI message
                    const aiMessage = new ChatMessage({
                        room_id: roomId,
                        sender_type: 'bot',
                        message: fullResponse,
                        ai_metadata: {
                            provider: aiResult.provider,
                            model: aiResult.model,
                            context_used: true,
                            response_time: aiResult.responseTime
                        }
                    });
                    await aiMessage.save();

                    // Send complete message
                    console.log(`📡 [send_message_with_ai] Emitting ai_response_complete to room chat_${roomId}`);
                    io.to(`chat_${roomId}`).emit('ai_response_complete', {
                        roomId,
                        messageId: aiMessage._id,
                        tempMessageId,
                        message: fullResponse,
                        provider: aiResult.provider,
                        created_at: aiMessage.createdAt
                    });

                    // Also emit as new_message so admin can see it
                    io.to(`chat_${roomId}`).emit('new_message', {
                        id: aiMessage._id,
                        room_id: roomId, // ✅ Added
                        sender_type: 'bot',
                        sender_name: 'AI Assistant', // ✅ Added
                        message: fullResponse,
                        created_at: aiMessage.createdAt,
                        ai_metadata: aiMessage.ai_metadata
                    });

                    console.log(`🎉 [send_message_with_ai] AI response complete: ${chunkCount} chunks, ${aiResult.responseTime}ms, ${fullResponse.length} chars`);

                } catch (error) {
                    console.error(`❌ [send_message_with_ai] AI response failed for room ${roomId}:`, error.message);
                    console.error('Error stack:', error.stack);

                    // Send fallback message
                    const fallbackMsg = new ChatMessage({
                        room_id: roomId,
                        sender_type: 'bot',
                        message: 'Xin lỗi, tôi đang gặp vấn đề kỹ thuật. Bạn có thể thử lại hoặc chat với admin để được hỗ trợ tốt hơn nhé! 😊'
                    });
                    await fallbackMsg.save();

                    io.to(`chat_${roomId}`).emit('new_message', {
                        id: fallbackMsg._id,
                        sender_type: 'bot',
                        message: fallbackMsg.message,
                        created_at: fallbackMsg.createdAt
                    });
                }
            } else {
                console.log(`ℹ️  [send_message_with_ai] AI not triggered - AI enabled: ${aiEnabled} (value: ${room.ai_enabled}), Admin: ${room.admin_id || 'none'}`);
            }

            // Update room timestamp
            try {
                room.last_message_at = new Date();
                await room.save();
                console.log(`✅ [send_message_with_ai] Handler completed for room ${roomId}`);
            } catch (saveError) {
                console.error(`⚠️  [send_message_with_ai] Failed to update room timestamp:`, saveError.message);
                // Don't fail the whole operation if room save fails
            }

        } catch (error) {
            console.error(`❌ [send_message_with_ai] Unexpected error for room ${data?.roomId}:`, error.message);
            console.error('Error stack:', error.stack);
            socket.emit('error', {
                message: 'Không thể gửi tin nhắn',
                details: error.message
            });
        }
    });

    /**
     * Mark messages as read
     */
    socket.on('mark_as_read', async (data) => {
        try {
            const { roomId } = data;

            // Verify room access
            const room = await ChatRoom.findOne({
                _id: roomId,
                $or: [{ user_id: userId }, { admin_id: userId }]
            });

            if (!room) return;

            const isUser = room.user_id.toString() === userId.toString();
            await ChatMessage.updateMany(
                { room_id: roomId, [isUser ? 'read_by_user' : 'read_by_admin']: false },
                { [isUser ? 'read_by_user' : 'read_by_admin']: true }
            );

            console.log(`✅ Messages marked as read in room ${roomId}`);
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    });

    /**
     * User is typing
     */
    socket.on('typing', (data) => {
        const { roomId } = data;
        socket.to(`chat_${roomId}`).emit('user_typing', {
            userId,
            roomId
        });
    });

    /**
     * User stopped typing
     */
    socket.on('stop_typing', (data) => {
        const { roomId } = data;
        socket.to(`chat_${roomId}`).emit('user_stop_typing', {
            userId,
            roomId
        });
    });

    /**
     * Disconnect
     */
    socket.on('disconnect', () => {
        console.log(`User ${userId} disconnected from chat`);
    });
}

module.exports = initChatHandlers;