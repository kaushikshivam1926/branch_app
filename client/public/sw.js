// SBI Branch Application Catalogue — Service Worker
// Cache-first strategy for complete offline functionality
// Version: 2.0

const CACHE_NAME = 'sbi-branch-app-v2';
const OFFLINE_FALLBACK = '/index.html';

// Core assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/images/sbi-logo.png',
  '/sample-accounts.csv'
];

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

  // Skip non-GET requests and cross-origin analytics/tracking
  if (request.method !== 'GET') return;
  if (url.hostname !== self.location.hostname && url.pathname.includes('umami')) return;

  // For navigation requests (HTML pages) — serve from cache or fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(OFFLINE_FALLBACK).then((cached) => cached || fetch(request))
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
