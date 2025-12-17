const express = require('express');
const router = express.Router();
const pagesController = require('../controllers/pages');
const authenticate = require('../middleware/authMiddleware');

// Routes
router.get('/', authenticate, pagesController.getPages);
router.post('/', authenticate, pagesController.createPage);
router.post('/save', authenticate, pagesController.savePage);
router.put('/:id', authenticate, pagesController.updatePage);
router.post('/:id/publish', authenticate, pagesController.publishPage);
router.delete('/:id', authenticate, pagesController.deletePage);
router.get('/:id/content', authenticate, pagesController.getPageContent);
router.get('/debug/s3', pagesController.debugS3);
router.get('/:id/regenerate-screenshot', authenticate, pagesController.regenerateScreenshot); // Đã có
router.get('/regenerate-screenshots', authenticate, pagesController.regenerateScreenshots); // Thêm mới
module.exports = router;