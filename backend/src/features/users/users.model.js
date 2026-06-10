const supabase = require('../../config/database');

exports.findAllUsersExcept = async (userId) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, avatar, role, is_active, last_seen')
    .neq('id', userId)
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return data;
};

exports.getAdminUsersPaginated = async (page, limit, search) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('users')
    .select('id, name, email, avatar, role, is_active, last_seen, created_at', { count: 'exact' });

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  return { users: data, total: count };
};

exports.deleteUser = async (userId) => {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId);

  if (error) throw new Error(error.message);
};

exports.updateUserStatus = async (userId, isActive) => {
  const { data, error } = await supabase
    .from('users')
    .update({ is_active: isActive })
    .eq('id', userId)
    .select('id, name, email, avatar, role, is_active, last_seen, created_at')
    .single();

  if (error) throw new Error(error.message);
  return data;
};

exports.updateUserAvatar = async (userId, avatarUrl) => {
  const { error } = await supabase
    .from('users')
    .update({ avatar: avatarUrl })
    .eq('id', userId);

  if (error) throw new Error(error.message);
};

exports.updateUserName = async (userId, name) => {
  const { error } = await supabase
    .from('users')
    .update({ name })
    .eq('id', userId);

  if (error) throw new Error(error.message);
};
