const express = require('express');
const pushController = require('./push.controller');
const { protect } = require('../../core/middlewares/auth.middleware');

const router = express.Router();

router.use(protect); // Bắt buộc đăng nhập

// Lấy Public Key cho Client
router.get('/vapid-public-key', pushController.getVapidPublicKey);

// Lưu Subscription
router.post('/subscribe', pushController.subscribe);

module.exports = router;
