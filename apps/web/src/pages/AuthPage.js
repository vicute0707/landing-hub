import React, { useState, useContext } from 'react';
import { setAuthToken } from '../utils/axiosConfig';
import { UserContext } from '../context/UserContext';
import Login from '../components/Login';
import Register from '../components/Register';
import Background from '../components/Background';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import api from '../utils/api';
import '../styles/AuthPage.css';
const AuthPage = () => {
    const { setUser } = useContext(UserContext);
    const [activeTab, setActiveTab] = useState('login');
    const [error, setError] = useState(null);

    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            const decoded = jwtDecode(credentialResponse.credential);
            console.log('Decoded Token from Google:', decoded);

            const token = credentialResponse.credential;

            // ✅ lưu và gắn header SAU khi có token
            localStorage.setItem('token', token);
            setAuthToken(token); // ➜ thêm dòng này

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
            setError('Lỗi khi xử lý đăng nhập: ' + err.message);
        }
    };

    const handleGoogleFailure = (error) => {
        console.error('Google Login Failed:', error);
        setError('Đăng nhập thất bại. Vui lòng thử lại.');
    };

    return (
        <Background>
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
                        />
                    )}
                    {activeTab === 'register' && <Register />}
                </div>
            </div>
        </Background>
    );
};

export default AuthPage;