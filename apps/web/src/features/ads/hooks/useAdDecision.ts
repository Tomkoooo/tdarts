"use client";

import { useEffect, useState } from 'react';
import type { AdDecisionResponse, AdViewType } from '@/features/ads/types/ad.types';

type UseAdDecisionArgs = {
  slotId: string;
  placementKey: string;
  viewType: AdViewType;
  pageKey: string;
};

export function useAdDecision(args: UseAdDecisionArgs) {
  const [data, setData] = useState<AdDecisionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/ads/decision', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(args),
        });
        const payload = (await res.json()) as AdDecisionResponse;
        if (!cancelled) setData(payload);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'ad decision failed');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [args.pageKey, args.placementKey, args.slotId, args.viewType]);

  return { data, isLoading, error };
}
