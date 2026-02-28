'use client';

import { useEffect } from 'react';

export default function PWAProvider() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    const shouldEnablePWA =
      process.env.NEXT_PUBLIC_ENABLE_PWA === 'true' || process.env.NODE_ENV === 'production';

    // In development we explicitly remove any previously installed SW/caches
    // so HMR and App Router navigation are never intercepted.
    if (!shouldEnablePWA) {
      const cleanup = async () => {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          const hadRegistrations = registrations.length > 0;
          await Promise.all(registrations.map((registration) => registration.unregister()));

          if ('caches' in window) {
            const cacheKeys = await caches.keys();
            await Promise.all(
              cacheKeys
                .filter((cacheName) => cacheName.startsWith('tdarts-'))
                .map((cacheName) => caches.delete(cacheName))
            );
          }

          console.log('PWA disabled in development: service workers and tdarts caches cleaned.');

          // If an old SW was controlling this page, one reload helps the browser
          // boot entirely without stale workers/caches.
          const reloadFlag = 'tdarts-sw-cleanup-reload-done';
          if (hadRegistrations && !sessionStorage.getItem(reloadFlag)) {
            sessionStorage.setItem(reloadFlag, '1');
            window.location.reload();
            return;
          }

          if (!hadRegistrations) {
            sessionStorage.removeItem(reloadFlag);
          }
        } catch (error) {
          console.error('Failed to cleanup service worker in development:', error);
        }
      };

      void cleanup();
      return;
    }

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration);

        // Ensure that any changes to the SW are applied immediately.
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New content available; please refresh.');
                window.location.reload();
              }
            };
          }
        };
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  }, []);

  return null;
}

