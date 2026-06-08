const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const globalErrorHandler = require('./core/middlewares/error.middleware');

const app = express();

// 1. Security HTTP headers (Helmet)
app.use(helmet());

// 2. Cross-Origin Resource Sharing (CORS)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true // Cho phép gửi cookie, JWT nếu cần
}));

// 3. Rate limiting (Chống DDoS / Spam chung cho toàn app)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 1000, // Giới hạn 1000 request / 15 phút cho mỗi IP
  message: 'Quá nhiều request từ IP này, vui lòng thử lại sau.'
});
app.use('/api', limiter);

// 4. Body parser (Đọc JSON data từ body)
// Giới hạn 10kb để chống payload quá lớn gây tràn bộ nhớ
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 6. Routes
const authRoutes = require('./features/auth/auth.routes');
const chatRoutes = require('./features/chat/chat.routes');
const usersRoutes = require('./features/users/users.routes');
const filesRoutes = require('./features/files/files.routes');
const pushRoutes = require('./features/push/push.routes');

app.get('/', (req, res) => {
  res.status(200).json({ message: 'TLSunChat Backend API is running safely!' });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/files', filesRoutes);
app.use('/api/v1/push', pushRoutes);

// 7. Global Error Handler (Đón bắt tất cả lỗi của ứng dụng)
app.use(globalErrorHandler);

module.exports = app;
