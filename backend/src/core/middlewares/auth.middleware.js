const jwt = require('jsonwebtoken');
const AppError = require('../errors/AppError');
const catchAsync = require('../utils/catchAsync');
const supabase = require('../../config/database');
const { getPasswordTokenVersion } = require('../utils/tokenFingerprint');
const authModel = require('../../features/auth/auth.model');

const protect = catchAsync(async (req, res, next) => {
  // 1. Lấy token từ header
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return next(new AppError('Bạn chưa đăng nhập. Vui lòng đăng nhập để truy cập!', 401));
  }

  // 2. Xác thực token
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // 3. Kiểm tra user còn tồn tại không
  const { data: user, error } = await supabase
    .from('users')
    .select('id, name, email, avatar, role, is_active, password_hash')
    .eq('id', decoded.id)
    .single();

  if (error || !user) {
    return next(new AppError('Tài khoản thuộc về token này không còn tồn tại.', 401));
  }

  if (!user.is_active) {
    return next(new AppError('Tài khoản của bạn đã bị vô hiệu hóa.', 403));
  }

  // 4. Cho phép đi tiếp, nhét thông tin user vào req
  if (!decoded.pwdv || decoded.pwdv !== getPasswordTokenVersion(user.password_hash)) {
    return next(new AppError('Phiên đăng nhập đã hết hiệu lực. Vui lòng đăng nhập lại.', 401));
  }

  if (decoded.sid) {
    const session = await authModel.findSessionById(decoded.sid);
    const sessionExpired = session?.expires_at && new Date(session.expires_at).getTime() <= Date.now();
    if (!session || session.user_id !== decoded.id || session.revoked_at || sessionExpired) {
      return next(new AppError('Phien dang nhap da het hieu luc. Vui long dang nhap lai.', 401));
    }
    req.sessionId = decoded.sid;
  }

  user.password_hash = undefined;
  req.user = user;
  next();
});

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Bạn không có quyền thực hiện hành động này!', 403));
    }
    next();
  };
};

module.exports = { protect, restrictTo };
