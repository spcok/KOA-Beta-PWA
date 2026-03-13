const CACHE_NAME = 'koa-static-v2';
const WEATHER_CACHE = 'weather-failover-cache';
const COMPLIANCE_CACHE = 'compliance-data-cache';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 1. Delete old caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          if (![CACHE_NAME, WEATHER_CACHE, COMPLIANCE_CACHE].includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );

      // 2. Purge cached data older than 14 days
      const now = Date.now();
      for (const cacheName of [WEATHER_CACHE, COMPLIANCE_CACHE]) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        for (const req of requests) {
          const response = await cache.match(req);
          if (response) {
            const dateHeader = response.headers.get('date');
            if (dateHeader) {
              const fetchDate = new Date(dateHeader).getTime();
              if (now - fetchDate > FOURTEEN_DAYS) {
                await cache.delete(req);
              }
            }
          }
        }
      }
      
      await self.clients.claim();
    })()
  );
});

async function networkFirstWithTimeout(request, cacheName, timeoutMs = 5000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (response && response.status === 200) {
      const cache = await caches.open(cacheName);
      // Store timestamp in headers if possible, or we'll just rely on basic caching
      // For a robust 14-day expiration, we'd ideally use IndexedDB, but for native SW,
      // we'll cache the response and clean up old entries periodically.
      cache.put(request, response.clone());
      return response;
    }
    throw new Error('Network response was not ok');
  } catch (error) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      // Basic expiration check could go here if we stored timestamps
      return cachedResponse;
    }
    throw error;
  }
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Strict Cloud Bypass for AI, Auth, and Storage
  if (url.href.match(/^https:\/\/.*\.supabase\.co\/(functions|auth|storage)\/v1\/.*/i)) {
    return; // Network only
  }

  // 2. Weather API Cache (Online-First with 14-day failover)
  if (url.href.match(/^https:\/\/(api\.open-meteo\.com|api\.openweathermap\.org|geocoding-api\.open-meteo\.com)\/.*/i)) {
    event.respondWith(networkFirstWithTimeout(event.request, WEATHER_CACHE));
    return;
  }

  // 3. Supabase REST API (Online-First with 14-day failover for Compliance)
  if (url.href.match(/^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i)) {
    event.respondWith(networkFirstWithTimeout(event.request, COMPLIANCE_CACHE));
    return;
  }

  // 4. Static Assets (Cache First, then Network)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        // Cache successful GET requests for static assets
        if (event.request.method === 'GET' && response.status === 200 && (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.png') || url.pathname.endsWith('.svg'))) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      });
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
