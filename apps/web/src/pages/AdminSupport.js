import React, { useState, useEffect, useContext, useRef } from 'react';
import { UserContext } from '../context/UserContext';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import '../styles/Dashboard.css';
import axios from 'axios';
import {
    initSocket,
    getSocket,
    on,
    joinDashboard,
    leaveDashboard,
    onRoomUpdate,
    onChatUpdate,
    disconnectSocket,
    joinRoom,
    leaveRoom
} from '../utils/socket';

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
    Assignment as AssignmentIcon,
    MoreVert as MoreVertIcon,
    PriorityHigh as PriorityIcon,
    Close as CloseIcon,
    Wifi as WifiIcon,
    WifiOff as WifiOffIcon,
    Search as SearchIcon
} from '@mui/icons-material';
import { styled, useTheme } from '@mui/material/styles';

// =======================================================
// 🎨 STYLED COMPONENTS (TINH CHỈNH GIAO DIỆN)
// =======================================================

const StyledPaper = styled(Paper)(({ theme }) => ({
    // 💡 Tinh chỉnh: Dùng nền trắng, bo góc lớn hơn, shadow nhẹ
    height: 'calc(100vh - 120px)',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '12px', // Bo góc lớn hơn
    overflow: 'hidden',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.05)', // Đổ bóng nhẹ nhàng, hiện đại
    backgroundColor: '#ffffff', // Nền trắng tinh
    border: `1px solid ${theme.palette.grey[100]}` // Viền mỏng
}));

const MessagesContainer = styled(Box)(({ theme }) => ({
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: theme.spacing(2),
    backgroundColor: '#f9faff', // Nền cực kỳ nhạt cho khu vực chat
    '&::-webkit-scrollbar': {
        width: '6px' // Giảm độ rộng scrollbar
    },
    '&::-webkit-scrollbar-track': {
        backgroundColor: 'transparent',
    },
    '&::-webkit-scrollbar-thumb': {
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: '3px',
        '&:hover': {
            backgroundColor: 'rgba(0,0,0,0.2)'
        }
    }
}));

const MessageBubble = styled(Box, {
    shouldForwardProp: (prop) => prop !== 'isOwn' && prop !== 'isBot'
})(({ theme, isOwn, isBot }) => ({
    padding: '10px 15px',
    borderRadius: isOwn ? '15px 15px 4px 15px' : '15px 15px 15px 4px',
    // Màu sắc tinh tế hơn
    backgroundColor: isBot ? '#e1f5fe' : isOwn ? theme.palette.primary.main : '#ffffff',
    color: isBot ? theme.palette.info.dark : isOwn ? '#fff' : theme.palette.grey[900],
    alignSelf: isOwn ? 'flex-end' : 'flex-start',
    wordWrap: 'break-word',
    maxWidth: '75%', // Giới hạn chiều rộng
    boxShadow: isOwn ? '0 2px 8px rgba(102, 126, 234, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.05)',
    marginBottom: theme.spacing(1),
    fontSize: '14px',
    lineHeight: '1.5',
    transition: 'all 0.2s ease',
    border: isOwn ? 'none' : `1px solid ${theme.palette.grey[200]}` // Viền mỏng cho tin nhắn đến
}));

// =======================================================
// 🧩 ADMIN SUPPORT COMPONENT
// =======================================================

