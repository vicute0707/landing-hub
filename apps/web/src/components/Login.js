import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useGoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import '../styles/login.css';
import Loader from '../components/Loader';

const Login = ({
                   error: externalError,             // Error từ AuthPage (nếu có)
                   onGoogleSuccess,                  // Không dùng ở đây nữa vì tự xử lý Google riêng
                   onGoogleFailure,                  // Tương tự
                   setQuickLoginRef,                  // Prop quan trọng: để AuthPage gọi quick login
               }) => {
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [redirecting, setRedirecting] = useState(false);
    const [error, setError] = useState(''); // Error nội bộ

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    // Hàm đăng nhập chính (email/password)
    const handleLogin = async (e) => {
        e?.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await api.post('/api/auth/login', form);
            const token = res.data.token;
            localStorage.setItem('token', token);

            const decodedToken = jwtDecode(token);
            const role = decodedToken.role;

            setRedirecting(true);
            setTimeout(() => redirectBasedOnRole(role), 1200);
        } catch (err) {
            const msg = err.response?.data?.msg || 'Đăng nhập thất bại';
            setError(msg);
            setLoading(false);
        }
    };

    // Hàm QUICK LOGIN - được gọi từ panel test ở Background
    const quickLogin = async (email, password) => {
        setForm({ email, password });
        setError('');
        setLoading(true);

        // Delay nhẹ để người dùng thấy form được điền tự động (UX tốt hơn)
        setTimeout(async () => {
            try {
                const res = await api.post('/api/auth/login', { email, password });
                const token = res.data.token;
                localStorage.setItem('token', token);

                const decodedToken = jwtDecode(token);
                const role = decodedToken.role;

                setRedirecting(true);
                setTimeout(() => redirectBasedOnRole(role), 1200);
            } catch (err) {
                const msg = err.response?.data?.msg || 'Đăng nhập thất bại';
                setError(msg);
                setLoading(false);
            }
        }, 600);
    };

    // Expose quickLogin ra ngoài cho AuthPage sử dụng
    useEffect(() => {
        if (setQuickLoginRef) {
            setQuickLoginRef(quickLogin);
        }
    }, [setQuickLoginRef]);

    // Login bằng Google (giữ nguyên logic cũ)
    const handleGoogleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            try {
                if (!tokenResponse.access_token) {
                    throw new Error('access_token is missing');
                }

                const userInfo = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });

                const res = await api.post('/api/auth/google/callback', {
                    email: userInfo.data.email,
                    name: userInfo.data.name,
                });

                const token = res.data.token;
                localStorage.setItem('token', token);

                const decodedToken = jwtDecode(token);
                const role = decodedToken.role;

                setRedirecting(true);
                setTimeout(() => redirectBasedOnRole(role), 1200);
            } catch (err) {
                setError(err.response?.data?.msg || 'Google login thất bại');
            }
        },
        onError: () => {
            setError('Google login thất bại');
        },
        flow: 'implicit',
        scope: 'openid email profile',
    });

    const redirectBasedOnRole = (role) => {
        if (role === 'admin') {
            navigate('/dashboard');
        } else {
            navigate('/dashboard'); // hoặc route khác nếu cần phân quyền
        }
    };

    // Hiển thị loader khi đang redirect
    if (redirecting) {
        return <Loader />;
    }

    // Ưu tiên hiển thị error từ bên ngoài (AuthPage), nếu không thì dùng error nội bộ
    const displayError = externalError || error;

    return (
        <div className="login-container">
            <form className="form" onSubmit={handleLogin}>
                <h2 style={{ textAlign: 'center', marginBottom: 20 }}>Đăng Nhập</h2>

                {displayError && (
                    <div style={{ color: 'red', marginBottom: 12, textAlign: 'center' }}>
                        {displayError}
                    </div>
                )}

                <div className="flex-column">
                    <label>Email</label>
                    <div className="inputForm">
                        <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="Enter your Email"
                            className="input"
                            required
                        />
                    </div>
                </div>

                <div className="flex-column">
                    <label>Password</label>
                    <div className="inputForm">
                        <input
                            type="password"
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            placeholder="Enter your Password"
                            className="input"
                            required
                            autoComplete="current-password"
                        />
                    </div>
                </div>

                <button type="submit" className="button-submit" disabled={loading}>
                    {loading ? 'Đang đăng nhập...' : 'Sign In'}
                </button>

                <p className="p line">Or With</p>

                <div className="flex-row" style={{ justifyContent: 'center' }}>
                    <button
                        type="button"
                        className="btn google"
                        onClick={() => handleGoogleLogin()}
                    >
                        Google
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Login;