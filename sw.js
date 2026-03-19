const CACHE_NAME = 'ah-plan-v1';
const ASSETS = [
  './',
  'index.html',
  'css/style.css',
  'js/nutrition-db.js',
  'js/calculator.js',
  'js/storage.js',
  'js/meal-planner.js',
  'js/app.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
