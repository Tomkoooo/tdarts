"use client";

import { useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { AdRenderer } from '@/features/ads/components/AdRenderer';
import { useAdDecision } from '@/features/ads/hooks/useAdDecision';
import { trackImpression, trackInteraction } from '@/features/ads/lib/adTelemetry';
import type { AdViewType } from '@/features/ads/types/ad.types';

type Props = {
  slotId: string;
  placementKey: string;
  viewType: AdViewType;
  className?: string;
};

export function AdSlotContainer({ slotId, placementKey, viewType, className }: Props) {
  const pathname = usePathname();
  const pageKey = useMemo(() => pathname || '/', [pathname]);
  const { data } = useAdDecision({ slotId, placementKey, viewType, pageKey });

  useEffect(() => {
    if (!data) return;
    if (data.renderMode === 'placeholder') return;
    trackImpression({
      decisionId: data.decisionId,
      ad: data.ad,
      slotId,
      placementKey,
      decisionLatencyMs: data.latencyMs,
    });
  }, [data, placementKey, slotId]);

  return (
    <div className={className}>
      <AdRenderer
        ad={data?.ad ?? null}
        onInteraction={(type) => {
          if (!data?.ad || data.renderMode === 'placeholder') return;
          trackInteraction({ ad: data.ad, type, pagePath: pageKey });
        }}
      />
    </div>
  );
}
