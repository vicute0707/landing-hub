import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../context/UserContext';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import '../styles/Dashboard.css';
import {
    Container, Grid, Paper, Typography, Box, Card, CardContent,
    Select, MenuItem, FormControl, InputLabel, CircularProgress, Divider, Chip
} from '@mui/material';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import axios from 'axios';

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#f59e0b', '#ef4444', '#8b5cf6'];

const AdminAnalytics = () => {
    const { user } = useContext(UserContext);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState(30);
    const [chatTrends, setChatTrends] = useState([]);
    const [marketplaceTrends, setMarketplaceTrends] = useState(null);
    const [summary, setSummary] = useState(null);
    const [aiInsights, setAiInsights] = useState(null);
    const [systemReport, setSystemReport] = useState(null);

    // Làm sạch text AI (bỏ emoji)
    const cleanAIText = (text) => {
        if (!text) return [];
        const cleanedText = text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
        return cleanedText.split('\n').filter(line => line.trim());
    };

    // Parse gợi ý AI
    const parseRecommendations = (text) => {
        if (!text) return [];
        const lines = cleanAIText(text);
        const recommendations = [];
        let currentRec = null;

        lines.forEach(line => {
            const trimmed = line.trim();
            const match = trimmed.match(/^(\d+)[.):]\s*(.+)/);
            if (match) {
                if (currentRec) recommendations.push(currentRec);
                currentRec = { title: match[2], details: [] };
            } else if (currentRec && trimmed.startsWith('-')) {
                currentRec.details.push(trimmed.substring(1).trim());
            } else if (currentRec && trimmed) {
                currentRec.details.push(trimmed);
            } else if (trimmed && !currentRec) {
                recommendations.push({ title: trimmed, details: [] });
            }
        });
        if (currentRec) recommendations.push(currentRec);
        return recommendations;
    };

    useEffect(() => {
        fetchAnalytics();
    }, [timeRange]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';

            const [trendsRes, marketplaceRes, summaryRes, insightsRes, systemRes] = await Promise.all([
                axios.get(`${apiUrl}/api/chat-analytics/trends?days=${timeRange}`, config),
                axios.get(`${apiUrl}/api/chat-analytics/marketplace-trends?days=${timeRange}`, config),
                axios.get(`${apiUrl}/api/chat-analytics/summary`, config),
                axios.get(`${apiUrl}/api/chat-analytics/ai-insights?days=${timeRange}`, config),
                axios.get(`${apiUrl}/api/reports/admin/system`, config)
            ]);

            setChatTrends(trendsRes.data.data);
            setMarketplaceTrends(marketplaceRes.data.data);
            setSummary(summaryRes.data.data);
            setAiInsights(insightsRes.data.data);
            setSystemReport(systemRes.data.data);
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu phân tích:', error);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ title, value, subtitle, trend }) => (
        <Card sx={{ background: 'linear-gradient(135deg, #667eea20 0%, #764ba220 100%)', borderLeft: '4px solid #667eea', height: '100%' }}>
            <CardContent>
                <Box display="flex" justifyContent="space-between">
                    <Box>
                        <Typography color="textSecondary" gutterBottom variant="body2">{title}</Typography>
                        <Typography variant="h4" fontWeight="bold">{value}</Typography>
                        {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
                        {trend && <Chip label={trend} size="small" color={trend.includes('+') ? 'success' : 'error'} sx={{ mt: 1 }} />}
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );

    if (loading) {
        return (
            <div className="dashboard-container">
                <Header role={user?.role} />
                <div className="dashboard-main">
                    <Sidebar role={user?.role} />
                    <div className="dashboard-content">
                        <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
                            <CircularProgress />
                        </Box>
                    </div>
                </div>
            </div>
        );
    }

    // Chuẩn bị dữ liệu biểu đồ
    const orderStatusData = systemReport?.transactions?.byStatus?.map(item => ({
        status: item.status,
        count: item.count,
        amount: item.totalAmountRaw
    })) || [];

    const paymentMethodData = systemReport?.transactions?.byPaymentMethod?.map(item => ({
        method: item.method,
        count: item.count,
        amount: item.totalAmountRaw
    })) || [];

    return (
        <div className="dashboard-container">
            <Header role={user?.role} />
            <div className="dashboard-main">
                <Sidebar role={user?.role} />
                <div className="dashboard-content">
                    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
                        {/* Header */}
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                            <Box>
                                <Typography variant="h4" fontWeight="bold">Tổng quan Admin</Typography>
                            </Box>
                            <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
                                <InputLabel>Khoảng thời gian</InputLabel>
                                <Select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} label="Khoảng thời gian">
                                    <MenuItem value={7}>7 ngày qua</MenuItem>
                                    <MenuItem value={30}>30 ngày qua</MenuItem>
                                    <MenuItem value={90}>90 ngày qua</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>

                        {/* Dòng 1: Chỉ số kinh doanh */}
                        <Typography variant="h6" sx={{ mb: 2 }}>Chỉ số kinh doanh</Typography>
                        <Grid container spacing={3} mb={4}>
                            <Grid item xs={12} sm={6} md={3}>
                                <StatCard title="Tổng doanh thu" value={systemReport?.overview?.totalRevenue || '₫0'} subtitle={`Phí: ${systemReport?.overview?.platformFees || '₫0'}`} trend="+12%" />
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <StatCard title="Số trang bán" value={systemReport?.marketplace?.totalPages || 0} subtitle={`TB: ${systemReport?.marketplace?.priceStats?.avg || '₫0'}`} />
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <StatCard title="Tổng lead" value={systemReport?.leads?.total || 0} subtitle={`Hôm nay: ${systemReport?.leads?.today || 0}`} />
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <StatCard title="Người dùng hoạt động" value={summary?.totalUsers || 0} subtitle={`${summary?.totalChats || 0} cuộc chat`} />
                            </Grid>
                        </Grid>

                        {/* Dòng 2: Hỗ trợ & tương tác */}
                        <Typography variant="h6" sx={{ mb: 2 }}>Hỗ trợ & tương tác</Typography>
                        <Grid container spacing={3} mb={4}>
                            <Grid item xs={12} sm={6} md={3}><StatCard title="Chat hôm nay" value={summary?.todayChats || 0} subtitle={`Đã xử lý: ${summary?.resolvedToday || 0}`} /></Grid>
                            <Grid item xs={12} sm={6} md={3}><StatCard title="Chat đang mở" value={summary?.openChats || 0} subtitle="Cần xử lý" /></Grid>
                            <Grid item xs={12} sm={6} md={3}><StatCard title="Tin nhắn hôm nay" value={summary?.todayMessages || 0} subtitle={`AI: ${summary?.messageStats?.aiToday || 0} (${summary?.messageStats?.aiPercentage || 0}%)`} /></Grid>
                            <Grid item xs={12} sm={6} md={3}><StatCard title="Tổng tin nhắn" value={summary?.messageStats?.total || 0} subtitle={`AI: ${summary?.messageStats?.aiGenerated || 0}`} /></Grid>
                        </Grid>

                        <Divider sx={{ my: 4 }} />

                        {/* Gợi ý AI */}
                        {summary?.aiRecommendations && parseRecommendations(summary.aiRecommendations).length > 0 && (
                            <Paper sx={{ p: 3, mb: 4, background: 'linear-gradient(135deg, #667eea20 0%, #764ba220 100%)', border: '1px solid #667eea40' }}>
                                <Typography variant="h6" fontWeight="bold" mb={2}>Gợi ý thông minh từ AI</Typography>
                                <Box>
                                    {parseRecommendations(summary.aiRecommendations).map((rec, index) => (
                                        <Box key={index} mb={2}>
                                            <Typography variant="body1" fontWeight="600">{rec.title}</Typography>
                                            {rec.details.length > 0 && (
                                                <Box ml={2} mt={1}>
                                                    {rec.details.map((detail, idx) => (
                                                        <Typography key={idx} variant="body2" color="text.secondary">{detail}</Typography>
                                                    ))}
                                                </Box>
                                            )}
                                            {index < parseRecommendations(summary.aiRecommendations).length - 1 && <Divider sx={{ my: 2 }} />}
                                        </Box>
                                    ))}
                                </Box>
                            </Paper>
                        )}

                        {/* Phân tích AI */}
                        {aiInsights && (
                            <Grid container spacing={3} mb={4}>
                                <Grid item xs={12} md={6}>
                                    <Paper sx={{ p: 3, height: '100%' }}>
                                        <Typography variant="h6" fontWeight="bold" mb={2}>Phân tích xu hướng chat</Typography>
                                        {aiInsights.chatInsights && cleanAIText(aiInsights.chatInsights).length > 0 ? (
                                            cleanAIText(aiInsights.chatInsights).map((line, index) => (
                                                <Typography key={index} variant="body2" paragraph color="text.secondary">{line}</Typography>
                                            ))
                                        ) : (
                                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>Chưa đủ dữ liệu chat để phân tích.</Typography>
                                        )}
                                    </Paper>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Paper sx={{ p: 3, height: '100%' }}>
                                        <Typography variant="h6" fontWeight="bold" mb={2}>Thông tin thị trường</Typography>
                                        {aiInsights.marketplaceInsights && cleanAIText(aiInsights.marketplaceInsights).length > 0 ? (
                                            cleanAIText(aiInsights.marketplaceInsights).map((line, index) => (
                                                <Typography key={index} variant="body2" paragraph color="text.secondary">{line}</Typography>
                                            ))
                                        ) : (
                                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>Chưa đủ dữ liệu mua-bán để phân tích.</Typography>
                                        )}
                                    </Paper>
                                </Grid>
                            </Grid>
                        )}

                        {/* Xu hướng doanh thu */}
                        {systemReport?.dailyRevenue && systemReport.dailyRevenue.length > 0 && (
                            <Paper sx={{ p: 3, mb: 4 }}>
                                <Typography variant="h6" fontWeight="bold" mb={2}>Xu hướng doanh thu (30 ngày)</Typography>
                                <ResponsiveContainer width="100%" height={300}>
                                    <AreaChart data={systemReport.dailyRevenue}>
                                        <defs>
                                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="colorFees" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="#667eea" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Area type="monotone" dataKey="revenueRaw" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenue)" name="Doanh thu" />
                                        <Area type="monotone" dataKey="platformFeesRaw" stroke="#667eea" fillOpacity={1} fill="url(#colorFees)" name="Phí nền tảng" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </Paper>
                        )}

                        {/* Trạng thái giao dịch & Phương thức thanh toán */}
                        <Grid container spacing={3} mb={4}>
                            <Grid item xs={12} md={6}>
                                <Paper sx={{ p: 3 }}>
                                    <Typography variant="h6" fontWeight="bold" mb={2}>Phân loại trạng thái giao dịch</Typography>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie
                                                data={orderStatusData}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={(entry) => `${entry.status}: ${entry.count}`}
                                                outerRadius={100}
                                                fill="#8884d8"
                                                dataKey="count"
                                            >
                                                {orderStatusData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </Paper>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Paper sx={{ p: 3 }}>
                                    <Typography variant="h6" fontWeight="bold" mb={2}>Phương thức thanh toán</Typography>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={paymentMethodData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="method" />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="count" fill="#667eea" name="Số giao dịch" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </Paper>
                            </Grid>
                        </Grid>

                        {/* Danh mục & Top mẫu */}
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <Paper sx={{ p: 3 }}>
                                    <Typography variant="h6" fontWeight="bold" mb={2}>Danh mục bán chạy nhất</Typography>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={marketplaceTrends?.categoryStats || []}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="_id" />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="totalSales" fill="#667eea" name="Doanh số" />
                                            <Bar dataKey="totalViews" fill="#4facfe" name="Lượt xem" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </Paper>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Paper sx={{ p: 3 }}>
                                    <Typography variant="h6" fontWeight="bold" mb={2}>Phân bố danh mục</Typography>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie
                                                data={marketplaceTrends?.categoryStats || []}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={(entry) => `${entry._id}: ${entry.pageCount}`}
                                                outerRadius={100}
                                                fill="#8884d8"
                                                dataKey="pageCount"
                                            >
                                                {(marketplaceTrends?.categoryStats || []).map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </Paper>
                            </Grid>

                            {/* Top mẫu */}
                            <Grid item xs={12}>
                                <Paper sx={{ p: 3 }}>
                                    <Typography variant="h6" fontWeight="bold" mb={2}>Template hiệu quả nhất</Typography>
                                    <Box sx={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                            <tr style={{ backgroundColor: '#f5f5f5' }}>
                                                <th style={{ padding: '12px', textAlign: 'left' }}>Tên mẫu</th>
                                                <th style={{ padding: '12px', textAlign: 'left' }}>Danh mục</th>
                                                <th style={{ padding: '12px', textAlign: 'right' }}>Giá</th>
                                                <th style={{ padding: '12px', textAlign: 'right' }}>Đã bán</th>
                                                <th style={{ padding: '12px', textAlign: 'right' }}>Lượt xem</th>
                                                <th style={{ padding: '12px', textAlign: 'right' }}>Đánh giá</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {(marketplaceTrends?.topTemplates || []).map((template, index) => (
                                                <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                                                    <td style={{ padding: '12px' }}>{template.title}</td>
                                                    <td style={{ padding: '12px' }}>{template.category}</td>
                                                    <td style={{ padding: '12px', textAlign: 'right' }}>
                                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(template.price)}
                                                    </td>
                                                    <td style={{ padding: '12px', textAlign: 'right' }}>{template.sold_count}</td>
                                                    <td style={{ padding: '12px', textAlign: 'right' }}>{template.views}</td>
                                                    <td style={{ padding: '12px', textAlign: 'right' }}>
                                                        {template.rating?.toFixed(1) || 'Chưa có'}
                                                    </td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </Box>
                                </Paper>
                            </Grid>
                        </Grid>
                    </Container>
                </div>
            </div>
        </div>
    );
};

export default AdminAnalytics;