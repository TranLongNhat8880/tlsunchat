const express = require('express');
const usersController = require('./users.controller');
const { protect, restrictTo } = require('../../core/middlewares/auth.middleware');

const router = express.Router();

router.use(protect); // Bắt buộc đăng nhập

router.get('/admin', restrictTo('admin'), usersController.getAdminUsers);
router.delete('/admin/:id', restrictTo('admin'), usersController.deleteUser);
router.put('/admin/:id/reset-password', restrictTo('admin'), usersController.resetPassword);

router.get('/', usersController.getAllUsers);

router.post('/me/avatar/upload-url', usersController.getAvatarUploadUrl);
router.put('/me/avatar', usersController.updateAvatar);
router.put('/me/profile', usersController.updateProfile);

module.exports = router;
