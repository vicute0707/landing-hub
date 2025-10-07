const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/auth');

// Register
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Email không hợp lệ'),
    body('password').isLength({ min: 6 }).withMessage('Mật khẩu ít nhất 6 ký tự'),
    body('name').notEmpty().withMessage('Tên không được bỏ trống'),
  ],
  authController.register
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Email không hợp lệ'),
    body('password').notEmpty().withMessage('Mật khẩu không được bỏ trống'),
  ],
  authController.login
);

// Google callback
router.post('/google-callback', authController.googleCallback);

module.exports = router;
