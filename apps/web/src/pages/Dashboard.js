import React, { useEffect, useState } from 'react';
import '../styles/Dashboard.css';
import { fetchDashboardData } from '../services/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { FaRocket, FaUserPlus, FaFileAlt, FaMoon, FaSun } from 'react-icons/fa';

const COLORS = ['#4ade80', '#facc15', '#60a5fa'];

const StatCard = ({ title, value, icon }) => (
  <div className="stat-card">
    <div className="stat-icon">{icon}</div>
    <p className="stat-title">{title}</p>
    <p className="stat-value">{value}</p>
  </div>
);

const QuickActions = ({ darkMode, toggleDarkMode }) => (
  <div className="quick-actions">
    <button className="action-btn bg-gradient-blue"><FaRocket /> Tạo Landing Page</button>
    <button className="action-btn bg-gradient-green"><FaUserPlus /> Tìm kiếm Lead</button>
    <button className="action-btn bg-gradient-purple"><FaFileAlt /> Xuất báo cáo</button>
    <button onClick={toggleDarkMode} className="action-btn bg-gray-600">
      {darkMode ? <FaSun /> : <FaMoon />} {darkMode ? 'Light Mode' : 'Dark Mode'}
    </button>
  </div>
);

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [darkMode, setDarkMode] = useState(false);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  useEffect(() => {
    fetchDashboardData().then(setData);
  }, []);

  if (!data) return <p className="loading">Loading...</p>;

  return (
    <div className={`dashboard-container ${darkMode ? 'dark' : ''}`}>
      <QuickActions darkMode={darkMode} toggleDarkMode={toggleDarkMode} />

      <div className="stat-grid">
        <StatCard title="Tổng Leads" value={data.totalLeads} icon={<FaUserPlus />} />
        <StatCard title="Tổng Landing Page" value={data.totalLandingPages} icon={<FaRocket />} />
        <StatCard title="Tỷ lệ chuyển đổi" value={`${(data.conversionRate*100).toFixed(1)}%`} icon={<FaFileAlt />} />
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>Leads theo thời gian</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.leadsStats}>
              <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke={darkMode ? '#e5e7eb' : '#1f2937'} />
              <YAxis stroke={darkMode ? '#e5e7eb' : '#1f2937'} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#4ade80" strokeWidth={3} animationDuration={1500} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Tình trạng Leads</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={data.leadsStatus} dataKey="count" nameKey="status" outerRadius={80} label animationDuration={1500}>
                {data.leadsStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card">
        <h3>Tăng trưởng Landing Page</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data.landingPageStats}>
            <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" />
            <XAxis dataKey="week" stroke={darkMode ? '#e5e7eb' : '#1f2937'} />
            <YAxis stroke={darkMode ? '#e5e7eb' : '#1f2937'} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#60a5fa" strokeWidth={3} animationDuration={1500} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="recent-activity-grid">
        <div className="recent-card">
          <h3>Recent Leads</h3>
          <ul>
            {data.recentLeads.map(lead => (
              <li key={lead.id}>
                <span className="lead-name">{lead.name}</span>
                <span className="lead-email">{lead.email}</span>
                <span className="lead-time">{new Date(lead.created_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="recent-card">
          <h3>Recent Landing Pages</h3>
          <ul>
            {data.recentLandingPages.map(lp => (
              <li key={lp.id}>
                <span className="lp-title">{lp.title}</span>
                <span className="lp-time">{new Date(lp.created_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
