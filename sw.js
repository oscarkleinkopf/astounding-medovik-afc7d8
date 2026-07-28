/* ============================================================
   BookmarkIQ — Service Worker (Offline Cache & PWA Support)
   ============================================================ */

const CACHE_NAME = 'bookmarkiq-v4';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './index.css',
  './app.js',
  './manifest.webmanifest',
  './src/core/i18n.js',
  './src/core/domain-database.js',
  './src/core/bookmark-parser.js',
  './src/core/bookmark-exporter.js',
  './src/core/categorizer.js',
  './src/core/gemini-client.js',
  './src/core/link-checker.js',
  './src/core/duplicate-detector.js',
  './src/core/backup-manager.js',
  './src/core/analytics.js',
  './src/core/tagger.js',
  './src/core/themes.js',
  './src/core/wayback-client.js',
  './src/core/tag-manager.js',
  './src/core/search-engine.js',
  './src/core/read-later.js',
  './src/core/ai-summarizer.js',
  './src/core/cloud-sync.js',
  './src/core/smart-collections.js',
  './src/core/health-report.js'
];

// Install Event — pre-cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event — clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event — stale-while-revalidate or cache-first for app shell
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Bypass API calls (Gemini, Wayback, GitHub, Google Drive, Favicons)
  if (
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('archive.org') ||
    url.hostname.includes('github.com') ||
    url.hostname.includes('google.com')
  ) {
    return;
  }

  const isApplicationCode = url.origin === self.location.origin && (
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.html') ||
    url.pathname === '/' ||
    url.pathname === ''
  );

  if (isApplicationCode) {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()));
        }
        return networkResponse;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch background update for next time
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {/* Ignore network errors offline */});

        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));

        return networkResponse;
      });
    })
  );
});
