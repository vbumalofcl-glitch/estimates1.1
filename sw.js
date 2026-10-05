/**
 * Service Worker for FCL Aranang Integrated Project Controls
 * Provides 100% offline capability for job sites and remote field engineers
 */

const CACHE_NAME = 'fcl-project-controls-v1.5';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './firebase_sync.js',
  './storage_manager.js',
  './manpower_utilization.css',
  './manpower_utilization.js',
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

  // 1. For HTML page navigations (opening app / reloading): Use Network-First
  // This guarantees fresh index.html without stale redirects hijacking the load
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => cached || caches.match('./index.html'));
        })
    );
    return;
  }

  // 2. For sub-resources (CSS, JS, images): Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
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
      });
    })
  );
});
