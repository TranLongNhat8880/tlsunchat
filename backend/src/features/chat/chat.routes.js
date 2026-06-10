const express = require('express');
const chatController = require('./chat.controller');
const { protect } = require('../../core/middlewares/auth.middleware');

const router = express.Router();

// Bắt buộc đăng nhập cho mọi tính năng chat
router.use(protect);

router.get('/rooms', chatController.getMyRooms);
router.post('/rooms', chatController.createRoom);
router.get('/rooms/:roomId/messages', chatController.getRoomMessages);
router.put('/rooms/:roomId/pin', chatController.togglePinRoom);
router.delete('/rooms/:roomId/membership', chatController.leaveRoom);
router.put('/messages/:messageId/pin', chatController.pinMessage);
router.put('/messages/:messageId/react', chatController.reactToMessage);
router.put('/messages/:messageId/recall', chatController.recallMessage);

module.exports = router;
