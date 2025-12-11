import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../context/UserContext';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import DogLoader from '../components/Loader';
import { useNavigate } from 'react-router-dom';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { userApi } from '../utils/userApi';
import '../styles/AdminUser.css';

const AdminUser = () => {
    const { user } = useContext(UserContext);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(null);
    const [users, setUsers] = useState([]);
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        role: 'user',
        subscription: 'free',
    });
    const [editingId, setEditingId] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) {
            navigate('/auth');
            return;
        }
        setUserRole(user.role);
        setLoading(false);
    }, [user, navigate]);

    useEffect(() => {
        AOS.init({ duration: 600, once: true });
    }, []);

    useEffect(() => {
        if (userRole === 'admin') loadUsers();
    }, [userRole]);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const res = await userApi.getAll();
            setUsers(res.data || []);
        } catch (err) {
            const msg =
                err.response?.data?.message ||
                err.message ||
                'Không thể tải danh sách người dùng';
            toast.error(msg);
            console.error('Load users failed:', err.response || err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await userApi.update(editingId, form);
                toast.success('Cập nhật người dùng thành công');
            } else {
                await userApi.create(form);
                toast.success('Tạo người dùng mới thành công');
            }
            setForm({ name: '', email: '', password: '', role: 'user', subscription: 'free' });
            setEditingId(null);
            loadUsers();
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Lỗi hệ thống';
            toast.error(msg);
        }
    };

    const handleEdit = (u) => {
        setEditingId(u._id);
        setForm({ ...u, password: '' });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa người dùng này?')) return;
        try {
            await userApi.remove(id);
            toast.info('Đã xóa người dùng');
            loadUsers();
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Không thể xóa người dùng';
            toast.error(msg);
        }
    };

    if (loading && users.length === 0) return <DogLoader />;

    return (
        <div className="admin-user-container">
            <Header />
            <div className="admin-user-main">
                <Sidebar role={userRole} />
                <div className="admin-user-content" data-aos="fade-up">
                    <div className="admin-header">
                        <div className="header-title">
                            <span className="icon-wrapper">👥</span>
                            <div>
                                <h1>Quản lý tài khoản</h1>
                                <p>Thêm mới, chỉnh sửa và quản lý tất cả người dùng trong hệ thống.</p>
                            </div>
                        </div>
                    </div>

                    {/* Form thêm/sửa user */}
                    <form onSubmit={handleSubmit} className="admin-user-form" data-aos="fade-right">
                        <input
                            type="text"
                            placeholder="Tên người dùng"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                        <input
                            type="email"
                            placeholder="Email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                        />
                        {!editingId && (
                            <input
                                type="password"
                                placeholder="Mật khẩu"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                            />
                        )}
                        <select
                            value={form.role}
                            onChange={(e) => setForm({ ...form, role: e.target.value })}
                        >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                        </select>
                        <select
                            value={form.subscription}
                            onChange={(e) => setForm({ ...form, subscription: e.target.value })}
                        >
                            <option value="free">Free</option>
                            <option value="premium">Premium</option>
                        </select>
                        <button type="submit" className="btn-primary">
                            {editingId ? 'Cập nhật' : 'Thêm mới'}
                        </button>
                    </form>

                    {/* Bảng user */}
                    <div className="user-table-container" data-aos="fade-left">
                        {loading ? (
                            <DogLoader />
                        ) : (
                            <table className="user-table">
                                <thead>
                                <tr>
                                    <th>Tên</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Gói</th>
                                    <th>Ngày tạo</th>
                                    <th>Đăng nhập cuối</th>
                                    <th>Số lần đăng nhập</th>
                                    <th>Hành động</th>
                                </tr>
                                </thead>
                                <tbody>
                                {users.map((u) => (
                                    <tr key={u._id}>
                                        <td>{u.name}</td>
                                        <td>{u.email}</td>
                                        <td>
                                            <span className={`role-badge ${u.role}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`sub-badge ${u.subscription}`}>
                                                {u.subscription}
                                            </span>
                                        </td>
                                        <td>{new Date(u.createdAt).toLocaleDateString('vi-VN')}</td>
                                        <td>
                                            {u.last_login ? (
                                                <div style={{ fontSize: '13px' }}>
                                                    <div>{new Date(u.last_login).toLocaleDateString('vi-VN')}</div>
                                                    <div style={{ color: '#666', fontSize: '11px' }}>
                                                        {new Date(u.last_login).toLocaleTimeString('vi-VN')}
                                                    </div>
                                                    {u.last_login_ip && (
                                                        <div style={{ color: '#999', fontSize: '10px' }}>
                                                            IP: {u.last_login_ip}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span style={{ color: '#999' }}>Chưa đăng nhập</span>
                                            )}
                                        </td>
                                        <td>
                                            <span className="login-count-badge">
                                                {u.login_count || 0}
                                            </span>
                                        </td>
                                        <td className="action-cell">
                                            <button className="btn-edit" onClick={() => handleEdit(u)}>
                                                Sửa
                                            </button>
                                            <button className="btn-delete" onClick={() => handleDelete(u._id)}>
                                                Xóa
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminUser;
