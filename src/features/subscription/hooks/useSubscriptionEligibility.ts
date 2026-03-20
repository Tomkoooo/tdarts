'use client';

import { useCallback } from 'react';
import { checkSubscriptionAction } from '@/features/subscription/actions/checkSubscription.action';

export function useSubscriptionEligibility() {
  const checkEligibility = useCallback(
    async (clubId: string, startDate: Date, isSandbox = false, isVerified = false) =>
      checkSubscriptionAction({ clubId, startDate, isSandbox, isVerified }),
    []
  );

  return { checkEligibility };
}
