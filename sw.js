/* FileKit Production Service Worker — 100% Offline Capability */
const CACHE_NAME = 'filekit-core-v20261020_v02';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/favicon.svg',
  '/dist/css/styles.min.css',
  '/dist/css/edit-pdf.min.css',
  '/dist/css/organize-pdf.min.css',
  '/dist/css/local-fonts.min.css',
  '/dist/css/mac-theme.css',
  '/dist/js/app.min.js',
  '/dist/js/tools.min.js',
  '/dist/js/tools-new.min.js',
  '/dist/js/tools-premium.min.js',
  '/dist/js/tools-premium2.min.js',
  '/dist/js/auth-license.min.js',
  '/dist/js/mac-bridge.min.js',
  '/js/pdf-compress-worker.js',
  '/js/image-compress-worker.js',
  '/js/bg-remove-worker.js',
  '/assets/portrait_model_cutout.png',
  '/vendor/pdf-lib.min.js',
  '/vendor/pdfjs.min.js',
  '/vendor/pdf.worker.min.js',
  '/vendor/fflate.js',
  '/vendor/jszip.min.js',
  '/vendor/exifr.js',
  '/assets/favicon.svg',
  '/assets/favicon-48x48.png',
  '/assets/filekit-logo.svg'
];

// Pre-cache core files on installation
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use addAll with error resilience
      return Promise.allSettled(
        PRECACHE_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[FileKit SW] Failed to precache:', url, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// Purge obsolete caches on activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[FileKit SW] Removing stale cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Resilient Offline Fetch Handler
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Ignore non-GET or chrome-extension schemes
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;

  // 1. Navigation requests (HTML pages) -> Network-First, fall back to cached index.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const copy = networkRes.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          }
          return networkRes;
        })
        .catch(() => caches.match('/index.html').then((res) => res || caches.match('/')))
    );
    return;
  }

  // 2. Static Assets (dist, assets, vendor, fonts) -> Cache-First, fall back to network
  event.respondWith(
    caches.match(req).then((cachedRes) => {
      if (cachedRes) return cachedRes;

      return fetch(req).then((networkRes) => {
        // Cache successful responses for vendor, dist, assets, and font items
        if (
          networkRes &&
          networkRes.status === 200 &&
          (req.url.includes('/dist/') ||
            req.url.includes('/assets/') ||
            req.url.includes('/vendor/') ||
            req.url.includes('fonts.gstatic.com'))
        ) {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        }
        return networkRes;
      });
    })
  );
});
