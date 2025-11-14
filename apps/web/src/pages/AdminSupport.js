import React, { useState, useEffect, useContext, useRef } from 'react';
import { UserContext } from '../context/UserContext';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import '../styles/Dashboard.css';
import io from 'socket.io-client';
import axios from 'axios';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Badge,
  TextField,
  IconButton,
  Chip,
  Button,
  Divider,
  Card,
  CardContent,
  Tabs,
  Tab,
  Menu,
  MenuItem,
  CircularProgress,
  Tooltip,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Person as PersonIcon,
  SmartToy as BotIcon,
  Check as CheckIcon,
  Assignment as AssignmentIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
  PriorityHigh as PriorityIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const StyledPaper = styled(Paper)(({ theme }) => ({
  height: 'calc(100vh - 120px)',
  display: 'flex',
  flexDirection: 'column'
}));

const MessagesContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  overflowY: 'auto',
  padding: theme.spacing(2),
  backgroundColor: '#f5f5f5',
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
  maxWidth: '70%',
  padding: '10px 14px',
  borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
  backgroundColor: isBot ? '#e3f2fd' : isOwn ? '#667eea' : '#fff',
  color: isBot ? '#1976d2' : isOwn ? '#fff' : '#000',
  alignSelf: isOwn ? 'flex-end' : 'flex-start',
  wordWrap: 'break-word',
  boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
  marginBottom: theme.spacing(1)
}));

const StatsCard = styled(Card)(({ theme }) => ({
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: '#fff',
  height: '100%'
}));

