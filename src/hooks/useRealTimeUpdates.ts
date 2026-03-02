import { useEffect, useState, useRef } from 'react';

type UseRealTimeUpdatesOptions = {
  tournamentId?: string;
  enabled?: boolean;
  maxSessionAgeMs?: number;
};

const DEFAULT_MAX_SESSION_AGE_MS = 96 * 60 * 60 * 1000; // 4 days

export const useRealTimeUpdates = (options?: UseRealTimeUpdatesOptions) => {
  const tournamentId = options?.tournamentId;
  const enabled = options?.enabled ?? true;
  const maxSessionAgeMs = options?.maxSessionAgeMs ?? DEFAULT_MAX_SESSION_AGE_MS;
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<{ type: string; data: any } | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const sessionStartedAtRef = useRef<number>(Date.now());
  const maxReconnectDelay = 30000; // Max 30 seconds
  const baseDelay = 1000; // Start with 1 second

  const clearReconnectTimer = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  const closeCurrentConnection = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  };

  const hasExceededSessionAge = () => Date.now() - sessionStartedAtRef.current >= maxSessionAgeMs;

  const connect = () => {
    if (!enabled) return;
    if (sessionExpired || hasExceededSessionAge()) {
      setSessionExpired(true);
      return;
    }

    clearReconnectTimer();

    // Clean up existing connection
    closeCurrentConnection();

    const query = new URLSearchParams();
    if (tournamentId) query.set('tournamentId', tournamentId);
    query.set('maxConnectionMs', String(maxSessionAgeMs));
    const url = query.size > 0 ? `/api/updates?${query.toString()}` : '/api/updates';

    console.log('SSE: Attempting to connect...');
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('SSE Connected');
      setIsConnected(true);
      reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Handle ping or other system messages
        if (data.message === 'SSE Connected' || data.time || data.reason === 'max-connection-age-reached') {
          return;
        }
        setLastEvent({ type: 'message', data });
      } catch (e) {
        console.error('Error parsing SSE message', e);
      }
    };

    // Listen for specific event types
    eventSource.addEventListener('tournament-update', (event: any) => {
        try {
            const data = JSON.parse(event.data);
            setLastEvent({ type: 'tournament-update', data });
        } catch (e) {
            console.error('Error parsing tournament update', e);
        }
    });

    eventSource.addEventListener('match-update', (event: any) => {
        try {
            const data = JSON.parse(event.data);
            setLastEvent({ type: 'match-update', data });
        } catch (e) {
            console.error('Error parsing match update', e);
        }
    });

    eventSource.addEventListener('group-update', (event: any) => {
        try {
            const data = JSON.parse(event.data);
            setLastEvent({ type: 'group-update', data });
        } catch (e) {
            console.error('Error parsing group update', e);
        }
    });

    //eslint-disable-next-line
    eventSource.addEventListener('heartbeat', (event: any) => {
        // Just to keep the connection alive, we can log it if needed
        // console.log('Heartbeat received');
        console.log('Heartbeat received');
        
    });

    eventSource.addEventListener('session-expired', () => {
      setSessionExpired(true);
      clearReconnectTimer();
      closeCurrentConnection();
    });

    eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
      setIsConnected(false);
      closeCurrentConnection();

      if (!enabled || sessionExpired || hasExceededSessionAge()) {
        setSessionExpired(true);
        clearReconnectTimer();
        return;
      }
      
      // Implement exponential backoff for reconnection
      reconnectAttemptsRef.current += 1;
      const delay = Math.min(
        baseDelay * Math.pow(2, reconnectAttemptsRef.current - 1),
        maxReconnectDelay
      );
      
      console.log(`SSE: Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})...`);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        if (!enabled || sessionExpired || hasExceededSessionAge()) {
          setSessionExpired(true);
          clearReconnectTimer();
          return;
        }
        connect();
      }, delay);
    };
  };

  useEffect(() => {
    setSessionExpired(false);
    sessionStartedAtRef.current = Date.now();
    reconnectAttemptsRef.current = 0;

    if (!enabled) {
      clearReconnectTimer();
      closeCurrentConnection();
      setLastEvent(null);
      return;
    }

    connect();

    return () => {
      // Cleanup on unmount
      clearReconnectTimer();
      closeCurrentConnection();
    };
  }, [enabled, tournamentId, maxSessionAgeMs]);

  return { isConnected, lastEvent, sessionExpired };
};
