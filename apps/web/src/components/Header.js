import React, {useState, useEffect, useRef} from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import UserProfile from './UserProfile';
import api from '../utils/api';
import logo from '../assets/logo.png';
import '../styles/header.css';
import { FiBell, FiX } from 'react-icons/fi';
import { usePolling } from '../hooks/usePolling';


const Header = () => {
    const [userData, setUserData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showProfile, setShowProfile] = useState(false);
    const [showNotif, setShowNotif] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const navigate = useNavigate();
    const lastNotifIdRef = useRef(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get('/api/user/info');
                setUserData(res.data);
            } catch (err) {
                console.error('Error fetching user data:', err);
                setError('Không thể tải dữ liệu người dùng.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/api/notifications');
            setNotifications(res.data.data);
            setUnreadCount(res.data.data.filter(n => !n.isRead).length);

            // Update last notification ID for polling
            if (res.data.data.length > 0) {
                lastNotifIdRef.current = res.data.data[0]._id;
            }
        } catch (err) {
            console.error('Lỗi tải thông báo:', err);
        }
    };

    // 🔄 Polling: Poll new notifications every 10 seconds
    const pollNewNotifications = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const params = lastNotifIdRef.current
                ? `?after=${lastNotifIdRef.current}`
                : '';

            const res = await api.get(`/api/notifications${params}`);

            if (res.data.data && res.data.data.length > 0) {
                const newNotifs = res.data.data;

                // Add new notifications to the beginning
                setNotifications(prev => [...newNotifs, ...prev]);

                // Update unread count
                const newUnread = newNotifs.filter(n => !n.isRead).length;
                setUnreadCount(prev => prev + newUnread);

                // Update last notification ID
                lastNotifIdRef.current = newNotifs[0]._id;
            }
        } catch (err) {
            // Suppress 404 errors - notification system not yet fully implemented
            if (err.response?.status !== 404) {
                console.error('Lỗi poll thông báo:', err);
            }
        }
    };

    // Poll notifications every 10 seconds
    usePolling(pollNewNotifications, 10000, !!localStorage.getItem('token'));

    const markAsRead = async (id) => {
        try {
            await api.patch(`/api/notifications/${id}/read`);
            setNotifications(prev =>
                prev.map(n => (n._id === id ? { ...n, isRead: true } : n))
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Lỗi đánh dấu đã đọc:', err);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        window.location.href = '/auth';
    };

    const displayName = userData.name || (localStorage.getItem('token') ? `User ${jwtDecode(localStorage.getItem('token')).userId}` : 'Khách');

    if (error) return <div style={{ color: 'red' }}>{error}</div>;

    return (
        <header className="header">
            <div className="header__wrapper">
                {/* Logo */}
                <img
                    src={logo}
                    alt="Logo"
                    className="header__logo"
                    onClick={() => navigate('/')}
                />

                {/* Right area */}
                <div className="header__right">
                    {/* Notification */}
                    <div className="notif">
                        <button
                            className="notif__btn"
                            onClick={() => setShowNotif(s => !s)}
                            aria-label="Thông báo"
                        >
                            <FiBell size={20} />
                            {unreadCount > 0 && <span className="notif__badge">{unreadCount}</span>}
                        </button>

                        {showNotif && (
                            <div className="notif__panel">
                                <div className="notif__header">
                                    <span>Thông báo</span>
                                    <FiX onClick={() => setShowNotif(false)} />
                                </div>
                                <div className="notif__body">
                                    {notifications.length === 0 ? (
                                        <div className="notif__empty">Không có thông báo mới</div>
                                    ) : (
                                        notifications.map(n => (
                                            <div
                                                key={n._id}
                                                className={`notif__item ${n.isRead ? 'read' : 'unread'}`}
                                                onClick={() => markAsRead(n._id)}
                                            >
                                                <div className="notif__title">{n.title}</div>
                                                <div className="notif__msg">{n.message}</div>
                                                <div className="notif__time">
                                                    {new Date(n.createdAt).toLocaleString('vi-VN')}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* User */}
                    <div className="user">
                        {!localStorage.getItem('token') ? (
                            <button
                                className="user__loginBtn"
                                onClick={() => navigate('/auth')}
                            >
                                Đăng nhập
                            </button>
                        ) : (
                            <>
                                <span className="user__name">Chào, {displayName}</span>

                                <div
                                    className="user__avatarWrap"
                                    onClick={() => setShowProfile(s => !s)}
                                >
                                    {userData.avatar ? (
                                        <img
                                            src={userData.avatar}
                                            alt="avatar"
                                            className="user__avatar"
                                        />
                                    ) : (
                                        <div className="user__avatarFallback">
                                            <svg viewBox="0 0 24 24">
                                                <circle cx="12" cy="8" r="4" />
                                                <path d="M4 20c0-3.5 4-5.5 8-5.5s8 2 8 5.5" />
                                            </svg>
                                        </div>
                                    )}
                                </div>

                                <button className="user__logout" onClick={handleLogout}>
                                    Đăng xuất
                                </button>

                                {showProfile && (
                                    <div className="user__popover">
                                        <UserProfile />
                                        <button
                                            className="user__close"
                                            onClick={() => setShowProfile(false)}
                                        >
                                            Đóng
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default React.memo(Header);