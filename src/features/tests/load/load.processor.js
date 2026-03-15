const BASE_URL = process.env.LOAD_BASE_URL || 'http://localhost:3000';

module.exports = {
  async sseUpdatesProbe(userContext, events) {
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    try {
      const response = await fetch(`${BASE_URL}/api/updates?tournamentId=DEMO&maxConnectionMs=60000`, {
        method: 'GET',
        headers: { Accept: 'text/event-stream' },
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        events.emit('counter', 'sse.failures', 1);
        return;
      }

      const reader = response.body.getReader();
      await Promise.race([
        reader.read(),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);

      events.emit('counter', 'sse.success', 1);
      events.emit('histogram', 'sse.connect_time', Date.now() - startedAt);
      controller.abort();
      return;
    } catch {
      // AbortError after intentionally closing the stream is acceptable.
      events.emit('counter', 'sse.failures', 1);
      return;
    } finally {
      clearTimeout(timeout);
    }
  },
};
