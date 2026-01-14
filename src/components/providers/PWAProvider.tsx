'use client';

import { useEffect } from 'react';

export default function PWAProvider() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);
          
          // Ensure that any changes to the SW are applied immediately
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('New content available; please refresh.');
                  // Force a reload to activate the new SW immediately
                  window.location.reload();
                }
              };
            }
          };
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);

  return null;
}

