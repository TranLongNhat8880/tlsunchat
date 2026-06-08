require('dotenv').config();
const http = require('http');
const app = require('./app');

// Cổng chạy server
const PORT = process.env.PORT || 5000;

// Khởi tạo HTTP server từ Express app (để dùng được Socket.io chung cổng)
const server = http.createServer(app);

// Khởi tạo Socket.io
const socketManager = require('./websockets/socket.manager');
socketManager.init(server);

// Lắng nghe trên cổng PORT
server.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
  console.log(`Môi trường: ${process.env.NODE_ENV || 'development'}`);
});

// Bắt các lỗi Promise chưa được xử lý (Unhandled Rejections) để tránh sập server đột ngột
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! Đang tắt server một cách an toàn...');
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1); // Thoát ứng dụng
  });
});
