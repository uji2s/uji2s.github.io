const CACHE_NAME = 'budsjett-cache-v1.32';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/base.js',
  '/utils.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/sponsor.png',
  '/changelog.md'
];

// --- Install: cache everything ---
self.addEventListener('install', (e) => {
  console.log('[SW] Installing...');
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE)));
  self.skipWaiting(); // activate immediately
});

// --- Activate: remove old caches ---
self.addEventListener('activate', (e) => {
  console.log('[SW] Activating...');
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => key !== CACHE_NAME && caches.delete(key)))
    )
  );
  self.clients.claim();
});

// --- Fetch: cache first, fallback to network ---
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request)
      .then(cached => cached || fetch(e.request).then(networkRes => {
        if (e.request.method === 'GET' && networkRes && networkRes.status === 200) {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return networkRes;
      }))
      .catch(() => e.request.destination === 'document' ? caches.match('/') : undefined)
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
    // reload all clients
    clients.forEach(c => c.navigate(c.url));
  }

  // Force update: new SW takes over
  if (event.data?.type === 'FORCE_UPDATE') {
    console.log('[SW] FORCE_UPDATE received');
    self.skipWaiting(); // activate new SW immediately
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
