"use client";

import Link from 'next/link';
import Image from 'next/image';
import type { AdCreative } from '@/features/ads/types/ad.types';

export function AdBlockVariant({ ad, onInteraction }: { ad: AdCreative; onInteraction?: (kind: 'hover' | 'mouseenter' | 'dismiss' | 'viewability') => void }) {
  return (
    <Link
      href={`/api/ads/click?campaignId=${encodeURIComponent(ad.campaignId)}&creativeId=${encodeURIComponent(ad.creativeId)}&url=${encodeURIComponent(ad.destinationUrl)}`}
      className="group block w-full max-w-sm rounded-xl border bg-card p-3 shadow-sm transition hover:shadow-md"
      onMouseEnter={() => onInteraction?.('mouseenter')}
      onMouseOver={() => onInteraction?.('hover')}
      aria-label={ad.accessibility.ariaLabel || ad.title}
    >
      {ad.mediaUrl ? (
        <div className="relative mb-2 h-44 w-full overflow-hidden rounded-lg">
          <Image src={ad.mediaUrl} alt={ad.accessibility.altText} fill className="object-cover" />
        </div>
      ) : null}
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Sponsored</p>
      <h3 className="text-sm font-semibold text-foreground">{ad.title}</h3>
      {ad.bodyText ? <p className="mt-1 text-sm text-muted-foreground">{ad.bodyText}</p> : null}
    </Link>
  );
}
