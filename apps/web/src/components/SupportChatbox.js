import React, { useState, useEffect, useRef, useContext } from 'react';
import { UserContext } from '../context/UserContext';
import io from 'socket.io-client';
import axios from 'axios';
import {
  Box,
  IconButton,
  TextField,
  Typography,
  Avatar,
  Badge,
  Tooltip,
  CircularProgress,
  Button,
  Chip,
  Divider,
  Paper,
  Fade,
  Zoom,
  Snackbar,
  Alert,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Rating
} from '@mui/material';
import {
  Chat as ChatIcon,
  Close as CloseIcon,
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  Support as SupportIcon,
  Star as StarIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

// Styled components
const ChatContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isOpen'
})(({ theme, isOpen }) => ({
  position: 'fixed',
  bottom: 20,
  right: 20,
  width: isOpen ? 380 : 60,
  height: isOpen ? 600 : 60,
  backgroundColor: '#fff',
  borderRadius: isOpen ? 16 : 30,
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
  display: 'flex',
  flexDirection: 'column',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  zIndex: 9999,
  overflow: 'hidden'
}));

const ChatButton = styled(IconButton)(({ theme }) => ({
  width: 60,
  height: 60,
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: '#fff',
  '&:hover': {
    background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
    transform: 'scale(1.05)'
  },
  transition: 'all 0.2s'
}));

const ChatHeader = styled(Box)(({ theme }) => ({
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: '#fff',
  padding: '16px 20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between'
}));

const MessagesContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  overflowY: 'auto',
  padding: '16px',
  backgroundColor: '#f5f5f5',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  '&::-webkit-scrollbar': {
    width: '6px'
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: '3px'
  }
}));

const MessageBubble = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isOwn' && prop !== 'isBot'
})(({ theme, isOwn, isBot }) => ({
  maxWidth: '75%',
  padding: '10px 14px',
  borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
  backgroundColor: isBot ? '#e3f2fd' : isOwn ? '#667eea' : '#fff',
  color: isBot ? '#1976d2' : isOwn ? '#fff' : '#000',
  alignSelf: isOwn ? 'flex-end' : 'flex-start',
  wordWrap: 'break-word',
  boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
  position: 'relative'
}));

const InputContainer = styled(Box)(({ theme }) => ({
  padding: '16px',
  backgroundColor: '#fff',
  borderTop: '1px solid #e0e0e0',
  display: 'flex',
  gap: '8px',
  alignItems: 'flex-end'
}));

const TypingIndicator = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: '4px',
  padding: '10px 14px',
  backgroundColor: '#fff',
  borderRadius: '16px',
  width: 'fit-content',
  alignItems: 'center',
  '& .dot': {
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: '#999',
    animation: 'typing 1.4s infinite',
    '&:nth-of-type(2)': {
      animationDelay: '0.2s'
    },
    '&:nth-of-type(3)': {
      animationDelay: '0.4s'
    }
  },
  '@keyframes typing': {
    '0%, 60%, 100%': {
      transform: 'translateY(0)',
      opacity: 0.7
    },
    '30%': {
      transform: 'translateY(-10px)',
      opacity: 1
    }
  }
}));

const QuickActionButton = styled(Button)(({ theme }) => ({
  borderRadius: 20,
  textTransform: 'none',
  padding: '8px 16px',
  fontSize: '0.85rem'
}));

