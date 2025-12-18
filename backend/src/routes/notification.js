const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const notificationController = require('../controllers/notificationController');

/* ====== USER / SELLER / ADMIN ====== */
// BỎ /notifications Ở ĐẦU MỖI ROUTE
router.get('/', authMiddleware, notificationController.getMyNotifications);
router.get('/unread/count', authMiddleware, notificationController.getUnreadCount);
router.patch('/:id/read', authMiddleware, notificationController.markAsRead);
router.patch('/read-all', authMiddleware, notificationController.markAllAsRead);

module.exports = router;