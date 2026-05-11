'use client';

import { useEffect } from 'react';

export default function PWAProvider() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    // PWA is not a product "feature flag": we only distinguish dev vs prod builds.
    // In development we unregister SW and clear app caches so HMR / Fast Refresh work.
    // In production we register `/sw.js` when the browser supports service workers.
    const isProduction = process.env.NODE_ENV === 'production';

    if (!isProduction) {
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

          console.log('Development mode: service workers and tdarts caches cleaned (PWA not active).');

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

