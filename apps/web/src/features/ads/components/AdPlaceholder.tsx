"use client";

import type { AdViewType } from '@/features/ads/types/ad.types';

function sizeClass(viewType: AdViewType) {
  if (viewType === 'block') return 'h-64 w-full max-w-sm';
  if (viewType === 'landscape') return 'h-28 w-full';
  if (viewType === 'popup') return 'h-64 w-full max-w-md';
  return 'h-12 w-full';
}

export function AdPlaceholder({ viewType }: { viewType: AdViewType }) {
  return (
    <div
      className={`rounded-xl border border-dashed border-muted-foreground/40 bg-muted/60 p-3 ${sizeClass(viewType)}`}
      aria-label={`Ad placeholder (${viewType})`}
      role="img"
    >
      <div className="flex h-full items-center justify-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Sponsored Placeholder ({viewType})
      </div>
    </div>
  );
}
