const express = require('express');
const router = express.Router();
const templateController = require('../controllers/templateController');
const authMiddleware = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/authMiddleware');


// ========== ADMIN ROUTES (ĐẶT TRƯỚC) ==========
router.get('/admin/presigned-url', authMiddleware, isAdmin, templateController.getPresignedUrl);
router.post('/admin/metadata', authMiddleware, isAdmin, templateController.saveTemplateMetadata);
router.get('/admin/stats', authMiddleware, isAdmin, templateController.getTemplateStats);
router.post('/admin/batch-regenerate-screenshots', authMiddleware, isAdmin, templateController.batchRegenerateScreenshots);
router.get('/admin/all', authMiddleware, isAdmin, templateController.getAllTemplatesAdmin);
// ========== PUBLIC ROUTES (ĐẶT TRƯỚC :id) ==========
router.get('/featured', templateController.getFeaturedTemplates);
router.get('/search', templateController.searchTemplates);router.get('/:id/preview', templateController.previewTemplate);



// ========== ROUTES VỚI :category PARAM ==========
router.get('/category/:category', templateController.getTemplatesByCategory);

// ========== ROUTES VỚI :id PARAM (ĐẶT SAU) ==========
router.get('/:id/preview', templateController.previewTemplate);
router.post('/:id/use', authMiddleware, templateController.useTemplate);
router.post('/:id/regenerate-screenshot', authMiddleware, isAdmin, templateController.regenerateTemplateScreenshot);
router.put('/:id', authMiddleware, isAdmin, templateController.updateTemplate);
router.delete('/:id', authMiddleware, isAdmin, templateController.deleteTemplate);

// ========== ROOT ROUTE (ĐẶT CUỐI) ==========
router.get('/', templateController.getTemplates);

module.exports = router;