const AdminSupport = () => {
  const { user } = useContext(UserContext);
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0); // 0: All, 1: Open, 2: Assigned, 3: Resolved
  const [stats, setStats] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Helper function to show toast notifications
  const showToast = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const closeSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Initialize socket
  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    const token = localStorage.getItem('token');
    const newSocket = io(API_URL, {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('✅ Admin socket connected');
    });

    // Handle reconnection - rejoin room automatically
    newSocket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Admin socket reconnected after', attemptNumber, 'attempts');
      showToast('Đã kết nối lại! 🎉', 'success');
      // Re-join room if exists
      if (selectedRoom) {
        console.log('🔄 Admin re-joining room:', selectedRoom._id);
        newSocket.emit('chat:join_room', { roomId: selectedRoom._id });
        // Reload messages
        loadMessagesForRoom(selectedRoom._id);
      }
      // Reload room list
      loadRooms();
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Admin socket connection error:', error.message);
      showToast('Lỗi kết nối. Đang thử lại...', 'warning');
    });

    newSocket.on('disconnect', (reason) => {
      console.log('⚠️ Admin socket disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server forcefully disconnected, reconnect manually
        showToast('Mất kết nối. Đang kết nối lại...', 'info');
        newSocket.connect();
      } else if (reason !== 'io client disconnect') {
        showToast('Mất kết nối. Đang tự động kết nối lại...', 'warning');
      }
    });

    // Listen for new messages
    newSocket.on('chat:new_message', (data) => {
      if (selectedRoom && data.message.room_id === selectedRoom._id) {
        setMessages(prev => {
          // Remove optimistic messages with temp IDs
          const filtered = prev.filter(msg =>
            !(msg.__optimistic && msg._id && msg._id.toString().startsWith('temp-'))
          );
          // Add real message from server
          return [...filtered, data.message];
        });
        scrollToBottom();
      }

      // Update room in list
      loadRooms();
    });

    // Listen for room updates
    newSocket.on('chat:room_tagged', () => {
      loadRooms();
    });

    newSocket.on('chat:user_typing', (data) => {
      if (selectedRoom && data.roomId === selectedRoom._id && data.userId !== user.id) {
        setIsTyping(data.isTyping);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user, API_URL, selectedRoom]);

  // Helper function to load messages for a room
  const loadMessagesForRoom = async (roomId) => {
    try {
      const response = await axios.get(`${API_URL}/api/chat/rooms/${roomId}/messages`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setMessages(response.data.messages);
      scrollToBottom();
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  // Load rooms
  const loadRooms = async () => {
    try {
      setLoading(true);
      const statusMap = ['', 'open', 'assigned', 'resolved'];
      const status = statusMap[tabValue];

      const response = await axios.get(`${API_URL}/api/chat/admin/rooms`, {
        params: status ? { status } : {},
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      setRooms(response.data.rooms);
    } catch (error) {
      console.error('Failed to load rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load stats
  const loadStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/chat/admin/stats`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      setStats(response.data.stats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadRooms();
      loadStats();
    }
  }, [user, tabValue]);

  // Select room
  const handleSelectRoom = async (room) => {
    try {
      setSelectedRoom(room);

      // Join socket room
      socket.emit('chat:join_room', { roomId: room._id });

      // Load messages
      const response = await axios.get(`${API_URL}/api/chat/rooms/${room._id}/messages`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      setMessages(response.data.messages);
      scrollToBottom();
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  // Assign room to self
  const handleAssignToSelf = async () => {
    if (!selectedRoom) return;

    try {
      socket.emit('chat:admin_assign', { roomId: selectedRoom._id });

      // Reload rooms
      setTimeout(() => {
        loadRooms();
      }, 500);
    } catch (error) {
      console.error('Failed to assign room:', error);
    }
  };

  // Send message
  const handleSendMessage = () => {
    if (!inputMessage.trim() || !selectedRoom || !socket) return;

    const messageText = inputMessage.trim();
    setInputMessage('');

    // Stop typing indicator
    socket.emit('chat:typing', { roomId: selectedRoom._id, isTyping: false });

    // 🚀 OPTIMISTIC UPDATE: Add message to UI immediately
    const optimisticMessage = {
      _id: `temp-${Date.now()}`,
      room_id: selectedRoom._id,
      sender_id: user,
      sender_type: 'admin',
      message: messageText,
      message_type: 'text',
      createdAt: new Date().toISOString(),
      __optimistic: true
    };

    setMessages(prev => [...prev, optimisticMessage]);
    scrollToBottom();

    // Send message
    socket.emit('chat:send_message', {
      roomId: selectedRoom._id,
      message: messageText,
      message_type: 'text',
      enableAI: false
    });
  };

  // Handle typing
  const handleTyping = (e) => {
    setInputMessage(e.target.value);

    if (!socket || !selectedRoom) return;

    socket.emit('chat:typing', { roomId: selectedRoom._id, isTyping: true });

    // Debounce typing indicator
    setTimeout(() => {
      socket.emit('chat:typing', { roomId: selectedRoom._id, isTyping: false });
    }, 2000);
  };

  // Close room
  const handleCloseRoom = () => {
    if (!selectedRoom || !socket) return;

    socket.emit('chat:close_room', { roomId: selectedRoom._id });

    setTimeout(() => {
      setSelectedRoom(null);
      setMessages([]);
      loadRooms();
    }, 500);
  };

  // Update priority
  const handleUpdatePriority = async (priority) => {
    if (!selectedRoom) return;

    try {
      await axios.put(
        `${API_URL}/api/chat/admin/rooms/${selectedRoom._id}/status`,
        { priority },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      setSelectedRoom({ ...selectedRoom, priority });
      loadRooms();
      setAnchorEl(null);
    } catch (error) {
      console.error('Failed to update priority:', error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="dashboard-container">
        <Header role={user?.role} />
        <div className="dashboard-main">
          <Sidebar role={user?.role} />
          <div className="dashboard-content">
            <Container>
              <Box py={4} textAlign="center">
                <Typography variant="h5">Bạn không có quyền truy cập trang này</Typography>
              </Box>
            </Container>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'error';
      case 'assigned': return 'primary';
      case 'resolved': return 'success';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'normal': return 'primary';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  return (
    <div className="dashboard-container">
      <Header role={user.role} />
      <div className="dashboard-main">
        <Sidebar role={user.role} />
        <div className="dashboard-content">
          <Container maxWidth="xl" sx={{ py: 3 }}>
            <Typography variant="h4" gutterBottom fontWeight={600}>
              🎧 Hỗ trợ khách hàng
            </Typography>

      {/* Stats */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Tổng cuộc hội thoại
                </Typography>
                <Typography variant="h4">{stats.totalRooms}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#fef3c7' }}>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Chờ xử lý
                </Typography>
                <Typography variant="h4" color="#d97706">{stats.openRooms}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#dbeafe' }}>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Đang xử lý
                </Typography>
                <Typography variant="h4" color="#2563eb">{stats.assignedRooms}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#dcfce7' }}>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Đã giải quyết hôm nay
                </Typography>
                <Typography variant="h4" color="#16a34a">{stats.resolvedToday}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Grid container spacing={2}>
        {/* Room List */}
        <Grid item xs={12} md={4}>
          <StyledPaper>
            <Box p={2} borderBottom="1px solid #e0e0e0">
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Danh sách chat</Typography>
                <IconButton size="small" onClick={loadRooms}>
                  <RefreshIcon />
                </IconButton>
              </Box>

              <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} variant="fullWidth">
                <Tab label="Tất cả" />
                <Tab label="Mới" />
                <Tab label="Đang xử lý" />
                <Tab label="Đã xong" />
              </Tabs>
            </Box>

            <List sx={{ flex: 1, overflowY: 'auto', p: 0 }}>
              {loading ? (
                <Box display="flex" justifyContent="center" p={4}>
                  <CircularProgress />
                </Box>
              ) : rooms.length === 0 ? (
                <Box p={4} textAlign="center">
                  <Typography color="textSecondary">Không có cuộc hội thoại nào</Typography>
                </Box>
              ) : (
                rooms.map((room) => (
                  <ListItem
                    key={room._id}
                    disablePadding
                    secondaryAction={
                      room.unread_count_admin > 0 && (
                        <Badge badgeContent={room.unread_count_admin} color="error" />
                      )
                    }
                  >
                    <ListItemButton
                      selected={selectedRoom?._id === room._id}
                      onClick={() => handleSelectRoom(room)}
                    >
                      <ListItemAvatar>
                        <Badge
                          badgeContent={room.priority === 'urgent' || room.priority === 'high' ? '!' : 0}
                          color="error"
                        >
                          <Avatar>
                            {room.user_id?.name?.charAt(0).toUpperCase() || 'U'}
                          </Avatar>
                        </Badge>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle2" fontWeight={600}>
                              {room.user_id?.name || 'Người dùng'}
                            </Typography>
                            <Chip
                              label={room.status}
                              size="small"
                              color={getStatusColor(room.status)}
                            />
                          </Box>
                        }
                        secondary={
                          <>
                            <Typography variant="caption" display="block">
                              {room.subject}
                            </Typography>
                            {room.tags && room.tags.length > 0 && (
                              <Box mt={0.5}>
                                {room.tags.slice(0, 2).map((tag, i) => (
                                  <Chip key={i} label={tag} size="small" sx={{ mr: 0.5, fontSize: '0.65rem', height: 18 }} />
                                ))}
                              </Box>
                            )}
                            <Typography variant="caption" color="textSecondary">
                              {new Date(room.last_message_at).toLocaleString('vi-VN')}
                            </Typography>
                          </>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                ))
              )}
            </List>
          </StyledPaper>
        </Grid>

        {/* Chat Window */}
        <Grid item xs={12} md={8}>
          <StyledPaper>
            {selectedRoom ? (
              <>
                {/* Chat Header */}
                <Box p={2} borderBottom="1px solid #e0e0e0">
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar>
                        {selectedRoom.user_id?.name?.charAt(0).toUpperCase() || 'U'}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {selectedRoom.user_id?.name || 'Người dùng'}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {selectedRoom.user_id?.email}
                        </Typography>
                      </Box>
                      <Chip
                        label={selectedRoom.priority}
                        size="small"
                        color={getPriorityColor(selectedRoom.priority)}
                      />
                      {selectedRoom.tags && selectedRoom.tags.map((tag, i) => (
                        <Chip key={i} label={tag} size="small" variant="outlined" />
                      ))}
                    </Box>

                    <Box display="flex" gap={1}>
                      {!selectedRoom.admin_id && (
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<AssignmentIcon />}
                          onClick={handleAssignToSelf}
                        >
                          Nhận hỗ trợ
                        </Button>
                      )}

                      <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
                        <MoreVertIcon />
                      </IconButton>

                      <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={() => setAnchorEl(null)}
                      >
                        <MenuItem onClick={() => handleUpdatePriority('urgent')}>
                          <PriorityIcon color="error" sx={{ mr: 1 }} /> Khẩn cấp
                        </MenuItem>
                        <MenuItem onClick={() => handleUpdatePriority('high')}>
                          <PriorityIcon color="warning" sx={{ mr: 1 }} /> Cao
                        </MenuItem>
                        <MenuItem onClick={() => handleUpdatePriority('normal')}>
                          <PriorityIcon color="primary" sx={{ mr: 1 }} /> Bình thường
                        </MenuItem>
                        <MenuItem onClick={() => handleUpdatePriority('low')}>
                          <PriorityIcon sx={{ mr: 1 }} /> Thấp
                        </MenuItem>
                        <Divider />
                        <MenuItem onClick={handleCloseRoom}>
                          <CloseIcon sx={{ mr: 1 }} /> Đóng cuộc hội thoại
                        </MenuItem>
                      </Menu>
                    </Box>
                  </Box>

                  {/* Context info */}
                  {selectedRoom.context && (
                    <Box mt={1} p={1} bgcolor="#f5f5f5" borderRadius={1}>
                      <Typography variant="caption" color="textSecondary">
                        📍 Trang: {selectedRoom.context.page} | Hành động: {selectedRoom.context.action}
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Messages */}
                <MessagesContainer>
                  {messages.map((msg, index) => (
                    <Box key={msg._id || index}>
                      {msg.message_type === 'system' ? (
                        <Box textAlign="center" my={1}>
                          <Chip label={msg.message} size="small" />
                        </Box>
                      ) : (
                        <Box display="flex" flexDirection="column" alignItems={msg.sender_type === 'admin' ? 'flex-end' : 'flex-start'}>
                          <Box display="flex" gap={1} alignItems="flex-end">
                            {msg.sender_type !== 'admin' && (
                              <Avatar sx={{ width: 24, height: 24, bgcolor: msg.sender_type === 'bot' ? '#1976d2' : '#ff9800' }}>
                                {msg.sender_type === 'bot' ? <BotIcon sx={{ fontSize: 14 }} /> : <PersonIcon sx={{ fontSize: 14 }} />}
                              </Avatar>
                            )}
                            <MessageBubble isOwn={msg.sender_type === 'admin'} isBot={msg.sender_type === 'bot'}>
                              {msg.message}
                              {msg.ai_metadata?.is_ai_generated && (
                                <Chip label="AI" size="small" sx={{ ml: 1, height: 16, fontSize: '0.65rem' }} />
                              )}
                            </MessageBubble>
                          </Box>
                          <Typography variant="caption" color="textSecondary" sx={{ ml: msg.sender_type === 'admin' ? 0 : 5, mt: 0.5 }}>
                            {msg.sender_id?.name || 'Unknown'} • {new Date(msg.createdAt).toLocaleTimeString('vi-VN')}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  ))}

                  {isTyping && (
                    <Box display="flex" gap={1} alignItems="center">
                      <Typography variant="caption" color="textSecondary">
                        Đang gõ...
                      </Typography>
                    </Box>
                  )}

                  <div ref={messagesEndRef} />
                </MessagesContainer>

                {/* Input */}
                {selectedRoom.status !== 'resolved' && (
                  <Box p={2} borderTop="1px solid #e0e0e0" display="flex" gap={1}>
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
                      maxRows={4}
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
                  </Box>
                )}
              </>
            ) : (
              <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                <Box textAlign="center">
                  <Typography variant="h6" color="textSecondary">
                    Chọn một cuộc hội thoại để bắt đầu
                  </Typography>
                </Box>
              </Box>
            )}
          </StyledPaper>
        </Grid>
      </Grid>
          </Container>
        </div>
      </div>

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
    </div>
  );
};

export default AdminSupport;
