// Bump CACHE_NAME on every content change so phones fetch the new build.
const CACHE_NAME = 'aadi-ledger-v17';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './ledger-icon-192.png',
  './ledger-icon-512.png',
  './ledger-touch-180.png',
  './fonts/42dot-sans.woff2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Pages: network first (3s cap) so updates show up, cache as the offline fallback.
// Everything else on this origin: cache first. Cross-origin (fonts) is left alone.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      Promise.race([
        fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put('./index.html', copy));
          return res;
        }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))
      ]).catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).catch(() => caches.match('./index.html')))
  );
});
