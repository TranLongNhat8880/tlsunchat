const supabase = require('../../config/database');

exports.createSubscription = async (userId, subscription) => {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .insert([{
      user_id: userId,
      subscription: subscription
    }]);

  if (error) throw new Error(error.message);
  return data;
};
