import React, { useState, useEffect } from 'react';
import {
    Activity, Users, DollarSign, TrendingUp, Award, CreditCard,
    RefreshCw, AlertCircle, ShoppingCart, User, Zap
} from 'lucide-react';
import api from '../utils/api';
import '../styles/AdminDashboard.css';

const AdminDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [report, setReport] = useState(null);
    const [error, setError] = useState(null);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);
            console.log('📡 Fetching admin dashboard data...');

            const response = await api.get('api/reports/admin/system');
            console.log('✅ Admin Dashboard API Response:', response.data);

            if (response.data && response.data.success) {
                setReport(response.data.data);
            } else {
                throw new Error(response.data.message || 'Cấu trúc phản hồi không hợp lệ từ API.');
            }
        } catch (error) {
            console.error('❌ Error fetching admin dashboard:', error);
            setError(error.message || 'Không thể tải dashboard. Vui lòng kiểm tra kết nối API.');
            setReport(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    // Hiển thị Loading State
    if (loading) {
        return (
            <div className="admin-dashboard-loading">
                <RefreshCw className="spin" size={48} />
                <p>Đang tải dashboard...</p>
            </div>
        );
    }

    // Hiển thị Error State
    if (error) {
        return (
            <div className="admin-dashboard-error">
                <AlertCircle size={48} color="#ef4444" />
                <h3>Không thể tải dashboard</h3>
                <p>{error}</p>
                <button onClick={fetchDashboardData} className="btn-retry">
                    <RefreshCw size={18} /> Thử lại
                </button>
            </div>
        );
    }

    // Hiển thị No Data State (Nếu API thành công nhưng không có dữ liệu)
    if (!report) {
        return <div className="admin-dashboard-error"><p>Không có dữ liệu để hiển thị.</p></div>;
    }

    // Lấy dữ liệu từ report thật
    const { overview, transactions, marketplace, topSellers, topBuyers, dailyRevenue } = report;
    const totalTransactions = transactions.byStatus?.reduce((sum, item) => sum + item.count, 0) || 0;

    // Tính Max Revenue (cần thiết cho biểu đồ cột)
    const maxRevenue = dailyRevenue && dailyRevenue.length > 0
        ? Math.max(...dailyRevenue.map(d => d.revenueRaw || 0))
        : 0;

    // Icons
    const revenueIcon = <DollarSign size={28} className="icon-main" />;
    const feesIcon = <TrendingUp size={28} className="icon-main" />;
    const pagesIcon = <Activity size={28} className="icon-main" />;
    const transactionIcon = <ShoppingCart size={28} className="icon-main" />;

    // Helper function để hiển thị Marketplace status
    const renderMarketplaceMeta = () => {
        if (!marketplace?.byStatus || marketplace.byStatus.length === 0) return 'Không có trạng thái';

        return marketplace.byStatus.map((s, i) => {
            const statusName = s._id.toUpperCase();
            // Lấy 3 trạng thái đầu tiên
            if (i >= 3) return null;

            // Sử dụng màu sắc tương ứng (ví dụ: ACTIVE là xanh lá, PENDING là vàng, REJECTED là đỏ)
            let colorClass = '';
            if (statusName.includes('ACTIVE')) colorClass = 'text-success';
            else if (statusName.includes('PENDING')) colorClass = 'text-warning';
            else if (statusName.includes('REJECTED') || statusName.includes('FAILED')) colorClass = 'text-error';

            return (
                <span key={i} className={colorClass}>
                    {s.count ? s.count.toLocaleString('vi-VN') : '0'} {s._id.toUpperCase()}
                    {i < marketplace.byStatus.length - 1 && i < 2 ? ' • ' : ''}
                </span>
            );
        });
    };

    // Tìm số lượng giao dịch thành công
    const completedTransactions = transactions.byStatus?.find(s => s.status === 'COMPLETED')?.count?.toLocaleString('vi-VN') || 0;

    return (
        <div className="admin-dashboard-v2">

            {/* HEADER */}
            <header className="dashboard-header-v2">
                <div className="header-content-v2">
                    <h1>✨ Admin Dashboard <span className="beta-tag">Premium</span></h1>
                    <p>Tổng quan hệ thống và hiệu suất kinh doanh trên nền tảng của bạn.</p>
                </div>
                <button onClick={fetchDashboardData} className="btn-refresh-v2">
                    <RefreshCw size={18} /> Làm mới
                </button>
            </header>

            {/* OVERVIEW STATS GRID (CHỈ 4 TRƯỜNG THEO YÊU CẦU) */}
            <div className="overview-grid-v2">

                {/* 1. Tổng Doanh Thu */}
                <div className="stat-card-v2 primary">
                    <div className="card-icon-v2">{revenueIcon}</div>
                    <div className="card-content-v2">
                        <p className="card-title">Tổng Doanh Thu</p>
                        <h2 className="card-value">{overview.totalRevenue || '0 ₫'}</h2>
                        <p className="card-meta">Tất cả giao dịch</p>
                    </div>
                    {/* Badge: Tăng trưởng */}
                    <span className="card-badge success">
                        <TrendingUp size={14} /> Tăng trưởng
                    </span>
                </div>

                {/* 2. Platform Fees */}
                <div className="stat-card-v2 secondary">
                    <div className="card-icon-v2">{feesIcon}</div>
                    <div className="card-content-v2">
                        <p className="card-title">Platform Fees</p>
                        <h2 className="card-value">{overview.platformFees || '0 ₫'}</h2>
                        <p className="card-meta">{overview.feePercentage || '0%'} của doanh thu</p>
                    </div>
                    {/* Badge: Tỉ lệ phí */}
                    <span className="card-badge secondary">
                        <DollarSign size={14} /> Tỉ lệ phí: {overview.feePercentage || '0%'}
                    </span>
                </div>

                {/* 3. Marketplace Pages */}
                <div className="stat-card-v2 info">
                    <div className="card-icon-v2">{pagesIcon}</div>
                    <div className="card-content-v2">
                        <p className="card-title">Marketplace Pages</p>
                        <h2 className="card-value">{marketplace.totalPages ? marketplace.totalPages.toLocaleString('vi-VN') : '0'}</h2>
                        <div className="card-meta marketplace-meta">
                            {/* Hiển thị chi tiết status, sử dụng Helper function */}
                            {renderMarketplaceMeta()}
                        </div>
                    </div>
                    {/* Badge: Pages mới */}
                    <span className="card-badge info">
                        <Zap size={14} /> Pages mới: {marketplace.newPagesToday || 0}
                    </span>
                </div>

                {/* 4. Giao Dịch */}
                <div className="stat-card-v2 warning">
                    <div className="card-icon-v2">{transactionIcon}</div>
                    <div className="card-content-v2">
                        <p className="card-title">Giao Dịch</p>
                        <h2 className="card-value">{totalTransactions.toLocaleString('vi-VN')}</h2>
                        <p className="card-meta">
                            {completedTransactions} thành công
                        </p>
                    </div>
                    {/* Badge: Giao dịch chờ */}
                    <span className="card-badge warning">
                        <ShoppingCart size={14} /> Chờ xử lý: {transactions.byStatus?.find(s => s.status === 'PENDING')?.count?.toLocaleString('vi-VN') || 0}
                    </span>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="main-content-grid-v2">

                {/* COLUMN 1: TRANSACTIONS & DAILY REVENUE */}
                <div className="column-left">

                    {/* DAILY REVENUE CHART */}
                    <div className="section-v2 daily-revenue-chart-v2">
                        <div className="section-header">
                            <h2>📈 Doanh Thu 30 Ngày Gần Nhất</h2>
                            <p className="subtitle">Tổng giao dịch: {totalTransactions.toLocaleString('vi-VN')}</p>
                        </div>
                        <div className="daily-chart-v2">
                            {dailyRevenue?.slice(-30).map((day, idx) => {
                                // Sử dụng toán tử kiểm tra null/undefined an toàn
                                const revenueRaw = day.revenueRaw || 0;
                                const height = maxRevenue > 0 ? (revenueRaw / maxRevenue) * 90 : 0;

                                return (
                                    <div key={idx} className="chart-bar-wrapper-v2" title={`${day.date} | ${day.revenue || '0 ₫'} | ${day.count || 0} GD`}>
                                        <div className="bar-info-v2">
                                            <span className="value-v2">{day.revenue ? day.revenue.split(' ')[0] : '0'}</span>
                                        </div>
                                        <div className="chart-bar-v2" style={{ height: `${Math.max(height, 2)}%` }}>
                                            <div className="bar-fill-v2"></div>
                                        </div>
                                        <div className="bar-label-v2">{day.date?.split('/').slice(0, 2).join('/') || 'N/A'}</div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="chart-axis-label">Ngày</div>
                    </div>

                    {/* TRANSACTION STATUS */}
                    <div className="section-v2 transaction-status-v2">
                        <div className="section-header">
                            <h2>📊 Giao Dịch Theo Trạng Thái</h2>
                        </div>
                        <div className="transaction-grid-v2">
                            {transactions.byStatus?.map((item, idx) => (
                                <div key={idx} className={`transaction-card-v2 status-${item.status.toLowerCase()}`}>
                                    <div className="status-header">
                                        <ShoppingCart size={20} />
                                        <div className="status-label">{item.status}</div>
                                    </div>
                                    <div className="count-v2">{item.count ? item.count.toLocaleString('vi-VN') : '0'}</div>
                                    <div className="details">
                                        <p>Tổng tiền: <span>{item.totalAmount || '0 ₫'}</span></p>
                                        <p>Phí Platform: <span>{item.platformFees || '0 ₫'}</span></p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* PAYMENT METHODS */}
                    {transactions.byPaymentMethod && transactions.byPaymentMethod.length > 0 && (
                        <div className="section-v2 payment-methods-v2">
                            <div className="section-header">
                                <h2>💳 Phương Thức Thanh Toán</h2>
                            </div>
                            <div className="payment-grid-v2">
                                {transactions.byPaymentMethod.map((item, idx) => (
                                    <div key={idx} className="payment-card-v2">
                                        <CreditCard size={28} />
                                        <div className="method-info">
                                            <div className="method-label">{item.method || 'N/A'}</div>
                                            <div className="count-amount">
                                                <span>{item.count ? item.count.toLocaleString('vi-VN') : '0'} GD</span>
                                                <span className="amount-v2">{item.totalAmount || '0 ₫'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* COLUMN 2: TOP SELLERS/BUYERS */}
                <div className="column-right">

                    {/* TOP SELLERS */}
                    <div className="section-v2 top-list-v2">
                        <div className="section-header">
                            <h2>🏆 Top 5 Sellers</h2>
                        </div>
                        <div className="list-items-v2">
                            {topSellers?.slice(0, 5).map((seller) => (
                                <div key={seller.sellerId} className="top-item-v2">
                                    <div className="rank-v2">#{seller.rank}</div>
                                    <div className="info-v2">
                                        <div className="id-v2" title={seller.sellerId}>{seller.sellerId?.substring(0, 15)}...</div>
                                        <div className="stats-v2">
                                            <span>{seller.totalSales ? seller.totalSales.toLocaleString('vi-VN') : '0'} sales</span>
                                            <span className="revenue-v2">| {seller.totalRevenue || '0 ₫'}</span>
                                        </div>
                                    </div>
                                    <Award size={20} className="award-icon" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* TOP BUYERS */}
                    <div className="section-v2 top-list-v2">
                        <div className="section-header">
                            <h2>💰 Top 5 Buyers</h2>
                        </div>
                        <div className="list-items-v2">
                            {topBuyers?.slice(0, 5).map((buyer) => (
                                <div key={buyer.buyerId} className="top-item-v2">
                                    <div className="rank-v2">#{buyer.rank}</div>
                                    <div className="info-v2">
                                        <div className="id-v2" title={buyer.buyerId}>{buyer.buyerId?.substring(0, 15)}...</div>
                                        <div className="stats-v2">
                                            <span>{buyer.totalPurchases ? buyer.totalPurchases.toLocaleString('vi-VN') : '0'} purchases</span>
                                            <span className="spent-v2">| {buyer.totalSpent || '0 ₫'}</span>
                                        </div>
                                    </div>
                                    <ShoppingCart size={20} className="award-icon" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* FOOTER */}
            <footer className="dashboard-footer-v2">
                <p>Dashboard được cập nhật lúc: <strong>{new Date(report.generatedAt).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'medium' })}</strong> | Dữ liệu được tính toán theo thời gian thực.</p>
            </footer>
        </div>
    );
};

export default React.memo(AdminDashboard);