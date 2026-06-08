const chatModel = require('./chat.model');
const AppError = require('../../core/errors/AppError');

exports.getMyRooms = async (userId) => {
  try {
    const rooms = await chatModel.findRoomsByUserId(userId);

    const roomsWithLastMessage = await Promise.all(rooms.map(async (roomEntry) => {
      const lastMessage = await chatModel.findLastMessageForRoom(roomEntry.room_id);
      return {
        ...roomEntry,
        last_message: lastMessage
      };
    }));

    return roomsWithLastMessage;
  } catch (error) {
    throw new AppError('Không thể tải danh sách phòng', 500);
  }
};

exports.getRoomMessages = async (roomId, userId) => {
  const member = await chatModel.checkRoomMembership(roomId, userId);
  if (!member) {
    throw new AppError('Bạn không có quyền xem tin nhắn phòng này', 403);
  }

  try {
    const messages = await chatModel.findMessagesByRoomId(roomId, 50);
    return messages.reverse();
  } catch (error) {
    throw new AppError('Không thể tải lịch sử tin nhắn', 500);
  }
};

exports.createRoom = async (name, type, memberIds, currentUserId) => {
  if (type === 'direct' && memberIds.length === 1) {
    const existingRoom = await chatModel.findDirectRoomByUsers(currentUserId, memberIds[0]);
    if (existingRoom) {
      return { isExisting: true, roomId: existingRoom.room_id };
    }
  }

  let newRoom;
  try {
    newRoom = await chatModel.createRoom({ name, type, created_by: currentUserId });

    const allMembers = Array.from(new Set([currentUserId, ...memberIds]));
    const membersData = allMembers.map(id => ({
      room_id: newRoom.id,
      user_id: id
    }));

    await chatModel.addRoomMembers(membersData);

    return { isExisting: false, room: newRoom };
  } catch (error) {
    if (newRoom?.id) {
      try {
        await chatModel.deleteRoom(newRoom.id);
      } catch (cleanupError) {
        console.error('Failed to cleanup orphan room:', cleanupError.message);
      }
    }
    throw new AppError('Lỗi khi tạo phòng hoặc thêm thành viên', 500);
  }
};

exports.togglePinRoom = async (roomId, userId) => {
  const member = await chatModel.checkRoomMembership(roomId, userId);
  if (!member) {
    throw new AppError('Không tìm thấy phòng', 404);
  }

  try {
    const newPinStatus = !member.is_pinned;
    await chatModel.updateRoomPinStatus(roomId, userId, newPinStatus);
    return newPinStatus;
  } catch (error) {
    throw new AppError('Không thể ghim phòng chat', 500);
  }
};
