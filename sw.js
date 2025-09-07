const CACHE_NAME = 'budsjett-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/base.js',
  '/utils.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
  // add any other assets you load, like images or utils.js
];

// Install: cache everything
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting(); // activate immediately
});

// Activate: remove old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }))
    )
  );
  self.clients.claim();
});

// Fetch: serve cached first, fallback to network
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(networkRes => {
        // optionally cache new files dynamically
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
