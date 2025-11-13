import React, { useState, useEffect, useContext, useRef } from 'react';
import { UserContext } from '../context/UserContext';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import InfiniteScroll from 'react-infinite-scroll-component';
import AOS from 'aos';
import 'aos/dist/aos.css';
import '../styles/Marketplace.css';
import DogLoader from '../components/Loader';
import { Search, Eye, Heart, Star, ShoppingCart, Monitor } from 'lucide-react';
import PreviewModal from '../components/PreviewModal';

const Marketplace = () => {
    const { user } = useContext(UserContext);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(null);
    const [userId, setUserId] = useState(null);
    const [pages, setPages] = useState([]);
    const [error, setError] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [priceRange, setPriceRange] = useState({ min: '', max: '' });
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
    const [featuredPages, setFeaturedPages] = useState([]);
    const [bestsellers, setBestsellers] = useState([]);
    const [viewFilter, setViewFilter] = useState('all');
    const [purchasedPageIds, setPurchasedPageIds] = useState([]);
    const [myPageIds, setMyPageIds] = useState([]);
    const [purchasedDates, setPurchasedDates] = useState({});

    // Preview Modal State
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewHtml, setPreviewHtml] = useState('');
    const [previewPageData, setPreviewPageData] = useState(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);

    const navigate = useNavigate();
    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    const cartRef = useRef(null);

    const categories = [
        { value: 'all', label: 'Tất cả' },
        { value: 'Thương mại điện tử', label: 'Thương mại điện tử' },
        { value: 'Landing Page', label: 'Landing Page' },
        { value: 'Blog', label: 'Blog' },
        { value: 'Portfolio', label: 'Portfolio' },
        { value: 'Doanh nghiệp', label: 'Doanh nghiệp' },
        { value: 'Giáo dục', label: 'Giáo dục' },
        { value: 'Sự kiện', label: 'Sự kiện' },
        { value: 'Bất động sản', label: 'Bất động sản' },
        { value: 'Ẩm thực', label: 'Ẩm thực' },
        { value: 'Du lịch', label: 'Du lịch' },
        { value: 'Y tế', label: 'Y tế' },
        { value: 'Thời trang', label: 'Thời trang' },
        { value: 'Khác', label: 'Khác' }
    ];

    const sortOptions = [
        { value: 'newest', label: 'Mới nhất' },
        { value: 'oldest', label: 'Cũ nhất' },
        { value: 'price_low', label: 'Giá thấp đến cao' },
        { value: 'price_high', label: 'Giá cao đến thấp' },
        { value: 'popular', label: 'Phổ biến nhất' },
        { value: 'bestseller', label: 'Bán chạy nhất' },
        { value: 'rating', label: 'Đánh giá cao nhất' }
    ];

    // Auth
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
                setUserId(decodedToken.userId || decodedToken.id || decodedToken._id);
            } catch (err) {
                console.error('Lỗi giải mã token:', err);
                navigate('/auth');
            } finally {
                setLoading(false);
            }
        };

        if (user?.role) {
            setUserRole(user.role);
            setUserId(user.id || user.userId || user._id);
            setLoading(false);
        } else {
            initializeAuth();
        }
    }, [user, navigate]);

    // Fetch purchased + my pages
    useEffect(() => {
        if (userId) {
            fetchPurchasedPageIds();
            fetchMyPageIds();
        }
    }, [userId]);

    const fetchPurchasedPageIds = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await axios.get(
                `${API_BASE_URL}/api/marketplace/my/purchased?limit=1000`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const purchasedItems = response.data.data || [];

            const ids = purchasedItems.map(item => item._id).filter(id => id);

            // Lưu ngày mua theo _id của MarketplacePage
            const dates = {};
            purchasedItems.forEach(item => {
                if (item._id) {
                    dates[item._id] = new Date(item.purchased_at || Date.now()).toLocaleDateString('vi-VN');
                }
            });

            setPurchasedPageIds(ids);
            setPurchasedDates(dates);
            console.log('✅ Đã tải xong page đã mua:', ids);
        } catch (err) {
            console.error('❌ Lỗi khi tải danh sách page đã mua:', err);
            // Không set error để không làm gãy UI, chỉ log
            setPurchasedPageIds([]);
            setPurchasedDates({});
        }
    };

    const fetchMyPageIds = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(
                `${API_BASE_URL}/api/marketplace/my/pages`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const ids = (response.data.data || []).map(p => p._id);
            setMyPageIds(ids);
        } catch (err) {
            console.error('Fetch my pages error:', err);
        }
    };

    // AOS
    useEffect(() => {
        AOS.init({ duration: 600, once: true, offset: 100 });
        return () => AOS.refresh();
    }, []);

    // Load featured + bestsellers
    useEffect(() => {
        if (userRole) {
            loadFeaturedPages();
            loadBestsellers();
        }
    }, [userRole]);

    // Reload khi filter thay đổi
    useEffect(() => {
        if (userRole) {
            setPages([]);
            setPage(1);
            setHasMore(true);
            loadPages(1);
        }
    }, [userRole, selectedCategory, sortBy]);

    const loadFeaturedPages = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/marketplace/featured/list?limit=5`);
            setFeaturedPages(response.data.data || []);
        } catch (err) {
            console.error('Lỗi tải featured pages:', err);
        }
    };

    const loadBestsellers = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/marketplace/bestsellers/list?limit=5`);
            setBestsellers(response.data.data || []);
        } catch (err) {
            console.error('Lỗi tải bestsellers:', err);
        }
    };

    const loadPages = async (pageNum = 1) => {
        try {
            setLoading(pageNum === 1);
            const params = new URLSearchParams({
                page: pageNum,
                limit: 12,
                sort: sortBy
            });

            if (selectedCategory !== 'all') params.append('category', selectedCategory);
            if (searchQuery) params.append('search', searchQuery);
            if (priceRange.min) params.append('price_min', priceRange.min);
            if (priceRange.max) params.append('price_max', priceRange.max);

            const response = await axios.get(`${API_BASE_URL}/api/marketplace?${params}`);
            const newPages = response.data.data || [];

            setPages(prev => pageNum === 1 ? newPages : [...prev, ...newPages]);
            setHasMore(newPages.length === 12);
            setError('');
        } catch (err) {
            console.error('Lỗi tải marketplace pages:', err);
            setError('Không thể tải marketplace: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const loadMore = () => {
        if (!loading && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            loadPages(nextPage);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setPages([]);
        setPage(1);
        setHasMore(true);
        loadPages(1);
    };

    const handleViewDetail = (pageId) => {
        navigate(`/marketplace/${pageId}`);
    };

    // Handle Preview
    const handlePreview = async (marketplacePage) => {
        setIsLoadingPreview(true);
        try {
            const token = localStorage.getItem('token');

            // Use page_id from marketplace page (reference to original page)
            const pageId = marketplacePage.page_id || marketplacePage.pageId || marketplacePage._id;
            console.log('Preview for page:', pageId, marketplacePage);

            // Fetch HTML from backend
            const response = await axios.get(`${API_BASE_URL}/api/pages/${pageId}/preview-html`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setPreviewHtml(response.data.html);
                setPreviewPageData(response.data.pageData || null);
                setShowPreviewModal(true);
            } else {
                alert('Không thể tải preview. Vui lòng thử lại.');
            }
        } catch (error) {
            console.error('Error loading preview:', error);
            alert('Lỗi khi tải preview: ' + (error.response?.data?.message || error.message));
        } finally {
            setIsLoadingPreview(false);
        }
    };



    const formatPrice = (price) => {
        if (price === 0) return 'Miễn phí';
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    };

    const calculateDiscount = (price, originalPrice) => {
        if (!originalPrice || originalPrice <= price) return 0;
        return Math.round(((originalPrice - price) / originalPrice) * 100);
    };

    const isPurchased = (pageId) => purchasedPageIds.includes(pageId);
    const isMyPage = (pageId) => myPageIds.includes(pageId);

    const getFilteredPages = () => {
        if (viewFilter === 'all') return pages;
        if (viewFilter === 'purchased') return pages.filter(p => isPurchased(p._id));
        if (viewFilter === 'my-pages') return pages.filter(p => isMyPage(p._id));
        return pages;
    };

    const filteredPages = getFilteredPages();

    if (loading && page === 1) {
        return <DogLoader />;
    }

    return (
        <div className="marketplace-container">
            <Sidebar userRole={userRole} />
            <div className="marketplace-main">
                <Header />
                <div className="marketplace-content">
                    {/* Hero */}
                    <div className="marketplace-hero" data-aos="fade-down">
                        <div className="hero-content">
                            <h1>Khám phá Landing Page</h1>
                            <p>Hàng trăm mẫu thiết kế chuyên nghiệp, sẵn sàng sử dụng</p>
                        </div>
                    </div>
                    {/* View Filter Tabs */}
                    <div className="view-filter-tabs" data-aos="fade-up">
                        <button onClick={() => setViewFilter('all')} className={viewFilter === 'all' ? 'active' : ''}>
                            Tất cả ({pages.length})
                        </button>
                        <button onClick={() => setViewFilter('purchased')} className={viewFilter === 'purchased' ? 'active' : ''}>
                            Đã mua ({purchasedPageIds.length})
                        </button>
                        <button onClick={() => setViewFilter('my-pages')} className={viewFilter === 'my-pages' ? 'active' : ''}>
                            Page của tôi ({myPageIds.length})
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="marketplace-filters" data-aos="fade-up">
                        <form onSubmit={handleSearch} className="search-bar">
                            <input
                                type="text"
                                placeholder="Tìm kiếm landing page..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <button type="submit">
                                <Search size={16} /> Tìm kiếm
                            </button>
                        </form>

                        <div className="filter-row">
                            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="filter-select">
                                {categories.map(cat => (
                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                ))}
                            </select>

                            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="filter-select">
                                {sortOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>

                            <div className="price-range">
                                <input type="number" placeholder="Giá tối thiểu" value={priceRange.min} onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })} />
                                <span>-</span>
                                <input type="number" placeholder="Giá tối đa" value={priceRange.max} onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })} />
                                <button onClick={handleSearch}>Áp dụng</button>
                            </div>
                        </div>
                    </div>

                    {/* Featured */}
                    {featuredPages.length > 0 && (
                        <div className="featured-section" data-aos="fade-up">
                            <h2>Nổi bật</h2>
                            <div className="featured-grid">
                                {featuredPages.map((page) => (
                                    <div key={page._id} className="featured-card" onClick={() => handleViewDetail(page._id)}>
                                        <div className="featured-image">
                                            <img src={page.main_screenshot || '/placeholder.png'} alt={page.title} loading="lazy" className="card-preview" />
                                            <div className="image-overlay"></div>
                                            {calculateDiscount(page.price, page.original_price) > 0 && (
                                                <div className="discount-badge">
                                                    -{calculateDiscount(page.price, page.original_price)}%
                                                </div>
                                            )}
                                        </div>
                                        <div className="featured-info">
                                            <h3>{page.title}</h3>
                                            <div className="featured-price">
                                                <span className="current-price">{formatPrice(page.price)}</span>
                                                {page.original_price && <span className="original-price">{formatPrice(page.original_price)}</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {error && <div className="error-message" data-aos="fade-in">{error}</div>}

                    {/* Main Grid */}
                    <div className="marketplace-grid-section" data-aos="fade-up">
                        <h2>
                            {viewFilter === 'all' && 'Tất cả Landing Page'}
                            {viewFilter === 'purchased' && 'Đã mua'}
                            {viewFilter === 'my-pages' && 'Page của tôi'}
                        </h2>

                        <InfiniteScroll
                            dataLength={viewFilter === 'all' ? pages.length : filteredPages.length}
                            next={loadMore}
                            hasMore={hasMore && viewFilter === 'all'}
                            loader={<div className="loader">Đang tải...</div>}
                            endMessage={<p style={{ textAlign: 'center', marginTop: '20px', color: '#666' }}>Đã hiển thị tất cả</p>}
                        >
                            <div className="marketplace-grid">
                                {filteredPages.map((page) => (
                                    <div key={page._id} className="marketplace-card" data-aos="zoom-in">
                                        <div className="card-image" onClick={() => handleViewDetail(page._id)}>
                                            <img
                                                src={page.main_screenshot || '/placeholder.png'}
                                                alt={page.title}
                                                loading="lazy"
                                            />
                                            <div className="image-overlay"></div>

                                            {isMyPage(page._id) && (
                                                <div className="my-page-badge">Page của bạn</div>
                                            )}

                                            {isPurchased(page._id) && !isMyPage(page._id) && (
                                                <div className="purchased-badge" data-tooltip={`Đã mua ngày ${purchasedDates[page._id] || 'N/A'}`}>
                                                    Đã mua
                                                </div>
                                            )}

                                            {page.is_bestseller && <div className="bestseller-badge">Bán chạy</div>}
                                            {calculateDiscount(page.price, page.original_price) > 0 && (
                                                <div className="discount-badge">
                                                    -{calculateDiscount(page.price, page.original_price)}%
                                                </div>
                                            )}

                                            <button
                                                className="preview-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handlePreview(page);
                                                }}
                                                title="Xem preview fullpage"
                                                disabled={isLoadingPreview}
                                            >
                                                <Monitor size={18} />
                                            </button>
                                            <button className="view-detail-btn">Xem chi tiết</button>
                                        </div>

                                        <div className="card-content">
                                            <div className="card-category">{page.category}</div>
                                            <h3 className="card-title">{page.title}</h3>
                                            <p className="card-description">
                                                {page.description.substring(0, 100)}{page.description.length > 100 ? '...' : ''}
                                            </p>

                                            <div className="card-meta">
                                                <span><Eye size={16} /> {page.views}</span>
                                                <span><Heart size={16} /> {page.likes}</span>
                                                <span><Star size={16} /> {page.rating.toFixed(1)}</span>
                                                <span><ShoppingCart size={16} /> {page.sold_count}</span>
                                            </div>

                                            <div className="card-footer">
                                                <div className="card-price">
                                                    <span className="current-price">{formatPrice(page.price)}</span>
                                                    {page.original_price && <span className="original-price">{formatPrice(page.original_price)}</span>}
                                                </div>

                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </InfiniteScroll>

                        {filteredPages.length === 0 && !loading && (
                            <div className="empty-state">
                                <p>
                                    {viewFilter === 'all' && 'Không tồn tại landing page nào'}
                                    {viewFilter === 'purchased' && 'Bạn chưa mua page nào'}
                                    {viewFilter === 'my-pages' && 'Bạn chưa đăng bán page nào'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Preview Modal */}
            {showPreviewModal && (
                <PreviewModal
                    selectedTemplate={null}
                    setShowPreviewModal={setShowPreviewModal}
                    setPreviewHtml={setPreviewHtml}
                    previewHtml={previewHtml}
                    pageData={previewPageData}
                />
            )}
        </div>
    );
};

export default Marketplace;