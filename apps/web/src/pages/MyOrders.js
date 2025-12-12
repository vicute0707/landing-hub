import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../context/UserContext';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { toast } from 'react-toastify';
import AOS from 'aos';
import 'aos/dist/aos.css';
import '../styles/Market.css';
import DogLoader from '../components/Loader';
import { ShoppingBag, Download, Calendar, CreditCard, AlertCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

const MyOrders = () => {
    const { user } = useContext(UserContext);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(null);
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [stats, setStats] = useState({
        total: 0,
        processing: 0,
        delivered: 0,
        cancelled: 0,
        refunded: 0
    });
    const navigate = useNavigate();

    const statusOptions = [
        { value: 'all', label: 'Tất cả', icon: ShoppingBag, color: '#6b7280' },
        { value: 'pending', label: 'Chờ xử lý', icon: AlertCircle, color: '#f59e0b' },
        { value: 'processing', label: 'Đang xử lý', icon: RefreshCw, color: '#3b82f6' },
        { value: 'delivered', label: 'Đã giao', icon: CheckCircle, color: '#10b981' },
        { value: 'cancelled', label: 'Đã hủy', icon: XCircle, color: '#ef4444' },
        { value: 'refunded', label: 'Đã hoàn tiền', icon: RefreshCw, color: '#8b5cf6' }
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
            loadOrders();
        }
    }, [userRole, currentPage, selectedStatus]);

    const loadOrders = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: currentPage,
                limit: 20
            });

            if (selectedStatus !== 'all') {
                params.append('status', selectedStatus);
            }

            const response = await api.get(`/api/orders/my?${params}`);

            if (response.data.success) {
                const orderData = response.data.data || [];
                setOrders(orderData);
                setFilteredOrders(orderData);
                setTotalPages(response.data.pagination?.totalPages || 1);

                // Calculate stats
                const statsData = {
                    total: orderData.length,
                    processing: orderData.filter(o => o.status === 'processing').length,
                    delivered: orderData.filter(o => o.status === 'delivered').length,
                    cancelled: orderData.filter(o => o.status === 'cancelled').length,
                    refunded: orderData.filter(o => o.status === 'refunded').length
                };
                setStats(statsData);
            }
        } catch (err) {
            console.error('Load orders error:', err);
            toast.error('Không thể tải danh sách đơn hàng');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelOrder = async (orderId) => {
        if (!window.confirm('Bạn có chắc muốn hủy đơn hàng này?')) return;

        try {
            const response = await api.patch(`/api/orders/${orderId}/cancel`);
            if (response.data.success) {
                toast.success('Đã hủy đơn hàng thành công');
                loadOrders();
            }
        } catch (err) {
            console.error('Cancel order error:', err);
            toast.error(err.response?.data?.message || 'Không thể hủy đơn hàng');
        }
    };

    const handleRequestRefund = async (orderId) => {
        const reason = window.prompt('Vui lòng nhập lý do hoàn tiền:');
        if (!reason) return;

        try {
            const response = await api.patch(`/api/orders/${orderId}/refund`, { reason });
            if (response.data.success) {
                toast.success('Đã gửi yêu cầu hoàn tiền');
                loadOrders();
            }
        } catch (err) {
            console.error('Request refund error:', err);
            toast.error(err.response?.data?.message || 'Không thể gửi yêu cầu hoàn tiền');
        }
    };

    const getStatusBadge = (status) => {
        const statusConfig = statusOptions.find(s => s.value === status);
        if (!statusConfig) return null;

        const Icon = statusConfig.icon;
        return (
            <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: '600',
                backgroundColor: `${statusConfig.color}20`,
                color: statusConfig.color
            }}>
                <Icon size={14} />
                {statusConfig.label}
            </div>
        );
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(price);
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getPaymentMethodLabel = (method) => {
        const methods = {
            MOMO: 'Momo',
            VNPAY: 'VNPay',
            SANDBOX: 'Sandbox',
            BANK_TRANSFER: 'Chuyển khoản'
        };
        return methods[method] || method;
    };

    if (loading && orders.length === 0) {
        return <DogLoader />;
    }

    return (
        <div className="marketplace-container">
            <Sidebar role={userRole} />
            <div className="marketplace-main">
                <Header />
                <div className="marketplace-content">
                    {/* Header */}
                    <div className="marketplace-hero" data-aos="fade-down">
                        <div>
                            <h1>🛒 Đơn hàng đã mua</h1>
                            <p>Quản lý các đơn hàng và giao dịch của bạn</p>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="stats-grid" data-aos="fade-up" style={{ marginBottom: '30px' }}>
                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: '#dbeafe' }}>
                                <ShoppingBag size={28} color="#2563eb" />
                            </div>
                            <div className="stat-info">
                                <div className="stat-value">{stats.total}</div>
                                <div className="stat-label">Tổng đơn hàng</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: '#dcfce7' }}>
                                <CheckCircle size={28} color="#10b981" />
                            </div>
                            <div className="stat-info">
                                <div className="stat-value">{stats.delivered}</div>
                                <div className="stat-label">Đã giao</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: '#dbeafe' }}>
                                <RefreshCw size={28} color="#3b82f6" />
                            </div>
                            <div className="stat-info">
                                <div className="stat-value">{stats.processing}</div>
                                <div className="stat-label">Đang xử lý</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: '#fee2e2' }}>
                                <XCircle size={28} color="#ef4444" />
                            </div>
                            <div className="stat-info">
                                <div className="stat-value">{stats.cancelled}</div>
                                <div className="stat-label">Đã hủy</div>
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="marketplace-filters" data-aos="fade-up">
                        <div className="filter-row">
                            <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                                className="filter-select"
                            >
                                {statusOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Orders List */}
                    {loading ? (
                        <DogLoader />
                    ) : filteredOrders.length === 0 ? (
                        <div className="marketplace-empty" data-aos="fade-up">
                            <ShoppingBag size={64} color="#9ca3af" />
                            <h3>Bạn chưa có đơn hàng nào</h3>
                            <p>Khám phá các landing page tuyệt vời trên marketplace!</p>
                            <button className="btn-primary" onClick={() => navigate('/market')}>
                                Khám phá Marketplace
                            </button>
                        </div>
                    ) : (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} data-aos="fade-up">
                                {filteredOrders.map((order) => (
                                    <div key={order._id} style={{
                                        background: 'white',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '12px',
                                        padding: '20px',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                    }}>
                                        {/* Order Header */}
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: '16px',
                                            paddingBottom: '16px',
                                            borderBottom: '1px solid #e5e7eb'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <Calendar size={18} color="#6b7280" />
                                                <span style={{ fontSize: '14px', color: '#6b7280' }}>
                                                    {formatDate(order.createdAt)}
                                                </span>
                                            </div>
                                            {getStatusBadge(order.status)}
                                        </div>

                                        {/* Order Details */}
                                        <div style={{ display: 'flex', gap: '20px', marginBottom: '16px' }}>
                                            {/* Page Info */}
                                            <div style={{ flex: 1 }}>
                                                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                                                    {order.marketplacePageId?.title || 'Landing Page'}
                                                </h3>
                                                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                                                    Người bán: {order.sellerId?.name || order.sellerId?.email || 'Unknown'}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#6b7280' }}>
                                                    <CreditCard size={16} />
                                                    {getPaymentMethodLabel(order.transactionId?.payment_method)}
                                                </div>
                                            </div>

                                            {/* Price */}
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>
                                                    {formatPrice(order.transactionId?.amount || order.marketplacePageId?.price || 0)}
                                                </div>
                                                {order.transactionId?.status && (
                                                    <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                                                        {order.transactionId.status === 'COMPLETED' ? '✅ Đã thanh toán' : '⏳ Chờ thanh toán'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Order Actions */}
                                        <div style={{ display: 'flex', gap: '12px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                                            {order.status === 'processing' && (
                                                <button
                                                    className="btn-secondary"
                                                    onClick={() => handleCancelOrder(order._id)}
                                                    style={{ fontSize: '14px', padding: '8px 16px' }}
                                                >
                                                    Hủy đơn hàng
                                                </button>
                                            )}
                                            {order.status === 'delivered' && (
                                                <>
                                                    <button
                                                        className="btn-secondary"
                                                        onClick={() => handleRequestRefund(order._id)}
                                                        style={{ fontSize: '14px', padding: '8px 16px' }}
                                                    >
                                                        Yêu cầu hoàn tiền
                                                    </button>
                                                    <button
                                                        className="btn-primary"
                                                        onClick={() => navigate(`/market/${order.marketplacePageId?._id}`)}
                                                        style={{ fontSize: '14px', padding: '8px 16px', marginLeft: 'auto' }}
                                                    >
                                                        <Download size={16} style={{ marginRight: '6px' }} />
                                                        Tải xuống
                                                    </button>
                                                </>
                                            )}
                                            {(order.status === 'cancelled' || order.status === 'refunded') && (
                                                <div style={{ fontSize: '14px', color: '#6b7280', padding: '8px 0' }}>
                                                    {order.refund_reason && `Lý do: ${order.refund_reason}`}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="pagination" data-aos="fade-up">
                                    <button
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(currentPage - 1)}
                                    >
                                        Trước
                                    </button>
                                    <span>Trang {currentPage} / {totalPages}</span>
                                    <button
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(currentPage + 1)}
                                    >
                                        Sau
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyOrders;