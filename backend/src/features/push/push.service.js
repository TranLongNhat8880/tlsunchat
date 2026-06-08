const webpush = require('web-push');
const pushModel = require('./push.model');
const AppError = require('../../core/errors/AppError');

const configureWebPush = () => {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    throw new AppError('Chua cau hinh VAPID keys', 500);
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@tlsunchat.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
};

exports.subscribe = async (userId, subscription) => {
  try {
    await pushModel.createSubscription(userId, subscription);
  } catch (error) {
    throw new AppError('Loi khi luu dang ky Push Notification', 500);
  }
};

exports.sendPushNotification = async (subscription, payload) => {
  configureWebPush();
  return webpush.sendNotification(subscription, JSON.stringify(payload));
};

exports.sendPushToUsers = async (userIds, payload) => {
  const subscriptions = await pushModel.findByUserIds(Array.from(new Set(userIds)));
  if (subscriptions.length === 0) return;

  await Promise.allSettled(subscriptions.map(async (item) => {
    try {
      await exports.sendPushNotification(item.subscription, payload);
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) {
        await pushModel.deleteById(item.id);
        return;
      }

      console.error('Failed to send push notification:', error.message);
    }
  }));
};
