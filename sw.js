// Keeps the app working offline. Bump VERSION whenever a file changes, or phones keep the old copy.
const VERSION = 'next-script-2';
const FILES = ['./', 'index.html', 'style.css', 'logic.js', 'scenes.js', 'app.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'assets/background.svg', 'assets/CreateGoal.svg', 'assets/ViewGoal.svg', 'assets/TrackGoal.svg'];

self.addEventListener('install', (event) => {
  // Skip the browser's HTTP cache, or an update could store stale files under the new version.
  const fresh = FILES.map((f) => new Request(f, { cache: 'reload' }));
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(fresh)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then((hit) => hit || fetch(event.request)));
});
