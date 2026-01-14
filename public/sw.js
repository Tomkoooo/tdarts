/* eslint-disable no-restricted-globals */

// Service Worker for tDarts PWA - Version 11
// Fixes "Blank Page" on mobile by handling RSC and JS chunks with high precision.
const CACHE_NAME = 'tdarts-v11';
const PRECACHE_URLS = [
  '/',
  '/board',
  '/site.webmanifest',
  '/tdarts_logo.svg',
  '/tdarts_fav.svg',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/apple-touch-icon.png'
];

/**
 * Strategy: Cache-First for static hashed assets, 
 * Network-First for Navigation and RSC (Dynamic data).
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('%c[SW v11] Installing & Precaching...', 'color: #3b82f6; font-weight: bold;');
      return Promise.allSettled(
        PRECACHE_URLS.map(url => 
          cache.add(url).catch(err => console.warn(`[SW v11] Failed to precache ${url}:`, err))
        )
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log(`[SW v11] Purging old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip dev server overhead
  if (url.pathname.includes('webpack-hmr') || url.pathname.includes('hot-update')) return;

  const isNavigation = event.request.mode === 'navigate';
  
  // RSC requests: Crucial for Next.js 15 navigation. Must NOT use ignoreSearch.
  const isRSC = event.request.headers.get('rsc') === '1' || url.search.includes('_rsc=');
  
  // Static Assets (Hashed chunks, CSS, Img)
  const isStaticAsset = 
    url.pathname.startsWith('/_next/static/') || 
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf|otf|css|js)$/) ||
    url.pathname.startsWith('/api/media');

  // 1. NAVIGATION: Network-First (Update cache on success)
  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok && response.status === 200) {
            // Only cache if it's a real page, not ngrok warning or short error
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request, { ignoreSearch: true })
            .then(cached => cached || caches.match('/', { ignoreSearch: true }));
        })
    );
    return;
  }

  // 2. RSC & Data: Network-First (NO ignoreSearch)
  // We need exact matches for data payloads to avoid blank pages/hydration errors.
  if (isRSC) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => {
          // Attempt exact match only
          return caches.match(event.request);
        })
    );
    return;
  }

  // 3. STATIC ASSETS: Cache-First (With ignoreSearch for build chunks)
  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request, { ignoreSearch: true }).then((cached) => {
        if (cached) return cached;

        return fetch(event.request).then((response) => {
          if (response.ok && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return response;
        }).catch(() => {
          // If a script fails to load offline, this is where the "blank page" starts.
          // We return nothing, causing the browser to error, which is caught by Next.js.
        });
      })
    );
    return;
  }

  // 4. DEFAULT: Network-Only with Cache Fallback
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request, { ignoreSearch: true }))
  );
});
