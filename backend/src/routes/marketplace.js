const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const marketplaceController = require('../controllers/marketplaceController');

/**
 * IMPORTANT: Route ordering matters!
 * 1. Static routes first (e.g., /my/pages, /featured/list)
 * 2. Specific dynamic routes (e.g., /:id/preview, /:id/reviews)
 * 3. General dynamic routes last (e.g., /:id)
 */

/**
 * Protected routes - yêu cầu authentication
 */

// Lấy marketplace pages của user
router.get('/my/pages', auth, marketplaceController.getMyMarketplacePages);

// Lấy các page đã mua
router.get('/my/purchased', auth, marketplaceController.getPurchasedPages);

// Lấy thống kê seller
router.get('/seller/stats', auth, marketplaceController.getSellerStats);

/**
 * Public routes - không cần authentication
 */

// Lấy featured pages (phải đặt trước /:id)
router.get('/featured/list', marketplaceController.getFeaturedPages);

// Lấy bestsellers (phải đặt trước /:id)
router.get('/bestsellers/list', marketplaceController.getBestsellers);

// Lấy new arrivals (phải đặt trước /:id)
router.get('/new-arrivals/list', marketplaceController.getNewArrivals);

// Lấy danh sách marketplace pages
router.get('/', marketplaceController.getMarketplacePages);

/**
 * Dynamic routes with specific patterns (MUST be before /:id)
 */

// Preview marketplace page (HTML) - MUST be before /:id
router.get('/:id/preview-data', marketplaceController.getPreviewData);
router.get('/:id/preview', marketplaceController.previewMarketplacePage);

// Download marketplace page as HTML ZIP - MUST be before /:id
router.get('/:id/download/html', auth, marketplaceController.downloadAsHTML);

// Download marketplace page as .iuhpage - MUST be before /:id
router.get('/:id/download/iuhpage', auth, marketplaceController.downloadAsIUHPage);

// Get detail with order info - MUST be before /:id
router.get('/:id/detail', auth, marketplaceController.getPageDetailWithOrder);

// Get detail with order (duplicate route?) - MUST be before /:id
router.get("/:id/detail-order", auth, marketplaceController.getPageDetailWithOrder);

// Get reviews for a page - MUST be before /:id
router.get('/:id/reviews', marketplaceController.getReviews);

/**
 * General dynamic route (MUST be AFTER all specific /:id/* routes)
 */

// Lấy chi tiết marketplace page (phải đặt cuối cùng)
router.get('/:id', marketplaceController.getMarketplacePageDetail);

/**
 * POST/PUT/DELETE routes (order doesn't matter as much)
 */

// Đăng bán landing page
router.post('/sell', auth, marketplaceController.sellPage);

// Submit review
router.post('/:id/reviews', auth, marketplaceController.submitReview);

// Like/Unlike marketplace page
router.post('/:id/like', auth, marketplaceController.toggleLike);

// Cập nhật marketplace page
router.put('/:id', auth, marketplaceController.updateMarketplacePage);

// Xóa marketplace page
router.delete('/:id', auth, marketplaceController.deleteMarketplacePage);

module.exports = router;