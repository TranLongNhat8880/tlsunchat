const webpush = require('web-push');
const pushModel = require('./push.model');
const AppError = require('../../core/errors/AppError');

exports.subscribe = async (userId, subscription) => {
  try {
    await pushModel.createSubscription(userId, subscription);
  } catch (error) {
    throw new AppError('Lỗi khi lưu đăng ký Push Notification', 500);
  }
};

exports.sendPushNotification = async (subscription, payload) => {
  try {
    webpush.setVapidDetails(
      'mailto:admin@tlsunchat.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (error) {
    console.error('Lỗi gửi Push Notification:', error);
  }
};
