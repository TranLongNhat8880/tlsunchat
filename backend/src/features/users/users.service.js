const usersModel = require('./users.model');
const AppError = require('../../core/errors/AppError');

exports.getAllUsers = async (userId) => {
  try {
    const users = await usersModel.findAllUsersExcept(userId);
    return users;
  } catch (error) {
    throw new AppError('Không thể tải danh sách người dùng', 500);
  }
};
