// Newsroom Nine service worker: makes the app work offline.
// When you change any file, change VERSION so installed copies refresh.
const VERSION = 'newsroom-nine-v2';

const CORE = [
  './',
  'index.html',
  'style.css',
  'game.js',
  'manifest.webmanifest',
  'cases/index.json',
  'icons/favicon.png',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(CORE);
    // Also store every case listed in cases/index.json, so new cases work offline with no edits here.
    try {
      const res = await fetch('cases/index.json', { cache: 'no-store' });
      const idx = await res.json();
      await cache.addAll(idx.cases.map((c) => 'cases/' + c.file));
    } catch (err) { /* offline during install: cases get cached on first use */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Serve from cache first, refresh the cache in the background.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const cached = await cache.match(req, { ignoreSearch: true });
    const network = fetch(req).then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => null);

    if (cached) { event.waitUntil(network); return cached; }
    const res = await network;
    if (res) return res;
    if (req.mode === 'navigate') {
      const shell = await cache.match('index.html');
      if (shell) return shell;
    }
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  })());
});
