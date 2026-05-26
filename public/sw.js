// GCTU Campus Navigator Service Worker
const CACHE_NAME = 'gctu-navigator-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/src/main.jsx',
  '/src/App.jsx',
  '/src/index.css',
  '/src/data/buildings.js',
  '/src/components/CampusHome.jsx',
  '/src/components/NavigationPanel.jsx',
  '/src/components/HelpDesk.jsx',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Install: Cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell and CDNs');
      return cache.addAll(ASSETS_TO_CACHE);
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

// Fetch: Serve from cache with Network Fallback
self.addEventListener('fetch', (event) => {
  // Exclude non-GET requests or browser extensions (chrome-extension://)
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
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
        // If it's a tile image, we can return a local empty SVG or similar placeholder
        if (event.request.url.includes('tile.openstreetmap.org')) {
          return new Response(
            `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" style="background:#f0eedb"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" fill="#999" font-size="12">Map Offline</text></svg>`,
            { headers: { 'Content-Type': 'image/svg+xml' } }
          );
        }
      });
    })
  );
});
