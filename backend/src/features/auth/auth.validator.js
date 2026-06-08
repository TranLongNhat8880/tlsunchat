const Joi = require('joi');

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email không hợp lệ',
    'any.required': 'Vui lòng nhập email'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Vui lòng nhập mật khẩu'
  })
});

const createUserSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Tên phải có ít nhất 2 ký tự',
    'any.required': 'Vui lòng nhập tên'
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Email không hợp lệ',
    'any.required': 'Vui lòng nhập email'
  }),
  password: Joi.string().min(6).default('123456').messages({
    'string.min': 'Mật khẩu phải có ít nhất 6 ký tự',
    'any.required': 'Vui lòng nhập mật khẩu'
  }),
  role: Joi.string().valid('admin', 'member').default('member')
});

module.exports = {
  loginSchema,
  createUserSchema
};
