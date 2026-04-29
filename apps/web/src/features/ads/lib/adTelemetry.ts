import type { AdCreative } from '@/features/ads/types/ad.types';

type InteractionType = 'hover' | 'mouseenter' | 'dismiss' | 'viewability';

async function post(path: string, payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);
  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon(path, blob);
    return;
  }
  await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true });
}

export function trackImpression(args: {
  decisionId: string;
  ad: AdCreative | null;
  slotId: string;
  placementKey: string;
  decisionLatencyMs: number;
}) {
  void post('/api/ads/impression', args);
}

export function trackInteraction(args: { ad: AdCreative; type: InteractionType; pagePath: string }) {
  void post('/api/ads/interaction', {
    campaignId: args.ad.campaignId,
    creativeId: args.ad.creativeId,
    eventType: args.type,
    pagePath: args.pagePath,
    eventAt: new Date().toISOString(),
  });
}
