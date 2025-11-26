import { useEffect, useState, useRef } from 'react';

export const useRealTimeUpdates = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<{ type: string; data: any } | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectDelay = 30000; // Max 30 seconds
  const baseDelay = 1000; // Start with 1 second

  const connect = () => {
    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    console.log('SSE: Attempting to connect...');
    const eventSource = new EventSource('/api/updates');
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
        if (data.message === 'SSE Connected' || data.time) {
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

    eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
      setIsConnected(false);
      eventSource.close();
      
      // Implement exponential backoff for reconnection
      reconnectAttemptsRef.current += 1;
      const delay = Math.min(
        baseDelay * Math.pow(2, reconnectAttemptsRef.current - 1),
        maxReconnectDelay
      );
      
      console.log(`SSE: Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})...`);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    };
  };

  useEffect(() => {
    connect();

    return () => {
      // Cleanup on unmount
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return { isConnected, lastEvent };
};
