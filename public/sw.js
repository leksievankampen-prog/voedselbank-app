/* Service worker voor de PWA: ontvangt de meldingen van de Voedselbank. */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch (error) {
    payload = { title: 'Voedselbank Haarlemmermeer', body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Voedselbank Haarlemmermeer', {
      body: payload.body || '',
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      lang: payload.lang || 'nl',
      dir: payload.lang === 'ar' ? 'rtl' : 'ltr',
      tag: payload.url || 'nieuws',
      renotify: !!payload.urgent,
      requireInteraction: !!payload.urgent,
      data: { url: payload.url || '/nieuws' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/nieuws';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
