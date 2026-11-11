// BhumiSutra service worker — offline-first app shell cache.
// Bump CACHE_VERSION whenever any cached file changes so clients pick up the update.
const CACHE_VERSION = 'bhumisutra-v4';

const PRECACHE_URLS = [
  './',
  'index.html',
  'manifest.json',
  'assets/favicon.svg',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'assets/css/fonts.css',
  'assets/css/style.css',
  'assets/fonts/galada-bengali-400-normal.woff2',
  'assets/fonts/galada-latin-400-normal.woff2',
  'assets/fonts/hind-siliguri-bengali-400-normal.woff2',
  'assets/fonts/hind-siliguri-bengali-500-normal.woff2',
  'assets/fonts/hind-siliguri-bengali-600-normal.woff2',
  'assets/fonts/hind-siliguri-bengali-700-normal.woff2',
  'assets/fonts/hind-siliguri-latin-400-normal.woff2',
  'assets/fonts/hind-siliguri-latin-500-normal.woff2',
  'assets/fonts/hind-siliguri-latin-600-normal.woff2',
  'assets/fonts/hind-siliguri-latin-700-normal.woff2',
  'assets/fonts/jetbrains-mono-latin-400-normal.woff2',
  'assets/fonts/jetbrains-mono-latin-500-normal.woff2',
  'assets/fonts/noto-serif-bengali-bengali-400-normal.woff2',
  'assets/fonts/noto-serif-bengali-bengali-700-normal.woff2',
  'assets/fonts/noto-serif-bengali-latin-400-normal.woff2',
  'assets/fonts/noto-serif-bengali-latin-700-normal.woff2',
  'assets/fonts/tiro-bangla-bengali-400-normal.woff2',
  'assets/fonts/tiro-bangla-latin-400-normal.woff2',
  'assets/js/app.js',
  'assets/js/assistant.js',
  'assets/js/auth.js',
  'assets/js/crypto.js',
  'assets/js/data.js',
  'assets/js/engine.js',
  'assets/js/i18n.js',
  'assets/js/i18n2.js',
  'assets/js/i18n3.js',
  'assets/js/i18n4.js',
  'assets/js/ledger.js',
  'assets/js/ocr.js',
  'assets/js/risk.js',
  'assets/js/security.js',
  'assets/js/sync.js',
  'assets/js/ui.js',
  'assets/js/views.js',
  'assets/js/views2.js',
  'assets/js/views3.js',
  'assets/js/views4.js',
  'assets/vendor/qrcode.js',
  'assets/vendor/tesseract/LICENSE-tesseract.js.md',
  'assets/vendor/tesseract/core/tesseract-core-lstm.wasm.js',
  'assets/vendor/tesseract/core/tesseract-core-simd-lstm.wasm.js',
  'assets/vendor/tesseract/lang/ben.traineddata.gz',
  'assets/vendor/tesseract/lang/eng.traineddata.gz',
  'assets/vendor/tesseract/tesseract.min.js',
  'assets/vendor/tesseract/worker.min.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Cache-first for everything in the app shell; same-origin GET requests fall back
// to the network and get cached for next time, so a first online visit also
// warms the cache for anything not explicitly precached.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match('index.html'));
    })
  );
});
