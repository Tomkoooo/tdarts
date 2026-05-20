"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { AdCreative } from '@/features/ads/types/ad.types';

export function AdPopupVariant({ ad, onInteraction }: { ad: AdCreative; onInteraction?: (kind: 'hover' | 'mouseenter' | 'dismiss' | 'viewability') => void }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 p-4 md:items-center">
      <div
        className="w-full max-w-md rounded-xl border bg-background p-4 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label={ad.accessibility.ariaLabel || ad.title}
        onMouseEnter={() => onInteraction?.('mouseenter')}
      >
        <button
          type="button"
          className="float-right text-xs text-muted-foreground"
          onClick={() => {
            setOpen(false);
            onInteraction?.('dismiss');
          }}
        >
          Close
        </button>
        {ad.mediaUrl ? (
          <div className="relative mb-2 h-40 w-full overflow-hidden rounded-md">
            <Image src={ad.mediaUrl} alt={ad.accessibility.altText} fill className="object-cover" />
          </div>
        ) : null}
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Sponsored</p>
        <h3 className="text-base font-semibold">{ad.title}</h3>
        {ad.bodyText ? <p className="mb-3 text-sm text-muted-foreground">{ad.bodyText}</p> : null}
        <Link
          href={`/api/ads/click?campaignId=${encodeURIComponent(ad.campaignId)}&creativeId=${encodeURIComponent(ad.creativeId)}&url=${encodeURIComponent(ad.destinationUrl)}`}
          className="inline-flex rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          {ad.ctaLabel || 'Learn more'}
        </Link>
      </div>
    </div>
  );
}