const SupportChatbox = () => {
  const { user } = useContext(UserContext);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [room, setRoom] = useState(null);
  const [socket, setSocket] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [adminOnline, setAdminOnline] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState({}); // Track feedback per message
  const [requestingAdmin, setRequestingAdmin] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [failedMessages, setFailedMessages] = useState(new Set());
  const [imagePreview, setImagePreview] = useState(null);
  const [ratingDialog, setRatingDialog] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Helper function to show toast notifications
  const showToast = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const closeSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Initialize socket connection
  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('token');
    const newSocket = io(API_URL, {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected');
      // Check admin online status
      newSocket.emit('chat:get_admin_status');
    });

    // Handle reconnection - rejoin room automatically
    newSocket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
      showToast('Đã kết nối lại! 🎉', 'success');
      // Re-join room if exists
      if (room) {
        console.log('🔄 Re-joining room:', room._id);
        newSocket.emit('chat:join_room', { roomId: room._id });
        // Reload messages to get any missed messages
        loadMessagesForRoom(room._id);
      }
      // Re-check admin status
      newSocket.emit('chat:get_admin_status');
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
      showToast('Lỗi kết nối. Đang thử lại...', 'warning');
    });

    newSocket.on('disconnect', (reason) => {
      console.log('⚠️ Socket disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server forcefully disconnected, reconnect manually
        showToast('Mất kết nối. Đang kết nối lại...', 'info');
        newSocket.connect();
      } else if (reason === 'io client disconnect') {
        // Manual disconnect, no action needed
      } else {
        showToast('Mất kết nối. Đang tự động kết nối lại...', 'warning');
      }
    });

    // Listen to global admin status broadcasts
    newSocket.on('chat:admin_status', (data) => {
      console.log('📡 Admin status update:', data.admins);
      const hasOnlineAdmin = data.admins.some(admin => admin.isOnline);
      setAdminOnline(hasOnlineAdmin);
    });

    newSocket.on('chat:new_message', (data) => {
      setMessages(prev => {
        // Remove optimistic messages with temp IDs
        const filtered = prev.filter(msg =>
          !(msg.__optimistic && msg._id && msg._id.toString().startsWith('temp-'))
        );
        // Add real message from server
        return [...filtered, data.message];
      });
      scrollToBottom();

      // Update unread count if chat is closed
      if (!isOpen) {
        setUnreadCount(prev => prev + 1);
      }
    });

    newSocket.on('chat:joined_room', (data) => {
      console.log('✅ Joined room:', data.room);
      setRoom(data.room);

      // Update admin info if available
      if (data.room.admin_info) {
        console.log('👨‍💼 Admin assigned:', data.room.admin_info);
        setAdminOnline(data.room.admin_info.isOnline);
      }
    });

    newSocket.on('chat:user_typing', (data) => {
      if (data.userId !== user.id) {
        setIsTyping(data.isTyping);
      }
    });

    newSocket.on('chat:admin_assigned', (data) => {
      setRoom(data.room);
      setMessages(prev => [...prev, data.systemMessage]);
      setAdminOnline(true);
    });

    newSocket.on('chat:room_closed', (data) => {
      setMessages(prev => [...prev, data.systemMessage]);
      setRoom(prev => ({ ...prev, status: 'resolved' }));
      // Show rating dialog after a short delay
      setTimeout(() => {
        setRatingDialog(true);
      }, 1000);
    });

    newSocket.on('chat:error', (data) => {
      console.error('Chat error:', data.message);
      showToast(data.message, 'error');
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user, API_URL, isOpen]);

  // Helper function to load messages for a room
  const loadMessagesForRoom = async (roomId) => {
    try {
      const messagesResponse = await axios.get(`${API_URL}/api/chat/rooms/${roomId}/messages`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setMessages(messagesResponse.data.messages);
      scrollToBottom();
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  // Get or create chat room when opening
  const initializeChatRoom = async () => {
    try {
      setIsLoading(true);

      // Get current page context
      const context = {
        page: window.location.pathname,
        action: determineAction(window.location.pathname),
        timestamp: new Date().toISOString()
      };

      const response = await axios.post(`${API_URL}/api/chat/rooms`,
        { context },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      const roomData = response.data.room;
      setRoom(roomData);

      // Join socket room
      socket.emit('chat:join_room', { roomId: roomData._id });

      // Load messages
      const messagesResponse = await axios.get(`${API_URL}/api/chat/rooms/${roomData._id}/messages`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      setMessages(messagesResponse.data.messages);
      setUnreadCount(0);
      scrollToBottom();
    } catch (error) {
      console.error('Failed to initialize chat:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Determine user action based on current path
  const determineAction = (path) => {
    if (path.includes('/create')) return 'building';
    if (path.includes('/marketplace')) return 'marketplace';
    if (path.includes('/payment')) return 'payment';
    if (path.includes('/dashboard')) return 'dashboard';
    return 'general';
  };

  // Open chat
  const handleOpen = () => {
    setIsOpen(true);
    if (!room) {
      initializeChatRoom();
    } else {
      setUnreadCount(0);
    }
  };

  // Close chat
  const handleClose = () => {
    setIsOpen(false);
    if (room && socket) {
      socket.emit('chat:leave_room', { roomId: room._id });
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !room || !socket) return;

    const messageText = inputMessage.trim();
    setInputMessage('');

    // Stop typing indicator
    socket.emit('chat:typing', { roomId: room._id, isTyping: false });

    // 🚀 OPTIMISTIC UPDATE: Add message to UI immediately
    const optimisticMessage = {
      _id: `temp-${Date.now()}`,
      room_id: room._id,
      sender_id: user,
      sender_type: 'user',
      message: messageText,
      message_type: 'text',
      createdAt: new Date().toISOString(),
      __optimistic: true
    };

    setMessages(prev => [...prev, optimisticMessage]);
    scrollToBottom();

    // Send message via socket
    socket.emit('chat:send_message', {
      roomId: room._id,
      message: messageText,
      message_type: 'text',
      enableAI: !room.admin_id // Enable AI only if no admin assigned
    });
  };

  // Handle typing
  const handleTyping = (e) => {
    setInputMessage(e.target.value);

    if (!socket || !room) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Emit typing start
    socket.emit('chat:typing', { roomId: room._id, isTyping: true });

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('chat:typing', { roomId: room._id, isTyping: false });
    }, 2000);
  };

  // Handle file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !room) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      showToast('File quá lớn! Tối đa 10MB', 'error');
      return;
    }

    // Show image preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(
        `${API_URL}/api/chat/rooms/${room._id}/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          }
        }
      );

      // Send message with attachment
      socket.emit('chat:send_message', {
        roomId: room._id,
        message: file.type.startsWith('image/') ? `🖼️ ${file.name}` : `📎 ${file.name}`,
        message_type: response.data.file.type,
        attachments: [response.data.file]
      });

      showToast('Upload thành công! ✅', 'success');
      setImagePreview(null);
    } catch (error) {
      console.error('File upload error:', error);
      showToast('Không thể upload file. Vui lòng thử lại.', 'error');
      setImagePreview(null);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Quick action buttons
  const handleQuickAction = (question) => {
    setInputMessage(question);
    setTimeout(() => handleSendMessage(), 100);
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle AI feedback
  const handleAIFeedback = async (messageId, isHelpful) => {
    try {
      await axios.post(
        `${API_URL}/api/chat/feedback`,
        { messageId, isHelpful, roomId: room._id },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      setFeedbackGiven(prev => ({ ...prev, [messageId]: isHelpful }));

      // If not helpful, suggest admin
      if (!isHelpful) {
        setTimeout(() => {
          const shouldConnectAdmin = window.confirm(
            'Xin lỗi câu trả lời chưa hữu ích. Bạn có muốn kết nối với Admin không?'
          );
          if (shouldConnectAdmin) {
            handleRequestAdmin();
          }
        }, 500);
      }
    } catch (error) {
      console.error('Feedback error:', error);
    }
  };

  // Request admin connection
  const handleRequestAdmin = async () => {
    if (!room || !socket || requestingAdmin) return;

    setRequestingAdmin(true);

    try {
      await axios.post(
        `${API_URL}/api/chat/request-admin`,
        { roomId: room._id, reason: 'user_requested' },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      // Socket will handle the escalation on backend
      showToast('Đã gửi yêu cầu đến Admin. Admin sẽ hỗ trợ bạn trong giây lát! 👨‍💼', 'success');
    } catch (error) {
      console.error('Request admin error:', error);
      showToast('Không thể kết nối với Admin. Vui lòng thử lại sau.', 'error');
    } finally {
      setRequestingAdmin(false);
    }
  };

  // Handle rating submission
  const handleSubmitRating = async () => {
    if (!room || rating === 0) {
      showToast('Vui lòng chọn số sao đánh giá', 'warning');
      return;
    }

    try {
      await axios.post(
        `${API_URL}/api/chat/rooms/${room._id}/rate`,
        { score: rating, feedback: ratingFeedback },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      showToast('Cảm ơn đánh giá của bạn! ⭐', 'success');
      setRatingDialog(false);
      setRating(0);
      setRatingFeedback('');
    } catch (error) {
      console.error('Rating error:', error);
      showToast('Không thể gửi đánh giá. Vui lòng thử lại.', 'error');
    }
  };

  // Don't show chatbox for admin users - they use admin dashboard instead
  if (!user || user.role === 'admin') return null;

  return (
    <>
      <ChatContainer isOpen={isOpen}>
        {!isOpen ? (
          <Tooltip title="Hỗ trợ" placement="left">
            <ChatButton onClick={handleOpen}>
              <Badge badgeContent={unreadCount} color="error">
                <SupportIcon sx={{ fontSize: 28 }} />
              </Badge>
            </ChatButton>
          </Tooltip>
        ) : (
          <>
            {/* Header */}
            <ChatHeader>
              <Box display="flex" alignItems="center" gap={1}>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.3)' }}>
                  <SupportIcon />
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Hỗ trợ Landing Hub
                  </Typography>
                  <Typography variant="caption">
                    {adminOnline ? (
                      <><span style={{color: '#4ade80'}}>●</span> Admin đang online</>
                    ) : (
                      <><span style={{color: '#fbbf24'}}>●</span> AI Bot sẵn sàng hỗ trợ</>
                    )}
                  </Typography>
                </Box>
              </Box>
              <IconButton onClick={handleClose} sx={{ color: '#fff' }} size="small">
                <CloseIcon />
              </IconButton>
            </ChatHeader>

            {/* Messages */}
            <MessagesContainer>
              {isLoading ? (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  {messages.length === 0 && (
                    <Box textAlign="center" py={4}>
                      <Avatar sx={{ bgcolor: '#667eea', width: 60, height: 60, margin: '0 auto 16px' }}>
                        <ChatIcon fontSize="large" />
                      </Avatar>
                      <Typography variant="h6" gutterBottom>
                        Chào mừng! 👋
                      </Typography>
                      <Typography variant="body2" color="textSecondary" mb={2}>
                        Bạn cần hỗ trợ gì hôm nay?
                      </Typography>

                      {/* Quick action buttons */}
                      <Box display="flex" flexDirection="column" gap={1} mt={2}>
                        <QuickActionButton
                          variant="outlined"
                          onClick={() => handleQuickAction('Làm sao để tạo landing page?')}
                        >
                          🎨 Tạo landing page
                        </QuickActionButton>
                        <QuickActionButton
                          variant="outlined"
                          onClick={() => handleQuickAction('Cách publish page lên domain?')}
                        >
                          🚀 Deploy & Domain
                        </QuickActionButton>
                        <QuickActionButton
                          variant="outlined"
                          onClick={() => handleQuickAction('Mua template ở marketplace')}
                        >
                          🛒 Mua template
                        </QuickActionButton>
                      </Box>
                    </Box>
                  )}

                  {messages.map((msg, index) => (
                    <Box key={msg._id || index}>
                      {msg.message_type === 'system' ? (
                        <Box textAlign="center" my={1}>
                          <Chip label={msg.message} size="small" />
                        </Box>
                      ) : (
                        <Box display="flex" flexDirection="column" alignItems={msg.sender_type === 'user' ? 'flex-end' : 'flex-start'}>
                          <Box display="flex" gap={1} alignItems="flex-end">
                            {msg.sender_type !== 'user' && (
                              <Avatar sx={{ width: 24, height: 24, bgcolor: msg.sender_type === 'bot' ? '#1976d2' : '#667eea' }}>
                                {msg.sender_type === 'bot' ? <BotIcon sx={{ fontSize: 14 }} /> : <PersonIcon sx={{ fontSize: 14 }} />}
                              </Avatar>
                            )}
                            <MessageBubble isOwn={msg.sender_type === 'user'} isBot={msg.sender_type === 'bot'}>
                              {msg.message}
                              {msg.attachments && msg.attachments.length > 0 && (
                                <Box mt={1}>
                                  {msg.attachments.map((att, i) => (
                                    att.type === 'image' ? (
                                      <img key={i} src={att.url} alt={att.filename} style={{ maxWidth: '100%', borderRadius: 8 }} />
                                    ) : (
                                      <a key={i} href={att.url} target="_blank" rel="noopener noreferrer">
                                        {att.filename}
                                      </a>
                                    )
                                  ))}
                                </Box>
                              )}
                            </MessageBubble>
                          </Box>
                          <Typography variant="caption" color="textSecondary" sx={{ ml: msg.sender_type !== 'user' ? 5 : 0, mt: 0.5 }}>
                            {new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </Typography>

                          {/* AI Feedback Buttons */}
                          {msg.sender_type === 'bot' && (!room.admin_id || !room.admin_id._id) && !feedbackGiven[msg._id] && (
                            <Box display="flex" gap={0.5} ml={msg.sender_type !== 'user' ? 5 : 0} mt={0.5}>
                              <Tooltip title="Câu trả lời hữu ích">
                                <IconButton
                                  size="small"
                                  onClick={() => handleAIFeedback(msg._id, true)}
                                  sx={{
                                    fontSize: '0.75rem',
                                    padding: '2px 6px',
                                    bgcolor: '#e8f5e9',
                                    '&:hover': { bgcolor: '#c8e6c9' }
                                  }}
                                >
                                  👍
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Cần hỗ trợ thêm">
                                <IconButton
                                  size="small"
                                  onClick={() => handleAIFeedback(msg._id, false)}
                                  sx={{
                                    fontSize: '0.75rem',
                                    padding: '2px 6px',
                                    bgcolor: '#ffebee',
                                    '&:hover': { bgcolor: '#ffcdd2' }
                                  }}
                                >
                                  👎
                                </IconButton>
                              </Tooltip>
                            </Box>
                          )}

                          {/* Feedback given confirmation */}
                          {msg.sender_type === 'bot' && feedbackGiven[msg._id] !== undefined && (
                            <Typography variant="caption" color="textSecondary" sx={{ ml: 5, mt: 0.5, fontStyle: 'italic' }}>
                              {feedbackGiven[msg._id] ? '✓ Cảm ơn phản hồi!' : '✓ Đã ghi nhận'}
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Box>
                  ))}

                  {isTyping && (
                    <TypingIndicator>
                      <div className="dot" />
                      <div className="dot" />
                      <div className="dot" />
                    </TypingIndicator>
                  )}

                  <div ref={messagesEndRef} />
                </>
              )}
            </MessagesContainer>

            {/* Connect to Admin Button */}
            {room && room.status !== 'resolved' && (!room.admin_id || !room.admin_id._id) && (
              <Box px={2} pb={1}>
                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  startIcon={<PersonIcon />}
                  onClick={handleRequestAdmin}
                  disabled={requestingAdmin}
                  sx={{
                    borderColor: '#667eea',
                    color: '#667eea',
                    fontSize: '0.8rem',
                    py: 0.5,
                    '&:hover': {
                      borderColor: '#764ba2',
                      bgcolor: '#f5f3ff'
                    }
                  }}
                >
                  {requestingAdmin ? 'Đang kết nối...' : '💬 Kết nối với Admin'}
                </Button>
              </Box>
            )}

            {/* Image Preview & Upload Progress */}
            {(imagePreview || isUploading) && (
              <Box px={2} pb={1}>
                {imagePreview && (
                  <Box mb={1} position="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      style={{
                        maxWidth: '200px',
                        maxHeight: '200px',
                        borderRadius: '8px',
                        objectFit: 'cover'
                      }}
                    />
                    {!isUploading && (
                      <IconButton
                        size="small"
                        onClick={() => {
                          setImagePreview(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}
                        sx={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          bgcolor: 'rgba(0,0,0,0.6)',
                          color: '#fff',
                          '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' }
                        }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                )}
                {isUploading && (
                  <>
                    <Box display="flex" alignItems="center" gap={1}>
                      <LinearProgress variant="determinate" value={uploadProgress} sx={{ flex: 1 }} />
                      <Typography variant="caption">{uploadProgress}%</Typography>
                    </Box>
                    <Typography variant="caption" color="textSecondary">
                      Đang upload {imagePreview ? 'hình ảnh' : 'file'}...
                    </Typography>
                  </>
                )}
              </Box>
            )}

            {/* Input */}
            {room && room.status !== 'resolved' && (
              <InputContainer>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                  accept="image/*,.pdf,.doc,.docx,.txt"
                />
                <IconButton
                  onClick={() => fileInputRef.current.click()}
                  size="small"
                  disabled={isUploading}
                >
                  <AttachFileIcon />
                </IconButton>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Nhập tin nhắn..."
                  value={inputMessage}
                  onChange={handleTyping}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  multiline
                  maxRows={3}
                />
                <IconButton
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim()}
                  sx={{
                    bgcolor: inputMessage.trim() ? '#667eea' : 'transparent',
                    color: inputMessage.trim() ? '#fff' : 'inherit',
                    '&:hover': {
                      bgcolor: inputMessage.trim() ? '#764ba2' : 'transparent'
                    }
                  }}
                >
                  <SendIcon />
                </IconButton>
              </InputContainer>
            )}

            {room && room.status === 'resolved' && (
              <Box p={2} bgcolor="#f5f5f5" textAlign="center">
                <Typography variant="body2" color="textSecondary">
                  Cuộc hội thoại đã kết thúc
                </Typography>
                <Button
                  size="small"
                  onClick={() => {
                    setRoom(null);
                    setMessages([]);
                    initializeChatRoom();
                  }}
                  sx={{ mt: 1 }}
                >
                  Bắt đầu chat mới
                </Button>
              </Box>
            )}
          </>
        )}
      </ChatContainer>

      {/* Toast Notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={closeSnackbar} severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Rating Dialog */}
      <Dialog open={ratingDialog} onClose={() => setRatingDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6" fontWeight={600}>
            Đánh giá trải nghiệm hỗ trợ
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box textAlign="center" py={2}>
            <Typography variant="body1" mb={2} color="textSecondary">
              Bạn có hài lòng với dịch vụ hỗ trợ không?
            </Typography>
            <Rating
              name="support-rating"
              value={rating}
              onChange={(event, newValue) => setRating(newValue)}
              size="large"
              sx={{ fontSize: '3rem' }}
            />
            <Typography variant="caption" display="block" mt={1} color="textSecondary">
              {rating === 0 && 'Chọn số sao'}
              {rating === 1 && 'Rất không hài lòng'}
              {rating === 2 && 'Không hài lòng'}
              {rating === 3 && 'Bình thường'}
              {rating === 4 && 'Hài lòng'}
              {rating === 5 && 'Rất hài lòng'}
            </Typography>
          </Box>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Chia sẻ ý kiến của bạn (không bắt buộc)"
            value={ratingFeedback}
            onChange={(e) => setRatingFeedback(e.target.value)}
            variant="outlined"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRatingDialog(false)} color="inherit">
            Bỏ qua
          </Button>
          <Button
            onClick={handleSubmitRating}
            variant="contained"
            disabled={rating === 0}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)'
              }
            }}
          >
            Gửi đánh giá
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SupportChatbox;
