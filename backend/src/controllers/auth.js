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
        res.json({ token, user: { _id: user._id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
};

exports.login = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ msg: errors.array()[0].msg });

    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

        const token = jwt.sign(
            { userId: user._id, role: user.role, subscription: user.subscription },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        res.json({ token, user: { _id: user._id, name: user.name, email: user.email, role: user.role } });
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
                password: null,
                role: 'user',
                subscription: 'free',
            });
            await user.save();
        } else if (!user.name && name) {
            user.name = name;
            await user.save();
        }

        const jwtToken = jwt.sign(
            { userId: user._id, role: user.role, subscription: user.subscription },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        res.json({ token: jwtToken, user: { _id: user._id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
        console.error('Google callback error:', err);
        res.status(500).json({ msg: 'Google authentication failed' });
    }
};
