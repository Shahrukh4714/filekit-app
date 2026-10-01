/* FileKit Service Worker — Enables 100% offline document workflows */
const CACHE_NAME = 'filekit-cache-v20260925_v262';
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
  '/vendor/webp/webp_enc.js',
  '/vendor/webp/webp_enc.wasm',
  '/assets/favicon.svg',
  '/assets/filekit-icon-4colors.svg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => caches.delete(k)));
    }).then(() => self.registration.unregister()).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Pass directly through to network with no caching
});













