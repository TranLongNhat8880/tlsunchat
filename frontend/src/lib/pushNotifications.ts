import api from './api';

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
};

export const registerPushNotifications = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    throw new Error('Thiet bi nay khong ho tro push notification');
  }

  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') {
    throw new Error('Ban chua cap quyen thong bao');
  }

  const { data } = await api.get('/push/vapid-public-key');
  const publicKey = data?.data?.publicKey;
  if (!publicKey) {
    throw new Error('Server chua cau hinh VAPID public key');
  }

  const registration = await navigator.serviceWorker.register('/push-sw.js', {
    scope: '/push/'
  });

  const existingSubscription = await registration.pushManager.getSubscription();
  const subscription = existingSubscription || await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey)
  });

  await api.post('/push/subscribe', subscription.toJSON());
};
