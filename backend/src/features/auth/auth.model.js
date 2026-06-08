const supabase = require('../../config/database');

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
