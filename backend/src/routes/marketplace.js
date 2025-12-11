const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const marketplaceController = require('../controllers/marketplaceController');



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



router.get('/:id/preview-data', marketplaceController.getPreviewData);
router.get('/:id/preview', marketplaceController.previewMarketplacePage);
router.get('/:id/download/html', auth, marketplaceController.downloadAsHTML);
router.get('/:id/download/iuhpage', auth, marketplaceController.downloadAsIUHPage);
router.get('/:id/detail', auth, marketplaceController.getPageDetailWithOrder);
router.get('/:id/reviews', marketplaceController.getReviews);

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
router.get('/', marketplaceController.getMarketplacePages);


module.exports = router;