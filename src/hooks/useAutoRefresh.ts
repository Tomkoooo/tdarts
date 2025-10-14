import { useState, useEffect, useRef } from 'react';
import { useFeatureFlag } from './useFeatureFlag';

interface UseAutoRefreshOptions {
  enabled?: boolean;
  interval?: number;
  onRefresh: () => Promise<void>;
  onError?: (error: Error) => void;
}

export const useAutoRefresh = ({
  enabled = true,
  interval = 10000, // 10 seconds default
  onRefresh,
  onError
}: UseAutoRefreshOptions) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const onRefreshRef = useRef(onRefresh);

  // Keep onRefresh ref up to date
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  const performRefresh = async () => {
    if (!isMountedRef.current || isRefreshing) return;
    
    try {
      setIsRefreshing(true);
      await onRefreshRef.current();
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Auto refresh error:', error);
      if (onError && error instanceof Error) {
        onError(error);
      }
    } finally {
      if (isMountedRef.current) {
        setIsRefreshing(false);
      }
    }
  };

  const startAutoRefresh = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    console.log('Starting auto-refresh with interval:', interval);
    intervalRef.current = setInterval(() => {
      console.log('Auto-refresh tick, performing refresh...');
      performRefresh();
    }, interval);
  };

  const stopAutoRefresh = () => {
    if (intervalRef.current) {
      console.log('Stopping auto-refresh');
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    
    console.log('Auto-refresh effect, enabled:', enabled);
    
    if (enabled) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }

    return () => {
      isMountedRef.current = false;
      stopAutoRefresh();
    };
  }, [enabled, interval]);

  return {
    isRefreshing,
    lastRefresh,
    startAutoRefresh,
    stopAutoRefresh,
    performRefresh
  };
};

// Hook for tournament auto-refresh with Pro subscription check
export const useTournamentAutoRefresh = (
  tournamentCode: string,
  onRefresh: () => Promise<void>,
  clubId?: string,
  enabled: boolean = false
) => {
  // Use the correct feature flag for Pro subscription
  const { isEnabled: isProFeature, isLoading } = useFeatureFlag('detailedStatistics', clubId);
  
  return useAutoRefresh({
    enabled: isProFeature && !isLoading && enabled,
    interval: 10000, // 10 seconds
    onRefresh,
    onError: (error) => {
      // Silent error handling - don't show toasts or alerts
      console.warn('Tournament auto-refresh failed:', error.message);
    }
  });
};
