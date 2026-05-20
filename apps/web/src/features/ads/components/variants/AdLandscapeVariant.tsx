"use client";

import Link from 'next/link';
import Image from 'next/image';
import type { AdCreative } from '@/features/ads/types/ad.types';

export function AdLandscapeVariant({ ad, onInteraction }: { ad: AdCreative; onInteraction?: (kind: 'hover' | 'mouseenter' | 'dismiss' | 'viewability') => void }) {
  return (
    <Link
      href={`/api/ads/click?campaignId=${encodeURIComponent(ad.campaignId)}&creativeId=${encodeURIComponent(ad.creativeId)}&url=${encodeURIComponent(ad.destinationUrl)}`}
      className="group flex w-full items-center gap-3 rounded-xl border bg-card p-3 shadow-sm"
      onMouseEnter={() => onInteraction?.('mouseenter')}
      onMouseOver={() => onInteraction?.('hover')}
      aria-label={ad.accessibility.ariaLabel || ad.title}
    >
      {ad.mediaUrl ? (
        <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-lg">
          <Image src={ad.mediaUrl} alt={ad.accessibility.altText} fill className="object-cover" />
        </div>
      ) : null}
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Sponsored</p>
        <h3 className="truncate text-sm font-semibold text-foreground">{ad.title}</h3>
        {ad.bodyText ? <p className="line-clamp-2 text-sm text-muted-foreground">{ad.bodyText}</p> : null}
      </div>
    </Link>
  );
}
