const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/authMiddleware');

// Lấy thông tin user
router.get('/info', authMiddleware, userController.getUserInfo);

// Cập nhật thông tin user
router.put('/update', authMiddleware, userController.updateUserInfo); // Sửa lại callback
router.patch('/:id/toggle-disable', authMiddleware, isAdmin, userController.toggleUserDisable);
module.exports = router;