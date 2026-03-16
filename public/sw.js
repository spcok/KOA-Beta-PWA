const CACHE_NAME = 'koa-static-v2';
const COMPLIANCE_CACHE = 'compliance-data-cache';
const COMPLIANCE_MAX_AGE = 14 * 24 * 60 * 60 * 1000; // 14 days in ms

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/offline-media-fallback.svg'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
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
            if (![CACHE_NAME, COMPLIANCE_CACHE].includes(cacheName)) {
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

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

async function pruneComplianceCaches() {
  const cache = await caches.open(COMPLIANCE_CACHE);
  const requests = await cache.keys();
  const now = Date.now();
  
  for (const request of requests) {
    const response = await cache.match(request);
    if (response) {
      const dateHeader = response.headers.get('Date');
      if (dateHeader) {
        const fetchDate = new Date(dateHeader).getTime();
        if (now - fetchDate > COMPLIANCE_MAX_AGE) {
          await cache.delete(request);
        }
      }
    }
  }
}

// Fetch Event
self.addEventListener('fetch', (event) => {
  // Bypass non-GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Rule 1: Strict Shield Bypass (Network Only)
  // Explicitly bypass /functions/v1/ (AI/Edge) and /auth/v1/
  if (url.hostname.includes('supabase.co') && (
    url.pathname.includes('/auth/v1/') ||
    url.pathname.includes('/functions/v1/')
  )) {
    return; // Network Only
  }

  // Rule 2: Targeted Vault Caching (Strictly /rest/v1/)
  if (url.hostname.includes('supabase.co') && url.pathname.includes('/rest/v1/')) {
    event.respondWith(networkFirstWithTimeout(event.request, COMPLIANCE_CACHE));
    return;
  }

  // Rule 3: Network-First for HTML/UI Navigation
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
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
    // Network failed
  }

  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  return new Response('Offline and no cached data available', { status: 503 });
}
