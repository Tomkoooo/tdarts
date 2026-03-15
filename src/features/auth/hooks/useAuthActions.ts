'use client';

import { useCallback } from 'react';
import { getAuthorizedSessionAction } from '@/features/auth/actions';

export function useAuthActions() {
  const getSession = useCallback(async () => {
    return getAuthorizedSessionAction(undefined);
  }, []);

  return { getSession };
}
