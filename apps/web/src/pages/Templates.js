import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../context/UserContext';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import PreviewModal from '../components/PreviewModal';
import { jwtDecode } from 'jwt-decode';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import InfiniteScroll from 'react-infinite-scroll-component';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { renderStaticHTML } from '../utils/pageUtils'; // đường dẫn giống CreateLanding
import '../styles/Templates.css';
import DogLoader from '../components/Loader';

const Templates = () => {
    const { user } = useContext(UserContext);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(null);
    const [templates, setTemplates] = useState([]);
    const [error, setError] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Tất cả');
    const [searchQuery, setSearchQuery] = useState('');
    const [designType, setDesignType] = useState('Tất cả');
    const [sortBy, setSortBy] = useState('usage_count');
    const [usingTemplateId, setUsingTemplateId] = useState(null);
    const [previewTemplate, setPreviewTemplate] = useState(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewHtml, setPreviewHtml] = useState('');
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
    const [showPreview, setShowPreview] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    const categories = [
        "Tất cả",
        "Thương mại điện tử",
        "Landing Page",
        "Blog",
        "Portfolio",
        "Doanh nghiệp",
        "Giáo dục",
        "Sự kiện",
        "Bất động sản",
        "Khác"
    ];
    const sortOptions = [
        { value: 'usage_count', label: 'Phổ biến nhất' },
        { value: 'created_at', label: 'Mới nhất' },
        { value: 'price_asc', label: 'Giá thấp đến cao' },
        { value: 'price_desc', label: 'Giá cao đến thấp' }
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
        AOS.init({ duration: 600, once: true, offset: 100 });
    }, []);

    useEffect(() => {
        if (userRole && userRole === 'user') {
            setTemplates([]);
            setPage(1);
            setHasMore(true);
            loadTemplates(1);
        }
    }, [userRole, selectedCategory, searchQuery, designType, sortBy]);

    const loadTemplates = async (pageNum = 1) => {
        try {
            setLoading(pageNum === 1);
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                page: pageNum,
                limit: 12,
                category: selectedCategory !== 'Tất cả' ? selectedCategory : '',
                q: searchQuery,
                design_type: designType !== 'Tất cả' ? designType : '',
                sort: sortBy
            });

            const response = await axios.get(`${API_BASE_URL}/api/templates?${params}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const newTemplates = response.data.templates || [];
            console.log('Templates được tải:', newTemplates.map(t => ({ id: t.id, screenshot_url: t.screenshot_url }))); // Debug
            setTemplates(prev => pageNum === 1 ? newTemplates : [...prev, ...newTemplates]);
            setHasMore(newTemplates.length === 12);
            setError('');
        } catch (err) {
            console.error('Lỗi tải templates:', err);
            setError('Không thể tải templates: ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    const loadMore = () => {
        if (!loading && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            loadTemplates(nextPage);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setTemplates([]);
        setPage(1);
        setHasMore(true);
        loadTemplates(1);
    };

    const handlePreview = async (template) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(
                `${API_BASE_URL}/api/templates/${template.id}/preview`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const { pageData } = res.data;
            console.log('🔍 PREVIEW response', res.data); // ← phải sau await

            if (!pageData || !pageData.elements) throw new Error('Không có dữ liệu trang');

            const html = renderStaticHTML(pageData);
            console.log('🔍 HTML length', html.length); // ← sau render

            setPreviewTemplate({ name: template.name });
            setPreviewHtml(html);
            setShowPreview(true);
        } catch (err) {
            console.error(err);
            alert('Không thể xem trước: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleUseTemplate = async (templateId, templateName) => {
        if (usingTemplateId) return;
        const confirmed = window.confirm(`Tạo landing page từ "${templateName}"?`);
        if (!confirmed) return;

        try {
            setUsingTemplateId(templateId);
            const token = localStorage.getItem('token');
            const decodedToken = jwtDecode(token);
            const userId = decodedToken.userId;

            const response = await axios.post(
                `${API_BASE_URL}/api/templates/${templateId}/use`,
                {
                    user_id: userId,
                    name: `${templateName} - Copy`,
                    description: `Từ template ${templateName}`
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                alert('✅ Tạo trang thành công!');
                navigate(`/pages?id=${response.data.page.id}`);
            }
        } catch (err) {
            console.error('Lỗi sử dụng template:', err);
            alert(`❌ ${err.response?.data?.error || 'Lỗi sử dụng template'}`);
        } finally {
            setUsingTemplateId(null);
        }
    };

    const getSafeImageUrl = (url) => {
        if (!url || !url.startsWith('http') || url.startsWith('s3://')) {
            return 'https://via.placeholder.com/400x240/667eea/ffffff?text=Preview+Not+Available';
        }
        return url;
    };

    const getUniqueKey = (template, index) => `${template.id}-${index}-${page}`;

    const getPlaceholderImage = (templateName, category) => {
        const colors = {
            'Bất động sản': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'Thương mại điện tử': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            'Nhà hàng': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            'Sức khỏe': 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            'Giáo dục': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            'Khác': 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)'
        };
        return {
            background: colors[category] || colors['Khác'],
            text: templateName ? templateName.charAt(0).toUpperCase() : 'T'
        };
    };

    const handleImageError = (e) => {
        console.error('Lỗi tải ảnh:', e.target.src);
        e.target.style.display = 'none';
        e.target.nextSibling.style.display = 'flex';
    };

    if (loading) return <DogLoader />;

    const isCompact = location.pathname === '/dashboard';

    return (
        <div className="templates-page">
            <Header role={userRole} />
            <div className="templates-main">
                <Sidebar role={userRole} isCompact={isCompact} />
                <div className="templates-content">
                    {/* BANNER QUẢNG CÁO */}
                    <div className="banner-section">
                        <img
                            src="https://res.cloudinary.com/dubthm5m6/image/upload/v1760618991/Black_and_white_Geometric_Gamming_Channel_Youtube_Banner_nanfgp.jpg"
                            alt="Template Marketplace Banner"
                            className="banner-image"
                        />
                        <div className="banner-overlay">
                            <h2>Khám Phá Marketplace Templates</h2>
                            <p>200+ Mẫu Thiết Kế Chuyên Nghiệp - Nhận Ưu Đãi 20% Hôm Nay!</p>
                            <button className="banner-cta" onClick={() => navigate('/market')}>
                                Mua Ngay
                            </button>
                        </div>
                    </div>

                    {/* SEARCH + FILTERS */}
                    <div className="controls-section">
                        <form className="search-form" onSubmit={handleSearch}>
                            <input
                                type="text"
                                placeholder="Tìm kiếm template..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="search-input"
                            />
                            <button type="submit" className="search-btn">
                                <i className="fas fa-search"></i>
                            </button>
                        </form>

                        <div className="sub-filters">
                            <select
                                value={sortBy}
                                onChange={e => setSortBy(e.target.value)}
                                className="filter-select"
                            >
                                {sortOptions.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* TABS DANH MỤC */}
                    <div className="category-tabs">
                        {categories.map(category => (
                            <button
                                key={category}
                                className={`tab-btn ${selectedCategory === category ? 'active' : ''}`}
                                onClick={() => setSelectedCategory(category)}
                            >
                                {category}
                            </button>
                        ))}
                    </div>

                    {error && (
                        <div className="error-alert">
                            <i className="fas fa-exclamation-triangle"></i>
                            {error}
                        </div>
                    )}

                    <InfiniteScroll
                        dataLength={templates.length}
                        next={loadMore}
                        hasMore={hasMore}
                        loader={<DogLoader small />}
                        endMessage={
                            <div className="end-message">
                                <i className="fas fa-check-circle"></i>
                                <p>Đã tải hết templates!</p>
                            </div>
                        }
                        className="templates-grid"
                    >
                        {templates.map((template, index) => {
                            const placeholder = getPlaceholderImage(template.name, template.category);
                            const safeImage = getSafeImageUrl(template.screenshot_url);
                            return (
                                <div key={getUniqueKey(template, index)} className="template-card" data-aos="fade-up">
                                    <div className="card-media">
                                        <img
                                            src={safeImage}
                                            alt={template.name}
                                            className="template-image"
                                            onError={handleImageError}
                                            loading="lazy"
                                        />
                                        <div
                                            className="image-placeholder"
                                            style={{ background: placeholder.background, display: safeImage ? 'none' : 'flex' }}
                                        >
                                            <span>{placeholder.text}</span>
                                        </div>

                                        <div className="card-overlay">
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => handlePreview(template)}
                                            >
                                                <i className="fas fa-eye"></i>
                                            </button>
                                            <button
                                                className="btn btn-primary"
                                                onClick={() => handleUseTemplate(template.id, template.name)}
                                                disabled={usingTemplateId === template.id}
                                            >
                                                {usingTemplateId === template.id ? (
                                                    <i className="fas fa-spinner fa-spin"></i>
                                                ) : (
                                                    <i className="fas fa-rocket"></i>
                                                )}
                                            </button>
                                        </div>

                                        {template.is_featured && <div className="badge featured">⭐ Nổi bật</div>}
                                        {template.price > 0 && (
                                            <div className="badge premium">{template.formatted_price}</div>
                                        )}
                                        {template.price === 0 && <div className="badge free">Free</div>}
                                    </div>

                                    <div className="card-content">
                                        <h3 className="card-title">{template.name}</h3>
                                        <div className="card-meta">
                                            <span className="category">{template.category}</span>
                                            <span className="usage">
                                                <i className="fas fa-users"></i> {template.usage_count}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </InfiniteScroll>
                    {showPreview && (
                        <PreviewModal
                            selectedTemplate={previewTemplate}
                            setShowPreviewModal={setShowPreview}
                            previewHtml={previewHtml}
                            setPreviewHtml={setPreviewHtml}
                            fullScreen={false}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default React.memo(Templates);