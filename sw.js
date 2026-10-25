// Garde les fichiers en cache pour jouer hors connexion.
// Les fichiers sont toujours redemandés au réseau d'abord, donc les mises à jour arrivent seules.
const VERSION = 'v1';
const CORE = [
  './', 'index.html', 'style.css', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/apple-touch-icon.png',
  'wordle/', 'wordle/index.html', 'wordle/wordle.js', 'wordle/words.js',
  'geo/', 'geo/index.html', 'geo/geo.js', 'geo/countries.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Réseau d'abord (pour avoir la dernière version), cache si hors ligne.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(VERSION).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true }))
  );
});