const AdminSupport = () => {
    const { user } = useContext(UserContext);
    const theme = useTheme();

    const [rooms, setRooms] = useState([]);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [tabValue, setTabValue] = useState(1); // Mặc định mở tab 'Mới' (index 1)
    const [stats, setStats] = useState(null);
    const [isTyping, setIsTyping] = useState(false); // Chưa dùng, nhưng giữ lại cho tương lai
    const [anchorEl, setAnchorEl] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
    const [socketConnected, setSocketConnected] = useState(false);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const [userScrolledUp, setUserScrolledUp] = useState(false);
    const socketCleanupRef = useRef({});
    const selectedRoomRef = useRef(null);
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

    // Sync ref with state
    useEffect(() => {
        selectedRoomRef.current = selectedRoom;
    }, [selectedRoom]);

    const showToast = (message, severity = 'info') => {
        setSnackbar({ open: true, message, severity });
    };

    const closeSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const getAuthHeader = () => {
        const token = localStorage.getItem('token');
        if (!token) {
            showToast('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại', 'error');
            throw new Error('No token');
        }
        return { Authorization: `Bearer ${token}` };
    };

    // Load rooms
    const loadRooms = async () => {
        try {
            setLoading(true);
            const statusMap = ['all', 'open', 'assigned', 'resolved'];
            const status = statusMap[tabValue] === 'all' ? '' : statusMap[tabValue];

            const response = await axios.get(`${API_URL}/api/chat/admin/rooms`, {
                params: status ? { status } : {},
                headers: getAuthHeader()
            });

            const uniqueRooms = response.data.rooms.filter((room, index, self) =>
                index === self.findIndex((r) => r._id === room._id)
            );

            // Sắp xếp: Ưu tiên (urgent/high) lên đầu, sau đó theo last_message_at
            uniqueRooms.sort((a, b) => {
                const priorityOrder = { 'urgent': 3, 'high': 2, 'normal': 1, 'low': 0, undefined: 1 };
                const aPrio = priorityOrder[a.priority] || 1;
                const bPrio = priorityOrder[b.priority] || 1;

                if (aPrio !== bPrio) {
                    return bPrio - aPrio; // Priority descending
                }

                return new Date(b.last_message_at) - new Date(a.last_message_at); // Time descending
            });


            setRooms(uniqueRooms);
        } catch (error) {
            console.error('Failed to load rooms:', error);
            if (error.response?.status === 401) {
                showToast('Lỗi xác thực, vui lòng đăng nhập lại', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const loadMessagesForRoom = async (roomId) => {
        try {
            const response = await axios.get(`${API_URL}/api/chat/rooms/${roomId}/messages`, {
                headers: getAuthHeader()
            });

            const transformedMessages = response.data.messages.map(msg => ({
                _id: msg.id || msg._id,
                room_id: msg.room_id,
                sender_id: msg.sender_id,
                sender_type: msg.sender_type,
                message: msg.message,
                message_type: msg.message_type || 'text',
                created_at: msg.created_at || msg.createdAt,
                createdAt: msg.created_at || msg.createdAt,
                is_read: msg.is_read,
                ai_metadata: msg.ai_metadata
            }));

            const uniqueMessages = transformedMessages.filter((msg, index, self) =>
                index === self.findIndex((m) => m._id === msg._id)
            );

            console.log(`📜 Loaded ${uniqueMessages.length} messages for room ${roomId}`);
            setMessages(uniqueMessages);
            scrollToBottom(true);
        } catch (error) {
            console.error('Failed to load messages:', error);
            showToast('Không thể tải tin nhắn', 'error');
        }
    };

    const loadStats = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/chat/admin/stats`, {
                headers: getAuthHeader()
            });
            setStats(response.data.stats);
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    };

    // WEBSOCKET: Khởi tạo và lắng nghe sự kiện
    useEffect(() => {
        if (!user || user.role !== 'admin') return;

        const socket = initSocket();
        if (!socket) {
            console.error('❌ Failed to initialize socket');
            showToast('Không thể kết nối WebSocket', 'error');
            return;
        }

        socketCleanupRef.current.handleConnected = on('connect', () => {
            console.log('✅ Admin socket connected');
            setSocketConnected(true);
            socket.emit('join_dashboard'); // Join admin dashboard
        });

        socketCleanupRef.current.handleDisconnected = on('disconnect', () => {
            console.log('❌ Admin socket disconnected');
            setSocketConnected(false);
            showToast('⚠️ Mất kết nối', 'warning');
        });

        // Listen for new messages
        socketCleanupRef.current.handleNewMessage = on('new_message', (data) => {
            const currentRoom = selectedRoomRef.current;

            // 1. Cập nhật Messages nếu đang trong phòng chat đó
            if (currentRoom && data.room_id === currentRoom._id) {
                const newMsg = {
                    _id: data.id,
                    room_id: data.room_id,
                    sender_id: { _id: data.sender_id, name: data.sender_name || 'User' },
                    sender_type: data.sender_type,
                    message: data.message,
                    created_at: data.created_at,
                    createdAt: data.created_at
                };

                setMessages(prev => {
                    const exists = prev.some(msg => msg._id === newMsg._id);
                    if (exists) return prev;

                    const filtered = prev.filter(msg => !msg.__optimistic);
                    scrollToBottom();
                    return [...filtered, newMsg];
                });

                // Nếu đang ở trong phòng, emit event đánh dấu đã đọc
                socket.emit('mark_as_read', { roomId: currentRoom._id });
            }

            // 2. Cập nhật Rooms List
            loadRooms();
            loadStats();
        });

        // Listen for room updates (for room list refresh)
        socketCleanupRef.current.handleRoomUpdate = on('room_updated', (data) => {
            console.log('🔄 Room Updated:', data);
            loadRooms();
            loadStats();

            // Cập nhật trạng thái phòng đang chọn nếu cần
            if (selectedRoomRef.current?._id === data._id) {
                setSelectedRoom(prev => ({ ...prev, ...data }));
            }
        });

        socketCleanupRef.current.handleNewSupportRequest = on('new_support_request', (data) => {
            console.log('🆕 New support request:', data);
            showToast('📢 Yêu cầu hỗ trợ mới!', 'info');
            loadRooms();
            loadStats();
        });

        return () => {
            Object.values(socketCleanupRef.current).forEach(cleanup => {
                if (typeof cleanup === 'function') cleanup();
            });
            if (socket && socket.connected) {
                socket.emit('leave_dashboard');
            }
            setSocketConnected(false);
        };
    }, [user]);

    // WEBSOCKET: Join/leave room
    useEffect(() => {
        if (selectedRoom && socketConnected) {
            const socket = getSocket();
            if (socket) {
                console.log(`🚪 Joining room: ${selectedRoom._id}`);
                socket.emit('join_room', { roomId: selectedRoom._id });
                socket.emit('mark_as_read', { roomId: selectedRoom._id }); // Mark as read immediately on join

                return () => {
                    console.log(`🚪 Leaving room: ${selectedRoom._id}`);
                    socket.emit('leave_room', { roomId: selectedRoom._id });
                };
            }
        }
    }, [selectedRoom, socketConnected]);

    // Load initial data
    useEffect(() => {
        if (user && user.role === 'admin') {
            loadRooms();
            loadStats();
        }
    }, [user, tabValue]);

    const handleSelectRoom = async (room) => {
        try {
            setSelectedRoom(room);
            await loadMessagesForRoom(room._id);
            // Cập nhật lại list sau khi đã đọc để badge count biến mất (nếu thành công)
            setTimeout(loadRooms, 300);
        } catch (error) {
            console.error('Failed to select room:', error);
        }
    };

    const handleAssignToSelf = async () => {
        if (!selectedRoom || !socketConnected) {
            showToast('Vui lòng đợi kết nối socket', 'error');
            return;
        }

        try {
            // Dùng API để đảm bảo cập nhật trạng thái Persistent
            await axios.put(
                `${API_URL}/api/chat/admin/rooms/${selectedRoom._id}/status`,
                { status: 'assigned', admin_id: user.id }, // Gửi cả admin_id lên
                { headers: getAuthHeader() }
            );

            showToast('Đã nhận hỗ trợ! 👨‍💼', 'success');

            // Cập nhật local state và trigger room update
            setSelectedRoom(prev => ({
                ...prev,
                admin_id: user.id,
                admin_name: user.name,
                status: 'assigned'
            }));

            loadRooms();

        } catch (error) {
            console.error('Failed to assign room:', error);
            showToast('Không thể nhận hỗ trợ. Vui lòng thử lại.', 'error');
        }
    };

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || !selectedRoom || !socketConnected) {
            if (!socketConnected) showToast('Vui lòng đợi kết nối socket', 'error');
            return;
        }

        const messageText = inputMessage.trim();
        setInputMessage('');

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
        scrollToBottom(true);

        try {
            const socket = getSocket();
            if (socket) {
                socket.emit('send_message', {
                    roomId: selectedRoom._id,
                    message: messageText
                });
                // Optimistic message sẽ được thay thế khi nhận lại 'new_message' event
            }
        } catch (error) {
            console.error('Send message error:', error);
            showToast('Không thể gửi tin nhắn. Vui lòng thử lại.', 'error');
            setMessages(prev => prev.filter(msg => msg._id !== optimisticMessage._id));
        }
    };

    const handleTyping = (e) => {
        setInputMessage(e.target.value);
        // TODO: Emit typing event
    };

    const handleCloseRoom = async () => {
        if (!selectedRoom) return;

        try {
            await axios.put(
                `${API_URL}/api/chat/admin/rooms/${selectedRoom._id}/status`,
                { status: 'resolved' },
                { headers: getAuthHeader() }
            );

            showToast('Đã đóng cuộc hội thoại! ✅', 'success');

            // Cập nhật local state và refresh list
            setSelectedRoom(null);
            setMessages([]);
            loadRooms();

        } catch (error) {
            console.error('Failed to close room:', error);
            showToast('Không thể đóng cuộc hội thoại. Vui lòng thử lại.', 'error');
        }
    };

    const handleUpdatePriority = async (priority) => {
        if (!selectedRoom) return;

        try {
            await axios.put(
                `${API_URL}/api/chat/admin/rooms/${selectedRoom._id}/priority`, // Endpoint riêng cho priority
                { priority },
                { headers: getAuthHeader() }
            );

            setSelectedRoom({ ...selectedRoom, priority });
            loadRooms();
            setAnchorEl(null);
            showToast(`Cập nhật ưu tiên thành ${priority}`, 'success');
        } catch (error) {
            console.error('Failed to update priority:', error);
            showToast('Cập nhật thất bại', 'error');
        }
    };

    const scrollToBottom = (force = false) => {
        if (force || !userScrolledUp) {
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    };

    const handleScroll = () => {
        if (messagesContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
            const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
            setUserScrolledUp(distanceFromBottom > 100);
        }
    };

    // Auto scroll when new message comes in
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

    // Helper functions for UI
    const getStatusColor = (status) => {
        switch (status) {
            case 'open': return 'error'; // Mới mở
            case 'assigned': return 'primary'; // Đang xử lý
            case 'resolved': return 'success'; // Đã giải quyết
            default: return 'default';
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'urgent': return 'error';
            case 'high': return 'warning';
            case 'normal': return 'info';
            case 'low': return 'default';
            default: return 'default';
        }
    };

    // =======================================================
    // 🖼️ RENDER UI
    // =======================================================
    return (
        <div className="dashboard-container">
            <Header role={user.role} />
            <div className="dashboard-main">
                <Sidebar role={user.role} />
                <div className="dashboard-content">
                    <Container maxWidth="xl" sx={{ py: 3 }}>
                        {/* Header và trạng thái WebSocket */}
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h4" gutterBottom fontWeight={700} color={theme.palette.primary.main}>
                                🎧 Hỗ trợ khách hàng
                            </Typography>
                            <Chip
                                icon={socketConnected ? <WifiIcon /> : <WifiOffIcon />}
                                label={socketConnected ? 'Realtime' : 'Offline'}
                                color={socketConnected ? 'success' : 'default'}
                                size="medium"
                            />
                        </Box>

                        {/* Thống kê (Stats Card - UI Tối giản) */}
                        {stats && (
                            <Grid container spacing={3} sx={{ mb: 3 }}>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Paper elevation={1} sx={{ p: 2, borderRadius: '8px', borderLeft: '4px solid #4a90e2' }}>
                                        <Typography color="textSecondary" variant="subtitle2" gutterBottom>
                                            Tổng cuộc hội thoại
                                        </Typography>
                                        <Typography variant="h5" fontWeight={700}>
                                            {(stats.byStatus?.open || 0) + (stats.byStatus?.assigned || 0) + (stats.byStatus?.resolved || 0)}
                                        </Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Paper elevation={1} sx={{ p: 2, borderRadius: '8px', borderLeft: '4px solid #f5a623' }}>
                                        <Typography color="textSecondary" variant="subtitle2" gutterBottom>
                                            Chờ xử lý (Mới)
                                        </Typography>
                                        <Typography variant="h5" fontWeight={700} color="#d97706">{stats.pendingRooms || 0}</Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Paper elevation={1} sx={{ p: 2, borderRadius: '8px', borderLeft: '4px solid #2ecc71' }}>
                                        <Typography color="textSecondary" variant="subtitle2" gutterBottom>
                                            Đang xử lý (Của tôi)
                                        </Typography>
                                        <Typography variant="h5" fontWeight={700} color="#2563eb">{stats.myActiveRooms || 0}</Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Paper elevation={1} sx={{ p: 2, borderRadius: '8px', borderLeft: '4px solid #1abc9c' }}>
                                        <Typography color="textSecondary" variant="subtitle2" gutterBottom>
                                            Đã giải quyết hôm nay
                                        </Typography>
                                        <Typography variant="h5" fontWeight={700} color="#16a34a">{stats.today?.resolved || 0}</Typography>
                                    </Paper>
                                </Grid>
                            </Grid>
                        )}

                        <Grid container spacing={2}>
                            {/* Cột 1: Danh sách phòng chat */}
                            <Grid item xs={12} md={4}>
                                <StyledPaper>
                                    <Box p={2} borderBottom={`1px solid ${theme.palette.grey[100]}`} sx={{ backgroundColor: '#ffffff' }}>
                                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                            <Typography variant="h6" fontWeight={700}>Danh sách yêu cầu</Typography>
                                        </Box>

                                        <Tabs
                                            value={tabValue}
                                            onChange={(e, v) => setTabValue(v)}
                                            variant="fullWidth"
                                            sx={{ minHeight: '36px', mb: 1 }}
                                        >
                                            <Tab label="Tất cả" sx={{ minHeight: '36px', p: 0 }} />
                                            <Tab label="Mới" sx={{ minHeight: '36px', p: 0 }} />
                                            <Tab label="Đang xử lý" sx={{ minHeight: '36px', p: 0 }} />
                                            <Tab label="Đã xong" sx={{ minHeight: '36px', p: 0 }} />
                                        </Tabs>

                                        {/* Thanh tìm kiếm (Placeholder) */}
                                        <TextField
                                            fullWidth
                                            size="small"
                                            placeholder="Tìm kiếm..."
                                            variant="outlined"
                                            InputProps={{
                                                startAdornment: <SearchIcon sx={{ color: theme.palette.grey[400], mr: 1 }} />,
                                                sx: { borderRadius: '8px', backgroundColor: theme.palette.grey[50] }
                                            }}
                                        />
                                    </Box>

                                    <List sx={{ flex: 1, overflowY: 'auto', p: 0 }}>
                                        {loading ? (
                                            <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
                                        ) : rooms.length === 0 ? (
                                            <Box p={4} textAlign="center">
                                                <Typography color="textSecondary">Không có cuộc hội thoại nào</Typography>
                                            </Box>
                                        ) : (
                                            rooms.map((room) => (
                                                <ListItem
                                                    key={room._id}
                                                    disablePadding
                                                    sx={{
                                                        // Highlight room được chọn
                                                        borderLeft: selectedRoom?._id === room._id ? `4px solid ${room.admin_id ? theme.palette.primary.main : theme.palette.error.main}` : '4px solid transparent',
                                                        transition: 'background-color 0.2s, border-left 0.2s',
                                                        '&:hover': { backgroundColor: theme.palette.grey[50] }
                                                    }}
                                                    secondaryAction={
                                                        room.unread_count_admin > 0 && (
                                                            <Badge badgeContent={room.unread_count_admin} color="error" max={99} sx={{ mr: 1 }} />
                                                        )
                                                    }
                                                >
                                                    <ListItemButton
                                                        selected={selectedRoom?._id === room._id}
                                                        onClick={() => handleSelectRoom(room)}
                                                        sx={{ py: 1.5 }}
                                                    >
                                                        <ListItemAvatar>
                                                            <Tooltip title={`Ưu tiên: ${room.priority || 'Bình thường'}`} placement="top">
                                                                <Badge
                                                                    overlap="circular"
                                                                    anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
                                                                    badgeContent={
                                                                        (room.priority === 'urgent' && <PriorityIcon fontSize="small" color="error" sx={{ bgcolor: 'white', borderRadius: '50%' }} />)
                                                                        || (room.priority === 'high' && <PriorityIcon fontSize="small" color="warning" sx={{ bgcolor: 'white', borderRadius: '50%' }} />)
                                                                        || null
                                                                    }
                                                                >
                                                                    <Avatar sx={{ bgcolor: room.admin_id ? theme.palette.primary.light : theme.palette.warning.main, width: 40, height: 40 }}>
                                                                        {room.user_id?.name?.charAt(0).toUpperCase() || 'U'}
                                                                    </Avatar>
                                                                </Badge>
                                                            </Tooltip>
                                                        </ListItemAvatar>
                                                        <ListItemText
                                                            primary={
                                                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                                                    <Typography variant="subtitle2" fontWeight={selectedRoom?._id === room._id ? 700 : 600}>
                                                                        {room.user_id?.name || 'Người dùng'}
                                                                    </Typography>
                                                                    <Chip
                                                                        label={room.status}
                                                                        size="small"
                                                                        color={getStatusColor(room.status)}
                                                                        sx={{ height: 20, fontSize: '0.7rem' }}
                                                                    />
                                                                </Box>
                                                            }
                                                            secondary={
                                                                <Box>
                                                                    <Typography variant="caption" display="block" color="textPrimary" noWrap sx={{ maxWidth: '90%' }}>
                                                                        {room.subject || 'Không có tiêu đề'}
                                                                    </Typography>
                                                                    <Box display="flex" alignItems="center" mt={0.5} gap={1}>
                                                                        {room.tags && room.tags.slice(0, 1).map((tag, i) => (
                                                                            <Chip key={i} label={tag} size="small" sx={{ fontSize: '0.65rem', height: 18, bgcolor: theme.palette.grey[200] }} />
                                                                        ))}
                                                                        <Typography variant="caption" color="textSecondary" sx={{ ml: 'auto' }}>
                                                                            {new Date(room.last_message_at).toLocaleDateString('vi-VN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                        </Typography>
                                                                    </Box>
                                                                </Box>
                                                            }
                                                        />
                                                    </ListItemButton>
                                                </ListItem>
                                            ))
                                        )}
                                    </List>
                                </StyledPaper>
                            </Grid>

                            {/* Cột 2: Khu vực chat */}
                            <Grid item xs={12} md={8}>
                                <StyledPaper>
                                    {selectedRoom ? (
                                        <>
                                            {/* Chat Header */}
                                            <Box p={2} borderBottom={`1px solid ${theme.palette.grey[200]}`} sx={{ backgroundColor: '#ffffff' }}>
                                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                                    <Box display="flex" alignItems="center" gap={2}>
                                                        <Avatar sx={{ bgcolor: selectedRoom.admin_id ? theme.palette.primary.light : theme.palette.warning.main }}>
                                                            {selectedRoom.user_id?.name?.charAt(0).toUpperCase() || 'U'}
                                                        </Avatar>
                                                        <Box>
                                                            <Typography variant="subtitle1" fontWeight={700}>
                                                                {selectedRoom.user_id?.name || 'Người dùng'}
                                                            </Typography>
                                                            <Typography variant="caption" color="textSecondary">
                                                                {selectedRoom.user_id?.email || 'Chưa cung cấp email'}
                                                            </Typography>
                                                        </Box>
                                                        <Chip
                                                            label={selectedRoom.priority}
                                                            size="small"
                                                            color={getPriorityColor(selectedRoom.priority)}
                                                            sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                                                        />
                                                    </Box>

                                                    <Box display="flex" gap={1}>
                                                        {!selectedRoom.admin_id && selectedRoom.status === 'open' && (
                                                            <Button
                                                                variant="contained"
                                                                size="small"
                                                                startIcon={<AssignmentIcon />}
                                                                onClick={handleAssignToSelf}
                                                                sx={{ bgcolor: '#2ecc71', '&:hover': { bgcolor: '#27ae60' } }}
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
                                                            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                                                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                                        >
                                                            <MenuItem onClick={() => handleUpdatePriority('urgent')}>
                                                                <PriorityIcon color="error" sx={{ mr: 1 }} /> Khẩn cấp
                                                            </MenuItem>
                                                            <MenuItem onClick={() => handleUpdatePriority('high')}>
                                                                <PriorityIcon color="warning" sx={{ mr: 1 }} /> Cao
                                                            </MenuItem>
                                                            <MenuItem onClick={() => handleUpdatePriority('normal')}>
                                                                <PriorityIcon color="info" sx={{ mr: 1 }} /> Bình thường
                                                            </MenuItem>
                                                            <MenuItem onClick={() => handleUpdatePriority('low')}>
                                                                <PriorityIcon sx={{ mr: 1, color: theme.palette.grey[500] }} /> Thấp
                                                            </MenuItem>
                                                            <Divider />
                                                            <MenuItem onClick={handleCloseRoom} disabled={selectedRoom.status === 'resolved'}>
                                                                <CloseIcon sx={{ mr: 1 }} /> Đóng cuộc hội thoại
                                                            </MenuItem>
                                                        </Menu>
                                                    </Box>
                                                </Box>

                                                {selectedRoom.context && (
                                                    <Box mt={1} p={1} bgcolor="#e8f4fd" borderRadius={1} border="1px dashed #90caf9">
                                                        <Typography variant="caption" fontWeight={500} color="textSecondary">
                                                            📍 **Ngữ cảnh:** Trang: {selectedRoom.context.page} | Hành động: {selectedRoom.context.action}
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </Box>

                                            {/* Messages Container */}
                                            <MessagesContainer ref={messagesContainerRef} onScroll={handleScroll}>
                                                {messages.map((msg, index) => (
                                                    <Box key={msg._id || `msg-${index}`} sx={{ display: 'flex', flexDirection: 'column', alignItems: msg.sender_type === 'admin' ? 'flex-end' : 'flex-start', mb: 1.5 }}>
                                                        {msg.message_type === 'system' ? (
                                                            <Box textAlign="center" my={1} width="100%">
                                                                <Chip label={msg.message} size="small" color="info" variant="outlined" sx={{ fontSize: '0.75rem' }} />
                                                            </Box>
                                                        ) : (
                                                            <Box>
                                                                <Box display="flex" gap={1} alignItems="flex-start" flexDirection={msg.sender_type === 'admin' ? 'row-reverse' : 'row'}>
                                                                    {/* Avatar cho tin nhắn đến (User/Bot) */}
                                                                    {msg.sender_type !== 'admin' && (
                                                                        <Avatar sx={{ width: 28, height: 28, mt: 0.5, bgcolor: msg.sender_type === 'bot' ? theme.palette.info.main : theme.palette.warning.main }}>
                                                                            {msg.sender_type === 'bot' ? <BotIcon sx={{ fontSize: 16 }} /> : <PersonIcon sx={{ fontSize: 16 }} />}
                                                                        </Avatar>
                                                                    )}

                                                                    <MessageBubble isOwn={msg.sender_type === 'admin'} isBot={msg.sender_type === 'bot'}>
                                                                        {msg.message}
                                                                        {msg.ai_metadata?.is_ai_generated && (
                                                                            <Chip label="AI Suggest" size="small" color="primary" variant="outlined" sx={{ ml: 1, height: 16, fontSize: '0.65rem' }} />
                                                                        )}
                                                                    </MessageBubble>

                                                                    {/* Avatar cho tin nhắn đi (Admin - Tùy chọn, hiện đang ẩn để gọn)
                                                                    {msg.sender_type === 'admin' && (
                                                                        <Avatar sx={{ width: 28, height: 28, mt: 0.5, bgcolor: theme.palette.primary.main }}>
                                                                            {user?.name?.charAt(0).toUpperCase() || 'A'}
                                                                        </Avatar>
                                                                    )} */}
                                                                </Box>

                                                                <Typography variant="caption" color="textSecondary" sx={{
                                                                    ml: msg.sender_type === 'admin' ? 0 : 4,
                                                                    mr: msg.sender_type === 'admin' ? 0 : 0, // Căn lề thời gian
                                                                    mt: 0.2,
                                                                    textAlign: msg.sender_type === 'admin' ? 'right' : 'left',
                                                                    width: '100%',
                                                                    display: 'block'
                                                                }}>
                                                                    {msg.sender_type === 'bot' ? 'AI Bot' : msg.sender_type === 'admin' ? 'Admin' : (msg.sender_id?.name || 'Người dùng')} • {new Date(msg.created_at || msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                                </Typography>
                                                            </Box>
                                                        )}
                                                    </Box>
                                                ))}

                                                {isTyping && (
                                                    <Box display="flex" alignItems="center" sx={{ mb: 1, ml: 4 }}>
                                                        <CircularProgress size={12} sx={{ mr: 1 }} />
                                                        <Typography variant="caption" color="textSecondary">
                                                            Đang trả lời tới bạn nhé =)) ...
                                                        </Typography>
                                                    </Box>
                                                )}

                                                <div ref={messagesEndRef} />
                                            </MessagesContainer>

                                            {/* Input Area */}
                                            {selectedRoom.status !== 'resolved' && (
                                                <Paper elevation={3} sx={{ p: 1.5, borderTop: `1px solid ${theme.palette.grey[100]}`, borderRadius: '0' }}>
                                                    <Box display="flex" gap={1}>
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
                                                            variant="outlined"
                                                            InputProps={{
                                                                sx: { borderRadius: '8px', pr: 0 },
                                                                endAdornment: (
                                                                    <IconButton size="small" onClick={() => fileInputRef.current?.click()} sx={{ mr: 0.5 }}>
                                                                        <AttachFileIcon />
                                                                    </IconButton>
                                                                )
                                                            }}
                                                        />
                                                        <IconButton
                                                            onClick={handleSendMessage}
                                                            disabled={!inputMessage.trim()}
                                                            color="primary"
                                                            sx={{
                                                                width: 40,
                                                                height: 40,
                                                                bgcolor: inputMessage.trim() ? theme.palette.primary.main : theme.palette.grey[200],
                                                                color: inputMessage.trim() ? '#fff' : theme.palette.grey[500],
                                                                '&:hover': {
                                                                    bgcolor: inputMessage.trim() ? theme.palette.primary.dark : theme.palette.grey[300]
                                                                }
                                                            }}
                                                        >
                                                            <SendIcon />
                                                        </IconButton>
                                                        {/* Hidden File Input */}
                                                        <input type="file" ref={fileInputRef} hidden />
                                                    </Box>
                                                </Paper>
                                            )}
                                        </>
                                    ) : (
                                        // Empty State
                                        <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                                            <Box textAlign="center" p={3}>
                                                <AssignmentIcon sx={{ fontSize: 60, color: theme.palette.grey[300] }} />
                                                <Typography variant="h6" color="textSecondary" mt={1}>
                                                    Chọn một cuộc hội thoại để bắt đầu
                                                </Typography>
                                                {!socketConnected && (
                                                    <Typography variant="caption" color="warning" display="block" mt={1}>
                                                        ⚠️ WebSocket chưa kết nối. Vui lòng refresh.
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Box>
                                    )}
                                </StyledPaper>
                            </Grid>
                        </Grid>
                    </Container>
                </div>
            </div>

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