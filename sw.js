const CACHE_NAME = 'budsjett-cache-v1.073'; // øk versjon for å invalidere gammel cache
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/base.js',
  '/utils.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/changelog.md'
];

// --- Install: cache everything ---
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting(); // activate immediately
});

// --- Activate: remove old caches ---
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

// --- Fetch: serve cached first, fallback to network ---
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;

      return fetch(e.request).then(networkRes => {
        // cache new files dynamically
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(e.request, networkRes.clone());
          return networkRes;
        });
      });
    }).catch(() => {
      // fallback if offline and not cached
      if (e.request.destination === 'document') return caches.match('/');
    })
  );
});

// --- Optional: listen for message to clear cache from page ---
self.addEventListener('message', async (e) => {
  if (e.data === 'CLEAR_CACHE') {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    console.log('[SW] Cleared all caches');
  }
});
