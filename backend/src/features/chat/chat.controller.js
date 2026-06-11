const chatService = require('./chat.service');
const chatModel = require('./chat.model');
const AppError = require('../../core/errors/AppError');
const catchAsync = require('../../core/utils/catchAsync');

// Lấy danh sách phòng chat mà user đang tham gia
exports.getMyRooms = catchAsync(async (req, res, next) => {
  const rooms = await chatService.getMyRooms(req.user.id);

  res.status(200).json({
    status: 'success',
    data: { rooms }
  });
});

// Lấy lịch sử tin nhắn của một phòng
exports.getRoomMessages = catchAsync(async (req, res, next) => {
  const result = await chatService.getRoomMessages(req.params.roomId, req.user.id, {
    limit: req.query.limit,
    before: req.query.before
  });

  res.status(200).json({
    status: 'success',
    data: result
  });
});

// Tạo phòng chat mới
exports.createRoom = catchAsync(async (req, res, next) => {
  const { name, type = 'direct', memberIds } = req.body;

  if (!memberIds || memberIds.length === 0) {
    return next(new AppError('Vui lòng chọn ít nhất 1 người để chat', 400));
  }

  const result = await chatService.createRoom(name, type, memberIds, req.user.id);

  if (result.isExisting) {
    return res.status(200).json({
      status: 'success',
      message: 'Phòng đã tồn tại',
      data: { roomId: result.roomId }
    });
  }

  // Phát tín hiệu Socket cho tất cả thành viên (bao gồm người tạo)
  const { getIo } = require('../../websockets/socket.manager');
  const io = getIo();
  const allMembers = Array.from(new Set([req.user.id, ...memberIds]));
  let systemMessage = null;

  if (result.room.type === 'group') {
    systemMessage = await chatModel.saveMessage({
      room_id: result.room.id,
      sender_id: req.user.id,
      type: 'system',
      content: `${req.user.name} đã tạo nhóm`
    });
  }

  allMembers.forEach(memberId => {
    io.to(memberId).emit('group_created', result.room);
    io.to(memberId).emit('room_members_updated', {
      roomId: result.room.id,
      participants: allMembers,
      memberCount: allMembers.length
    });
    if (systemMessage) {
      io.to(memberId).emit('receive_message', systemMessage);
    }
  });

  res.status(201).json({
    status: 'success',
    data: { room: result.room }
  });
});

// Bật/tắt ghim phòng chat
exports.togglePinRoom = catchAsync(async (req, res, next) => {
  const newPinStatus = await chatService.togglePinRoom(req.params.roomId, req.user.id);

  res.status(200).json({
    status: 'success',
    data: { isPinned: newPinStatus }
  });
});

exports.leaveRoom = catchAsync(async (req, res, next) => {
  const result = await chatService.leaveRoom(req.params.roomId, req.user.id);

  const { getIo } = require('../../websockets/socket.manager');
  const io = getIo();
  const remainingMemberIds = result.remainingMemberIds || [];

  io.to(req.user.id).emit('room_left', { roomId: req.params.roomId });

  if (result.type === 'group' && result.memberCount > 0) {
    const systemMessage = await chatModel.saveMessage({
      room_id: req.params.roomId,
      sender_id: req.user.id,
      type: 'system',
      content: `${req.user.name} đã rời nhóm`
    });

    remainingMemberIds.forEach(memberId => {
      io.to(memberId).emit('room_members_updated', {
        roomId: req.params.roomId,
        participants: remainingMemberIds,
        memberCount: result.memberCount
      });
      io.to(memberId).emit('receive_message', systemMessage);
    });
  }

  res.status(200).json({
    status: 'success',
    data: result
  });
});

exports.pinMessage = catchAsync(async (req, res, next) => {
  const { isPinned } = req.body;
  const message = await chatModel.findMessageRoom(req.params.messageId);
  if (!message) return next(new AppError('Không tìm thấy tin nhắn', 404));

  const membership = await chatModel.checkRoomMembership(message.room_id, req.user.id);
  if (!membership) return next(new AppError('Bạn không có quyền thao tác tin nhắn này', 403));

  const nextPinStatus = Boolean(isPinned);
  if (nextPinStatus && !message.is_pinned) {
    const pinnedCount = await chatModel.countPinnedMessages(message.room_id);
    if (pinnedCount >= 3) return next(new AppError('Moi hop thoai chi duoc ghim toi da 3 tin nhan', 400));
  }

  await chatModel.pinMessage(req.params.messageId, nextPinStatus);

  const { getIo } = require('../../websockets/socket.manager');
  // Lấy room_id để phát event. Tạm thời phát theo messageId cũng được, nhưng tốt nhất phát theo room.
  const members = await chatModel.getRoomMemberIds(message.room_id);
  members.forEach(member => {
    getIo().to(member.user_id).emit('message_pinned', {
      messageId: req.params.messageId,
      isPinned: nextPinStatus
    });
  });

  res.status(200).json({ status: 'success' });
});

exports.recallMessage = catchAsync(async (req, res, next) => {
  const message = await chatModel.findMessageRoom(req.params.messageId);
  if (!message) return next(new AppError('Không tìm thấy tin nhắn', 404));

  const membership = await chatModel.checkRoomMembership(message.room_id, req.user.id);
  if (!membership) return next(new AppError('Bạn không có quyền thao tác tin nhắn này', 403));

  if (message.sender_id !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('Chỉ người gửi mới được thu hồi tin nhắn', 403));
  }

  await require('../files/files.service').deleteStoredFilesForMessage(req.params.messageId);
  await chatModel.recallMessage(req.params.messageId);

  const { getIo } = require('../../websockets/socket.manager');
  const members = await chatModel.getRoomMemberIds(message.room_id);
  members.forEach(member => {
    getIo().to(member.user_id).emit('message_recalled', {
      messageId: req.params.messageId
    });
  });

  res.status(200).json({ status: 'success' });
});

exports.reactToMessage = catchAsync(async (req, res, next) => {
  const { emoji } = req.body;
  const userId = req.user.id;

  const message = await chatModel.findMessageRoom(req.params.messageId);
  if (!message) return next(new AppError('Không tìm thấy tin nhắn', 404));

  const membership = await chatModel.checkRoomMembership(message.room_id, userId);
  if (!membership) return next(new AppError('Bạn không có quyền thao tác tin nhắn này', 403));

  const reactions = message.reactions && typeof message.reactions === 'object'
    ? { ...message.reactions }
    : {};
  if (emoji) {
    reactions[userId] = emoji;
  } else {
    delete reactions[userId];
  }

  await chatModel.reactToMessage(req.params.messageId, reactions);

  const { getIo } = require('../../websockets/socket.manager');
  const members = await chatModel.getRoomMemberIds(message.room_id);
  members.forEach(member => {
    getIo().to(member.user_id).emit('message_reacted', {
      messageId: req.params.messageId,
      reactions
    });
  });

  res.status(200).json({ status: 'success' });
});
