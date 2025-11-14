const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authMiddleware, isAdmin } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Try to configure AWS S3 if credentials available
let useS3 = false;
let upload;

try {
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    const multerS3 = require('multer-s3');
    const AWS = require('aws-sdk');

    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'ap-southeast-1'
    });

    upload = multer({
      storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_S3_BUCKET || 'landing-hub-deployments',
        acl: 'public-read',
        metadata: function (req, file, cb) {
          cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          const ext = path.extname(file.originalname);
          cb(null, `chat-uploads/${req.user.id}/${uniqueSuffix}${ext}`);
        }
      }),
      limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
      }
    });

    useS3 = true;
    console.log('✅ Using S3 for chat file uploads');
  } else {
    throw new Error('AWS credentials not configured');
  }
} catch (error) {
  console.log('⚠️  S3 not configured, using local storage for chat uploads:', error.message);

  // Fallback to local storage
  const uploadDir = path.join(__dirname, '../../uploads/chat');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      const userDir = path.join(uploadDir, req.user.id.toString());
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
      }
      cb(null, userDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, uniqueSuffix + ext);
    }
  });

  upload = multer({
    storage: storage,
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB limit
    }
  });
}

// ===== USER ROUTES =====

// Create or get existing room
router.post('/rooms', authMiddleware, chatController.createOrGetRoom);

// Get user's chat rooms
router.get('/rooms', authMiddleware, chatController.getUserRooms);

// Get messages for a specific room
router.get('/rooms/:roomId/messages', authMiddleware, chatController.getRoomMessages);

// Send message (REST fallback)
router.post('/rooms/:roomId/messages', authMiddleware, chatController.sendMessage);

// Send message with AI auto-response
router.post('/rooms/:roomId/messages/ai', authMiddleware, chatController.sendMessageWithAI);

// Upload file to chat
router.post('/rooms/:roomId/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Không có file được upload'
      });
    }

    let fileUrl;
    if (useS3) {
      // S3 upload
      fileUrl = req.file.location;
    } else {
      // Local storage - construct URL
      const relativePath = req.file.path.split('uploads')[1];
      fileUrl = `${process.env.API_URL || 'http://localhost:5000'}/uploads${relativePath}`;
    }

    const fileData = {
      type: req.file.mimetype.startsWith('image/') ? 'image' : 'file',
      url: fileUrl,
      filename: req.file.originalname,
      size: req.file.size,
      mime_type: req.file.mimetype
    };

    console.log('✅ File uploaded:', fileData);

    res.json({
      success: true,
      file: fileData
    });
  } catch (error) {
    console.error('❌ Upload file error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể upload file',
      error: error.message
    });
  }
});

// Close/resolve room
router.put('/rooms/:roomId/close', authMiddleware, chatController.closeRoom);

// Rate chat experience
router.post('/rooms/:roomId/rate', authMiddleware, chatController.rateRoom);

// ===== ADMIN ROUTES =====

// Get all support rooms
router.get('/admin/rooms', authMiddleware, isAdmin, chatController.getAllRooms);

// Assign room to current admin
router.put('/admin/rooms/:roomId/assign', authMiddleware, isAdmin, chatController.assignRoom);

// Update room status/priority
router.put('/admin/rooms/:roomId/status', authMiddleware, isAdmin, chatController.updateRoomStatus);

// Get chat statistics
router.get('/admin/stats', authMiddleware, isAdmin, chatController.getChatStats);

// Get AI provider status
router.get('/provider-status', (req, res) => {
  try {
    const multiAIProvider = require('../services/multiAIProvider');
    const status = multiAIProvider.getProviderStatus();

    res.json({
      success: true,
      providers: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Cannot get provider status',
      error: error.message
    });
  }
});

module.exports = router;
