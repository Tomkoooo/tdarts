// Service Worker for tDarts PWA
const CACHE_NAME = 'tdarts-v1';
const urlsToCache = [
  '/',
  '/tdarts_logo.svg',
  '/tdarts_fav.svg',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/apple-touch-icon.png'
];

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Only handle GET requests - Cache API doesn't support POST, PUT, DELETE, etc.
  if (event.request.method !== 'GET') {
    // For non-GET requests, just fetch from network without caching
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache successful GET responses
        if (response.status === 200 && event.request.method === 'GET') {
          // Clone the response before caching
          const responseToCache = response.clone();
          
          // Cache the response (only for GET requests)
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache).catch((error) => {
              // Silently fail if caching fails (e.g., for non-cacheable requests)
              console.warn('Failed to cache request:', event.request.url, error);
            });
          });
        }
        
        return response;
      })
      .catch(() => {
        // Network failed, try cache (only for GET requests)
        return caches.match(event.request).then((response) => {
          if (response) {
            return response;
          }
          
          // Return offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          
          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});

