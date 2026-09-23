// GCTU Campus Navigator Service Worker
const CACHE_NAME = 'gctu-navigator-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/src/main.jsx',
  '/src/App.jsx',
  '/src/index.css',
  '/src/data/buildings.js',
  '/src/components/CampusHome.jsx',
  '/src/components/NavigationPanel.jsx',
  '/src/components/HelpDesk.jsx'
];

// Install: Cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell');
      // Cache each asset on its own. cache.addAll() rejects outright if any
      // single URL fails, and the /src/* entries only exist on the dev server,
      // so a production install used to abort and leave no offline support.
      return Promise.allSettled(ASSETS_TO_CACHE.map((url) => cache.add(url)));
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Basemap tile hosts. A miss on any of these falls back to the offline
// blueprint placeholder rather than a broken image.
const TILE_HOSTS = ['basemaps.cartocdn.com', 'tile.openstreetmap.org'];

const offlineResponse = () =>
  new Response('', { status: 503, statusText: 'Offline' });

// API data changes (tickets get replied to), so it must come from the network
// whenever there is one. Serving it cache-first handed the Help Desk a stale
// ticket list and hid the bot's reply. The cache is only an offline fallback,
// and admin (Authorization) responses are never stored on the device.
function networkFirst(request) {
  return fetch(request).then((networkResponse) => {
    const authenticated = request.headers && request.headers.get('Authorization');
    if (networkResponse.status === 200 && !authenticated) {
      const cacheCopy = networkResponse.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, cacheCopy));
    }
    return networkResponse;
  }).catch(() =>
    caches.match(request).then((cachedResponse) => cachedResponse || offlineResponse())
  );
}

// Fetch: Serve from cache with Network Fallback
self.addEventListener('fetch', (event) => {
  // Exclude non-GET requests or browser extensions (chrome-extension://)
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  if (new URL(event.request.url).pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return from cache; fetch from network in background to update
        fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {/* Ignore network update fails when offline */});

        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        // Cache newly requested tiles or fonts on-the-fly
        if (networkResponse.status === 200) {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cacheCopy);
          });
        }
        return networkResponse;
      }).catch((err) => {
        // Fallback for when offline and resource not cached
        console.log('[Service Worker] Fetch failed, network offline', err);
        // Map tiles get a "Map Offline" placeholder instead of a broken image.
        if (TILE_HOSTS.some((host) => event.request.url.includes(host))) {
          return new Response(
            `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" style="background:#f0eedb"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" fill="#999" font-size="12">Map Offline</text></svg>`,
            { headers: { 'Content-Type': 'image/svg+xml' } }
          );
        }
        // A page load (any client-side URL) can still be served by the cached
        // app shell. Anything else gets a real error response rather than
        // `undefined`, which respondWith() rejects as a network error.
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html').then((shell) => shell || offlineResponse());
        }
        return offlineResponse();
      });
    })
  );
});
