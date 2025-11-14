import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../context/UserContext';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import '../styles/Dashboard.css';
import {
  Container, Grid, Paper, Typography, Box, Card, CardContent,
  Select, MenuItem, FormControl, InputLabel, CircularProgress
} from '@mui/material';
import {
  TrendingUp, ChatBubble, Message, Group
} from '@mui/icons-material';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import axios from 'axios';

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b'];

const AdminAnalytics = () => {
  const { user } = useContext(UserContext);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30);
  const [chatTrends, setChatTrends] = useState([]);
  const [marketplaceTrends, setMarketplaceTrends] = useState(null);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      const [trendsRes, marketplaceRes, summaryRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_URL}/api/chat-analytics/trends?days=${timeRange}`, config),
        axios.get(`${process.env.REACT_APP_API_URL}/api/chat-analytics/marketplace-trends?days=${timeRange}`, config),
        axios.get(`${process.env.REACT_APP_API_URL}/api/chat-analytics/summary`, config)
      ]);

      setChatTrends(trendsRes.data.data);
      setMarketplaceTrends(marketplaceRes.data.data);
      setSummary(summaryRes.data.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color }) => (
    <Card sx={{ 
      background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`,
      borderLeft: `4px solid ${color}`
    }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              {value}
            </Typography>
          </Box>
          <Box sx={{ 
            backgroundColor: `${color}20`, 
            borderRadius: 2, 
            p: 1.5,
            display: 'flex',
            alignItems: 'center'
          }}>
            {icon}
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

  return (
    <div className="dashboard-container">
      <Header role={user?.role} />
      <div className="dashboard-main">
        <Sidebar role={user?.role} />
        <div className="dashboard-content">
          <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" fontWeight="bold">
          📊 Admin Analytics Dashboard
        </Typography>
        <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Time Range</InputLabel>
          <Select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            label="Time Range"
          >
            <MenuItem value={7}>Last 7 days</MenuItem>
            <MenuItem value={30}>Last 30 days</MenuItem>
            <MenuItem value={90}>Last 90 days</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Today's Chats"
            value={summary?.todayChats || 0}
            icon={<ChatBubble sx={{ color: '#667eea', fontSize: 40 }} />}
            color="#667eea"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Open Chats"
            value={summary?.openChats || 0}
            icon={<Message sx={{ color: '#f093fb', fontSize: 40 }} />}
            color="#f093fb"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Messages Today"
            value={summary?.todayMessages || 0}
            icon={<TrendingUp sx={{ color: '#43e97b', fontSize: 40 }} />}
            color="#43e97b"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Users"
            value={summary?.totalUsers || 0}
            icon={<Group sx={{ color: '#4facfe', fontSize: 40 }} />}
            color="#4facfe"
          />
        </Grid>
      </Grid>

      {/* Chat Volume Trend */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" fontWeight="bold" mb={3}>
          💬 Chat Volume Trend
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chatTrends}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="_id" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="totalChats" 
              stroke="#667eea" 
              strokeWidth={2}
              name="Total Chats"
            />
            <Line 
              type="monotone" 
              dataKey="openChats" 
              stroke="#f093fb" 
              strokeWidth={2}
              name="Open Chats"
            />
            <Line 
              type="monotone" 
              dataKey="resolvedChats" 
              stroke="#43e97b" 
              strokeWidth={2}
              name="Resolved Chats"
            />
          </LineChart>
        </ResponsiveContainer>
      </Paper>

      {/* Marketplace Trends */}
      <Grid container spacing={3}>
        {/* Category Performance */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" mb={3}>
              🏆 Top Categories by Sales
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={marketplaceTrends?.categoryStats || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="totalSales" fill="#667eea" name="Sales" />
                <Bar dataKey="totalViews" fill="#4facfe" name="Views" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Category Distribution Pie */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" mb={3}>
              📈 Category Distribution
            </Typography>
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

        {/* Top Templates */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" mb={3}>
              ⭐ Top Performing Templates
            </Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5' }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Template</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Category</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Price</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Sales</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Views</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {(marketplaceTrends?.topTemplates || []).map((template, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px' }}>{template.title}</td>
                      <td style={{ padding: '12px' }}>{template.category}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        {template.price?.toLocaleString()} VNĐ
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>{template.sold_count}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>{template.views}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        ⭐ {template.rating?.toFixed(1) || 'N/A'}
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
