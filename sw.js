/**
 * Service Worker for FCL Aranang Integrated Project Controls
 * Provides 100% offline capability for job sites and remote field engineers
 */

const CACHE_NAME = 'fcl-project-controls-v1.3';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './firebase_sync.js',
  './storage_manager.js',
  './manifest.json',
  './HOMEPAGE.png',
  './icon-192.png',
  './icon-512.png',
  './pricelist_dupa/index.html',
  './pricelist_dupa/pricelist_dupa.css',
  './pricelist_dupa/pricelist_dupa.js',
  './boq_schedule/index.html',
  './boq_schedule/boq_schedule.css',
  './boq_schedule/boq_schedule.js',
  './boq_schedule/pdf.min.js',
  './boq_schedule/pdf.worker.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Pre-cache error (handled gracefully for non-critical assets):', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Only handle http and https requests
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Let Firebase / Firestore network requests bypass service worker
  if (url.hostname.includes('googleapis.com') || url.hostname.includes('firebaseio.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh copy in background to keep cache up to date
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
