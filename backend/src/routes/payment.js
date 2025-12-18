const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/authMiddleware');
const paymentController = require('../controllers/paymentController');

/**
 * PUBLIC ROUTES - Payment gateway callbacks (PHẢI ĐẶT TRƯỚC AUTH MIDDLEWARE)
 */

// MOMO
router.post('/momo/ipn', paymentController.momoIPN);
router.get('/momo/ipn', paymentController.momoIPN); // MoMo hay test bằng GET

router.get('/momo/return', paymentController.momoReturn);
router.get('/momo/callback', paymentController.momoReturn);

// VNPay
router.get('/vnpay/ipn', paymentController.vnpayIPN);
router.post('/vnpay/ipn', paymentController.vnpayIPN);

router.get('/vnpay/return', paymentController.vnpayReturn);
router.post('/vnpay/return', paymentController.vnpayReturn); // Thêm POST cho chắc
router.get('/vnpay/callback', paymentController.vnpayReturn);
router.post('/vnpay/callback', paymentController.vnpayReturn);

// Sandbox
router.post('/sandbox/confirm', paymentController.sandboxConfirm);

/**
 * PROTECTED ROUTES - User routes (yêu cầu login)
 */
router.use(authMiddleware); // Từ đây trở xuống đều cần auth

// Tạo transaction
router.post('/create-transaction', paymentController.createTransaction);

// User routes
router.get('/transactions', paymentController.getUserTransactions);
router.get('/stats', paymentController.getUserStats);
router.get('/export', paymentController.exportUserTransactions);

router.get('/transaction/:id', paymentController.getTransactionStatus);
router.get('/purchases', paymentController.getPurchaseHistory);
router.get('/sales', paymentController.getSalesHistory);
router.get('/check-purchase/:marketplace_page_id', paymentController.checkPurchase);
router.post('/refund/request', paymentController.requestRefund);

// Seller deliver order
router.post('/orders/:orderId/deliver', paymentController.deliverOrder);

/**
 * ADMIN ROUTES
 */
router.use(isAdmin); // Từ đây trở xuống chỉ admin mới truy cập được

router.get('/admin/transactions', paymentController.getAllTransactionsAdmin);
router.get('/admin/stats', paymentController.getPaymentStatsAdmin);
router.get('/admin/export', paymentController.exportTransactionsAdmin);

router.get('/admin/revenue-by-period', paymentController.getRevenueByPeriod);
router.get('/admin/top-sellers', paymentController.getTopSellers);
router.get('/admin/top-buyers', paymentController.getTopBuyers);
router.get('/admin/payment-method-stats', paymentController.getPaymentMethodStats);
router.get('/admin/performance-metrics', paymentController.getPerformanceMetrics);

router.get('/admin/marketplace/refunds', paymentController.getRefundRequestsAdmin);
router.get('/orders', paymentController.getAllOrdersAdmin); // Admin xem tất cả orders

module.exports = router;