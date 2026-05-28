// SafeHer Service Worker — v2.0.0
const CACHE_NAME = 'safeher-v2.0.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
];

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Cache individual assets, don't fail if one is missing
        return Promise.allSettled(STATIC_ASSETS.map((url) => cache.add(url).catch(() => {})));
      });
    })
  );
  self.skipWaiting();
});

// ── Activate & clean old caches ───────────────────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch strategy ─────────────────────────────────────────────────────────────
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Always network-first for Firebase/Google APIs
  const isExternalAPI = (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebase.googleapis.com') ||
    url.hostname.includes('nominatim.openstreetmap.org') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('maps.googleapis.com')
  );

  if (isExternalAPI) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          // Cache Google Fonts for offline
          if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first for app shell assets; network fallback → index.html for SPA
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;

      return fetch(e.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          }
          return res;
        })
        .catch(() => {
          // SPA fallback — return cached index.html for navigation requests
          if (e.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
    })
  );
});

// ── Push notification handler ─────────────────────────────────────────────────
self.addEventListener('push', (e) => {
  const data = e.data?.json() || {};
  e.waitUntil(
    self.registration.showNotification(data.title || '🚨 SafeHer Alert', {
      body: data.body || 'You have an emergency notification',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: 'safeher-alert',
      requireInteraction: true,
      vibrate: [500, 100, 500],
      data: { url: data.url || '/' },
    })
  );
});

// ── Notification click handler ────────────────────────────────────────────────
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      const url = e.notification.data?.url || '/';
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
