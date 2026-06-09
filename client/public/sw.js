// SBI Branch Application Catalogue — Service Worker
// Version: 4.0 — network-first nav, Vite dev scripts bypassed
const CACHE_NAME = 'sbi-branch-app-v4';
const OFFLINE_FALLBACK = '/index.html';

// Core assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/index.html',
  '/manifest.json',
];

// Paths that must NEVER be served from cache (Vite dev internals)
function shouldBypassCache(url) {
  const p = url.pathname;
  return (
    p.startsWith('/@vite/') ||
    p.startsWith('/@fs/') ||
    p.startsWith('/node_modules/') ||
    p.startsWith('/__vite') ||
    p.includes('?v=') ||
    p.includes('?t=')
  );
}

// ── Install: pre-cache critical assets ──────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      // Activate immediately without waiting for old SW to die
      return self.skipWaiting();
    })
  );
});

// ── Activate: purge stale caches ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first with network fallback ─────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and Vite dev internals — always go to network
  if (request.method !== 'GET') return;
  if (url.hostname !== self.location.hostname) return;
  if (shouldBypassCache(url)) return;

  // Navigation: network-first so new deployments are always picked up
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          return response;
        })
        .catch(() => caches.match(OFFLINE_FALLBACK))
    );
    return;
  }

  // For all other requests — cache-first strategy
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      // Not in cache — fetch from network and cache the response
      return fetch(request.clone()).then((response) => {
        // Only cache valid same-origin responses
        if (
          !response ||
          response.status !== 200 ||
          (response.type !== 'basic' && response.type !== 'cors')
        ) {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });

        return response;
      }).catch(() => {
        // Network failed — return offline fallback for HTML
        if (request.headers.get('accept')?.includes('text/html')) {
          return caches.match(OFFLINE_FALLBACK);
        }
      });
    })
  );
});
