"use client";

import Link from 'next/link';
import Image from 'next/image';
import type { AdCreative } from '@/features/ads/types/ad.types';

export function AdInlineVariant({ ad, onInteraction }: { ad: AdCreative; onInteraction?: (kind: 'hover' | 'mouseenter' | 'dismiss' | 'viewability') => void }) {
  return (
    <Link
      href={`/api/ads/click?campaignId=${encodeURIComponent(ad.campaignId)}&creativeId=${encodeURIComponent(ad.creativeId)}&url=${encodeURIComponent(ad.destinationUrl)}`}
      className="inline-flex max-w-full items-center gap-2 rounded-md bg-muted px-2 py-1 text-sm"
      onMouseEnter={() => onInteraction?.('mouseenter')}
      onMouseOver={() => onInteraction?.('hover')}
      aria-label={ad.accessibility.ariaLabel || ad.title}
    >
      {ad.mediaUrl ? (
        <span className="relative h-5 w-5 overflow-hidden rounded-sm">
          <Image src={ad.mediaUrl} alt={ad.accessibility.altText} fill className="object-cover" />
        </span>
      ) : null}
      <span className="truncate">{ad.title}</span>
    </Link>
  );
}
