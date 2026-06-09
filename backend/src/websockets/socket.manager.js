const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const chatModel = require('../features/chat/chat.model');
const pushService = require('../features/push/push.service');
const supabase = require('../config/database');
const { getPasswordTokenVersion } = require('../core/utils/tokenFingerprint');

let io;
const onlineUsers = new Map();
const isDev = process.env.NODE_ENV !== 'production';
const debugLog = (...args) => {
  if (isDev) console.log(...args);
};

const getFrontendUrl = () => (process.env.FRONTEND_URL || 'https://tlsunchat.vercel.app').replace(/\/$/, '');
const toPublicAssetUrl = (path) => `${getFrontendUrl()}${path.startsWith('/') ? path : `/${path}`}`;

const getOnlineUserIds = () => Array.from(onlineUsers.keys());

const markUserOnline = (userId) => {
  const count = onlineUsers.get(userId) || 0;
  onlineUsers.set(userId, count + 1);
  return count === 0;
};

const markUserOffline = (userId) => {
  const count = onlineUsers.get(userId) || 0;
  if (count <= 1) {
    onlineUsers.delete(userId);
    return true;
  }

  onlineUsers.set(userId, count - 1);
  return false;
};

const init = (server) => {
  io = socketIo(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: Missing token'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const { data: user, error } = await supabase
        .from('users')
        .select('id, role, is_active, password_hash')
        .eq('id', decoded.id)
        .single();

      if (error || !user || !user.is_active) {
        return next(new Error('Authentication error: Invalid user'));
      }

      if (!decoded.pwdv || decoded.pwdv !== getPasswordTokenVersion(user.password_hash)) {
        return next(new Error('Authentication error: Expired session'));
      }

      socket.user = { id: user.id, role: user.role };
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    debugLog(`User connected: ${socket.user.id} (Socket: ${socket.id})`);

    socket.join(socket.user.id);
    const becameOnline = markUserOnline(socket.user.id);
    socket.emit('presence_snapshot', { onlineUserIds: getOnlineUserIds() });
    if (becameOnline) {
      io.emit('presence_update', {
        userId: socket.user.id,
        status: 'online'
      });
    }

    const isRoomMember = async (roomId, userId) => {
      if (!roomId || !userId) return false;
      const member = await chatModel.checkRoomMembership(roomId, userId);
      return !!member;
    };

    socket.on('join_room', async (roomId) => {
      if (!(await isRoomMember(roomId, socket.user.id))) {
        debugLog(`User ${socket.user.id} denied access to room ${roomId}`);
        return;
      }

      socket.join(roomId);
      debugLog(`User ${socket.user.id} joined room ${roomId}`);
    });

    socket.on('leave_room', (roomId) => {
      socket.leave(roomId);
      debugLog(`User ${socket.user.id} left room ${roomId}`);
    });

    socket.on('send_message', async (data, callback) => {
      const { roomId, content, type = 'text', replyToId = null } = data;
      const senderId = socket.user.id;

      try {
        if (!(await isRoomMember(roomId, senderId))) {
          throw new Error('Bạn không có quyền gửi tin nhắn vào phòng này');
        }

        const newMessage = await chatModel.saveMessage({
          room_id: roomId,
          sender_id: senderId,
          content,
          type,
          reply_to_id: replyToId
        });

        const members = await chatModel.getRoomMemberIds(roomId);

        if (members) {
          members.forEach((member) => {
            io.to(member.user_id).emit('receive_message', newMessage);
          });

          const recipientIds = members
            .map(member => member.user_id)
            .filter(userId => userId !== senderId);

          if (recipientIds.length > 0) {
            const senderName = newMessage.users?.name || 'TLSunChat';
            const senderAvatar = newMessage.users?.avatar || toPublicAssetUrl('/pwa-192x192.png');
            const body = type === 'file'
              ? 'Da gui mot tep tin'
              : type === 'image'
                ? 'Da gui mot hinh anh'
                : type === 'video'
                  ? 'Da gui mot video'
                  : content;

            pushService.sendPushToUsers(recipientIds, {
              title: `Tin nhan tu ${senderName}`,
              body,
              icon: senderAvatar,
              badge: toPublicAssetUrl('/pwa-badge.svg'),
              tag: `message-${newMessage.id}`,
              url: `/?room=${encodeURIComponent(roomId)}&message=${encodeURIComponent(newMessage.id)}`
            }).catch(error => {
              console.error('Failed to queue push notification:', error.message);
            });
          }
        }

        if (callback) callback({ status: 'success', message: newMessage });
      } catch (err) {
        console.error('Failed to save message:', err.message);
        if (callback) callback({ status: 'error', error: err.message });
      }
    });

    socket.on('typing', async ({ roomId, isTyping }) => {
      if (!(await isRoomMember(roomId, socket.user.id))) {
        debugLog(`User ${socket.user.id} denied typing access to room ${roomId}`);
        return;
      }

      socket.to(roomId).emit('user_typing', {
        userId: socket.user.id,
        isTyping
      });
    });

    socket.on('disconnect', () => {
      debugLog(`User disconnected: ${socket.user.id}`);
      const becameOffline = markUserOffline(socket.user.id);
      if (becameOffline) {
        io.emit('presence_update', {
          userId: socket.user.id,
          status: 'offline'
        });
      }
    });
  });
};

const getIo = () => {
  if (!io) {
    throw new Error('Socket.io has not been initialized');
  }
  return io;
};

const disconnectUser = (userId, reason = 'SESSION_INVALIDATED') => {
  if (!io || !userId) return;
  io.to(userId).emit('force_logout', { reason });
  io.in(userId).disconnectSockets(true);
};

module.exports = { init, getIo, disconnectUser };
