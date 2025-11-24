import { useEffect, useState } from 'react';

export const useRealTimeUpdates = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<{ type: string; data: any } | null>(null);

  useEffect(() => {
    const eventSource = new EventSource('/api/updates');

    eventSource.onopen = () => {
      console.log('SSE Connected');
      setIsConnected(true);
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

    eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
      setIsConnected(false);
      eventSource.close();
      // Reconnect logic is handled by browser for EventSource, but we can add custom backoff if needed
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, []);

  return { isConnected, lastEvent };
};
