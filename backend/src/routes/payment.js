const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/authMiddleware');
const paymentController = require('../controllers/paymentController');
/**
 * Admin routes - đặt trước
 */

// Admin: Lấy tất cả transactions
router.get('/admin/transactions', authMiddleware, isAdmin, paymentController.getAllTransactionsAdmin);

// Admin: Lấy thống kê
router.get('/admin/stats', authMiddleware, isAdmin, paymentController.getPaymentStatsAdmin);

// Admin: Export transactions
router.get('/admin/export', authMiddleware, isAdmin, paymentController.exportTransactionsAdmin);

// Admin: Advanced reports
router.get('/admin/revenue-by-period', authMiddleware, isAdmin, paymentController.getRevenueByPeriod);
router.get('/admin/top-sellers', authMiddleware, isAdmin, paymentController.getTopSellers);
router.get('/admin/top-buyers', authMiddleware, isAdmin, paymentController.getTopBuyers);
router.get('/admin/payment-method-stats', authMiddleware, isAdmin, paymentController.getPaymentMethodStats);
router.get('/admin/performance-metrics', authMiddleware, isAdmin, paymentController.getPerformanceMetrics);

router.get('/admin/marketplace/refunds', authMiddleware, isAdmin, paymentController.getRefundRequestsAdmin);
router.get('/orders', authMiddleware, isAdmin, paymentController.getAllOrdersAdmin);
/**
 * Protected routes - yêu cầu authentication
 */
router.post('/orders/:orderId/deliver', authMiddleware, paymentController.deliverOrder);
// User: Lấy lịch sử giao dịch của mình
router.get('/transactions', authMiddleware, paymentController.getUserTransactions);

// User: Lấy thống kê cá nhân
router.get('/stats', authMiddleware, paymentController.getUserStats);

// User: Export transactions của mình
router.get('/export', authMiddleware, paymentController.exportUserTransactions);

// Tạo transaction và payment URL
router.post('/create-transaction', authMiddleware, paymentController.createTransaction);

// Lấy trạng thái transaction
router.get('/transaction/:id', authMiddleware, paymentController.getTransactionStatus);

// Lấy lịch sử mua hàng
router.get('/purchases', authMiddleware, paymentController.getPurchaseHistory);

// Lấy lịch sử bán hàng
router.get('/sales', authMiddleware, paymentController.getSalesHistory);

// Check if user has purchased a page
router.get('/check-purchase/:marketplace_page_id', authMiddleware, paymentController.checkPurchase);

// Request refund
router.post('/refund/request', authMiddleware, paymentController.requestRefund);

/**
 * Payment gateway callbacks - public
 */

// MOMO IPN callback (accept both GET and POST)
router.post('/momo/ipn', paymentController.momoIPN);
router.get('/momo/ipn', paymentController.momoIPN);

// MOMO return URL (support both /return and /callback)
router.get('/momo/return', paymentController.momoReturn);
router.get('/momo/callback', paymentController.momoReturn);

// VNPay IPN callback
router.get('/vnpay/ipn', paymentController.vnpayIPN);
router.post('/vnpay/ipn', paymentController.vnpayIPN);

// VNPay return URL (support both /return and /callback)
router.get('/vnpay/return', paymentController.vnpayReturn);
router.get('/vnpay/callback', paymentController.vnpayReturn);

// Sandbox confirm (for testing)
router.post('/sandbox/confirm', paymentController.sandboxConfirm);
router.post('/create-transaction', paymentController.createTransaction);

router.post('/momo/ipn', paymentController.momoIPN);

module.exports = router;