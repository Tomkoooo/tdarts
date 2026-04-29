"use client";

import { useState } from 'react';
import type { AdViewType } from '@/features/ads/types/ad.types';

function sizeClass(viewType: AdViewType) {
  if (viewType === 'block') return 'h-64 w-full max-w-sm';
  if (viewType === 'landscape') return 'h-28 w-full';
  if (viewType === 'popup') return 'h-64 w-full max-w-md';
  return 'h-12 w-full';
}

export function AdPlaceholder({ viewType }: { viewType: AdViewType }) {
  const [open, setOpen] = useState(true);

  if (viewType === 'popup') {
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 p-4 md:items-center">
        <div
          className="w-full max-w-md rounded-xl border border-dashed border-muted-foreground/40 bg-muted/80 p-4 shadow-xl"
          role="dialog"
          aria-modal="true"
          aria-label="Ad placeholder (popup)"
        >
          <button
            type="button"
            className="float-right text-xs text-muted-foreground"
            onClick={() => setOpen(false)}
          >
            Close
          </button>
          <div className="flex h-56 items-center justify-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Sponsored Placeholder (popup)
          </div>
        </div>
      </div>
    );
  }

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
