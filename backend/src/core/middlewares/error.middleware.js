const AppError = require('../errors/AppError');

const handleJWTError = () => new AppError('Token không hợp lệ. Vui lòng đăng nhập lại!', 401);
const handleJWTExpiredError = () => new AppError('Token đã hết hạn. Vui lòng đăng nhập lại!', 401);

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

const sendErrorProd = (err, res) => {
  // 1) Lỗi nghiệp vụ (Operational error) mà mình biết và ném ra -> Gửi về cho client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  } 
  // 2) Lỗi kĩ thuật do code (Programming error) hoặc lỗi thư viện -> Không rò rỉ chi tiết cho client
  else {
    console.error('ERROR', err.name, err.message);
    res.status(500).json({
      status: 'error',
      message: 'Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau!'
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;
    error.name = err.name;

    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, res);
  }
};
