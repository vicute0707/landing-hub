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
  Zoom
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
const ChatContainer = styled(Box)(({ theme, isOpen }) => ({
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

const MessageBubble = styled(Box)(({ theme, isOwn, isBot }) => ({
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
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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

    newSocket.on('chat:admin_status', (data) => {
      const hasOnlineAdmin = data.admins.some(admin => admin.isOnline);
      setAdminOnline(hasOnlineAdmin);
    });

    newSocket.on('chat:new_message', (data) => {
      setMessages(prev => {
        // Remove optimistic message if exists
        const filtered = prev.filter(msg => !msg.__optimistic || msg.message !== data.message.message);
        // Add real message from server
        return [...filtered, data.message];
      });
      scrollToBottom();

      // Update unread count if chat is closed
      if (!isOpen) {
        setUnreadCount(prev => prev + 1);
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
    });

    newSocket.on('chat:error', (data) => {
      console.error('Chat error:', data.message);
      alert(data.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user, API_URL, isOpen]);

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

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(
        `${API_URL}/api/chat/rooms/${room._id}/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      // Send message with attachment
      socket.emit('chat:send_message', {
        roomId: room._id,
        message: `📎 ${file.name}`,
        message_type: response.data.file.type,
        attachments: [response.data.file]
      });
    } catch (error) {
      console.error('File upload error:', error);
      alert('Không thể upload file');
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

  if (!user) return null;

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
                <IconButton onClick={() => fileInputRef.current.click()} size="small">
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
    </>
  );
};

export default SupportChatbox;
