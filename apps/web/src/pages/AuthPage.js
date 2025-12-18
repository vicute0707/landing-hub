import React, { useState, useContext, useEffect, useRef } from 'react';
import { setAuthToken } from '../utils/axiosConfig';
import { UserContext } from '../context/UserContext';
import Login from '../components/Login';
import Register from '../components/Register';
import Background from '../components/Background';
import { jwtDecode } from 'jwt-decode';
import api from '../utils/api';
import '../styles/AuthPage.css';

const AuthPage = () => {
    const { setUser } = useContext(UserContext);
    const [activeTab, setActiveTab] = useState('login');
    const [error, setError] = useState(null);

    // Ref để truyền hàm quickLogin từ Login ra ngoài
    const quickLoginRef = useRef(null);

    // Hàm xử lý Google login thành công
    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            const decoded = jwtDecode(credentialResponse.credential);
            console.log('Decoded Token from Google:', decoded);

            const token = credentialResponse.credential;
            localStorage.setItem('token', token);
            setAuthToken(token);

            const API_URL = process.env.REACT_APP_API_URL || 'https://api.landinghub.shop';
            await fetch(`${API_URL}/api/auth/google-callback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: decoded.email, name: decoded.name }),
            });

            const res = await api.get('/api/user/info');
            const backendUser = res.data;
            setUser({ ...backendUser, userId: backendUser._id });
            window.location.href = '/dashboard';
        } catch (err) {
            console.error(err);
            setError('Lỗi khi xử lý đăng nhập Google: ' + err.message);
        }
    };

    const handleGoogleFailure = (error) => {
        console.error('Google Login Failed:', error);
        setError('Đăng nhập Google thất bại. Vui lòng thử lại.');
    };

    // Hàm quick login được gọi từ Background (panel test)
    const handleQuickLogin = async (email, password) => {
        if (activeTab !== 'login') {
            setActiveTab('login'); // Tự động chuyển sang tab Login nếu đang ở Register
        }
        setError(null);

        // Gọi hàm quickLogin bên trong component Login thông qua ref
        if (quickLoginRef.current) {
            quickLoginRef.current(email, password);
        }
    };

    return (
        // Truyền handleQuickLogin vào Background để nó gọi lại khi cần
        <Background onQuickLogin={handleQuickLogin}>
            <div className="auth-page">
                <div className="tab-container">
                    <label className="tab_label" onClick={() => setActiveTab('login')}>
                        Login
                    </label>
                    <label className="tab_label" onClick={() => setActiveTab('register')}>
                        Register
                    </label>
                    <div className={`indicator ${activeTab}`}></div>
                </div>

                <div className="tab-content">
                    {activeTab === 'login' && (
                        <Login
                            onGoogleSuccess={handleGoogleSuccess}
                            onGoogleFailure={handleGoogleFailure}
                            error={error}
                            // Truyền ref để AuthPage có thể gọi quick login từ bên ngoài
                            setQuickLoginRef={(fn) => (quickLoginRef.current = fn)}
                        />
                    )}
                    {activeTab === 'register' && <Register />}
                </div>
            </div>
        </Background>
    );
};

export default AuthPage;