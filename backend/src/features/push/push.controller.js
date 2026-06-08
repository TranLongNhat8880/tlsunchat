const pushService = require('./push.service');
const AppError = require('../../core/errors/AppError');
const catchAsync = require('../../core/utils/catchAsync');

// 1. Sinh VAPID Keys
exports.getVapidPublicKey = (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      publicKey: process.env.VAPID_PUBLIC_KEY
    }
  });
};

// 2. Client gửi subscription lên server để lưu vào database
exports.subscribe = catchAsync(async (req, res, next) => {
  const subscription = req.body;

  if (!subscription || !subscription.endpoint) {
    return next(new AppError('Subscription không hợp lệ', 400));
  }

  await pushService.subscribe(req.user.id, subscription);

  res.status(201).json({
    status: 'success',
    message: 'Đăng ký nhận thông báo thành công!'
  });
});
