const express = require('express');
const authController = require('./auth.controller');
const { protect, restrictTo } = require('../../core/middlewares/auth.middleware');

const router = express.Router();

// Public routes
router.post('/login', authController.login);

// Protected routes (Cần có JWT Token)
router.use(protect);

router.get('/me', authController.getMe);
router.post('/logout', authController.logout);
router.put('/change-password', authController.changePassword);

// Chỉ Admin mới được tạo user
router.post('/create-user', restrictTo('admin'), authController.createUser);

module.exports = router;
