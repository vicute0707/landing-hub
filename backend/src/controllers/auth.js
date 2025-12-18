const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

exports.register = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ msg: errors.array()[0].msg });

    const { email, password, name } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ msg: 'User already exists' });

        user = new User({ email, password, name });
        await user.save();

        const token = jwt.sign(
            { userId: user._id, role: user.role, subscription: user.subscription },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        res.json({ token });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.login = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ msg: errors.array()[0].msg });
    }

    const { email, password } = req.body;

    try {
        // 1. Tìm user theo email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // 2. 🔒 KIỂM TRA TÀI KHOẢN BỊ KHÓA - PHẢI ĐẶT SAU KHI CÓ USER
        if (user.isDisabled) {
            return res.status(403).json({
                msg: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ hỗ trợ.'
            });
        }

        // 3. Kiểm tra mật khẩu
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // 4. Track login (IP, time, count)
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        await user.trackLogin(ipAddress);

        // 5. Tạo token mới
        const token = jwt.sign(
            {
                userId: user._id,
                role: user.role,
                subscription: user.subscription
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' } // Anh khuyên tăng lên 7 ngày để tránh expire nhanh
        );

        res.json({ token });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.googleCallback = async (req, res) => {
    const { email, name } = req.body;
    try {
        if (!email || !name) return res.status(400).json({ msg: 'Missing user info' });

        let user = await User.findOne({ email });
        if (!user) {
            user = new User({
                email,
                name,
                password: null, // Không hash password cho Google login
                role: 'user',
                subscription: 'free',
            });
            await user.save();
        } else if (!user.name && name) {
            user.name = name;
            await user.save();
        }

        // 🔐 Track login for Google authentication
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        await user.trackLogin(ipAddress);

        const jwtToken = jwt.sign(
            { userId: user._id, role: user.role, subscription: user.subscription },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        res.json({ token: jwtToken });
    } catch (err) {
        console.error('Google callback error details:', err);
        res.status(500).json({ msg: 'Google authentication failed' });
    }
};