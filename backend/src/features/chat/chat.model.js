const supabase = require('../../config/database');

exports.findRoomsByUserId = async (userId) => {
  const { data, error } = await supabase
    .from('room_members')
    .select(`
      room_id,
      joined_at,
      is_pinned,
      rooms (
        id, name, type, created_at,
        room_members (
          user_id,
          users ( id, name, avatar )
        )
      )
    `)
    .eq('user_id', userId)
    .order('joined_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
};

exports.findLastMessageForRoom = async (roomId) => {
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(1);
  return data && data.length > 0 ? data[0] : null;
};

exports.findRoomById = async (roomId) => {
  const { data, error } = await supabase
    .from('rooms')
    .select('id, type')
    .eq('id', roomId)
    .single();

  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  return data;
};

exports.checkRoomMembership = async (roomId, userId) => {
  const { data, error } = await supabase
    .from('room_members')
    .select('id, is_pinned')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  return data;
};

exports.removeRoomMember = async (roomId, userId) => {
  const { error } = await supabase
    .from('room_members')
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
};

exports.findMessagesByRoomId = async (roomId, limit = 50, before = null) => {
  let query = supabase
    .from('messages')
    .select(`
      *,
      users (id, name, avatar),
      files (id, original_name, r2_key, file_type, file_size),
      reply_to:messages!reply_to_id (id, content, type, users(id, name))
    `)
    .eq('room_id', roomId)
    .order('created_at', { ascending: false });

  if (before) {
    query = query.lt('created_at', before);
  }

  const { data, error } = await query.limit(limit);

  if (error) throw new Error(error.message);
  return data;
};

exports.findDirectRoomByUsers = async (userId1, userId2) => {
  const { data: myRooms } = await supabase
    .from('room_members')
    .select('room_id')
    .eq('user_id', userId1);
    
  if (myRooms && myRooms.length > 0) {
    const roomIds = myRooms.map(r => r.room_id);
    const { data: existingRoom } = await supabase
      .from('room_members')
      .select('room_id, rooms!inner(type)')
      .in('room_id', roomIds)
      .eq('user_id', userId2)
      .eq('rooms.type', 'direct')
      .limit(1);

    if (existingRoom && existingRoom.length > 0) {
      return existingRoom[0];
    }
  }
  return null;
};

exports.createRoom = async (roomData) => {
  const { data, error } = await supabase
    .from('rooms')
    .insert([roomData])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

exports.deleteRoom = async (roomId) => {
  const { error } = await supabase
    .from('rooms')
    .delete()
    .eq('id', roomId);

  if (error) throw new Error(error.message);
};

exports.addRoomMembers = async (membersData) => {
  const { error } = await supabase
    .from('room_members')
    .insert(membersData);

  if (error) throw new Error(error.message);
};

exports.updateRoomPinStatus = async (roomId, userId, isPinned) => {
  const { error } = await supabase
    .from('room_members')
    .update({ is_pinned: isPinned })
    .eq('room_id', roomId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
};

exports.saveMessage = async (messageData) => {
  const { data, error } = await supabase
    .from('messages')
    .insert([messageData])
    .select('*, users(id, name, avatar), reply_to:messages!reply_to_id(id, content, type, users(id, name))')
    .single();

  if (error) throw new Error(error.message);
  return data;
};

exports.getRoomMemberIds = async (roomId) => {
  const { data, error } = await supabase
    .from('room_members')
    .select('user_id')
    .eq('room_id', roomId);

  if (error) throw new Error(error.message);
  return data;
};

exports.countRoomMembers = async (roomId) => {
  const { count, error } = await supabase
    .from('room_members')
    .select('id', { count: 'exact', head: true })
    .eq('room_id', roomId);

  if (error) throw new Error(error.message);
  return count || 0;
};

exports.findMessageRoom = async (messageId) => {
  const { data, error } = await supabase
    .from('messages')
    .select('id, room_id, sender_id, reactions, is_pinned')
    .eq('id', messageId)
    .single();

  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  return data;
};

exports.countPinnedMessages = async (roomId) => {
  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('room_id', roomId)
    .eq('is_pinned', true);

  if (error) throw new Error(error.message);
  return count || 0;
};

exports.pinMessage = async (messageId, isPinned) => {
  const { error } = await supabase
    .from('messages')
    .update({ is_pinned: isPinned })
    .eq('id', messageId);

  if (error) throw new Error(error.message);
};

exports.recallMessage = async (messageId) => {
  const { error } = await supabase
    .from('messages')
    .update({
      content: '__MESSAGE_RECALLED__',
      type: 'text',
      is_pinned: false,
      reactions: {},
      reply_to_id: null
    })
    .eq('id', messageId);

  if (error) throw new Error(error.message);
};

exports.reactToMessage = async (messageId, reactions) => {
  const { error } = await supabase
    .from('messages')
    .update({ reactions })
    .eq('id', messageId);

  if (error) throw new Error(error.message);
};
