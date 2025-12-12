const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
const authMiddleware = require('./middleware/authMiddleware');
require('dotenv').config();
const templateRoutes = require('./routes/templateRoutes');


mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5000',

    // Frontend CloudFront + domain
    'https://landinghub.shop',
    'https://www.landinghub.shop',
    'https://app.landinghub.shop',
    'https://d197hx8bwkos4.cloudfront.net',
];
// CORS Configuration
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);

        if (
            allowedOrigins.includes(origin) ||
            origin.endsWith('.landinghub.shop') ||
            origin.endsWith('.cloudfront.net')
        ) {
            callback(null, true);
        } else {
            console.warn('❌ CORS BLOCKED:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/pages', require('./routes/pages'));
app.use('/api/images',  require('./routes/imageRoutes'))
app.use('/api/templates', require('./routes/templateRoutes'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/marketplace', require('./routes/marketplace'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/payout', require('./routes/payout'));
app.use('/api/admin/marketplace', require('./routes/adminMarketplace'));
app.use('/api/forms', require('./routes/formSubmissions'));
app.use('/api/deployment', require('./routes/deployment'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api', require('./routes/notification'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/admin/users', require('./routes/adminUserRoutes'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/research', require('./routes/llmResearch'));
app.use('/api/chat-analytics', require('./routes/chatAnalytics'));
app.use('/api/chat-feedback', require('./routes/chatFeedback'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/notifications', require('./routes/notification'));
app.use('/api/orders', require('./routes/orderRoutes'));
// app.use('/api/admin/marketplace',require('./routes/templateRoutes'));
app.use('/api/admin', require('./routes/payment'));
app.use('/api/admin/marketplace', require('./routes/adminMarketplace'));
const adminMarketplaceRouter = require('./routes/adminMarketplace');
app.use('/api/admin/marketplace', adminMarketplaceRouter);

// Health-check route
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

module.exports = app;