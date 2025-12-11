import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../context/UserContext';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import AOS from 'aos';
import 'aos/dist/aos.css';
import '../styles/SellPage.css';
import DogLoader from '../components/Loader';

// [LUXURY ICON COMPONENT] (Giữ nguyên)
const IconLuxury = ({ name, size = 18, color = 'currentColor', className = '' }) => {
    const icons = {
        File: <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>,
        Edit: <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>,
        List: <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>,
        Tag: <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>,
        DollarSign: <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>,
        Link: <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>,
        Info: <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>,
    };

    return <i className={className}>{icons[name] || null}</i>;
};



const SellPage = () => {
    const { user } = useContext(UserContext);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [myPages, setMyPages] = useState([]);
    const [formData, setFormData] = useState({
        page_id: '',
        title: '',
        description: '',
        category: 'Landing Page',
        price: '',
        original_price: '',
        tags: '',
        demo_url: ''
    });

    const navigate = useNavigate();
    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

    const categories = [
        'Landing Page',
        'Thương mại điện tử',
        'Blog',
        'Portfolio',
        'Doanh nghiệp',
        'Giáo dục',
        'Sự kiện',
        'Bất động sản',
        'Ẩm thực',
        'Du lịch',
        'Y tế',
        'Thời trang',
        'Khác'
    ];

    useEffect(() => {
        const initializeAuth = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/auth');
                setLoading(false);
                return;
            }
            try {
                const decodedToken = jwtDecode(token);
                if (!decodedToken.role || !decodedToken.userId) {
                    navigate('/auth');
                    setLoading(false);
                    return;
                }
                setUserRole(decodedToken.role);
            } catch (err) {
                console.error('Lỗi giải mã token:', err);
                navigate('/auth');
            } finally {
                setLoading(false);
            }
        };

        if (user?.role) {
            setUserRole(user.role);
            setLoading(false);
        } else {
            initializeAuth();
        }
    }, [user, navigate]);

    useEffect(() => {
        AOS.init({ duration: 600, once: true });
    }, []);

    useEffect(() => {
        if (userRole) {
            loadMyPages();
        }
    }, [userRole, API_BASE_URL]);

    const loadMyPages = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/api/pages`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const pagesWithData = response.data.filter(page => page.page_data);
            setMyPages(pagesWithData);
        } catch (err) {
            console.error('Lỗi tải pages:', err);
            toast.error('Không thể tải danh sách landing page');
        }
    };

    const handlePageSelect = (e) => {
        const pageId = e.target.value;
        const selectedPage = myPages.find(p => p._id === pageId);

        if (selectedPage) {
            setFormData({
                ...formData,
                page_id: pageId,
                title: selectedPage.name,
                description: selectedPage.description || '',
                demo_url: selectedPage.url || ''
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.page_id) {
            toast.error('Vui lòng chọn landing page');
            return;
        }

        if (!formData.title || !formData.description) {
            toast.error('Vui lòng điền đầy đủ thông tin');
            return;
        }

        if (!formData.price || parseFloat(formData.price) < 0) {
            toast.error('Vui lòng nhập giá hợp lệ');
            return;
        }

        try {
            setSubmitting(true);
            const token = localStorage.getItem('token');
            const payload = {
                page_id: formData.page_id,
                title: formData.title,
                description: formData.description,
                category: formData.category,
                price: parseFloat(formData.price),
                original_price: formData.original_price ? parseFloat(formData.original_price) : null,
                tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
                demo_url: formData.demo_url
            };

            const response = await axios.post(
                `${API_BASE_URL}/api/marketplace/sell`,
                payload,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                toast.success('Đăng bán landing page thành công! Đang chờ admin duyệt.');
                navigate('/my-sales');
            }
        } catch (err) {
            console.error('Lỗi đăng bán:', err);
            toast.error(err.response?.data?.message || 'Không thể đăng bán landing page');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <DogLoader />;
    }

    return (
        <div className="sell-page-container">
            <Header />
            <div className="sell-page-main">
                <Sidebar userRole={userRole} />
                <div className="sell-page-content">
                    <div className="sell-page-header" data-aos="fade-down">
                        <h1>Đăng bán Landing Page</h1>
                        <p>Đăng bán landing page của bạn lên Marketplace chuyên nghiệp</p>
                    </div>

                    {/* START: Cấu trúc 2 cột mới */}
                    <div className="form-layout-grid" data-aos="fade-up">

                        {/* CỘT 1: FORM CHÍNH */}
                        <div className="sell-form-column">
                            <form onSubmit={handleSubmit} className="sell-form">
                                {/* Select Landing Page */}
                                <div className="form-group">
                                    <label>
                                        <IconLuxury name="File" color="var(--color-accent-gold-dark)" className="label-icon" />
                                        Chọn Landing Page
                                        <span className="required">*</span>
                                    </label>
                                    <select
                                        value={formData.page_id}
                                        onChange={handlePageSelect}
                                        required
                                    >
                                        <option value="">-- Chọn landing page (có thể chưa publish) --</option>
                                        {myPages.map(page => (
                                            <option key={page._id} value={page._id}>
                                                {page.name} ({page.status === 'ĐÃ XUẤT BẢN' ? 'Đã Xuất Bản' : 'Chưa Xuất Bản'})
                                            </option>
                                        ))}
                                    </select>
                                    {myPages.length === 0 && (
                                        <p className="help-text">
                                            Bạn chưa có landing page nào. <a href="/pages">Tạo ngay</a>
                                        </p>
                                    )}
                                </div>

                                {/* Title */}
                                <div className="form-group">
                                    <label>
                                        <IconLuxury name="Edit" color="var(--color-accent-gold-dark)" className="label-icon" />
                                        Tiêu đề
                                        <span className="required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="Nhập tiêu đề hấp dẫn cho landing page"
                                        maxLength={200}
                                        required
                                    />
                                    <span className="char-count">{formData.title.length}/200</span>
                                </div>

                                {/* Description */}
                                <div className="form-group">
                                    <label>
                                        <IconLuxury name="List" color="var(--color-accent-gold-dark)" className="label-icon" />
                                        Mô tả
                                        <span className="required">*</span>
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Mô tả chi tiết về landing page của bạn, tính năng, ưu điểm..."
                                        maxLength={2000}
                                        rows={6}
                                        required
                                    />
                                    <span className="char-count">{formData.description.length}/2000</span>
                                </div>

                                {/* Category */}
                                <div className="form-group">
                                    <label>
                                        <IconLuxury name="Tag" color="var(--color-accent-gold-dark)" className="label-icon" />
                                        Danh mục
                                        <span className="required">*</span>
                                    </label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        required
                                    >
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Pricing */}
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>
                                            <IconLuxury name="DollarSign" color="var(--color-accent-gold-dark)" className="label-icon" />
                                            Giá bán (VNĐ)
                                            <span className="required">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.price}
                                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                            placeholder="0"
                                            min="0"
                                            step="1000"
                                            required
                                        />
                                        <p className="help-text">
                                            Platform sẽ thu phí 10%. Bạn nhận: **{formData.price ? (parseFloat(formData.price) * 0.9).toLocaleString('vi-VN') : '0'} VNĐ**
                                        </p>
                                    </div>

                                </div>

                                {/* Tags */}
                                <div className="form-group">
                                    <label>
                                        <IconLuxury name="Tag" color="var(--color-accent-gold-dark)" className="label-icon" />
                                        Tags
                                        <span className="optional">(Tùy chọn)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.tags}
                                        onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                        placeholder="VD: responsive, modern, ecommerce (cách nhau bằng dấu phẩy)"
                                    />
                                </div>

                                {/* Demo URL */}
                                <div className="form-group">
                                    <label>
                                        <IconLuxury name="Link" color="var(--color-accent-gold-dark)" className="label-icon" />
                                        URL Demo
                                        <span className="optional">(Tùy chọn)</span>
                                    </label>
                                    <input
                                        type="url"
                                        value={formData.demo_url}
                                        onChange={(e) => setFormData({ ...formData, demo_url: e.target.value })}
                                        placeholder="https://example.com/demo"
                                    />
                                </div>

                                {/* Submit Button (Đặt bên dưới form chính) */}
                                <div className="form-actions-full">
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={() => navigate('/pages')}
                                        disabled={submitting}
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-primary"
                                        disabled={submitting}
                                    >
                                        {submitting ? '⏳ Đang xử lý...' : '🚀 Đăng bán ngay'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* CỘT 2: INFO BOX */}
                        <div className="info-box-column">
                            <div className="info-box" data-aos="fade-in">
                                <h3><IconLuxury name="Info" size={18} color="var(--color-accent-navy)" /> Lưu ý khi đăng bán</h3>
                                <ul>
                                    <li>Không cần publish - Có thể bán ngay khi đã tạo nội dung</li>
                                    <li>Hệ thống tự động copy images & tạo screenshot</li>
                                    <li>Admin sẽ review và duyệt trong vòng **24-48 giờ**</li>
                                    <li>Đảm bảo nội dung không vi phạm bản quyền</li>
                                    <li>Platform thu phí **10%** trên mỗi giao dịch</li>
                                    <li>Bạn có thể cập nhật thông tin sau khi đăng</li>
                                </ul>
                            </div>
                            {/* Bạn có thể thêm một "Seller Tip" nhỏ khác ở đây */}
                        </div>
                    </div>
                    {/* END: Cấu trúc 2 cột mới */}
                </div>
            </div>
        </div>
    );
};

export default SellPage;