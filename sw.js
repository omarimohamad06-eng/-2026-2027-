/* Service worker : met l'application en cache pour un usage 100 % hors-ligne. */
const CACHE = 'sijil-hodour-v3';
const FICHIERS = [
  './', './index.html', './manifest.webmanifest',
  './assets/css/theme.css', './assets/css/app.css', './assets/css/print.css',
  './assets/img/icon.svg',
  './src/main.js', './src/i18n/index.js',
  './src/db/idb.js', './src/db/repo.js', './src/db/backup.js',
  './src/data/defaults.js', './src/data/levels.js', './src/data/calendar-2026-2027.js',
  './src/core/schoolCalendar.js', './src/core/attendance.js', './src/core/stats.js',
  './src/ui/app.js', './src/ui/router.js', './src/ui/components/pickers.js',
  './src/ui/views/setup.js', './src/ui/views/classes.js', './src/ui/views/students.js',
  './src/ui/views/register.js', './src/ui/views/dashboard.js', './src/ui/views/calendar.js',
  './src/ui/views/backup.js',
  './src/export/print.js', './src/export/pdf.js',
  './src/ui/views/sync.js',
  './src/sync/index.js', './src/sync/engine.js', './src/sync/local-idb.js',
  './src/sync/remote-firebase.js', './src/sync/remote-memory.js',
  './src/utils/dom.js', './src/utils/csv.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

/* Réseau d'abord (pour récupérer les mises à jour), cache en secours hors-ligne. */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copie = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copie)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
