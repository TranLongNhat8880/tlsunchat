const supabase = require('../../config/database');

exports.findRoomMember = async (roomId, userId) => {
  const { data, error } = await supabase
    .from('room_members')
    .select('id')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .single();
    
  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  return data;
};

exports.findFileWithAccess = async (fileId, userId) => {
  const { data: file, error: fileErr } = await supabase
    .from('files')
    .select('id, r2_key, original_name, file_type, file_size, message_id, messages(room_id)')
    .eq('id', fileId)
    .single();

  if (fileErr || !file) return null;

  const roomId = file.messages?.room_id;
  if (!roomId) return null;
  const { data: member, error: memberErr } = await supabase
    .from('room_members')
    .select('id')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .single();

  if (memberErr || !member) return null;

  return file;
};

exports.findFilesByMessageId = async (messageId) => {
  const { data, error } = await supabase
    .from('files')
    .select('id, r2_key, original_name, file_type, file_size, message_id')
    .eq('message_id', messageId);

  if (error) throw new Error(error.message);
  return data || [];
};

exports.deleteFileRecordsByMessageId = async (messageId) => {
  const { error } = await supabase
    .from('files')
    .delete()
    .eq('message_id', messageId);

  if (error) throw new Error(error.message);
};

exports.findMessageToAttach = async (messageId, userId) => {
  const { data, error } = await supabase
    .from('messages')
    .select('id, room_id')
    .eq('id', messageId)
    .eq('sender_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  return data;
};

exports.createFileRecord = async (fileData) => {
  const { data, error } = await supabase
    .from('files')
    .insert([fileData])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

exports.getAdminFilesPaginated = async (page, limit) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, count, error } = await supabase
    .from('files')
    .select('*, users(name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);
  
  return { files: data, total: count };
};

exports.getTotalStorage = async () => {
  // Vì không thể dùng sum() trực tiếp trên JS client dễ dàng, ta fetch column file_size
  // Cân nhắc dùng RPC nếu file quá nhiều, nhưng hiện tại lấy ra mảng file_size tính tổng là ok
  const { data, error } = await supabase
    .from('files')
    .select('file_size');

  if (error) throw new Error(error.message);
  
  const totalBytes = data.reduce((acc, file) => acc + (file.file_size || 0), 0);
  return totalBytes;
};
