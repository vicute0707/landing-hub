import React, { useState, useContext } from 'react';
import api from '@landinghub/api';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import '../styles/register.css';

const Register = () => {
    const { setUser } = useContext(UserContext);
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            // Chỉ gọi /auth/register vì baseURL trong api.js đã là /api
            const res = await api.post('/auth/register', form);

            // Lưu token
            localStorage.setItem('token', res.data.token);

            // Set user vào context để app biết
            if (res.data.user) setUser(res.data.user);

            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.msg || 'Đăng ký thất bại');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="register-container">
            <form className="form" onSubmit={handleRegister}>
                <h2 style={{ textAlign: 'center', marginBottom: 20 }}>Đăng Ký</h2>

                {error && (
                    <div style={{ color: 'red', marginBottom: 12, textAlign: 'center' }}>
                        {error}
                    </div>
                )}

                <div className="flex-column">
                    <label>Tên</label>
                    <div className="inputForm">
                        <input
                            type="text"
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            placeholder="Enter your Name"
                            className="input"
                            required
                        />
                    </div>
                </div>

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
                        />
                    </div>
                </div>

                <button type="submit" className="button-submit" disabled={loading}>
                    {loading ? 'Đang đăng ký...' : 'Đăng Ký'}
                </button>
            </form>
        </div>
    );
};

export default Register;
