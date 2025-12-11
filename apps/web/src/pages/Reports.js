import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../context/UserContext';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import {
    Container, Paper, Typography, Box, Grid, Card, CardContent, Button,
    CircularProgress, Divider, TextField, MenuItem, Alert, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Chip, Stack, LinearProgress,
    Avatar, Tabs, Tab
} from '@mui/material';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart
} from 'recharts';
import {
    Download as DownloadIcon, Print as PrintIcon, Assessment as AssessmentIcon,
    TrendingUp, TrendingDown, AttachMoney, ShoppingCart, People, Chat, Refresh,
    Description, Payment as PaymentIcon, Insights, Timeline, Speed, CheckCircle,
    HourglassEmpty, LocalAtm, Store, StarRate, Psychology, Lightbulb, ChatBubble
} from '@mui/icons-material';
import axios from 'axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import '../styles/Dashboard.css';

const COLORS = ['#667eea', '#34d399', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981'];
/* ----------  HELPER CHUẨN NGÂN HÀNG  ---------- */
const toVND = (num, unit = 'auto') => {
    if (typeof num !== 'number') return '-';

    let v = Math.abs(num);
    let suffix = '';
    if (unit === 'auto') {
        if (v >= 1_000_000_000) { v /= 1_000_000_000; suffix = ' Tỷ'; }
        else if (v >= 1_000_000) { v /= 1_000_000; suffix = ' Triệu'; }
        else if (v >= 1_000) { v /= 1_000; suffix = ' Nghìn'; }
    } else {
        suffix = ` ${unit}`;
    }
    return (num < 0 ? '-' : '') +
        v.toFixed(2).replace('.', ',')   // thập phân
        + suffix + ' đồng';
};
const Reports = () => {
    const { user } = useContext(UserContext);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dateRange, setDateRange] = useState('30');
    const [tabValue, setTabValue] = useState(0);
    const [reportData, setReportData] = useState({
        systemReport: null,
        chatAnalytics: null,
        marketplaceTrends: null,
        summary: null,
        aiInsights: null
    });

    const cleanAIText = (text) => {
        if (!text) return [];
        const cleaned = text.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
        return cleaned.split('\n').map(l => l.trim()).filter(Boolean);
    };

    const parseRecommendations = (text) => {
        if (!text) return [];
        const lines = cleanAIText(text);
        const result = [];
        let current = null;

        lines.forEach(line => {
            const match = line.match(/^(\d+)[.):]\s*(.+)/);
            if (match) {
                if (current) result.push(current);
                current = { title: match[2].trim(), details: [] };
            } else if (current && line.startsWith('-')) {
                current.details.push(line.substring(1).trim());
            } else if (current && line) {
                current.details.push(line);
            } else if (line && !current) {
                result.push({ title: line, details: [] });
            }
        });
        if (current) result.push(current);
        return result;
    };

    const fetchReports = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';

            const [systemRes, chatRes, marketplaceRes, summaryRes, insightsRes] = await Promise.all([
                axios.get(`${apiUrl}/api/reports/admin/system`, config),
                axios.get(`${apiUrl}/api/chat-analytics/trends?days=${dateRange}`, config),
                axios.get(`${apiUrl}/api/chat-analytics/marketplace-trends?days=${dateRange}`, config),
                axios.get(`${apiUrl}/api/chat-analytics/summary`, config),
                axios.get(`${apiUrl}/api/chat-analytics/ai-insights?days=${dateRange}`, config)
            ]);

            setReportData({
                systemReport: systemRes.data.data,
                chatAnalytics: chatRes.data.data,
                marketplaceTrends: marketplaceRes.data.data,
                summary: summaryRes.data.data,
                aiInsights: insightsRes.data.data
            });
        } catch (err) {
            setError(err.response?.data?.message || 'Không thể tải dữ liệu báo cáo');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, [dateRange]);

    // XUẤT PDF CHUẨN VIỆT NAM - ĐẸP NHƯ BÁO CÁO CHUYÊN NGHIỆP
    const exportToPDF = () => {
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // Font tiếng Việt
        doc.addFont('https://cdn.jsdelivr.net/npm/@fontsource/roboto/files/roboto-vietnamese-400-normal.woff', 'Roboto', 'normal');
        doc.setFont('Roboto');

        // Header
        doc.setFontSize(22);
        doc.setTextColor(102, 126, 234);
        doc.text('BÁO CÁO PHÂN TÍCH HỆ THỐNG', pageWidth / 2, 20, { align: 'center' });

        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`LandingHub • Ngày tạo: ${new Date().toLocaleString('vi-VN')}`, pageWidth / 2, 28, { align: 'center' });

        let y = 40;

        // Tổng quan
        if (reportData.systemReport) {
            doc.setFontSize(16);
            doc.setTextColor(0);
            doc.text('TỔNG QUAN HỆ THỐNG', 14, y);
            y += 10;

            const overview = [
                ['Tổng Doanh Thu', reportData.systemReport.overview.totalRevenue],
                ['Phí Nền Tảng', reportData.systemReport.overview.platformFees],
                ['Tổng Trang Marketplace', reportData.systemReport.marketplace.totalPages],
                ['Tổng Lead', reportData.systemReport.leads?.total || 0],
                ['Tổng Tin Nhắn', reportData.summary?.totalChats || 0]
            ];

            doc.autoTable({
                startY: y,
                head: [['Chỉ Số', 'Giá Trị']],
                body: overview,
                theme: 'grid',
                headStyles: { fillColor: [102, 126, 234], textColor: 255, fontSize: 12 },
                styles: { font: 'Roboto', fontSize: 11 },
                columnStyles: { 1: { halign: 'right' } }
            });
            y = doc.lastAutoTable.finalY + 15;
        }

        // Top Người Bán
        if (reportData.systemReport?.topSellers?.length > 0) {
            doc.setFontSize(16);
            doc.text('TOP NGƯỜI BÁN XUẤT SẮC', 14, y);
            y += 8;

            const topSellersData = reportData.systemReport.topSellers.slice(0, 10).map(s => [
                `#${s.rank}`,
                s.sellerName || 'Ẩn danh',
                s.totalSales,
                s.totalRevenue
            ]);

            doc.autoTable({
                startY: y,
                head: [['Hạng', 'Người bán', 'Số đơn', 'Doanh thu']],
                body: topSellersData,
                theme: 'striped',
                headStyles: { fillColor: [255, 193, 7] },
                styles: { font: 'Roboto' }
            });
            y = doc.lastAutoTable.finalY + 15;
        }

        // Top Khách Hàng
        if (reportData.systemReport?.topBuyers?.length > 0) {
            doc.setFontSize(16);
            doc.text('TOP KHÁCH HÀNG THÂN THIẾT', 14, y);
            y += 8;

            const topBuyersData = reportData.systemReport.topBuyers.slice(0, 10).map(b => [
                `#${b.rank}`,
                b.buyerName || 'Ẩn danh',
                b.totalPurchases,
                b.totalSpent
            ]);

            doc.autoTable({
                startY: y,
                head: [['Hạng', 'Khách hàng', 'Số lần mua', 'Tổng chi']],
                body: topBuyersData,
                theme: 'striped',
                headStyles: { fillColor: [76, 175, 80] },
                styles: { font: 'Roboto' }
            });
        }

        // Footer
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(`© ${new Date().getFullYear()} LandingHub. Báo cáo được tạo tự động.`, pageWidth / 2, pageHeight - 10, { align: 'center' });

        doc.save(`BaoCao_LandingHub_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    // XUẤT EXCEL CHUẨN
    const exportToExcel = () => {
        const wb = XLSX.utils.book_new();

        // Sheet Tổng quan
        const overview = [
            ['BÁO CÁO HỆ THỐNG LANDINGHUB'],
            ['Ngày tạo', new Date().toLocaleString('vi-VN')],
            [],
            ['TỔNG QUAN'],
            ['Tổng Doanh Thu', reportData.systemReport?.overview?.totalRevenue || toVND(0)],
            ['Phí Nền Tảng', reportData.systemReport?.overview?.platformFees || '0 ₫'],
            ['Tổng Trang', reportData.systemReport?.marketplace?.totalPages || 0],
            ['Tổng Lead', reportData.systemReport?.leads?.total || 0],
            ['Tổng Tin Nhắn', reportData.summary?.totalChats || 0]
        ];
        const ws1 = XLSX.utils.aoa_to_sheet(overview);
        XLSX.utils.book_append_sheet(wb, ws1, 'Tổng Quan');

        // Sheet Top Người Bán
        if (reportData.systemReport?.topSellers?.length > 0) {
            const topSellers = [['Hạng', 'Người bán', 'Số đơn', 'Doanh thu'], ...reportData.systemReport.topSellers.map(s => [s.rank, s.sellerName || 'Ẩn danh', s.totalSales, s.totalRevenue])];
            const ws2 = XLSX.utils.aoa_to_sheet(topSellers);
            XLSX.utils.book_append_sheet(wb, ws2, 'Top Người Bán');
        }

        // Sheet Top Khách Hàng
        if (reportData.systemReport?.topBuyers?.length > 0) {
            const topBuyers = [['Hạng', 'Khách hàng', 'Số lần mua', 'Tổng chi'], ...reportData.systemReport.topBuyers.map(b => [b.rank, b.buyerName || 'Ẩn danh', b.totalPurchases, b.totalSpent])];
            const ws3 = XLSX.utils.aoa_to_sheet(topBuyers);
            XLSX.utils.book_append_sheet(wb, ws3, 'Top Khách Hàng');
        }

        XLSX.writeFile(wb, `BaoCao_LandingHub_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handlePrint = () => window.print();
    if (loading) return (
        <div className="dashboard-container">
            <Header role={user?.role} />
            <div className="dashboard-main">
                <Sidebar role={user?.role} />
                <div className="dashboard-content">
                    <Container maxWidth="xl" sx={{ mt: 10, textAlign: 'center' }}>
                        <CircularProgress size={80} />
                        <Typography variant="h5" sx={{ mt: 3 }}>Đang tải báo cáo phân tích...</Typography>
                    </Container>
                </div>
            </div>
        </div>
    );
    if (loading) {
        return (
            <div className="dashboard-container">
                <Header role={user?.role} />
                <div className="dashboard-main">
                    <Sidebar role={user?.role} />
                    <div className="dashboard-content">
                        <Container maxWidth="xl" sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
                            <CircularProgress size={60} />
                            <Typography variant="h6" sx={{ mt: 2 }}>
                                Đang tải báo cáo phân tích...
                            </Typography>
                        </Container>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-container">
                <Header role={user?.role} />
                <div className="dashboard-main">
                    <Sidebar role={user?.role} />
                    <div className="dashboard-content">
                        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
                            <Alert severity="error">{error}</Alert>
                        </Container>
                    </div>
                </div>
            </div>
        );
    }

    const { systemReport, chatAnalytics, marketplaceTrends, summary, aiInsights } = reportData;

    const orderStatusData = systemReport?.transactions?.byStatus?.map(item => ({
        status: item.status === 'completed' ? 'Hoàn thành' : item.status === 'pending' ? 'Chờ xử lý' : item.status === 'cancelled' ? 'Đã hủy' : item.status,
        count: item.count,
        amount: item.totalAmountRaw
    })) || [];

    const paymentMethodData = systemReport?.transactions?.byPaymentMethod?.map(item => ({
        method: item.method === 'vnpay' ? 'VNPay' : item.method === 'momo' ? 'MoMo' : item.method === 'bank_transfer' ? 'Chuyển khoản' : item.method,
        count: item.count,
        amount: item.totalAmountRaw
    })) || [];

    const performanceData = [
        { metric: 'Doanh Thu', value: Math.min((systemReport?.overview?.totalRevenueRaw || 0) / 10000000 * 100, 100) },
        { metric: 'Bán Hàng', value: Math.min((systemReport?.marketplace?.totalPages || 0) / 100 * 100, 100) },
        { metric: 'Lead', value: Math.min((systemReport?.leads?.total || 0) / 500 * 100, 100) },
        { metric: 'Tin Nhắn', value: Math.min((summary?.totalChats || 0) / 1000 * 100, 100) },
        { metric: 'Người Dùng', value: Math.min((summary?.totalUsers || 0) / 500 * 100, 100) }
    ];

    const KPICard = ({ title, value, subtitle, icon: Icon, color, trend, trendValue, gradient }) => (
        <Card elevation={3} sx={{ background: gradient || `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`, borderLeft: `4px solid ${color}`, height: '100%', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 } }}>
            <CardContent>
                <Stack spacing={1}>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>{title}</Typography>
                        <Avatar sx={{ bgcolor: `${color}30`, width: 40, height: 40 }}><Icon sx={{ color, fontSize: 24 }} /></Avatar>
                    </Box>
                    <Typography variant="h4" fontWeight="bold">{value}</Typography>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
                        {trend && <Chip icon={trend === 'up' ? <TrendingUp /> : <TrendingDown />} label={trendValue || '0%'} size="small" color={trend === 'up' ? 'success' : 'error'} sx={{ height: 20 }} />}
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );

    return (
        <div className="dashboard-container">
            <Header role={user?.role} />
            <div className="dashboard-main">
                <Sidebar role={user?.role} />
                <div className="dashboard-content">
                    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
                        {/* Header */}
                        <Box className="no-print" sx={{ mb: 4 }}>
                            <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} md={6}>
                                    <Box display="flex" alignItems="center" gap={2}>
                                        <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                                            <AssessmentIcon fontSize="large" />
                                        </Avatar>
                                        <Box>
                                            <Typography variant="h4" fontWeight="bold">Báo Cáo & Phân Tích</Typography>
                                            <Typography variant="body2" color="text.secondary">Thông tin kinh doanh & trí tuệ nhân tạo toàn diện</Typography>
                                        </Box>
                                    </Box>
                                </Grid>
                                <Grid item xs={12} md={6} sx={{ textAlign: 'right' }}>
                                    <Stack direction="row" spacing={2} justifyContent="flex-end" flexWrap="wrap">
                                        <TextField select size="small" value={dateRange} onChange={(e) => setDateRange(e.target.value)} label="Khoảng Thời Gian" sx={{ minWidth: 160 }}>
                                            <MenuItem value="7">7 ngày qua</MenuItem>
                                            <MenuItem value="30">30 ngày qua</MenuItem>
                                            <MenuItem value="90">90 ngày qua</MenuItem>
                                        </TextField>
                                        <Button variant="outlined" startIcon={<Refresh />} onClick={fetchReports}>Làm mới</Button>
                                        <Button variant="contained" color="primary" startIcon={<DownloadIcon />} onClick={exportToPDF}>Xuất PDF</Button>
                                        <Button variant="contained" color="success" startIcon={<DownloadIcon />} onClick={exportToExcel}>Xuất Excel</Button>
                                        <Button variant="contained" color="info" startIcon={<PrintIcon />} onClick={handlePrint}>In báo cáo</Button>
                                    </Stack>
                                </Grid>
                            </Grid>
                        </Box>

                        {/* Tabs */}
                        <Paper sx={{ mb: 3 }} className="no-print">
                            <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} variant="fullWidth">
                                <Tab icon={<Timeline />} label="Tổng Quan" />
                                <Tab icon={<Psychology />} label="AI Gợi Ý" />
                                <Tab icon={<AttachMoney />} label="Doanh Thu" />
                                <Tab icon={<Store />} label="Marketplace" />
                                <Tab icon={<Chat />} label="Hỗ Trợ" />
                            </Tabs>
                        </Paper>

                        {/* Tab 0: Tổng Quan */}
                        {tabValue === 0 && (
                            <>
                                <Grid container spacing={3} mb={4}>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <KPICard title="TỔNG DOANH THU" value={systemReport?.overview?.totalRevenue || '0 ₫'} subtitle={`Phí nền tảng: ${systemReport?.overview?.platformFees || '0 ₫'}`} icon={LocalAtm} color="#10b981" trend="up" trendValue="+12.5%" />
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <KPICard title="TRANG MARKETPLACE" value={systemReport?.marketplace?.totalPages || 0} subtitle={`Giá TB: ${systemReport?.marketplace?.priceStats?.avg || '0 ₫'}`} icon={Store} color="#667eea" trend="up" trendValue="+8.3%" />
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <KPICard title="TỔNG TIN NHẮN" value={summary?.totalChats?.toLocaleString() || 0} subtitle={`${summary?.todayChats || 0} hôm nay`} icon={Chat} color="#06b6d4" trend="up" trendValue="+15.2%" />
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <KPICard title="TỔNG LEAD" value={systemReport?.leads?.total || 0} subtitle={`${systemReport?.leads?.today || 0} hôm nay`} icon={Description} color="#f59e0b" trend="down" trendValue="-2.1%" />
                                    </Grid>
                                </Grid>

                                <Grid container spacing={3} mb={4}>
                                    <Grid item xs={12} md={4}>
                                        <Card elevation={2}><CardContent>
                                            <Box display="flex" alignItems="center" gap={2} mb={1}><CheckCircle color="success" /><Typography variant="h3" fontWeight="bold">{systemReport?.transactions?.successRate || '0%'}</Typography></Box>
                                            <LinearProgress variant="determinate" value={parseFloat(systemReport?.transactions?.successRate) || 0} sx={{ height: 8, borderRadius: 4 }} color="success" />
                                        </CardContent></Card>
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <Card elevation={2}><CardContent>
                                            <Typography variant="h6" gutterBottom color="info.main">Giá Trị Đơn Hàng Trung Bình</Typography>
                                            <Box display="flex" alignItems="center" gap={2} mb={1}><ShoppingCart color="info" /><Typography variant="h3" fontWeight="bold">{systemReport?.marketplace?.priceStats?.avg || '0 ₫'}</Typography></Box>
                                            <Typography variant="caption" color="text.secondary">Khoảng: {systemReport?.marketplace?.priceStats?.min} - {systemReport?.marketplace?.priceStats?.max}</Typography>
                                        </CardContent></Card>
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <Card elevation={2}><CardContent>
                                            <Typography variant="h6" gutterBottom color="warning.main">Tương Tác Người Dùng</Typography>
                                            <Box display="flex" alignItems="center" gap={2} mb={1}><People color="warning" /><Typography variant="h3" fontWeight="bold">{summary?.totalUsers || 0}</Typography></Box>
                                            <Typography variant="caption" color="text.secondary">Người dùng có lịch sử chat</Typography>
                                        </CardContent></Card>
                                    </Grid>
                                </Grid>

                            </>
                        )}

                        {/* Tab 1: AI Gợi Ý */}
                        {tabValue === 1 && (
                            <>
                                {summary?.aiRecommendations && (
                                    <Paper sx={{ p: 3, mb: 4, background: 'linear-gradient(135deg, #667eea20 0%, #764ba220 100%)', border: '1px solid #667eea40' }}>
                                        <Box display="flex" alignItems="center" gap={1} mb={3}><Psychology sx={{ color: '#667eea', fontSize: 32 }} /><Typography variant="h5" fontWeight="bold">Gợi Ý Thông Minh Từ AI</Typography></Box>
                                        <Box>
                                            {parseRecommendations(summary.aiRecommendations).map((rec, i) => (
                                                <Box key={i} mb={2}>
                                                    <Box display="flex" alignItems="flex-start" gap={1}>
                                                        <Lightbulb sx={{ color: '#f59e0b', fontSize: 24, mt: 0.3 }} />
                                                        <Box>
                                                            <Typography variant="h6" fontWeight="600" gutterBottom>{rec.title}</Typography>
                                                            {rec.details.length > 0 && rec.details.map((d, j) => <Typography key={j} variant="body2" color="text.secondary" paragraph>{d}</Typography>)}
                                                        </Box>
                                                    </Box>
                                                    {i < parseRecommendations(summary.aiRecommendations).length - 1 && <Divider sx={{ my: 2 }} />}
                                                </Box>
                                            ))}
                                        </Box>
                                    </Paper>
                                )}

                                {aiInsights && (
                                    <Grid container spacing={3} mb={4}>
                                        <Grid item xs={12} md={6}>
                                            <Paper sx={{ p: 3, height: '100%', border: '1px solid #f093fb40' }}>
                                                <Box display="flex" alignItems="center" gap={1} mb={3}><ChatBubble sx={{ color: '#f093fb', fontSize: 28 }} /><Typography variant="h6" fontWeight="bold">Phân Tích Xu Hướng Chat</Typography></Box>
                                                {cleanAIText(aiInsights.chatInsights).map((line, i) => <Typography key={i} variant="body2" paragraph color="text.secondary">{line}</Typography>)}
                                            </Paper>
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <Paper sx={{ p: 3, height: '100%', border: '1px solid #43e97b40' }}>
                                                <Box display="flex" alignItems="center" gap={1} mb={3}><ShoppingCart sx={{ color: '#43e97b', fontSize: 28 }} /><Typography variant="h6" fontWeight="bold">Phân Tích Marketplace</Typography></Box>
                                                {aiInsights.marketplaceInsights ? cleanAIText(aiInsights.marketplaceInsights).map((line, i) => <Typography key={i} variant="body2" paragraph color="text.secondary">{line}</Typography>) : <Typography variant="body2" color="text.secondary">Chưa có dữ liệu phân tích AI.</Typography>}
                                            </Paper>
                                        </Grid>
                                    </Grid>
                                )}
                            </>
                        )}

                        {/* Tab 2: Doanh Thu */}
                        {tabValue === 2 && (
                            <>
                                {systemReport?.dailyRevenue && systemReport.dailyRevenue.length > 0 && (
                                    <Paper sx={{ p: 3, mb: 4 }}>
                                        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Timeline color="success" />Xu Hướng Doanh Thu (30 ngày gần nhất)</Typography>
                                        <ResponsiveContainer width="100%" height={400}>
                                            <ComposedChart data={systemReport.dailyRevenue}>
                                                <defs>
                                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/><stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/></linearGradient>
                                                    <linearGradient id="colorFees" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/><stop offset="95%" stopColor="#667eea" stopOpacity={0.1}/></linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                                <XAxis dataKey="date" />
                                                <YAxis />
                                                <Tooltip />
                                                <Legend />
                                                <Area type="monotone" dataKey="revenueRaw" stroke="#10b981" fill="url(#colorRevenue)" name="Tổng Doanh Thu" />
                                                <Area type="monotone" dataKey="platformFeesRaw" stroke="#667eea" fill="url(#colorFees)" name="Phí Nền Tảng" />
                                                <Line type="monotone" dataKey="transactionCount" stroke="#f59e0b" strokeWidth={2} name="Số Giao Dịch" />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </Paper>
                                )}

                                <Grid container spacing={3} mb={4}>
                                    <Grid item xs={12} md={6}>
                                        <Paper sx={{ p: 3 }}>
                                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Insights color="primary" />Trạng Thái Giao Dịch</Typography>
                                            <ResponsiveContainer width="100%" height={300}>
                                                <PieChart>
                                                    <Pie data={orderStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} labelLine={false} label={(e) => `${e.status}: ${e.count}`} fill="#8884d8" dataKey="count">
                                                        {orderStatusData.map((e, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                                                    </Pie>
                                                    <Tooltip /><Legend />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </Paper>
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <Paper sx={{ p: 3 }}>
                                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><PaymentIcon color="success" />Phương Thức Thanh Toán</Typography>
                                            <ResponsiveContainer width="100%" height={300}>
                                                <BarChart data={paymentMethodData}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="method" />
                                                    <YAxis />
                                                    <Tooltip />
                                                    <Legend />
                                                    <Bar dataKey="count" fill="#10b981" name="Số lần" radius={[8, 8, 0, 0]} />
                                                    <Bar dataKey="amount" fill="#667eea" name="Doanh thu" radius={[8, 8, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </Paper>
                                    </Grid>
                                </Grid>

                                <Grid container spacing={3} mb={4}>
                                    {systemReport?.topSellers && systemReport.topSellers.length > 0 && (
                                        <Grid item xs={12} md={6}>
                                            <Paper sx={{ p: 3 }}>
                                                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><StarRate color="primary" />Top Người Bán Xuất Sắc</Typography>
                                                <TableContainer><Table size="small">
                                                    <TableHead><TableRow><TableCell><strong>Xếp hạng</strong></TableCell><TableCell><strong>Người bán</strong></TableCell><TableCell align="right"><strong>Số đơn</strong></TableCell><TableCell align="right"><strong>Doanh thu</strong></TableCell></TableRow></TableHead>
                                                    <TableBody>
                                                        {systemReport.topSellers.slice(0, 5).map(s => (
                                                            <TableRow key={s.sellerId}>
                                                                <TableCell><Chip label={`#${s.rank}`} size="small" color={s.rank <= 3 ? 'warning' : 'default'} /></TableCell>
                                                                <TableCell sx={{ fontWeight: 600 }}>{s.sellerName || s.sellerId.substring(0, 12) + '...'}</TableCell>
                                                                <TableCell align="right"><Chip label={s.totalSales} color="primary" /></TableCell>
                                                                <TableCell align="right" sx={{ color: 'success.main', fontWeight: 'bold' }}>{s.totalRevenue}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table></TableContainer>
                                            </Paper>
                                        </Grid>
                                    )}

                                    {systemReport?.topBuyers && systemReport.topBuyers.length > 0 && (
                                        <Grid item xs={12} md={6}>
                                            <Paper sx={{ p: 3 }}>
                                                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><People color="success" />Top Khách Hàng Thân Thiết</Typography>
                                                <TableContainer><Table size="small">
                                                    <TableHead><TableRow><TableCell><strong>Xếp hạng</strong></TableCell><TableCell><strong>Khách hàng</strong></TableCell><TableCell align="right"><strong>Số lần mua</strong></TableCell><TableCell align="right"><strong>Tổng chi</strong></TableCell></TableRow></TableHead>
                                                    <TableBody>
                                                        {systemReport.topBuyers.slice(0, 5).map(b => (
                                                            <TableRow key={b.buyerId}>
                                                                <TableCell><Chip label={`#${b.rank}`} size="small" color={b.rank <= 3 ? 'success' : 'default'} /></TableCell>
                                                                <TableCell sx={{ fontWeight: 600 }}>{b.buyerName || b.buyerId.substring(0, 12) + '...'}</TableCell>
                                                                <TableCell align="right"><Chip label={b.totalPurchases} color="info" /></TableCell>
                                                                <TableCell align="right" sx={{ color: 'warning.main', fontWeight: 'bold' }}>{b.totalSpent}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table></TableContainer>
                                            </Paper>
                                        </Grid>
                                    )}
                                </Grid>
                            </>
                        )}

                        {/* Tab 3: Marketplace */}
                        {tabValue === 3 && (
                            <>
                                {marketplaceTrends?.categoryStats && (
                                    <Paper sx={{ p: 3, mb: 4 }}>
                                        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Store color="primary" />Hiệu Suất Marketplace Theo Danh Mục</Typography>
                                        <Grid container spacing={3}>
                                            <Grid item xs={12} md={7}>
                                                <ResponsiveContainer width="100%" height={350}>
                                                    <BarChart data={marketplaceTrends.categoryStats}>
                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis dataKey="_id" />
                                                        <YAxis />
                                                        <Tooltip />
                                                        <Legend />
                                                        <Bar dataKey="totalSales" fill="#667eea" name="Tổng bán" radius={[8, 8, 0, 0]} />
                                                        <Bar dataKey="totalViews" fill="#34d399" name="Lượt xem" radius={[8, 8, 0, 0]} />
                                                        <Bar dataKey="pageCount" fill="#f59e0b" name="Số trang" radius={[8, 8, 0, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </Grid>
                                            <Grid item xs={12} md={5}>
                                                <ResponsiveContainer width="100%" height={350}>
                                                    <PieChart>
                                                        <Pie data={marketplaceTrends.categoryStats} dataKey="pageCount" nameKey="_id" cx="50%" cy="50%" innerRadius={60} outerRadius={100} label={(e) => `${e._id}: ${e.pageCount}`}>
                                                            {marketplaceTrends.categoryStats.map((e, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                                                        </Pie>
                                                        <Tooltip /><Legend />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </Grid>
                                        </Grid>
                                    </Paper>
                                )}

                                {marketplaceTrends?.topTemplates && marketplaceTrends.topTemplates.length > 0 && (
                                    <Paper sx={{ p: 3, mb: 4 }}>
                                        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><StarRate color="warning" />Top Template Bán Chạy Nhất</Typography>
                                        <TableContainer>
                                            <Table>
                                                <TableHead><TableRow sx={{ bgcolor: 'action.hover' }}>
                                                    <TableCell><strong>Hạng</strong></TableCell>
                                                    <TableCell><strong>Tên Template</strong></TableCell>
                                                    <TableCell><strong>Danh mục</strong></TableCell>
                                                    <TableCell align="right"><strong>Giá</strong></TableCell>
                                                    <TableCell align="right"><strong>Đã bán</strong></TableCell>
                                                    <TableCell align="right"><strong>Lượt xem</strong></TableCell>
                                                    <TableCell align="center"><strong>Đánh giá</strong></TableCell>
                                                    <TableCell align="right"><strong>Tỷ lệ chuyển đổi</strong></TableCell>
                                                </TableRow></TableHead>
                                                <TableBody>
                                                    {marketplaceTrends.topTemplates.slice(0, 10).map((t, i) => {
                                                        const rate = t.views > 0 ? ((t.sold_count / t.views) * 100).toFixed(1) : '0';
                                                        return (
                                                            <TableRow key={i} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                                                                <TableCell><Chip label={`#${i + 1}`} size="small" color={i < 3 ? 'warning' : 'default'} /></TableCell>
                                                                <TableCell sx={{ fontWeight: 500 }}>{t.title}</TableCell>
                                                                <TableCell><Chip label={t.category} size="small" color="primary" variant="outlined" /></TableCell>
                                                                <TableCell align="right" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                                                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(t.price)}
                                                                </TableCell>
                                                                <TableCell align="right"><Chip label={t.sold_count} size="small" color="info" /></TableCell>
                                                                <TableCell align="right">{t.views.toLocaleString()}</TableCell>
                                                                <TableCell align="center"><Chip label={t.rating ? t.rating.toFixed(1) : 'N/A'} size="small" color={t.rating >= 4.5 ? 'success' : t.rating >= 4 ? 'info' : 'default'} /></TableCell>
                                                                <TableCell align="right"><Chip label={`${rate}%`} size="small" color={rate > 5 ? 'success' : rate > 2 ? 'warning' : 'default'} /></TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Paper>
                                )}
                            </>
                        )}

                        {/* Tab 4: Hỗ Trợ */}
                        {tabValue === 4 && (
                            <>
                                {chatAnalytics && chatAnalytics.length > 0 && (
                                    <Paper sx={{ p: 3, mb: 4 }}>
                                        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Chat color="primary" />Xu Hướng Tin Nhắn Hỗ Trợ</Typography>
                                        <ResponsiveContainer width="100%" height={400}>
                                            <AreaChart data={chatAnalytics}>
                                                <defs>
                                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/><stop offset="95%" stopColor="#667eea" stopOpacity={0.1}/></linearGradient>
                                                    <linearGradient id="colorOpen" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/><stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/></linearGradient>
                                                    <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#34d399" stopOpacity={0.8}/><stop offset="95%" stopColor="#34d399" stopOpacity={0.1}/></linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="_id" />
                                                <YAxis />
                                                <Tooltip />
                                                <Legend />
                                                <Area type="monotone" dataKey="totalChats" stroke="#667eea" fill="url(#colorTotal)" name="Tổng tin nhắn" />
                                                <Area type="monotone" dataKey="openChats" stroke="#f59e0b" fill="url(#colorOpen)" name="Tin nhắn đang mở" />
                                                <Area type="monotone" dataKey="resolvedChats" stroke="#34d399" fill="url(#colorResolved)" name="Đã giải quyết" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </Paper>
                                )}

                                <Grid container spacing={3} mb={4}>
                                    <Grid item xs={12} md={4}>
                                        <Card sx={{ background: 'linear-gradient(135deg, #667eea20 0%, #764ba210 100%)' }}>
                                            <CardContent>
                                                <Stack spacing={2}>
                                                    <Box display="flex" alignItems="center" gap={2}><Avatar sx={{ bgcolor: 'primary.main' }}><Chat /></Avatar><Typography variant="h6">Tổng Tin Nhắn</Typography></Box>
                                                    <Typography variant="h3" fontWeight="bold">{summary?.totalChats?.toLocaleString() || 0}</Typography>
                                                    <Typography variant="body2" color="text.secondary">Tất cả cuộc hội thoại</Typography>
                                                </Stack>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <Card sx={{ background: 'linear-gradient(135deg, #f59e0b20 0%, #f59e0b10 100%)' }}>
                                            <CardContent>
                                                <Stack spacing={2}>
                                                    <Box display="flex" alignItems="center" gap={2}><Avatar sx={{ bgcolor: 'warning.main' }}><HourglassEmpty /></Avatar><Typography variant="h6">Tin Nhắn Đang Mở</Typography></Box>
                                                    <Typography variant="h3" fontWeight="bold">{summary?.openChats || 0}</Typography>
                                                    <Typography variant="body2" color="text.secondary">Đang chờ phản hồi</Typography>
                                                </Stack>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <Card sx={{ background: 'linear-gradient(135deg, #34d39920 0%, #34d39910 100%)' }}>
                                            <CardContent>
                                                <Stack spacing={2}>
                                                    <Box display="flex" alignItems="center" gap={2}><Avatar sx={{ bgcolor: 'success.main' }}><CheckCircle /></Avatar><Typography variant="h6">Đã Giải Quyết Hôm Nay</Typography></Box>
                                                    <Typography variant="h3" fontWeight="bold">{summary?.resolvedToday || 0}</Typography>
                                                    <Typography variant="body2" color="text.secondary">Xử lý thành công</Typography>
                                                </Stack>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                </Grid>
                            </>
                        )}

                        {/* Tab 5: Hiệu Suất */}
                        {tabValue === 5 && (
                            <>
                                {systemReport?.leads?.topPages && systemReport.leads.topPages.length > 0 && (
                                    <Paper sx={{ p: 3, mb: 4 }}>
                                        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Description color="warning" />Top Trang Tạo Lead Nhiều Nhất</Typography>
                                        <TableContainer>
                                            <Table>
                                                <TableHead><TableRow sx={{ bgcolor: 'action.hover' }}>
                                                    <TableCell><strong>Hạng</strong></TableCell>
                                                    <TableCell><strong>Tên Trang</strong></TableCell>
                                                    <TableCell align="right"><strong>Số Lead</strong></TableCell>
                                                    <TableCell align="right"><strong>Lần gửi gần nhất</strong></TableCell>
                                                    <TableCell align="center"><strong>Trạng thái</strong></TableCell>
                                                </TableRow></TableHead>
                                                <TableBody>
                                                    {systemReport.leads.topPages.map(p => (
                                                        <TableRow key={p.pageId} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                                                            <TableCell><Chip label={`#${p.rank}`} size="small" color={p.rank <= 3 ? 'warning' : 'default'} /></TableCell>
                                                            <TableCell sx={{ fontWeight: 500 }}>{p.pageTitle || p.pageId.substring(0, 20) + '...'}</TableCell>
                                                            <TableCell align="right"><Chip label={p.leadsCount} color="success" sx={{ fontWeight: 'bold' }} /></TableCell>
                                                            <TableCell align="right">{new Date(p.latestSubmission).toLocaleDateString('vi-VN')}</TableCell>
                                                            <TableCell align="center"><Chip label="Hoạt động" size="small" color="success" icon={<CheckCircle />} /></TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Paper>
                                )}
                            </>
                        )}

                        {/* Footer */}
                        <Box sx={{ mt: 6, textAlign: 'center', color: 'text.secondary' }}>
                            <Divider sx={{ mb: 3 }} />
                            <Typography variant="body2" gutterBottom>
                                Báo cáo được tạo lúc {new Date().toLocaleString('vi-VN')} • LandingHub Analytics
                            </Typography>
                            <Typography variant="caption">© {new Date().getFullYear()} LandingHub. Bảo lưu mọi quyền.</Typography>
                        </Box>

                        <style>{`
                            @media print {
                                .no-print { display: none !important; }
                                body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                            }
                        `}</style>
                    </Container>
                </div>
            </div>
        </div>
    );
};

export default React.memo(Reports);