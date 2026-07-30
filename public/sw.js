self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    self.registration.showNotification(data.title || 'Fundora Alert', {
      body: data.body || '',
      icon: data.icon || '/favicon.png',
      badge: '/favicon.png',
      vibrate: [200, 100, 200],
      data: data.data || {}
    });
  } catch (e) {
    self.registration.showNotification('Fundora Notification', {
      body: event.data.text()
    });
  }
});
