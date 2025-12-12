import React, { useState, useEffect } from 'react';
import {
    Activity, Users, DollarSign, TrendingUp, Award, CreditCard,
    RefreshCw, Download, Calendar
} from 'lucide-react';
import api from '../utils/api';
import '../styles/AdminSystemReport.css';

const AdminSystemReport = () => {
    const [loading, setLoading] = useState(true);
    const [report, setReport] = useState(null);
    const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });

    const fetchReport = async () => {
        try {
            setLoading(true);
            let url = '/api/reports/admin/system';

            if (dateRange.startDate && dateRange.endDate) {
                url += `?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
            }

            const response = await api.get(url);
            console.log('📊 Admin Report:', response.data);

            if (response.data.success) {
                setReport(response.data.data);
            }
        } catch (error) {
            console.error('❌ Error fetching admin report:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, []);

    if (loading) {
        return (
            <div className="admin-report loading">
                <RefreshCw className="spin" size={48} />
                <p>Đang tải báo cáo...</p>
            </div>
        );
    }

    if (!report) {
        return <div className="admin-report error"><p>Không thể tải báo cáo</p></div>;
    }

    const { overview, transactions, marketplace, topSellers, topBuyers, dailyRevenue } = report;

    return (
        <div className="admin-report">
            {/* HEADER */}
            <div className="report-header">
                <div className="report-title">
                    <div>
                        <h1>System Report 2025</h1>
                        <p>Phân tích tổng quan hệ thống và xu hướng kinh doanh</p>
                    </div>
                </div>
                <div className="report-actions">
                    <button className="btn-refresh" onClick={fetchReport}>
                        <RefreshCw size={18} /> Làm mới
                    </button>
                    <button className="btn-download">
                        <Download size={18} /> Xuất báo cáo
                    </button>
                </div>
            </div>

            {/* DATE FILTER */}
            <div className="date-range-filter">
                <Calendar size={20} />
                <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                />
                <span>đến</span>
                <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                />
                <button onClick={fetchReport} className="btn-filter">Lọc</button>
            </div>

            {/* OVERVIEW CARDS - MODERN DESIGN */}
            <div className="overview-grid">
                <div className="overview-card revenue">
                    <div className="card-header">
                        <span className="card-label">Tổng Doanh Thu</span>
                        <span className="trend-badge positive">
                            <TrendingUp size={14} /> +12.5%
                        </span>
                    </div>
                    <div className="card-value">{overview.totalRevenue}</div>
                    <div className="card-footer">
                        <span>So với tháng trước</span>
                    </div>
                </div>

                <div className="overview-card fees">
                    <div className="card-header">
                        <span className="card-label">Platform Fees</span>
                    </div>
                    <div className="card-value">{overview.platformFees}</div>
                    <div className="card-footer">
                        <span>Tỷ lệ phí</span>
                        <span className="highlight">{overview.feePercentage}</span>
                    </div>
                </div>

                <div className="overview-card transactions">
                    <div className="card-header">
                        <span className="card-label">Tổng Giao Dịch</span>
                    </div>
                    <div className="card-value">{overview.totalTransactions || 0}</div>
                    <div className="card-footer">
                        <span>Tất cả trạng thái</span>
                    </div>
                </div>

                <div className="overview-card pages">
                    <div className="card-header">
                        <span className="card-label">Marketplace Pages</span>
                    </div>
                    <div className="card-value">{marketplace.totalPages}</div>
                    <div className="card-footer">
                        <span>Active</span>
                        <span className="highlight">{marketplace.activePages || 0}</span>
                    </div>
                </div>

                <div className="overview-card users">
                    <div className="card-header">
                        <span className="card-label">Tổng Người Dùng</span>
                        <span className="trend-badge positive">
                            <Users size={14} /> +8.3%
                        </span>
                    </div>
                    <div className="card-value">{overview.totalUsers || 0}</div>
                    <div className="card-footer">
                        <span>Đã đăng ký</span>
                    </div>
                </div>

                <div className="overview-card conversion">
                    <div className="card-header">
                        <span className="card-label">Tỷ Lệ Chuyển Đổi</span>
                    </div>
                    <div className="card-value">
                        {((overview.totalTransactions / (marketplace.totalPages || 1)) * 100).toFixed(1)}%
                    </div>
                    <div className="card-footer">
                        <span>Giao dịch / Page</span>
                    </div>
                </div>
            </div>

            {/* TRANSACTION STATUS */}
            <div className="section">
                <h2>Giao Dịch Theo Trạng Thái</h2>
                <div className="transaction-grid">
                    {transactions.byStatus.map((item, idx) => (
                        <div key={idx} className={`transaction-card status-${item.status.toLowerCase()}`}>
                            <div className="status">{item.status}</div>
                            <div className="count">{item.count} giao dịch</div>
                            <div className="amount">{item.totalAmount}</div>
                            <div className="fees">Phí: {item.platformFees}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* PAYMENT METHODS */}
            <div className="section">
                <h2>Phương Thức Thanh Toán</h2>
                <div className="payment-grid">
                    {transactions.byPaymentMethod.map((item, idx) => (
                        <div key={idx} className="payment-card">
                            <CreditCard size={32} />
                            <div className="method">{item.method}</div>
                            <div className="count">{item.count} GD</div>
                            <div className="amount">{item.totalAmount}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* TOP SELLERS */}
            <div className="section">
                <h2>Top 20 Sellers</h2>
                <div className="leaderboard-table">
                    <table>
                        <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Seller ID</th>
                            <th>Sales</th>
                            <th>Revenue</th>
                            <th>Earned</th>
                            <th>Platform Fees</th>
                        </tr>
                        </thead>
                        <tbody>
                        {topSellers.slice(0, 20).map((seller) => (
                            <tr key={seller.sellerId}>
                                <td className="rank">#{seller.rank}</td>
                                <td className="seller-id">{seller.sellerId.substring(0, 10)}...</td>
                                <td>{seller.totalSales}</td>
                                <td className="revenue">{seller.totalRevenue}</td>
                                <td className="earned">{seller.totalEarned}</td>
                                <td className="fees">{seller.platformFees}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* DAILY REVENUE CHART */}
            <div className="section">
                <h2>Doanh Thu 30 Ngày Gần Nhất</h2>
                <div className="daily-chart">
                    {dailyRevenue.slice(-30).map((day, idx) => {
                        const maxRevenue = Math.max(...dailyRevenue.map(d => d.revenueRaw));
                        const height = maxRevenue > 0 ? (day.revenueRaw / maxRevenue) * 100 : 0;

                        return (
                            <div key={idx} className="chart-bar-wrapper">
                                <div className="bar-info">
                                    <span className="value">{day.revenue}</span>
                                    <span className="count">{day.count} GD</span>
                                </div>
                                <div className="chart-bar" style={{ height: `${Math.max(height, 5)}%` }}>
                                    <div className="bar-fill"></div>
                                </div>
                                <div className="bar-label">{day.date.split('/').slice(0, 2).join('/')}</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* FOOTER */}
            <div className="report-footer">
                <p>Báo cáo được tạo lúc: {new Date(report.generatedAt).toLocaleString('vi-VN')}</p>
                <p>Dữ liệu cập nhật realtime</p>
                <p className="report-year">System Report 2025 - LandingHub Platform Analytics</p>
            </div>
        </div>
    );
};

export default AdminSystemReport;