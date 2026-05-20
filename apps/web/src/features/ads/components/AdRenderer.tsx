"use client";

import type { AdCreative } from '@/features/ads/types/ad.types';
import { AdPlaceholder } from '@/features/ads/components/AdPlaceholder';
import { AdBlockVariant } from '@/features/ads/components/variants/AdBlockVariant';
import { AdInlineVariant } from '@/features/ads/components/variants/AdInlineVariant';
import { AdLandscapeVariant } from '@/features/ads/components/variants/AdLandscapeVariant';
import { AdPopupVariant } from '@/features/ads/components/variants/AdPopupVariant';

type Props = {
  ad: AdCreative | null;
  onInteraction?: (kind: 'hover' | 'mouseenter' | 'dismiss' | 'viewability') => void;
};

export function AdRenderer({ ad, onInteraction }: Props) {
  if (!ad) return null;
  if (ad.isPlaceholder) return <AdPlaceholder viewType={ad.viewType} />;
  if (ad.viewType === 'block') return <AdBlockVariant ad={ad} onInteraction={onInteraction} />;
  if (ad.viewType === 'landscape') return <AdLandscapeVariant ad={ad} onInteraction={onInteraction} />;
  if (ad.viewType === 'popup') return <AdPopupVariant ad={ad} onInteraction={onInteraction} />;
  return <AdInlineVariant ad={ad} onInteraction={onInteraction} />;
}
