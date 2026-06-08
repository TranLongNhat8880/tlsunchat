const express = require('express');
const filesController = require('./files.controller');
const { protect, restrictTo } = require('../../core/middlewares/auth.middleware');

const router = express.Router();

router.use(protect); // Bắt buộc đăng nhập để lấy link file

// Admin routes
router.get('/admin', restrictTo('admin'), filesController.getAdminFiles);
router.get('/admin/stats', restrictTo('admin'), filesController.getAdminStats);

// Lấy link để Upload thẳng lên Cloudflare R2
router.post('/upload-url', filesController.getPresignedUploadUrl);

// Lưu thông tin file vào Database sau khi upload xong
router.post('/', filesController.saveFileRecord);

// Lấy link Download file (Có thời hạn)
router.get('/:fileId/download', filesController.getPresignedDownloadUrl);

// Lấy link file trực tiếp (redirect - dùng cho ảnh)
router.get('/:fileId/download-direct', filesController.getDirectDownloadUrl);

module.exports = router;
