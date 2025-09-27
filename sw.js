const CACHE_VERSION = 'v1.44'; // Øk dette tallet når du endrer noe
const CACHE_NAME = `budsjett-cache-${CACHE_VERSION}`;

// Versjonsstyrte filer (cache-busting med query params for ikoner)
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/base.js',
  '/utils.js',
  '/manifest.json',
  '/icon-192.png?v=' + CACHE_VERSION,
  '/icon-512.png?v=' + CACHE_VERSION,
  '/sponsor.png?v=' + CACHE_VERSION,
  '/changelog.md?v=' + CACHE_VERSION
];

// --- Install: cache everything ---
self.addEventListener('install', (e) => {
  console.log('[SW] Installing new version:', CACHE_VERSION);
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting()) // tar over med en gang
  );
});

// --- Activate: remove old caches ---
self.addEventListener('activate', (e) => {
  console.log('[SW] Activating new version:', CACHE_VERSION);
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// --- Fetch: cache first, then network ---
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request)
      .then(cached => {
        if (cached) return cached;

        return fetch(e.request).then(networkRes => {
          // Bare cache GET-requests med status 200
          if (e.request.method === 'GET' && networkRes && networkRes.status === 200) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          }
          return networkRes;
        });
      })
      .catch(() => {
        // Fallback hvis offline og dokument ikke finnes
        if (e.request.destination === 'document') {
          return caches.match('/');
        }
      })
  );
});

// --- Message handling ---
self.addEventListener('message', async (event) => {
  const clients = await self.clients.matchAll();

  // Clear all caches
  if (event.data === 'CLEAR_CACHE') {
    console.log('[SW] CLEAR_CACHE received');
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    console.log('[SW] All caches cleared');
    clients.forEach(c => c.navigate(c.url));
  }

  // Force update: new SW takes over and reloads clients
  if (event.data?.type === 'FORCE_UPDATE') {
    console.log('[SW] FORCE_UPDATE received');
    await self.skipWaiting();
    clients.forEach(c => c.navigate(c.url));
  }

  // Skip waiting (generic)
  if (event.data?.type === 'SKIP_WAITING') {
    console.log('[SW] SKIP_WAITING received');
    self.skipWaiting();
  }

  // Respond to entries request
  if (event.data?.type === 'REQUEST_ENTRIES') {
    const stored = await event.source?.postMessage({
      type: 'ENTRIES_DATA',
      entries: localStorage.getItem ? localStorage.getItem("entries") : null
    });
  }
});
