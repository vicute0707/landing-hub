import React, { useState, useEffect } from 'react';
import api from '@landinghub/api';
import '../styles/UserProfile.css';
import Loading from '../components/FaceLoader';

const UserProfile = () => {
    const [userData, setUserData] = useState({});
    const [form, setForm] = useState({ name: '' });
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get('/api/user/info');
                setUserData(res.data);
                setForm({ name: res.data.name || '' });
            } catch (err) {
                console.error(err);
                setError('Không thể tải dữ liệu người dùng.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleChange = (e) => setForm({ name: e.target.value });

    const handleUpdate = async (e) => {
        e.preventDefault();
        setError(null);
        setUpdating(true);
        try {
            const res = await api.put('/api/user/update', { name: form.name });
            localStorage.setItem('token', res.data.token);
            setUserData({ ...userData, name: form.name });
        } catch (err) {
            setError(err.response?.data?.msg || 'Cập nhật thất bại');
        } finally {
            setUpdating(false);
        }
    };

    /* ---------- RENDER ---------- */
    if (loading)
        return (
            <div className="upro-container">
                <div className="upro-card">
                    <div className="upro-skeleton" />
                </div>
            </div>
        );

    return (
        <div className="upro-container">
            <div className="upro-card">
                <h2 className="upro-title">Thông tin người dùng</h2>
                {error && <p className="upro-error">{error}</p>}

                <form onSubmit={handleUpdate} className="upro-form">
                    <label className="upro-label">
                        Tên
                        <input
                            className="upro-input"
                            value={form.name}
                            onChange={handleChange}
                            disabled={updating}
                        />
                    </label>

                    <label className="upro-label">
                        Email
                        <input
                            className="upro-input"
                            value={userData.email || 'Chưa có thông tin'}
                            disabled
                        />
                    </label>

                    <label className="upro-label">
                        Vai trò
                        <input
                            className="upro-input"
                            value={userData.role || 'Chưa có thông tin'}
                            disabled
                        />
                    </label>

                    <label className="upro-label">
                        Gói
                        <input
                            className="upro-input"
                            value={userData.subscription || 'Chưa có thông tin'}
                            disabled
                        />
                    </label>

                    <label className="upro-label">
                        Ngày tạo
                        <input
                            className="upro-input"
                            value={
                                userData.createdAt
                                    ? new Date(userData.createdAt).toLocaleDateString('vi-VN')
                                    : 'Chưa có thông tin'
                            }
                            disabled
                        />
                    </label>

                    <div className="upro-footer">
                        {updating ? (
                            <div className="upro-loaderWrap">
                                <Loading />
                                <span>Đang cập nhật...</span>
                            </div>
                        ) : (
                            <button className="upro-btn">Cập nhật</button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserProfile;