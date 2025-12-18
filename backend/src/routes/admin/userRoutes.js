const express = require('express');
const router = express.Router();
const userController = require('../../controllers/userController'); // điều chỉnh path nếu cần
const authMiddleware = require('../../middleware/authMiddleware');
const { isAdmin } = require('../../middleware/authMiddleware');

// 🔒 Các route chỉ admin mới dùng
router.patch('/users/:id/toggle-disable', authMiddleware, isAdmin, userController.toggleUserDisable);

// Có thể thêm các route admin khác ở đây sau này:
// router.get('/users', authMiddleware, isAdmin, userController.getAllUsers);
// router.post('/users', authMiddleware, isAdmin, userController.createUser);
// router.delete('/users/:id', authMiddleware, isAdmin, userController.deleteUser);

module.exports = router;