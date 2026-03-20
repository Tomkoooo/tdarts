'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

type Vitals = {
  ttfbMs?: number;
  fcpMs?: number;
  lcpMs?: number;
  inpMs?: number;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function getCurrentVitals(): Promise<Vitals> {
  return new Promise((resolve) => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const paints = performance.getEntriesByType('paint');
    const fcp = paints.find((entry) => entry.name === 'first-contentful-paint')?.startTime;
    const ttfb = nav?.responseStart;

    let lcpValue: number | undefined;
    let inpValue: number | undefined;

    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) lcpValue = last.startTime;
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      setTimeout(() => lcpObserver.disconnect(), 2500);
    } catch {
      // no-op
    }

    try {
      const eventObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          const duration = Number((entry as any).duration || 0);
          if (duration > 0) {
            inpValue = Math.max(inpValue || 0, duration);
          }
        }
      });
      eventObserver.observe({ type: 'event', buffered: true, durationThreshold: 16 } as any);
      setTimeout(() => eventObserver.disconnect(), 2500);
    } catch {
      // no-op
    }

    setTimeout(() => {
      resolve({
        ttfbMs: isFiniteNumber(ttfb) ? ttfb : undefined,
        fcpMs: isFiniteNumber(fcp) ? fcp : undefined,
        lcpMs: isFiniteNumber(lcpValue) ? lcpValue : undefined,
        inpMs: isFiniteNumber(inpValue) ? inpValue : undefined,
      });
    }, 2600);
  });
}

function sendVitals(path: string, vitals: Vitals) {
  const payload = JSON.stringify({ path, ...vitals });
  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: 'application/json' });
    navigator.sendBeacon('/api/telemetry/page-vitals', blob);
    return;
  }

  void fetch('/api/telemetry/page-vitals', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => undefined);
}

export default function PageVitalsReporter() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    const key = `telemetry.rum.sent:${pathname}`;
    if (sessionStorage.getItem(key) === '1') return;

    getCurrentVitals()
      .then((vitals) => {
        sendVitals(pathname, vitals);
        sessionStorage.setItem(key, '1');
      })
      .catch(() => undefined);
  }, [pathname]);

  return null;
}
