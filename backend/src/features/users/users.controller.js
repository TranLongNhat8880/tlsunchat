const usersService = require('./users.service');
const catchAsync = require('../../core/utils/catchAsync');

// Lấy danh sách toàn bộ nhân viên công ty (trừ bản thân)
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const users = await usersService.getAllUsers(req.user.id);

  res.status(200).json({
    status: 'success',
    results: users.length,
    data: { users }
  });
});

exports.getAdminUsers = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const search = req.query.search || '';

  const { users, total } = await require('./users.model').getAdminUsersPaginated(page, limit, search);

  res.status(200).json({
    status: 'success',
    data: {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  });
});

exports.deleteUser = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  if (id === req.user.id) {
    return next(new require('../../core/errors/AppError')('Không thể tự xóa tài khoản của chính mình', 400));
  }

  await require('./users.model').deleteUser(id);
  require('../../websockets/socket.manager').disconnectUser(id, 'ACCOUNT_DELETED');

  res.status(200).json({
    status: 'success',
    message: 'Đã xóa tài khoản'
  });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  await require('../auth/auth.service').resetPasswordToDefault(id);
  require('../../websockets/socket.manager').disconnectUser(id, 'PASSWORD_RESET');

  res.status(200).json({
    status: 'success',
    message: 'Đã reset mật khẩu về mặc định (123456)'
  });
});

const cloudinary = require('cloudinary').v2;

exports.getAvatarUploadUrl = catchAsync(async (req, res, next) => {
  const timestamp = Math.round((new Date).getTime() / 1000);
  const folder = `avatars`;

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });

  const signature = cloudinary.utils.api_sign_request({
    timestamp,
    folder,
  }, process.env.CLOUDINARY_API_SECRET);

  res.status(200).json({
    status: 'success',
    data: {
      provider: 'cloudinary',
      uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/auto/upload`,
      signature,
      timestamp,
      folder,
      apiKey: process.env.CLOUDINARY_API_KEY
    }
  });
});

exports.updateAvatar = catchAsync(async (req, res, next) => {
  const { avatarUrl } = req.body;
  if (!avatarUrl) {
    return next(new require('../../core/errors/AppError')('Vui lòng cung cấp avatarUrl', 400));
  }

  await require('./users.model').updateUserAvatar(req.user.id, avatarUrl);

  // Phát sự kiện realtime để các client tự cập nhật avatar
  const { getIo } = require('../../websockets/socket.manager');
  getIo().emit('user_updated', {
    userId: req.user.id,
    avatar: avatarUrl
  });

  res.status(200).json({
    status: 'success',
    message: 'Cập nhật avatar thành công'
  });
});

exports.updateProfile = catchAsync(async (req, res, next) => {
  const { name } = req.body;
  if (!name || name.trim().length === 0) {
    return next(new require('../../core/errors/AppError')('Vui lòng cung cấp tên hợp lệ', 400));
  }

  const userModel = require('./users.model');
  await userModel.updateUserName(req.user.id, name.trim());

  // Phát sự kiện realtime để đồng bộ tên
  const { getIo } = require('../../websockets/socket.manager');
  getIo().emit('user_updated', {
    userId: req.user.id,
    name: name.trim()
  });

  res.status(200).json({
    status: 'success',
    message: 'Cập nhật tên hiển thị thành công',
    data: { name: name.trim() }
  });
});
