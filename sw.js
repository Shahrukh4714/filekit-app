/* FileKit Service Worker — Enables 100% offline document workflows */
const CACHE_NAME = 'filekit-cache-v107';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/dist/css/styles.min.css',
  '/dist/css/edit-pdf.min.css',
  '/dist/css/organize-pdf.min.css',
  '/dist/css/local-fonts.min.css',
  '/dist/js/app.min.js',
  '/dist/js/tools.min.js',
  '/dist/js/tools-new.min.js',
  '/dist/js/tools-premium.min.js',
  '/dist/js/tools-premium2.min.js',
  '/js/pdf-compress-worker.js',
  '/js/image-compress-worker.js',
  '/vendor/avif/avif_enc.js',
  '/vendor/avif/avif_enc.wasm',
  '/vendor/mozjpeg/mozjpeg_enc.js',
  '/vendor/mozjpeg/mozjpeg_enc.wasm',
  '/assets/favicon.svg',
  '/assets/filekit-icon-4colors.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('[SW] Pre-cache partial fail:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // For same-origin navigation requests (HTML), try network first, then cache, fallback to index.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/index.html') || caches.match('/'))
    );
    return;
  }

  // Network-first for local assets so updates are immediate
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req).then((networkRes) => {
        if (networkRes && networkRes.status === 200) {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone));
        }
        return networkRes;
      }).catch(() => caches.match(req))
    );
  }
});












