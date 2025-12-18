const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5000',
    'https://api.landinghub.shop',
    'https://landinghub.shop',
    'https://www.landinghub.shop',
    'https://app.landinghub.shop',
    'https://d197hx8bwkos4.cloudfront.net',
];

// CORS Configuration - giữ nguyên, rất tốt
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        console.log('🔍 CORS Request from origin:', origin);
        if (
            allowedOrigins.includes(origin) ||
            origin.endsWith('.landinghub.shop') ||
            origin.endsWith('.cloudfront.net')
        ) {
            console.log('✅ CORS ALLOWED:', origin);
            callback(null, true);
        } else {
            console.warn('❌ CORS BLOCKED:', origin);
            callback(null, false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    preflightContinue: false,
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ================== ROUTES - SẠCH SẼ, KHÔNG DUPLICATE ==================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/pages', require('./routes/pages'));
app.use('/api/images', require('./routes/imageRoutes')); // ← ĐÃ THÊM DẤU ;
app.use('/api/templates', require('./routes/templateRoutes'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/marketplace', require('./routes/marketplace'));
app.use('/api/payment', require('./routes/payment')); // Chỉ mount 1 lần
app.use('/api/payout', require('./routes/payout'));
app.use('/api/forms', require('./routes/formSubmissions'));
app.use('/api/deployment', require('./routes/deployment'));
app.use('/api/chat', require('./routes/chat')); // Chỉ 1 lần
app.use('/api/research', require('./routes/llmResearch'));
app.use('/api/chat-analytics', require('./routes/chatAnalytics'));
app.use('/api/chat-feedback', require('./routes/chatFeedback'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/orders', require('./routes/orderRoutes'));

// Notification - chọn 1 trong 2 (khuyến nghị dùng /api/notifications)
app.use('/api/notifications', require('./routes/notification')); // Dễ quản lý hơn

// Admin routes - riêng biệt, rõ ràng
app.use('/api/admin/users', require('./routes/adminUserRoutes')); // ← Đây là route cho toggle-disable
app.use('/api/admin/marketplace', require('./routes/adminMarketplace')); // Chỉ mount 1 lần

// Health check
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

module.exports = app;