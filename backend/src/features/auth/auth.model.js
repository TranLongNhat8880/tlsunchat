const supabase = require('../../config/database');

const isMissingSessionTableError = (error) => (
  error?.code === '42P01'
  || error?.code === 'PGRST205'
  || String(error?.message || '').includes('auth_sessions')
);

exports.findByEmail = async (email) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // Bỏ qua lỗi không tìm thấy
  return data;
};

exports.findById = async (id) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

exports.createUser = async (userData) => {
  const { data, error } = await supabase
    .from('users')
    .insert([userData])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      const err = new Error('Email này đã được sử dụng');
      err.isDuplicate = true;
      throw err;
    }
    throw error;
  }
  return data;
};

exports.updatePassword = async (userId, password_hash) => {
  const { error } = await supabase
    .from('users')
    .update({ password_hash })
    .eq('id', userId);

  if (error) throw error;
};

exports.createSession = async (sessionData) => {
  const { data, error } = await supabase
    .from('auth_sessions')
    .insert([sessionData])
    .select()
    .single();

  if (error) {
    if (isMissingSessionTableError(error)) {
      console.warn('auth_sessions table is missing; issuing legacy non-revocable token');
      return null;
    }
    throw error;
  }

  return data;
};

exports.findSessionById = async (sessionId) => {
  const { data, error } = await supabase
    .from('auth_sessions')
    .select('id, user_id, expires_at, revoked_at')
    .eq('id', sessionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116' || isMissingSessionTableError(error)) return null;
    throw error;
  }

  return data;
};

exports.revokeSession = async (sessionId, userId) => {
  const { error } = await supabase
    .from('auth_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('user_id', userId)
    .is('revoked_at', null);

  if (error) {
    if (isMissingSessionTableError(error)) return;
    throw error;
  }
};
