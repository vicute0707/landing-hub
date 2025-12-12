import React, { useState, useEffect, useContext, useMemo } from 'react';
import { UserContext } from '../context/UserContext';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import AOS from 'aos';
import 'aos/dist/aos.css';
import '../styles/UnifiedPayments.css';
import DogLoader from '../components/Loader';
import ModernPayoutRequest from '../components/ModernPayoutRequest';
import {
    DollarSign, TrendingUp, CheckCircle, Clock, Filter,
    Download, CreditCard, Eye, RotateCcw, BarChart3, Package, AlertCircle
} from 'lucide-react';

// Utility function for retrying API calls
const retry = async (fn, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, delay));
            console.log(`Retry ${i + 1}/${retries} for ${fn.name}`);
        }
    }
};

const UnifiedPayments = () => {
    const { user } = useContext(UserContext);
    const navigate = useNavigate();
    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

    // States
    const [showPayoutModal, setShowPayoutModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(null);
    const [stats, setStats] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [orders, setOrders] = useState([]); // Purchased orders
    const [soldOrders, setSoldOrders] = useState([]); // Sold orders
    const [totalPages, setTotalPages] = useState(1);
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState({
        status: 'all',
        paymentMethod: 'all',
        orderStatus: 'all',
        startDate: '',
        endDate: '',
    });
    const [viewMode, setViewMode] = useState('transactions'); // 'transactions' | 'orders' | 'sold'
    const [transactionStatus, setTransactionStatus] = useState({});
    const [orderTransactions, setOrderTransactions] = useState([]);
    const buildParams = () => {
        const p = new URLSearchParams({ page, limit: 20 });
        if (filters.status !== 'all')       p.append('status', filters.status);
        if (filters.paymentMethod !== 'all') p.append('paymentMethod', filters.paymentMethod);
        if (filters.orderStatus !== 'all')   p.append('orderStatus', filters.orderStatus);
        if (filters.startDate)               p.append('startDate', filters.startDate);
        if (filters.endDate)                 p.append('endDate', filters.endDate);
        return p;
    };

    const params = buildParams();
    const url = userRole === 'admin'
        ? `${API_BASE_URL}/api/payment/admin/transactions?${params}`
        : `${API_BASE_URL}/api/payment/transactions?${params}`;
    // Auth useEffect
    useEffect(() => {
        const token = localStorage.getItem('token');
        console.log('Token:', token);
        if (!token) {
            console.log('No token, redirecting to /auth');
            navigate('/auth');
            return;
        }
        try {
            const decoded = jwtDecode(token);
            console.log('Decoded token:', decoded);
            setUserRole(decoded.role);
        } catch {
            console.error('Invalid token, redirecting to /auth');
            navigate('/auth');
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    // Initialize AOS
    useEffect(() => {
        AOS.init({ duration: 600, once: true });
    }, []);

    // Load data when role is ready
    useEffect(() => {
        if (!userRole) return;
        console.log('Calling APIs with userRole:', userRole);
        loadStats();
        loadTransactions();
        loadOrders();
        loadSoldOrders(); // Load sold orders
    }, [userRole, filters, page, viewMode]);

    // Load stats with enhanced data
    const loadStats = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('No token found');

            const url = userRole === 'admin'
                ? `${API_BASE_URL}/api/payment/admin/stats`
                : `${API_BASE_URL}/api/payment/stats`;

            console.log('Fetching stats from:', url);
            const { data } = await retry(() => axios.get(url, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 15000,
            }));

            console.log('Stats response:', data);
            setStats(data.data ?? {
                buyerStats: { totalSpent: 0, purchaseCount: 0, avgPurchase: 0 },
                sellerStats: { totalRevenue: 0, totalEarned: 0, salesCount: 0, avgSale: 0, pendingPayout: 0, completedPayout: 0 },
                transactionStatus: {},
                orderTransactions: []
            });

            if (data.data?.transactionStatus) {
                setTransactionStatus(data.data.transactionStatus);
            }
        } catch (error) {
            console.error('Error fetching stats:', error.response?.status, error.response?.data, error.message);
            toast.error(`Không tải được thống kê: ${error.response?.data?.message || error.message}`);
            setStats({
                buyerStats: { totalSpent: 0, purchaseCount: 0, avgPurchase: 0 },
                sellerStats: { totalRevenue: 0, totalEarned: 0, salesCount: 0, avgSale: 0, pendingPayout: 0, completedPayout: 0 },
                transactionStatus: {},
                orderTransactions: []
            });
        }
    };

    // Load transactions
    const loadTransactions = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            if (!token) throw new Error('No token found');

            const url = userRole === 'admin'
                ? `${API_BASE_URL}/api/payment/admin/transactions?${params}`
                : `${API_BASE_URL}/api/payment/transactions?${params}`;

            console.log('Fetching transactions from:', url);
            const { data } = await retry(() => axios.get(url, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 15000,
            }));

            console.log('Transactions response:', data);
            const txData = userRole === 'admin' ? data.data?.transactions || data.data : data.data;
            setTransactions(Array.isArray(txData) ? txData : []);
            setTotalPages(data.pagination?.totalPages || 1);
        } catch (error) {
            console.error('Error fetching transactions:', error.response?.status, error.response?.data, error.message);
            toast.error(`Không tải được giao dịch: ${error.response?.data?.message || error.message}`);
            setTransactions([]);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    };

    // Load purchased orders
    const loadOrders = async () => {
        try {
            if (userRole === 'admin') return;

            setLoading(true);
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({ page, limit: 20, ...filters });
            const url = `${API_BASE_URL}/api/orders/my?${params}`;

            console.log('Fetching purchased orders from:', url);
            const { data } = await retry(() => axios.get(url, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 15000,
            }));

            console.log('Purchased orders response:', data);
            setOrders(data.data || []);
            const orderTx = data.data
                .filter(order => order.transactionId)
                .map(order => ({
                    ...order.transactionId,
                    orderId: order.orderId,
                    orderStatus: order.status,
                    marketplace_page_id: order.marketplacePageId
                }));
            setOrderTransactions(orderTx);
            setTotalPages(data.pagination?.totalPages || 1);
        } catch (error) {
            console.error('Error fetching purchased orders:', error.response?.status, error.response?.data, error.message);
            setOrders([]);
            setOrderTransactions([]);
        } finally {
            setLoading(false);
        }
    };

    // Load sold orders
    const loadSoldOrders = async () => {
        try {
            if (userRole === 'admin') return;

            setLoading(true);
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({ page, limit: 20, ...filters });
            const url = `${API_BASE_URL}/api/orders/seller?${params}`;

            console.log('Fetching sold orders from:', url);
            const { data } = await retry(() => axios.get(url, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 15000,
            }));

            console.log('Sold orders response:', data);
            setSoldOrders(data.data || []);
            if (viewMode === 'sold') {
                const orderTx = data.data
                    .filter(order => order.transactionId)
                    .map(order => ({
                        ...order.transactionId,
                        orderId: order.orderId,
                        orderStatus: order.status,
                        marketplace_page_id: order.marketplacePageId,
                        buyer_id: order.buyerId
                    }));
                setOrderTransactions(orderTx);
                setTotalPages(data.pagination?.totalPages || 1);
            }
        } catch (error) {
            console.error('Error fetching sold orders:', error.response?.status, error.response?.data, error.message);
            setSoldOrders([]);
            if (viewMode === 'sold') setOrderTransactions([]);
        } finally {
            setLoading(false);
        }
    };

    // Format functions
    const formatPrice = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
    const formatDate = (d) => (d ? new Date(d).toLocaleString('vi-VN') : '-');

    // Status badge class
    const getStatusClass = (status) => {
        const classes = {
            completed: 'success',
            pending: 'warning',
            failed: 'danger',
            cancelled: 'secondary',
            refunded: 'info',
            refund_pending: 'warning',
            processing: 'warning',
            delivered: 'success'
        };
        return classes[status?.toLowerCase()] || 'secondary';
    };

    // Export CSV for transactions
    const exportCSV = () => {
        const headers = ['ID', 'Ngày', 'Loại', 'Sản phẩm', 'Người mua/Người bán', 'Phương thức', 'Số tiền', 'Trạng thái'];
        const rows = transactions.map((tx) => [
            tx._id?.slice(-6) || '-',
            formatDate(tx.created_at),
            userRole === 'admin' ? (tx.buyer_id?.name || tx.buyer_id?.email || '-') : (tx.seller_id?.name || tx.seller_id?.email || '-'),
            tx.marketplace_page_id?.title || '-',
            userRole === 'admin' ? (tx.seller_id?.name || tx.seller_id?.email || '-') : (tx.buyer_id?.name || tx.buyer_id?.email || '-'),
            tx.payment_method || '-',
            formatPrice(tx.amount),
            tx.status || '-'
        ]);

        const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Đã xuất file CSV');
    };

    // Export CSV for orders
    const exportOrdersCSV = () => {
        const headers = ['Order ID', 'Ngày tạo', 'Sản phẩm', 'Trạng thái đơn', 'Trạng thái giao dịch', 'Số tiền', 'Phương thức', 'Người mua'];
        const rows = orderTransactions.map((orderTx) => [
            orderTx.orderId || '-',
            formatDate(orderTx.created_at),
            orderTx.marketplace_page_id?.title || '-',
            orderTx.orderStatus || '-',
            orderTx.status || '-',
            formatPrice(orderTx.amount),
            orderTx.payment_method || '-',
            orderTx.buyer_id?.name || orderTx.buyer_id?.email || '-'
        ]);

        const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${viewMode === 'sold' ? 'sold_orders' : 'orders'}_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Đã xuất file CSV ${viewMode === 'sold' ? 'đơn hàng đã bán' : 'đơn hàng'}`);
    };

    // Reset filters
    const resetFilter = () => {
        setFilters({
            status: 'all',
            paymentMethod: 'all',
            orderStatus: 'all',
            startDate: '',
            endDate: ''
        });
        setPage(1);
    };

    // Derived data
    const completed = stats?.buyerStats?.purchaseCount || transactionStatus?.COMPLETED?.count || 0;
    const pending = stats?.transactionStatus?.PENDING?.count || transactionStatus?.PENDING?.count || 0;
    const failed = transactionStatus?.FAILED?.count || 0;
    const totalRevenue = userRole === 'admin' ? stats?.totalRevenue || 0 : stats?.buyerStats?.totalSpent || 0;
    const platformFee = userRole === 'admin' ? stats?.totalPlatformFee || 0 : stats?.sellerStats?.totalEarned || 0;
    const pendingPayout = stats?.sellerStats?.pendingPayout || 0;

    // Current data to display based on view mode
    const currentData = viewMode === 'orders' || viewMode === 'sold' ? orderTransactions : transactions;
    const currentExport = viewMode === 'orders' || viewMode === 'sold' ? exportOrdersCSV : exportCSV;
    // Lọc theo ngày trên frontend
    const filteredData = useMemo(() => {
        if (!filters.startDate && !filters.endDate) return currentData;
        console.log('currentData', currentData); // ← xem có PROCESSING không

        const start = filters.startDate ? new Date(filters.startDate) : null;
        const end   = filters.endDate   ? new Date(filters.endDate)   : null;
        end?.setDate(end.getDate() + 1); // include end-date

        return currentData.filter(item => {
            const d = new Date(item.created_at || item.createdAt);
            if (start && d < start) return false;
            if (end   && d >= end)  return false;
            return true;
        });
    }, [currentData, filters.startDate, filters.endDate]);
    return (
        <div className="unified-payments">
            <Header />

            <Sidebar role={userRole} />
            <div className="main-area">
                <div className="content">
                    {/* Page Header */}
                    <div className="page-header" data-aos="fade-down">
                        <h1>{userRole === 'admin' ? 'Quản lý giao dịch & Đơn hàng' : 'Lịch sử thanh toán & Đơn hàng'}</h1>
                        <p>{userRole === 'admin' ? 'Toàn bộ giao dịch, đơn hàng & lợi nhuận' : 'Giao dịch, đơn hàng đã mua và đã bán'}</p>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="view-toggle" data-aos="fade-up">
                        <button
                            className={viewMode === 'transactions' ? 'active' : ''}
                            onClick={() => setViewMode('transactions')}
                        >
                            <CreditCard size={16} /> Giao dịch
                        </button>
                        {userRole !== 'admin' && (
                            <>
                                <button
                                    className={viewMode === 'orders' ? 'active' : ''}
                                    onClick={() => setViewMode('orders')}
                                >
                                    <Package size={16} /> Đơn hàng đã mua
                                </button>
                                <button
                                    className={viewMode === 'sold' ? 'active' : ''}
                                    onClick={() => setViewMode('sold')}
                                >
                                    <Package size={16} /> Đơn hàng đã bán
                                </button>
                            </>
                        )}
                    </div>

                    {/* Enhanced Stats */}
                    <div className="stats-grid enhanced" data-aos="fade-up">
                        <div className="stat-card">
                            <DollarSign size={28} />
                            <div>
                                <div className="val">{formatPrice(totalRevenue)}</div>
                                <div className="lbl">{userRole === 'admin' ? 'Tổng doanh thu' : 'Tổng chi tiêu'}</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <TrendingUp size={28} />
                            <div>
                                <div className="val">{formatPrice(platformFee)}</div>
                                <div className="lbl">{userRole === 'admin' ? 'Lợi nhuận nền tảng' : 'Thu nhập thực'}</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <CheckCircle size={28} color="green" />
                            <div>
                                <div className="val">{completed}</div>
                                <div className="lbl">Hoàn thành</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <Clock size={28} color="orange" />
                            <div>
                                <div className="val">{pending}</div>
                                <div className="lbl">Chờ xử lý</div>
                            </div>
                        </div>
                        {userRole !== 'admin' && (
                            <div className="stat-card highlight-card payout-card"
                                 onClick={() => pendingPayout > 0 ? setShowPayoutModal(true) : toast.info('Bạn chưa có tiền để rút')}>
                                <DollarSign size={28} color="#d97706" />
                                <div>
                                    <div className="val">{formatPrice(pendingPayout)}</div>
                                    <div className="lbl">Chờ rút tiền</div>
                                </div>
                            </div>
                        )}
                        {userRole === 'admin' && (
                            <div className="stat-card">
                                <AlertCircle size={28} color="red" />
                                <div>
                                    <div className="val">{failed}</div>
                                    <div className="lbl">Thất bại</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Transaction Status Breakdown */}
                    {Object.keys(transactionStatus).length > 0 && (
                        <div className="status-breakdown" data-aos="fade-up">
                            <h3><BarChart3 size={20} /> Phân tích trạng thái giao dịch</h3>
                            <div className="status-grid">
                                {Object.entries(transactionStatus).map(([status, data]) => (
                                    <div key={status} className={`status-item ${getStatusClass(status)}`}>
                                        <div className="status-label">{status}</div>
                                        <div className="status-count">{data.count}</div>
                                        <div className="status-amount">{formatPrice(data.totalAmount)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Enhanced Filters */}
                    <div className="filters enhanced" data-aos="fade-up">
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        >
                            <option value="all">Tất cả trạng thái giao dịch</option>
                            <option value="COMPLETED">Hoàn thành</option>
                            <option value="PENDING">Chờ xử lý</option>
                            <option value="FAILED">Thất bại</option>
                            <option value="CANCELLED">Đã hủy</option>
                            <option value="REFUNDED">Hoàn tiền</option>
                        </select>
                        {(viewMode === 'orders' || viewMode === 'sold') && (
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            >
                                <option value="all">Tất cả trạng thái giao dịch</option>
                                <option value="COMPLETED">Hoàn thành</option>
                                <option value="PENDING">Chờ xử lý</option>
                                <option value="PROCESSING">Đang xử lý</option> {/* ✅ thêm dòng này */}
                                <option value="FAILED">Thất bại</option>
                                <option value="CANCELLED">Đã hủy</option>
                                <option value="REFUNDED">Hoàn tiền</option>
                            </select>
                        )}

                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                            placeholder="Từ ngày"
                        />
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                            placeholder="Đến ngày"
                        />
                        <button onClick={() => { loadTransactions(); loadOrders(); loadSoldOrders(); }}>
                            <Filter size={16} /> Lọc
                        </button>
                        <button onClick={currentExport}>
                            <Download size={16} /> Xuất CSV
                        </button>
                        <button onClick={resetFilter} className="reset">
                            <RotateCcw size={16} /> Reset
                        </button>
                    </div>

                    {/* Enhanced Table */}
                    <div className="table-wrapper enhanced" data-aos="fade-up">
                        {loading ? (
                            <DogLoader />
                        ) : !currentData.length ? (
                            <div className="empty-state">
                                <Package size={64} className="empty-icon" />
                                <p className="empty-text">
                                    {viewMode === 'orders' ? 'Không có đơn hàng đã mua' : viewMode === 'sold' ? 'Không có đơn hàng đã bán' : 'Không có giao dịch nào'}
                                </p>
                                <p className="empty-subtext">
                                    Thử thay đổi bộ lọc hoặc chuyển sang tab khác
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="table-header">
                                    <h3>
                                        {viewMode === 'orders' ? (
                                            <><Package size={20} /> Đơn hàng đã mua ({currentData.length})</>
                                        ) : viewMode === 'sold' ? (
                                            <><Package size={20} /> Đơn hàng đã bán ({currentData.length})</>
                                        ) : (
                                            <><CreditCard size={20} /> Giao dịch ({currentData.length})</>
                                        )}
                                    </h3>
                                </div>
                                <div className="table-container">
                                    <table>
                                        <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Ngày</th>
                                            {(viewMode === 'orders' || viewMode === 'sold') && <th>Mã đơn</th>}
                                            <th>Sản phẩm</th>
                                            {(userRole === 'admin' || viewMode === 'sold') && <th>Người mua</th>}
                                            {userRole === 'admin' && viewMode === 'transactions' && <th>Người bán</th>}
                                            <th>Phương thức</th>
                                            <th>Số tiền</th>
                                            {(viewMode === 'orders' || viewMode === 'sold') && <th>Trạng thái đơn</th>}
                                            <th>Trạng thái GD</th>
                                            {userRole === 'admin' && <th>Hành động</th>}
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {filteredData.map((item) => {
                                            const tx = viewMode === 'orders' || viewMode === 'sold' ? item : item;
                                            const orderInfo = viewMode === 'orders' || viewMode === 'sold' ? item : null;

                                            return (
                                                <tr key={tx._id || item._id}>
                                                    <td><code>{(tx._id || item._id)?.slice(-6) || '-'}</code></td>
                                                    <td>{formatDate(tx.created_at || tx.createdAt)}</td>
                                                    {(viewMode === 'orders' || viewMode === 'sold') && (
                                                        <td><code>{orderInfo?.orderId?.slice(-8) || '-'}</code></td>
                                                    )}
                                                    <td>
                                                        <div className="product-info">
                                                            <span>{tx.marketplace_page_id?.title || '-'}</span>
                                                            {tx.marketplace_page_id?.category && (
                                                                <small className="category">{tx.marketplace_page_id.category}</small>
                                                            )}
                                                        </div>
                                                    </td>
                                                    {(userRole === 'admin' || viewMode === 'sold') && (
                                                        <td>
                                                            <div className="user-info">
                                                                {tx.buyer_id?.name || tx.buyer_id?.email || '-'}
                                                            </div>
                                                        </td>
                                                    )}
                                                    {userRole === 'admin' && viewMode === 'transactions' && (
                                                        <td>
                                                            <div className="user-info">
                                                                {tx.seller_id?.name || tx.seller_id?.email || '-'}
                                                            </div>
                                                        </td>
                                                    )}
                                                    <td>
                                                            <span className="payment-method">
                                                                {tx.payment_method === 'MOMO' && 'MOMO'}
                                                                {tx.payment_method === 'VNPAY' && 'VNPay'}
                                                                {tx.payment_method === 'SANDBOX' && 'Test'}
                                                            </span>
                                                    </td>
                                                    <td>
                                                        <strong>{formatPrice(tx.amount)}</strong>
                                                        {userRole === 'admin' && tx.platform_fee > 0 && (
                                                            <small className="fee">+{formatPrice(tx.platform_fee)}</small>
                                                        )}
                                                    </td>
                                                    {(viewMode === 'orders' || viewMode === 'sold') && (
                                                        <td>
                                                                <span className={`order-badge ${getStatusClass(orderInfo?.orderStatus)}`}>
                                                                    {orderInfo?.orderStatus || '-'}
                                                                </span>
                                                        </td>
                                                    )}
                                                    <td>
                                                            <span className={`badge1 ${getStatusClass(tx.status)}`}>
                                                                {tx.status || '-'}
                                                            </span>
                                                    </td>
                                                    {userRole === 'admin' && (
                                                        <td>
                                                            <button className="action-btn" onClick={() => navigate(`/orders/${tx._id || item.orderId}`)}>
                                                                <Eye size={16} /> Chi tiết
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                        </tbody>
                                    </table>
                                </div>
                                {totalPages > 1 && (
                                    <div className="pagination">
                                        <button
                                            disabled={page === 1}
                                            onClick={() => setPage((p) => p - 1)}
                                            className="pagination-btn"
                                        >
                                            ← Trước
                                        </button>
                                        <span className="page-info">Trang {page} / {totalPages}</span>
                                        <button
                                            disabled={page === totalPages}
                                            onClick={() => setPage((p) => p + 1)}
                                            className="pagination-btn"
                                        >
                                            Sau →
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Payout Modal */}
            {showPayoutModal && pendingPayout > 0 && (
                <ModernPayoutRequest
                    isOpen={showPayoutModal}
                    onClose={() => setShowPayoutModal(false)}
                    pendingAmount={pendingPayout}
                    onSuccess={() => {
                        toast.success('Yêu cầu rút tiền đã gửi!');
                        loadStats();
                        loadSoldOrders();
                        setShowPayoutModal(false);
                    }}
                />
            )}
        </div>
    );
};

export default UnifiedPayments;