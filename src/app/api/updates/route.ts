import { NextRequest, NextResponse } from 'next/server';
import { eventEmitter, EVENTS } from '@/lib/events';
import { withApiTelemetry } from '@/lib/api-telemetry';

// Helper to format SSE message
const formatMessage = (event: string, data: any) => {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
};

async function __GET(req: NextRequest) {
  const encoder = new TextEncoder();
  const customReadable = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      controller.enqueue(encoder.encode(formatMessage('connected', { message: 'SSE Connected' })));

      // Keep connection alive with heartbeat
      const keepAlive = setInterval(() => {
        try {
            controller.enqueue(encoder.encode(formatMessage('heartbeat', { time: new Date().toISOString() })));
        } catch {
            clearInterval(keepAlive);
        }
      }, 20000); // 20s heartbeat to prevent timeout

      // Event Listeners
      const onTournamentUpdate = (data: any) => {
        try {
            controller.enqueue(encoder.encode(formatMessage(EVENTS.TOURNAMENT_UPDATE, data)));
        } catch (e) {
            console.error('Error sending tournament update', e);
        }
      };

      const onMatchUpdate = (data: any) => {
        try {
            controller.enqueue(encoder.encode(formatMessage(EVENTS.MATCH_UPDATE, data)));
        } catch (e) {
            console.error('Error sending match update', e);
        }
      };

      const onGroupUpdate = (data: any) => {
        try {
            controller.enqueue(encoder.encode(formatMessage(EVENTS.GROUP_UPDATE, data)));
        } catch (e) {
            console.error('Error sending group update', e);
        }
      };

      // Subscribe
      eventEmitter.on(EVENTS.TOURNAMENT_UPDATE, onTournamentUpdate);
      eventEmitter.on(EVENTS.MATCH_UPDATE, onMatchUpdate);
      eventEmitter.on(EVENTS.GROUP_UPDATE, onGroupUpdate);

      req.signal.addEventListener('abort', () => {
        clearInterval(keepAlive);
        eventEmitter.off(EVENTS.TOURNAMENT_UPDATE, onTournamentUpdate);
        eventEmitter.off(EVENTS.MATCH_UPDATE, onMatchUpdate);
        eventEmitter.off(EVENTS.GROUP_UPDATE, onGroupUpdate);
        controller.close();
      });
    },
  });

  return new NextResponse(customReadable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx/Cloudflare buffering
    },
  });
}

export const GET = withApiTelemetry('/api/updates', __GET as any);
