'use client';

import { useCallback } from 'react';
import { checkFeatureFlagAction, checkSocketFlagAction } from '@/features/feature-flags/actions/checkFeatureFlags.action';

export function useFeatureFlagAction() {
  const checkFeature = useCallback((feature: string, clubId?: string) => checkFeatureFlagAction({ feature, clubId }), []);
  const checkSocket = useCallback((clubId?: string) => checkSocketFlagAction({ clubId }), []);

  return { checkFeature, checkSocket };
}
