const supabase = require('../../config/database');

exports.createSubscription = async (userId, subscription) => {
  const { data: existing, error: findError } = await supabase
    .from('push_subscriptions')
    .select('id')
    .eq('user_id', userId)
    .contains('subscription', { endpoint: subscription.endpoint })
    .limit(1);

  if (findError) throw new Error(findError.message);

  if (existing && existing.length > 0) {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .update({ subscription })
      .eq('id', existing[0].id)
      .select();

    if (error) throw new Error(error.message);
    return data;
  }

  const { data, error } = await supabase
    .from('push_subscriptions')
    .insert([{ user_id: userId, subscription }])
    .select();

  if (error) throw new Error(error.message);
  return data;
};

exports.findByUserIds = async (userIds) => {
  if (!userIds || userIds.length === 0) return [];

  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('id, user_id, subscription')
    .in('user_id', userIds);

  if (error) throw new Error(error.message);
  return data || [];
};

exports.deleteById = async (id) => {
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
};
