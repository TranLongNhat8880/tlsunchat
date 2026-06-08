const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const authModel = require('./auth.model');
const AppError = require('../../core/errors/AppError');
const { getPasswordTokenVersion } = require('../../core/utils/tokenFingerprint');

const DEFAULT_PASSWORD = '123456';

const signToken = (user) => {
  return jwt.sign({
    id: user.id,
    pwdv: getPasswordTokenVersion(user.password_hash)
  }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h'
  });
};

const updatePassword = async (userId, newPassword) => {
  const salt = await bcrypt.genSalt(12);
  const password_hash = await bcrypt.hash(newPassword, salt);
  await authModel.updatePassword(userId, password_hash);
};

exports.login = async (email, password) => {
  const user = await authModel.findByEmail(email);

  if (!user) {
    throw new AppError('Email hoac mat khau khong chinh xac', 401);
  }

  if (!user.is_active) {
    throw new AppError('Tai khoan cua ban da bi vo hieu hoa', 403);
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new AppError('Email hoac mat khau khong chinh xac', 401);
  }

  const token = signToken(user);
  const requirePasswordChange = password === DEFAULT_PASSWORD;
  user.password_hash = undefined;

  return { token, user, requirePasswordChange };
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
    throw new AppError('Nguoi dung khong ton tai', 404);
  }

  if (oldPassword) {
    const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isMatch) {
      throw new AppError('Mat khau cu khong chinh xac', 400);
    }
  } else {
    const isDefaultPassword = await bcrypt.compare(DEFAULT_PASSWORD, user.password_hash);
    if (!isDefaultPassword) {
      throw new AppError('Vui long nhap mat khau cu', 400);
    }
  }

  await updatePassword(userId, newPassword);
};

exports.resetPasswordToDefault = async (userId) => {
  const user = await authModel.findById(userId);
  if (!user) {
    throw new AppError('Nguoi dung khong ton tai', 404);
  }

  await updatePassword(userId, DEFAULT_PASSWORD);
};
