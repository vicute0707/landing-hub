import React, { useState } from 'react';
import '../styles/Background.css';
import logo from '../assets/logo.png';
import { Link } from "react-router-dom";

const Background = ({ children, fullWidth = false, onQuickLogin }) => {
    const [showTestPanel, setShowTestPanel] = useState(false);
    const [showPassAdmin, setShowPassAdmin] = useState(false);
    const [showPassUser, setShowPassUser] = useState(false);

    const togglePanel = () => setShowTestPanel(!showTestPanel);

    const handleQuickLogin = (email, password) => {
        if (onQuickLogin) {
            onQuickLogin(email, password);
        }
        setShowTestPanel(false);
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert('Đã copy: ' + text);
    };

    return (
        <div className="background-container">
            {/* Shapes & Navbar giữ nguyên */}
            <div className="background-shapes">
                <div className="shape-yellow-circle"></div>
                <div className="shape-blue-large"></div>
                <div className="shape-purple-overlay"></div>
                <div className="shape-pink-bottom"></div>
            </div>

            <nav className="navbar">
                <div className="navbar-container">
                    <div className="logo-section">
                        <img src={logo} alt="Logo" className="logo-image" />
                    </div>
                    <div className="menu-items">
                        <Link to="/public/gioithieu" className="menu-link">Giới thiệu</Link>
                        <Link to="/public/bai-viet" className="menu-link">Bài viết</Link>
                        <Link to="/public/pages" className="menu-link">Pages</Link>
                        <Link to="/public/lienhe" className="menu-link">Liên hệ</Link>
                    </div>
                    <select className="language-selector">
                        <option>Tiếng việt</option>
                        <option>English</option>
                    </select>
                </div>
            </nav>

            {/* Main Content */}
            {fullWidth ? (
                <div style={{ position: 'relative', zIndex: 10 }}>{children}</div>
            ) : (
                <div className="main-content-lo">
                    <div className="content-wrapper">
                        <div className="form-container">{children}</div>
                    </div>
                </div>
            )}

            {/* ================== NÚT TEST MÈO DỄ THƯƠNG - BÊN TRÁI ================== */}
            {process.env.NODE_ENV === 'development' && (
                <>
                    {/* Nút con mèo ở góc dưới bên TRÁI */}
                    <button
                        onClick={togglePanel}
                        style={{
                            position: 'fixed',
                            bottom: '30px',
                            left: '30px',                    // ← Chuyển sang bên trái
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            backgroundColor: '#ff6b6b',      // Màu hồng cam dễ thương
                            color: 'white',
                            border: 'none',
                            fontSize: '36px',
                            boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
                            cursor: 'pointer',
                            zIndex: 3000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.3s ease',
                        }}
                        title="Click để xem tài khoản test (chỉ hiện ở dev mode nha~ 🐱)"
                        aria-label="Tài khoản test demo"
                    >
                        🐱
                    </button>

                    {/* Tooltip nhỏ hiện khi hover (dùng pseudo-element bằng div cho dễ) */}
                    <div
                        style={{
                            position: 'fixed',
                            bottom: '110px',
                            left: '30px',
                            backgroundColor: 'rgba(0,0,0,0.8)',
                            color: 'white',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            pointerEvents: 'none',
                            opacity: showTestPanel ? 0 : 0.9,  // Chỉ hiện khi chưa mở panel
                            transition: 'opacity 0.3s ease',
                            zIndex: 2999,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        🐱 Click để test tài khoản demo
                    </div>

                    {/* Panel test - cũng chuyển sang bên trái */}
                    {showTestPanel && (
                        <div
                            style={{
                                position: 'fixed',
                                bottom: '110px',
                                left: '30px',                   // ← Bên trái
                                width: '340px',
                                backgroundColor: 'white',
                                borderRadius: '16px',
                                boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
                                padding: '20px',
                                zIndex: 2999,
                                fontSize: '14px',
                                border: '2px solid #ff6b6b',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <strong style={{ color: '#ff6b6b', fontSize: '16px' }}>🐱 Tài khoản test </strong>
                                <button
                                    onClick={togglePanel}
                                    style={{ background: 'none', border: 'none', fontSize: '26px', cursor: 'pointer', padding: '0' }}
                                >
                                    ×
                                </button>
                            </div>

                            {/* Admin */}
                            <div style={{ marginBottom: '16px', padding: '14px', background: '#fff0f0', borderRadius: '10px' }}>
                                <strong>Admin</strong><br />
                                Email: <code>admin@gmail.com</code><br />
                                Pass: <span>{showPassAdmin ? '123456' : '••••••••'}</span>
                                <button onClick={() => setShowPassAdmin(!showPassAdmin)} style={{ marginLeft: '8px', background: 'none', border: 'none', cursor: 'pointer' }}>
                                    {showPassAdmin ? '🙈' : '👁'}
                                </button>
                                <button onClick={() => copyToClipboard('123456')} style={{ marginLeft: '8px', fontSize: '12px', padding: '2px 6px' }}>
                                    Copy
                                </button>
                                <br />
                                <button
                                    onClick={() => handleQuickLogin('admin@gmail.com', '123456')}
                                    style={{ marginTop: '10px', width: '100%', padding: '10px', background: '#e91e63', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    Đăng nhập nhanh (Admin)
                                </button>
                            </div>

                            {/* User thường */}
                            <div style={{ padding: '14px', background: '#f0fff0', borderRadius: '10px' }}>
                                <strong>User</strong><br />
                                Email: <code>vi123@gmail.com</code><br />
                                Pass: <span>{showPassUser ? '123456' : '•••••••'}</span>
                                <button onClick={() => setShowPassUser(!showPassUser)} style={{ marginLeft: '8px', background: 'none', border: 'none', cursor: 'pointer' }}>
                                    {showPassUser ? '🙈' : '👁'}
                                </button>
                                <button onClick={() => copyToClipboard('123456')} style={{ marginLeft: '8px', fontSize: '12px', padding: '2px 6px' }}>
                                    Copy
                                </button>
                                <br />
                                <button
                                    onClick={() => handleQuickLogin('vi123@gmail.com', '123456')}
                                    style={{ marginTop: '10px', width: '100%', padding: '10px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    Đăng nhập nhanh (User)
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Background;