const authService = require('./auth.service');
const AppError = require('../../core/errors/AppError');
const catchAsync = require('../../core/utils/catchAsync');
const { loginSchema, createUserSchema } = require('./auth.validator');

// Đăng nhập
exports.login = catchAsync(async (req, res, next) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) return next(new AppError(error.details[0].message, 400));

  const { email, password } = value;
  const result = await authService.login(email, password);

  res.status(200).json({
    status: 'success',
    token: result.token,
    requirePasswordChange: result.requirePasswordChange,
    data: { user: result.user }
  });
});

// Tạo User nội bộ
exports.createUser = catchAsync(async (req, res, next) => {
  const { error, value } = createUserSchema.validate(req.body);
  if (error) return next(new AppError(error.details[0].message, 400));

  const newUser = await authService.createUser(value);

  res.status(201).json({
    status: 'success',
    message: 'Tạo tài khoản thành công',
    data: { user: newUser }
  });
});

// Lấy thông tin user hiện tại
exports.getMe = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: 'success',
    data: { user: req.user }
  });
});

exports.changePassword = catchAsync(async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword) {
    return next(new AppError('Vui lòng nhập mật khẩu cũ', 400));
  }
  if (!newPassword || newPassword.length < 6) {
    return next(new AppError('Mật khẩu mới phải có ít nhất 6 ký tự', 400));
  }
  if (newPassword === '123456') {
    return next(new AppError('Không được sử dụng mật khẩu mặc định (123456)', 400));
  }

  await authService.changePassword(req.user.id, oldPassword, newPassword);
  require('../../websockets/socket.manager').disconnectUser(req.user.id, 'PASSWORD_CHANGED');

  res.status(200).json({
    status: 'success',
    message: 'Đổi mật khẩu thành công'
  });
});
