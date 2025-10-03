// Simple service worker for caching app shell and album images
const CACHE_NAME = 'slv-cache-v1';
const APP_SHELL = [
  './',
  './index.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => k !== CACHE_NAME && caches.delete(k))))
  );
  self.clients.claim();
});

// Cache-first for images, network-first for HTML, cache-first for same-origin GETs otherwise
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET
  if (req.method !== 'GET') return;

  // Cache-first strategy for images (including remote album art)
  if (req.destination === 'image' || /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req, { mode: 'no-cors' }).then((resp) => {
          const toCache = resp && (resp.type === 'opaque' || (resp.status >= 200 && resp.status < 400));
          if (toCache) {
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resp.clone())).catch(() => {});
          }
          return resp;
        }).catch(() => cached);
      })
    );
    return;
  }

  // For HTML, prefer network, fallback to cache
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then((c) => c.put('./', copy)).catch(() => {});
        return resp;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Same-origin GETs: cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((resp) => {
        caches.open(CACHE_NAME).then((c) => c.put(req, resp.clone())).catch(() => {});
        return resp;
      }))
    );
  }
});
