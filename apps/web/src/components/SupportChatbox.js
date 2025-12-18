import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import axios from 'axios';
import { initSocket, getSocket, emit, on } from '../utils/socket';
import './SupportChatbox.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const SupportChatbox = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [roomId, setRoomId] = useState(() => {
        // Initialize roomId from localStorage if exists
        return localStorage.getItem('chatRoomId') || null;
    });
    const [isConnected, setIsConnected] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [aiStreaming, setAiStreaming] = useState(false);
    const [streamingMessage, setStreamingMessage] = useState('');
    const [roomInfo, setRoomInfo] = useState(null); // Track room info (hasAdmin, aiEnabled, etc.)
    const [errorMessage, setErrorMessage] = useState('');

    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const cleanupFunctionsRef = useRef([]);
    const lastScrollRef = useRef(0);

    // Save roomId to localStorage whenever it changes
    useEffect(() => {
        if (roomId) {
            localStorage.setItem('chatRoomId', roomId);
        }
    }, [roomId]);

    // Auto-dismiss error after 5 seconds
    useEffect(() => {
        if (errorMessage) {
            const timer = setTimeout(() => setErrorMessage(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [errorMessage]);

    // Auto-scroll to bottom - optimized to prevent flickering
    const scrollToBottom = useCallback(() => {
        // Use requestAnimationFrame to batch DOM updates and prevent flickering
        requestAnimationFrame(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
        });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages.length, streamingMessage.length, scrollToBottom]); // Scroll on message count or streaming length change

    // Initialize chat room or load messages when chatbox opens
    useEffect(() => {
        if (isOpen) {
            if (roomId) {
                // If we have a roomId, just load messages
                console.log('📜 Loading messages for existing room:', roomId);
                loadMessages(roomId);
            } else {
                // Otherwise, create/get room (which will also load messages)
                initializeChatRoom();
            }
        }
    }, [isOpen]); // Only run when isOpen changes

    // Initialize Socket.IO
    useEffect(() => {
        if (roomId && !socketRef.current) {
            // Initialize socket using shared utility
            const socket = initSocket();

            if (!socket) {
                console.error('Failed to initialize socket - no token found');
                return;
            }

            socketRef.current = socket;

            // Setup connection status listeners
            const handleConnect = () => {
                console.log('✅ Socket.IO connected');
                setIsConnected(true);
                // Join room once connected
                emit('join_room', { roomId });
            };

            const handleDisconnect = () => {
                console.log('❌ Socket.IO disconnected');
                setIsConnected(false);
            };

            // Register all event listeners and store cleanup functions
            const cleanups = [];

            cleanups.push(on('connect', handleConnect));
            cleanups.push(on('disconnect', handleDisconnect));

            cleanups.push(on('joined_room', (data) => {
                console.log('✅ Joined room:', data.roomId);
            }));

            cleanups.push(on('new_message', (data) => {
                console.log('📨 New message received:', data);

                setMessages(prev => {
                    // Deduplication
                    const exists = prev.some(msg => msg.id === data.id);
                    if (exists) {
                        console.log('⚠️ Message already exists, skipping:', data.id);
                        return prev;
                    }

                    // Chuẩn hóa sender_type: nếu là admin thì set rõ 'admin'
                    const normalizedSenderType = data.sender_type === 'admin'
                        ? 'admin'
                        : data.sender_type || 'bot'; // fallback

                    return [...prev, {
                        id: data.id,
                        sender_type: normalizedSenderType,
                        message: data.message,
                        created_at: data.created_at,
                        message_type: data.message_type || 'text' // nếu có system message
                    }];
                });
            }));

            cleanups.push(on('ai_response_start', (data) => {
                console.log('🤖 AI response starting...');
                setAiStreaming(true);
                setStreamingMessage('');
            }));

            cleanups.push(on('ai_response_chunk', (data) => {
                setStreamingMessage(data.fullText);
            }));

            cleanups.push(on('ai_response_complete', (data) => {
                console.log('✅ AI response complete');
                setAiStreaming(false);
                setStreamingMessage('');
                setMessages(prev => {
                    // Check if message already exists (deduplication)
                    const exists = prev.some(msg => msg.id === data.messageId);
                    if (exists) {
                        console.log('⚠️  AI message already exists (from new_message event), skipping');
                        return prev;
                    }
                    return [...prev, {
                        id: data.messageId,
                        sender_type: 'bot',
                        message: data.message,
                        created_at: data.created_at
                    }];
                });
            }));

            cleanups.push(on('user_typing', () => {
                setIsTyping(true);
            }));

            cleanups.push(on('user_stop_typing', () => {
                setIsTyping(false);
            }));

            cleanups.push(on('admin_joined', (data) => {
                console.log('👨‍💼 Admin đã tham gia chat:', data);

                // Cập nhật trạng thái để biết đang chat với admin
                setRoomInfo(prev => ({
                    ...prev,
                    admin_id: data.admin_id || 'admin',
                    status: data.status || 'assigned',
                    ai_enabled: false
                }));

                // Thêm tin nhắn thông báo để người dùng biết
                setMessages(prev => [...prev, {
                    id: `system-admin-joined-${Date.now()}`,
                    sender_type: 'system',
                    message: 'Admin đã tham gia cuộc trò chuyện. Bạn đang được hỗ trợ trực tiếp! 👨‍💼',
                    created_at: new Date().toISOString()
                }]);
            }));

            cleanups.push(on('escalated_to_admin', () => {
                console.log('📢 Request escalated to admin');
            }));

            cleanups.push(on('room_deescalated', (data) => {
                console.log('🔙 Room de-escalated, back to AI');
                setRoomInfo(prev => ({ ...prev, admin_id: null, ai_enabled: true }));
            }));

            cleanups.push(on('room_closed', (data) => {
                console.log('🚪 Room closed by admin:', data);
                setRoomInfo(prev => ({
                    ...prev,
                    status: data.status,
                    admin_id: null,
                    ai_enabled: true
                }));
            }));

            cleanups.push(on('error', (data) => {
                console.error('❌ Socket error:', data.message);
                setErrorMessage(data.message || 'Đã xảy ra lỗi');
            }));

            // Store cleanup functions
            cleanupFunctionsRef.current = cleanups;

            // If already connected, join room immediately
            if (socket.connected) {
                setIsConnected(true);
                emit('join_room', { roomId });
            }

            return () => {
                // Cleanup all event listeners
                cleanupFunctionsRef.current.forEach(cleanup => cleanup());
                cleanupFunctionsRef.current = [];
                socketRef.current = null;
            };
        }
    }, [roomId]);

    const initializeChatRoom = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(
                `${API_URL}/api/chat/rooms`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                setRoomId(response.data.room.id);
                setRoomInfo(response.data.room); // Save room info
                loadMessages(response.data.room.id);
            }
        } catch (error) {
            console.error('Error initializing chat room:', error);
            setErrorMessage('Không thể khởi tạo chat. Vui lòng thử lại.');
        }
    };

    const loadMessages = useCallback(async (chatRoomId) => {
        if (!chatRoomId) return;

        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(
                `${API_URL}/api/chat/rooms/${chatRoomId}/messages`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                console.log('📜 Loaded messages:', response.data.messages.length, 'messages');
                setMessages(response.data.messages || []);
            }
        } catch (error) {
            console.error('Error loading messages:', error);
            // Don't show error to user for message loading
        }
    }, []);

    const handleSendMessage = () => {
        if (!inputMessage.trim() || !isConnected) {
            console.warn('Cannot send message - socket not connected or empty message');
            return;
        }

        // Prevent sending while AI is streaming to avoid multiple concurrent responses
        if (aiStreaming) {
            console.warn('⏳ Cannot send message - AI is currently responding. Please wait...');
            return;
        }

        const message = inputMessage.trim();
        setInputMessage('');

        console.log('📤 Sending message with AI:', message);

        // Send via Socket.IO with AI response
        emit('send_message_with_ai', {
            roomId,
            message
        });
    };

    const handleInputChange = (e) => {
        setInputMessage(e.target.value);

        // Emit typing indicator
        if (isConnected) {
            emit('typing', { roomId });

            // Clear existing timeout
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            // Stop typing after 1 second of no input
            typingTimeoutRef.current = setTimeout(() => {
                emit('stop_typing', { roomId });
            }, 1000);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const toggleChat = () => {
        setIsOpen(!isOpen);
    };

    const handleDeEscalate = async () => {
        if (!roomId) return;

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(
                `${API_URL}/api/chat/rooms/${roomId}/de-escalate`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                console.log('✅ De-escalated to AI:', response.data);
                setRoomInfo(response.data.room);
            }
        } catch (error) {
            console.error('Error de-escalating:', error);

            // User-friendly error messages
            let errorMsg = 'Không thể chuyển về chat với AI.';
            if (error.response?.status === 404) {
                errorMsg = 'Không tìm thấy cuộc hội thoại. Vui lòng làm mới trang.';
            } else if (error.response?.status === 401) {
                errorMsg = 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.';
            } else if (error.response?.status === 500) {
                errorMsg = 'Lỗi hệ thống. Vui lòng thử lại sau.';
            } else if (!error.response) {
                errorMsg = 'Không thể kết nối server. Kiểm tra kết nối mạng.';
            }

            setErrorMessage(errorMsg);
        }
    };

    const handleRequestAdmin = () => {
        if (!roomId || !isConnected) return;

        // Send a special message that will trigger admin escalation
        const adminRequest = "Tôi cần được hỗ trợ bởi admin. Vui lòng kết nối tôi với admin.";

        emit('send_message_with_ai', {
            roomId,
            message: adminRequest
        });

        console.log('📢 Requested admin support');
    };

    return (
        <>
            {/* Error Toast */}
            {errorMessage && (
                <div style={{
                    position: 'fixed',
                    bottom: '100px',
                    right: '20px',
                    background: '#ef4444',
                    color: 'white',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 10001,
                    maxWidth: '300px',
                    fontSize: '14px',
                    fontWeight: '500',
                    animation: 'slideInUp 0.3s ease'
                }}>
                    <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
                        <span>⚠️</span>
                        <div style={{ flex: 1 }}>{errorMessage}</div>
                        <button
                            onClick={() => setErrorMessage('')}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                padding: '0',
                                fontSize: '18px',
                                lineHeight: '1'
                            }}
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}

            {/* Chat Button */}
            <div className="chat-button" onClick={toggleChat}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H6L4 18V4H20V16Z" fill="white"/>
                </svg>
                {!isConnected && isOpen && (
                    <span className="connection-indicator offline"></span>
                )}
            </div>

            {/* Chat Window */}
            {isOpen && (
                <div className="chat-window">
                    {/* Header */}
                    <div className="chat-header">
                        <div style={{ flex: 1 }}>
                            <h3>💬 Hỗ trợ LandingHub</h3>
                            <span className="chat-status">
                {isConnected ? (
                    <>
                        <span className="status-dot online"></span>
                        <span style={{ color: '#6b7280', fontSize: '12px' }}>
    {roomInfo?.admin_id ? '👨‍💼 Admin đang hỗ trợ' : '🤖 AI sẵn sàng'}
  </span>
                    </>
                ) : (
                    <>
                        <span className="status-dot offline"></span>
                        <span style={{ color: '#ef4444' }}>Đang kết nối...</span>
                    </>
                )}
              </span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            {!roomInfo?.admin_id && isConnected ? (
                                <button
                                    onClick={handleRequestAdmin}
                                    title="Kết nối với admin để được hỗ trợ trực tiếp"
                                    style={{
                                        background: '#10b981',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        padding: '6px 12px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }}
                                >
                                    👨‍💼 Admin
                                </button>
                            ) : roomInfo?.admin_id ? (
                                <button
                                    onClick={handleDeEscalate}
                                    title="Quay lại chat với AI"
                                    style={{
                                        background: '#3b82f6',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        padding: '6px 12px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }}
                                >
                                    🤖 AI
                                </button>
                            ) : null}
                            <button className="close-btn" onClick={toggleChat}>✕</button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="chat-messages">
                        {messages.length === 0 && !aiStreaming && (
                            <div style={{
                                textAlign: 'center',
                                padding: '40px 20px',
                                color: '#9ca3af'
                            }}>
                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
                                <p style={{ margin: 0, fontSize: '14px' }}>
                                    Bắt đầu cuộc trò chuyện bằng cách gửi tin nhắn
                                </p>
                                <p style={{ margin: '8px 0 0 0', fontSize: '12px' }}>
                                    AI sẽ trả lời ngay lập tức
                                </p>
                            </div>
                        )}
                        {messages.map((msg, index) => (
                            <div
                                key={msg.id ?? `msg-${msg.sender_type}-${index}-${msg.created_at || Date.now()}`}
                                className={`message ${
                                    msg.sender_type === 'user' ? 'user'
                                        : msg.sender_type === 'admin' ? 'bot'  // dùng class bot để bên phải, hoặc tạo class riêng 'admin'
                                            : 'bot'
                                }`}
                            >
                                {msg.sender_type !== 'user' && (
                                    <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '4px', fontWeight: '600' }}>
                                        {msg.sender_type === 'bot' ? '🤖 AI Assistant'
                                            : msg.sender_type === 'admin' ? '👨‍💼 Admin'
                                                : 'Hệ thống'}
                                    </div>
                                )}
                                <div className="message-content">
                                    {msg.message_type === 'system' ? (
                                        <em style={{ color: '#6b7280' }}>{msg.message}</em>
                                    ) : (
                                        msg.message
                                    )}
                                </div>
                                <div className="message-time">
                                    {new Date(msg.created_at).toLocaleTimeString('vi-VN', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>
                            </div>
                        ))}

                        {/* AI Streaming Message */}
                        {aiStreaming && (
                            <div className="message bot">
                                <div style={{
                                    fontSize: '10px',
                                    color: '#6b7280',
                                    marginBottom: '4px',
                                    fontWeight: '600'
                                }}>
                                    🤖 AI Assistant
                                </div>
                                <div className="message-content streaming">
                                    {streamingMessage || 'Đang suy nghĩ...'}
                                    <span className="cursor">▊</span>
                                </div>
                            </div>
                        )}

                        {/* Typing Indicator */}
                        {isTyping && (
                            <div className="typing-indicator">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="chat-input">
  <textarea
      value={inputMessage}
      onChange={handleInputChange}
      onKeyPress={handleKeyPress}
      placeholder={aiStreaming ? "⏳ AI đang trả lời..." : "Nhập tin nhắn..."}
      rows="1"
      disabled={aiStreaming} // ← CHỈ disable khi AI đang trả lời
      style={{ resize: 'none' }} // Bonus: đẹp hơn
  />
                        <button
                            onClick={handleSendMessage}
                            disabled={!inputMessage.trim() || aiStreaming}
                            title={aiStreaming ? "Vui lòng đợi AI trả lời xong" : "Gửi tin nhắn"}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M2 21L23 12L2 3V10L17 12L2 14V21Z" fill="currentColor"/>
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default SupportChatbox;