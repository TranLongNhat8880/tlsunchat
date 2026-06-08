class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Đánh dấu đây là lỗi nghiệp vụ do mình chủ động ném ra, không phải bug crash app

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
