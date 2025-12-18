import { io } from 'socket.io-client';

let socket = null;
let isConfigured = false;

/**
 * Initialize Socket.IO connection
 */
export const initSocket = () => {
    // Nếu đã connect rồi thì return luôn
    if (socket && socket.connected) {
        return socket;
    }

    // Lấy token từ localStorage
    const token = localStorage.getItem('token');
    if (!token) {
        console.warn('No token found for socket connection');
        isConfigured = false;
        return null;
    }

    // 🔧 FIX CHÍNH: Đúng URL production, KHÔNG dùng localhost:5000 nữa!
    const apiUrl = process.env.REACT_APP_API_URL
        ? `${process.env.REACT_APP_API_URL.replace(/\/$/, '')}`  // Xóa trailing slash nếu có
        : 'https://api.landinghub.shop';  // Hardcode fallback production URL

    // In ra để debug (sau này có thể xóa)
    console.log('🔌 Initializing socket to:', apiUrl);

    socket = io(apiUrl, {
        auth: {
            token: token  // Gửi token trong auth để backend verify
        },
        transports: ['websocket', 'polling'], // polling fallback nếu websocket bị chặn
        reconnection: true,
        reconnectionAttempts: 10,      // Tăng lên để kiên nhẫn hơn
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
    });

    // Các event listener
    socket.on('connect', () => {
        console.log('✅ Socket connected successfully:', socket.id);
        isConfigured = true;
    });

    socket.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected:', reason);
        isConfigured = false;
    });

    socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message);
        isConfigured = false;
    });

    socket.on('reconnect_failed', () => {
        console.error('Socket reconnection failed after multiple attempts');
        isConfigured = false;
    });

    // Backend có thể từ chối nếu token sai/hết hạn
    socket.on('authentication_error', (err) => {
        console.error('Socket authentication failed:', err);
        disconnectSocket(true);
        // Có thể trigger logout ở đây
        localStorage.removeItem('token');
        window.location.href = '/auth';
    });

    return socket;
};

/**
 * Get the current socket instance
 */
export const getSocket = () => {
    return socket;
};

/**
 * Check if socket is configured and connected
 */
export const isSocketConfigured = () => {
    return isConfigured && socket && socket.connected;
};
/**
 * Disconnect socket
 * @param {boolean} force - Force disconnect even if not connected
 */
export const disconnectSocket = (force = false) => {
    if (socket) {
        if (force || socket.connected) {
            socket.disconnect();
        }
        socket = null;
        isConfigured = false;
        console.log('🔌 Socket disconnected manually');
    }
};

/**
 * Generic event listener
 * @param {string} event - Event name
 * @param {Function} callback - Callback function
 * @returns {Function} - Cleanup function to remove listener
 */
export const on = (event, callback) => {
    if (!socket) {
        console.warn('Socket not initialized');
        return () => {};
    }

    socket.on(event, callback);

    // Return cleanup function
    return () => {
        if (socket) {
            socket.off(event, callback);
        }
    };
};

/**
 * Emit event to socket
 * @param {string} event - Event name
 * @param {*} data - Data to emit
 */
export const emit = (event, data) => {
    if (!socket || !socket.connected) {
        console.warn('Socket not connected, cannot emit:', event);
        return;
    }

    socket.emit(event, data);
};

/**
 * Join dashboard room
 */
export const joinDashboard = () => {
    if (!socket || !socket.connected) {
        console.warn('Socket not connected, cannot join dashboard');
        return;
    }

    socket.emit('dashboard:join');
    console.log('📊 Joining dashboard room...');
};

/**
 * Leave dashboard room
 */
export const leaveDashboard = () => {
    if (!socket || !socket.connected) {
        return;
    }

    socket.emit('dashboard:leave');
    console.log('📊 Leaving dashboard room');
};

/**
 * Listen for dashboard updates
 * @param {Function} callback - Callback function to handle updates
 * @returns {Function} - Cleanup function to remove listener
 */
export const onDashboardUpdate = (callback) => {
    if (!socket) {
        console.warn('Socket not initialized');
        return () => {};
    }

    socket.on('dashboard:update', callback);

    // Return cleanup function
    return () => {
        if (socket) {
            socket.off('dashboard:update', callback);
        }
    };
};

/**
 * Join a chat room
 * @param {string} roomId - Room ID to join
 */
export const joinRoom = (roomId) => {
    if (!socket || !socket.connected) {
        console.warn('Socket not connected, cannot join room:', roomId);
        return;
    }

    socket.emit('admin:join_room', { roomId });
    console.log('💬 Joining room:', roomId);
};

/**
 * Leave a chat room
 * @param {string} roomId - Room ID to leave
 */
export const leaveRoom = (roomId) => {
    if (!socket || !socket.connected) {
        return;
    }

    socket.emit('admin:leave_room', { roomId });
    console.log('💬 Leaving room:', roomId);
};

/**
 * Listen for room updates (new rooms, room status changes)
 * @param {Function} callback - Callback function to handle room updates
 * @returns {Function} - Cleanup function to remove listener
 */
export const onRoomUpdate = (callback) => {
    if (!socket) {
        console.warn('Socket not initialized');
        return () => {};
    }

    socket.on('room:update', callback);

    // Return cleanup function
    return () => {
        if (socket) {
            socket.off('room:update', callback);
        }
    };
};

/**
 * Listen for chat updates (new messages)
 * @param {Function} callback - Callback function to handle chat updates
 * @returns {Function} - Cleanup function to remove listener
 */
export const onChatUpdate = (callback) => {
    if (!socket) {
        console.warn('Socket not initialized');
        return () => {};
    }

    socket.on('chat:update', callback);

    // Return cleanup function
    return () => {
        if (socket) {
            socket.off('chat:update', callback);
        }
    };
};

/**
 * Send a chat message via socket
 * @param {string} roomId - Room ID
 * @param {string} message - Message content
 * @param {object} options - Additional options
 */
export const sendChatMessage = (roomId, message, options = {}) => {
    if (!socket || !socket.connected) {
        console.warn('Socket not connected, cannot send message');
        return;
    }

    socket.emit('admin:send_message', {
        roomId,
        message,
        ...options
    });
};

export default {
    initSocket,
    getSocket,
    isSocketConfigured,
    disconnectSocket,
    on,
    emit,
    joinDashboard,
    leaveDashboard,
    onDashboardUpdate,
    joinRoom,
    leaveRoom,
    onRoomUpdate,
    onChatUpdate,
    sendChatMessage
};
