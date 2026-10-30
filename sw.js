// Garde les fichiers en cache pour jouer hors connexion.
// Les fichiers sont toujours redemandés au réseau d'abord, donc les mises à jour arrivent seules.
const VERSION = 'v11';
const CORE = [
  './', 'index.html', 'style.css', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/apple-touch-icon.png',
  'mot/', 'mot/index.html', 'mot/mot.js', 'mot/words.js', 'mot/dico/5.txt',
  'geo/', 'geo/index.html', 'geo/geo.js', 'geo/countries.js', 'geo/indices.js',
  'frontieres/', 'frontieres/index.html', 'frontieres/frontieres.js', 'frontieres/data.js',
  'quiz/', 'quiz/index.html', 'quiz/quiz.js',
  'droit/', 'droit/index.html', 'droit/droit.js', 'droit/themes.js',
  'droit/q/penal.js', 'droit/q/civil.js', 'droit/q/social.js', 'droit/q/affaires.js', 'droit/q/societes.js',
  'droit/q/suretes.js', 'droit/q/administratif.js', 'droit/q/dip.js', 'droit/q/europeen.js', 'droit/q/constitutionnel.js', 'droit/q/libertes.js',
  'chats/', 'chats/index.html', 'chats/dessins.js',
  'sudochat/', 'sudochat/index.html', 'sudochat/sudochat.js',
  'paniers/', 'paniers/index.html', 'paniers/paniers.js', 'paniers/niveaux.js',
  'xcatspad/', 'xcatspad/index.html', 'xcatspad/xcatspad.js',
  'sens/', 'sens/index.html', 'sens/sens.js', 'sens/secrets.js', 'sens/vocab.txt',
  'cartes/', 'cartes/index.html', 'cartes/cartes.css', 'cartes/moteur.js', 'cartes/solitaire.js', 'cartes/spider.js',
  'cartes/freecell.js', 'cartes/dame.js', 'cartes/app.js',
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
