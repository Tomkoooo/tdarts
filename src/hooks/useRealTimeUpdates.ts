import { useEffect, useState, useRef } from 'react';
import type { SseDeltaPayload } from '@/lib/events';

type UseRealTimeUpdatesOptions = {
  tournamentId?: string;
  enabled?: boolean;
  maxSessionAgeMs?: number;
};

type RealtimeUpdateEvent = {
  type: string;
  data: any;
  delta?: SseDeltaPayload<any>;
};

const DEFAULT_MAX_SESSION_AGE_MS = 96 * 60 * 60 * 1000; // 4 days
const SSE_DEBUG = process.env.NEXT_PUBLIC_SSE_DEBUG === 'true';

export const useRealTimeUpdates = (options?: UseRealTimeUpdatesOptions) => {
  const tournamentId = options?.tournamentId;
  const enabled = options?.enabled ?? true;
  const maxSessionAgeMs = options?.maxSessionAgeMs ?? DEFAULT_MAX_SESSION_AGE_MS;
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimeUpdateEvent | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const sessionStartedAtRef = useRef<number>(Date.now());
  const maxReconnectDelay = 30000; // Max 30 seconds
  const baseDelay = 1000; // Start with 1 second
  const reconnectJitterMs = 400;

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

  const toDeltaPayload = (eventType: string, payload: any): SseDeltaPayload<any> | undefined => {
    if (payload?.kind === 'delta' && payload?.schemaVersion === 1) {
      return payload as SseDeltaPayload<any>;
    }

    const tournamentCode =
      typeof payload?.tournamentId === 'string' && payload.tournamentId ? payload.tournamentId : undefined;
    if (!tournamentCode) return undefined;

    if (eventType === 'match-update') {
      return {
        schemaVersion: 1,
        kind: 'delta',
        tournamentId: tournamentCode,
        scope: 'match',
        action:
          payload?.type === 'started'
            ? 'started'
            : payload?.type === 'finished'
              ? 'finished'
              : payload?.type === 'leg-finished'
                ? 'leg-finished'
                : 'updated',
        data: payload,
        emittedAt: new Date().toISOString(),
      };
    }

    if (eventType === 'group-update') {
      return {
        schemaVersion: 1,
        kind: 'delta',
        tournamentId: tournamentCode,
        scope: 'group',
        action: 'standings-updated',
        data: payload,
        requiresResync: true,
        emittedAt: new Date().toISOString(),
      };
    }

    return {
      schemaVersion: 1,
      kind: 'delta',
      tournamentId: tournamentCode,
      scope: 'tournament',
      action: payload?.type === 'knockout-update' ? 'knockout-updated' : 'updated',
      data: payload,
      requiresResync: payload?.type === 'knockout-update',
      emittedAt: new Date().toISOString(),
    };
  };

  const handleIncomingEvent = (eventType: string, payload: any) => {
    const delta = toDeltaPayload(eventType, payload);
    if (SSE_DEBUG) {
      console.log('[SSE][RealtimeHook] event', {
        eventType,
        scope: delta?.scope,
        action: delta?.action,
        tournamentId: delta?.tournamentId,
      });
    }
    setLastEvent({ type: eventType, data: payload, delta });
  };

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

    if (SSE_DEBUG) {
      console.log('SSE: Attempting to connect...', { tournamentId, maxSessionAgeMs });
    }
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      if (SSE_DEBUG) {
        console.log('SSE Connected');
      }
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
        handleIncomingEvent('message', data);
      } catch (e) {
        console.error('Error parsing SSE message', e);
      }
    };

    // Listen for specific event types
    eventSource.addEventListener('tournament-update', (event: any) => {
        try {
            const data = JSON.parse(event.data);
            handleIncomingEvent('tournament-update', data);
        } catch (e) {
            console.error('Error parsing tournament update', e);
        }
    });

    eventSource.addEventListener('match-update', (event: any) => {
        try {
            const data = JSON.parse(event.data);
            handleIncomingEvent('match-update', data);
        } catch (e) {
            console.error('Error parsing match update', e);
        }
    });

    eventSource.addEventListener('group-update', (event: any) => {
        try {
            const data = JSON.parse(event.data);
            handleIncomingEvent('group-update', data);
        } catch (e) {
            console.error('Error parsing group update', e);
        }
    });

    //eslint-disable-next-line
    eventSource.addEventListener('heartbeat', (event: any) => {
        // Just to keep the connection alive, we can log it if needed
        // console.log('Heartbeat received');
        if (SSE_DEBUG) {
          console.log('Heartbeat received');
        }
        
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
      const jitter = Math.floor(Math.random() * reconnectJitterMs);
      const reconnectDelay = Math.min(delay + jitter, maxReconnectDelay);
      
      if (SSE_DEBUG) {
        console.log(`SSE: Reconnecting in ${reconnectDelay}ms (attempt ${reconnectAttemptsRef.current})...`);
      }
      
      reconnectTimeoutRef.current = setTimeout(() => {
        if (!enabled || sessionExpired || hasExceededSessionAge()) {
          setSessionExpired(true);
          clearReconnectTimer();
          return;
        }
        connect();
      }, reconnectDelay);
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
