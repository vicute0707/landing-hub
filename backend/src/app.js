const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ===== Middleware =====
app.use(cors({ origin: process.env.REACT_APP_API_URL || 'http://localhost:3000' }));
app.use(express.json());

// ===== MongoDB =====
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// ===== Routes =====
app.use('/api/auth', require('./routes/auth')); // nếu chưa có file auth.js, tạo router trống
app.use('/api/user', require('./routes/user')); // nếu chưa có file user.js, tạo router trống
app.use('/api/payment', require('./routes/payment')); // payment route

module.exports = app;
