self.addEventListener('push', (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch (error) {
    payload = {
      title: 'TLSunChat',
      body: event.data ? event.data.text() : 'Ban co tin nhan moi'
    };
  }

  const title = payload.title || 'TLSunChat';
  const notificationIcon = payload.icon || '/pwa-192x192.png';
  const options = {
    body: payload.body || 'Ban co tin nhan moi',
    icon: notificationIcon,
    badge: payload.badge || '/pwa-badge.svg',
    tag: payload.tag || 'tlsunchat-message',
    renotify: true,
    timestamp: payload.timestamp || Date.now(),
    vibrate: payload.vibrate || [180, 70, 180],
    actions: payload.actions || [
      { action: 'open', title: 'Mo chat' }
    ],
    data: {
      url: payload.url || '/'
    }
  };

  if (payload.image && payload.image !== notificationIcon) {
    options.image = payload.image;
  }

  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (client.focused) {
        return; // App is focused, frontend will handle the notification if needed
      }
    }
    return self.registration.showNotification(title, options);
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin);
  const roomId = targetUrl.searchParams.get('room');
  const messageId = targetUrl.searchParams.get('message');
  const openMessage = {
    type: 'TLSUNCHAT_OPEN_NOTIFICATION',
    roomId,
    messageId,
    url: targetUrl.pathname + targetUrl.search
  };

  event.waitUntil((async () => {
    const windows = await clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });

    for (const client of windows) {
      if ('focus' in client) {
        client.postMessage(openMessage);
        await client.focus();
        return;
      }
    }

    if (clients.openWindow) {
      await clients.openWindow(targetUrl.href);
    }
  })());
});
