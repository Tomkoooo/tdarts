/* eslint-disable @typescript-eslint/no-require-imports */
const { z } = require('zod');

const BASE_URL = process.env.LOAD_BASE_URL || 'http://localhost:3000';

const createTournamentPayloadSchema = z.object({
  name: z.string().min(1),
  boards: z.array(z.object({ boardNumber: z.number().int().positive() })).min(1),
  maxPlayers: z.number().int().positive().optional(),
  format: z.string().optional(),
  startingScore: z.number().int().positive().optional(),
  entryFee: z.number().int().nonnegative().optional(),
  participationMode: z.enum(['individual', 'pair', 'team']).optional(),
  startDate: z.string().optional(),
});

const addPlayerPayloadSchema = z.object({
  name: z.string().min(1),
  userRef: z.string().optional(),
});

function randomThinkSeconds() {
  return 1 + Math.floor(Math.random() * 3);
}

module.exports = {
  async prepareAuthAndPayloads(userContext) {
    const createPayload = createTournamentPayloadSchema.parse({
      name: `Load Tournament ${Date.now()}`,
      boards: [{ boardNumber: 1 }, { boardNumber: 2 }],
      maxPlayers: 32,
      format: 'group_knockout',
      startingScore: 501,
      entryFee: 0,
      participationMode: 'individual',
      startDate: new Date().toISOString(),
    });
    const addPlayerPayload = addPlayerPayloadSchema.parse({
      name: `Load Player ${Math.floor(Math.random() * 1_000_000)}`,
    });

    userContext.vars.createPayload = JSON.stringify(createPayload);
    userContext.vars.addPlayerPayload = JSON.stringify(addPlayerPayload);
    userContext.vars.thinkSec = randomThinkSeconds();

    try {
      const response = await fetch(`${BASE_URL}/api/socket/auth`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.token) {
          userContext.vars.authHeader = `Bearer ${data.token}`;
          userContext.vars.authCookie = `token=${data.token}`;
        }
      }
    } catch {
      userContext.vars.authHeader = '';
      userContext.vars.authCookie = '';
    }
  },

  async sseUpdatesProbe(userContext, events) {
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`${BASE_URL}/api/updates?tournamentId=DEMO&maxConnectionMs=60000`, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          Authorization: userContext.vars.authHeader || '',
          Cookie: userContext.vars.authCookie || '',
        },
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        events.emit('counter', 'sse.failures', 1);
        return;
      }

      const reader = response.body.getReader();
      await Promise.race([
        reader.read(),
        new Promise((resolve) => setTimeout(resolve, 2500)),
      ]);

      events.emit('counter', 'sse.success', 1);
      events.emit('histogram', 'sse.connect_time', Date.now() - startedAt);
      controller.abort();
      return;
    } catch {
      events.emit('counter', 'sse.failures', 1);
      return;
    } finally {
      clearTimeout(timeout);
    }
  },
};
