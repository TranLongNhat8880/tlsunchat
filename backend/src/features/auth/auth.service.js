const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const authModel = require('./auth.model');
const AppError = require('../../core/errors/AppError');
const { getPasswordTokenVersion } = require('../../core/utils/tokenFingerprint');

const DEFAULT_PASSWORD = '123456';

const getJwtExpiresIn = () => process.env.JWT_EXPIRES_IN || '8h';

const parseDurationMs = (value) => {
  if (typeof value === 'number') return value * 1000;
  const match = String(value || '').trim().match(/^(\d+)\s*([smhd])?$/i);
  if (!match) return 8 * 60 * 60 * 1000;

  const amount = Number(match[1]);
  const unit = (match[2] || 's').toLowerCase();
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };
  return amount * multipliers[unit];
};

const getTokenExpiresAt = () => new Date(Date.now() + parseDurationMs(getJwtExpiresIn()));

const signToken = (user, sessionId = null) => {
  const payload = {
    id: user.id,
    pwdv: getPasswordTokenVersion(user.password_hash)
  };

  if (sessionId) payload.sid = sessionId;

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: getJwtExpiresIn()
  });
};

const updatePassword = async (userId, newPassword) => {
  const salt = await bcrypt.genSalt(12);
  const password_hash = await bcrypt.hash(newPassword, salt);
  await authModel.updatePassword(userId, password_hash);
};

exports.login = async (email, password, meta = {}) => {
  const user = await authModel.findByEmail(email);

  if (!user) {
    throw new AppError('Email hoặc mật khẩu không chính xác', 401);
  }

  if (!user.is_active) {
    throw new AppError('Tài khoản của bạn đã bị vô hiệu hóa', 403);
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new AppError('Email hoặc mật khẩu không chính xác', 401);
  }

  const session = await authModel.createSession({
    user_id: user.id,
    expires_at: getTokenExpiresAt().toISOString(),
    user_agent: meta.userAgent || null,
    ip_address: meta.ipAddress || null
  });
  const token = signToken(user, session?.id);
  const requirePasswordChange = password === DEFAULT_PASSWORD;
  user.password_hash = undefined;

  return { token, user, requirePasswordChange };
};

exports.logout = async (userId, sessionId) => {
  if (!sessionId) return;
  await authModel.revokeSession(sessionId, userId);
};

exports.createUser = async (userData) => {
  try {
    const password_hash = await bcrypt.hash(userData.password || DEFAULT_PASSWORD, 12);

    const newUser = await authModel.createUser({
      name: userData.name,
      email: userData.email,
      password_hash,
      role: userData.role
    });

    newUser.password_hash = undefined;
    return newUser;
  } catch (error) {
    if (error.isDuplicate) {
      throw new AppError(error.message, 400);
    }
    throw new AppError(error.message, 500);
  }
};

exports.changePassword = async (userId, oldPassword, newPassword) => {
  const user = await authModel.findById(userId);
  if (!user) {
    throw new AppError('Người dùng không tồn tại', 404);
  }

  if (oldPassword) {
    const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isMatch) {
      throw new AppError('Mật khẩu cũ không chính xác', 400);
    }
  } else {
    const isDefaultPassword = await bcrypt.compare(DEFAULT_PASSWORD, user.password_hash);
    if (!isDefaultPassword) {
      throw new AppError('Vui lòng nhập mật khẩu cũ', 400);
    }
  }

  await updatePassword(userId, newPassword);
};

exports.resetPasswordToDefault = async (userId) => {
  const user = await authModel.findById(userId);
  if (!user) {
    throw new AppError('Người dùng không tồn tại', 404);
  }

  await updatePassword(userId, DEFAULT_PASSWORD);
};
