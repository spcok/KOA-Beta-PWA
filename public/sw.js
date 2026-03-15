const CACHE_NAME = 'koa-static-v2';
const WEATHER_CACHE = 'weather-failover-cache';
const COMPLIANCE_CACHE = 'compliance-data-cache';
const MEDIA_CACHE = 'media-failover-cache';
const FALLBACK_IMAGE = '/offline-media-fallback.svg';

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  FALLBACK_IMAGE
];

const COMPLIANCE_MAX_AGE = 14 * 24 * 60 * 60 * 1000; // 14 days in ms

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('🛠️ [SW] Pre-caching App Shell');
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // 1. Cleanup old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (![CACHE_NAME, WEATHER_CACHE, COMPLIANCE_CACHE, MEDIA_CACHE].includes(cacheName)) {
              console.log('🛠️ [SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // 2. Prune 14-day compliance data
      pruneComplianceCaches()
    ])
  );
  self.clients.claim();
});

async function pruneComplianceCaches() {
  const cachesToPrune = [WEATHER_CACHE, COMPLIANCE_CACHE, MEDIA_CACHE];
  const now = Date.now();

  for (const cacheName of cachesToPrune) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const dateHeader = response.headers.get('Date');
        if (dateHeader) {
          const fetchDate = new Date(dateHeader).getTime();
          if (now - fetchDate > COMPLIANCE_MAX_AGE) {
            console.log(`🛠️ [SW] Pruning expired entry from ${cacheName}:`, request.url);
            await cache.delete(request);
          }
        }
      }
    }
  }
}

// Fetch Event
self.addEventListener('fetch', (event) => {
  // PATCH: Bypass non-GET requests to prevent TypeError on Supabase writes
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Rule 1: Strict Cloud Bypass (Network Only)
  if (url.hostname.includes('supabase.co') && (
    url.pathname.includes('/auth/v1/') ||
    url.pathname.includes('/functions/v1/')
  )) {
    return; // Default browser behavior (Network Only)
  }

  // Rule 2: Media Caching (Cache First, then Network)
  if (url.hostname.includes('supabase.co') && url.pathname.includes('/storage/v1/object/public/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;

        return fetch(event.request).then((networkResponse) => {
          if (networkResponse.ok) {
            return caches.open(MEDIA_CACHE).then((cache) => {
              cache.put(event.request, networkResponse.clone());
              return networkResponse;
            });
          }
          return networkResponse;
        }).catch(() => {
          // If offline and not in cache, return fallback SVG
          return caches.match(FALLBACK_IMAGE);
        });
      })
    );
    return;
  }

  // Network-First for HTML/UI Navigation
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Rule 3: Compliance & Weather (Network First with 5s Timeout)
  const isRestApi = url.hostname.includes('supabase.co') && url.pathname.includes('/rest/v1/');
  const isWeatherApi = url.hostname.includes('api.openweathermap.org') || url.hostname.includes('weather'); // Generic weather check

  if (isRestApi || isWeatherApi) {
    event.respondWith(networkFirstWithTimeout(event.request, isWeatherApi ? WEATHER_CACHE : COMPLIANCE_CACHE));
    return;
  }

  // Rule 4: Static Assets (Cache First)
  const isStaticAsset = [
    '.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.woff2'
  ].some(ext => url.pathname.endsWith(ext));

  if (isStaticAsset || APP_SHELL.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
  }
});

async function networkFirstWithTimeout(request, cacheName) {
  const timeoutPromise = new Promise((resolve) => 
    setTimeout(() => resolve(null), 5000)
  );

  try {
    const networkResponse = await Promise.race([
      fetch(request),
      timeoutPromise
    ]);

    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.log('🛠️ [SW] Network failed, checking cache:', request.url);
  }

  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  // If both fail, return a generic error or null
  return new Response('Offline and no cached data available', { status: 503 });
}
