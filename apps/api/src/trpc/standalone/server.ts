/**
 * Standalone tRPC API server (primary deployment target).
 *
 * Run with:   pnpm --filter @tdarts/api dev
 * Deploy:     node dist/server.mjs
 *
 * Environment variables:
 *   PORT                      – defaults to 4000
 *   API_MOBILE_CLIENT_ID      – Tier 1 mobile client ID
 *   API_MOBILE_CLIENT_SECRET  – Tier 1 mobile client secret
 *   API_INTEGRATION_KEYS      – comma-separated integration keys
 *   API_DEV_BYPASS_SECRET     – (non-prod) bypass header value
 *   MONGODB_URI               – MongoDB connection string
 *   JWT_SECRET                – shared JWT signing secret
 *   GOOGLE_CLIENT_ID          – or GOOGLE_CLIENT_IDS (comma-separated) for Google Sign-In
 *   API_PUBLIC_URL            – public base URL for profile image links (e.g. https://api.example.com)
 *   STRIPE_SECRET_KEY         – Stripe API secret (for POST /api/payments/verify)
 *   APP_PUBLIC_VERSION        – or NEXT_PUBLIC_APP_VERSION for GET /api/updates
 *   APP_MIN_CLIENT_VERSION    – optional gate string for clients
 *   SOCKET_PUBLIC_URL         – or NEXT_PUBLIC_SOCKET_URL (hint in /api/updates)
 *   SOCKET_TOKEN_TTL_SEC      – optional socket JWT TTL (default 600)
 *   UPSTASH_REDIS_REST_URL    – (optional) for Redis-backed rate limits
 *   UPSTASH_REDIS_REST_TOKEN  – (optional)
 *   CORS_ORIGINS              – comma-separated allowed origins
 */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createHandler, PUBLIC_BASE_PATH } from '../adapters/createFetchHandler';
import {
  handleGoogleAuthPost,
  handleMediaGetRequest,
  handleMediaUploadPost,
} from '../../http/restHandlers';
import { handleSocketAuthPost } from '../../http/socketHandlers';
import { handleUpdatesGet } from '../../http/updatesHandlers';
import { handlePaymentsVerifyPost } from '../../http/paymentsHandlers';
import { handlePlayerAvatarPost } from '../../http/playersHandlers';
import { connectMongo } from '@tdarts/core';

const PORT = Number(process.env.PORT ?? 4000);

const allowedOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .concat([
    'capacitor://localhost',
    'ionic://localhost',
    'http://localhost:3000',
    'http://localhost:8100',
  ]);

const app = new Hono();

// CORS — explicit allow-list (no wildcard with credentials)
app.use(
  '*',
  cors({
    origin: (origin) => (allowedOrigins.includes(origin) ? origin : null),
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'X-Client-Id',
      'X-Client-Secret',
      'X-Integration-Key',
      'X-Request-Id',
      'X-Dev-Bypass',
    ],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    maxAge: 600,
  }),
);

// Health endpoint — no auth required
app.get('/health', (c) =>
  c.json({ ok: true, service: '@tdarts/api', ts: new Date().toISOString() }),
);

// REST — same path shapes as Next.js App Router (`/api/...`) for mobile clients
app.post('/api/auth/google', (c) => handleGoogleAuthPost(c.req.raw));
app.get('/api/media/:id', (c) => handleMediaGetRequest(c.req.raw, c.req.param('id')));
app.post('/api/media/upload', (c) => handleMediaUploadPost(c.req.raw, { mode: 'mobile' }));

app.post('/api/socket/auth', (c) => handleSocketAuthPost(c.req.raw, { mode: 'mobile' }));
app.get('/api/updates', () => handleUpdatesGet());
app.post('/api/payments/verify', (c) => handlePaymentsVerifyPost(c.req.raw, { mode: 'mobile' }));
app.post('/api/players/:id/avatar', (c) =>
  handlePlayerAvatarPost(c.req.raw, c.req.param('id'), { mode: 'mobile' }),
);

// tRPC handler
app.all(`${PUBLIC_BASE_PATH}/*`, async (c) => {
  const res = await createHandler(c.req.raw);
  return res;
});

// 404 fallback
app.notFound((c) => c.json({ error: 'Not found' }, 404));

async function start() {
  await connectMongo();
  console.log(`[tdarts/api] MongoDB connected`);

  serve({ fetch: app.fetch, port: PORT }, () => {
    console.log(`[tdarts/api] Listening on http://localhost:${PORT}`);
    console.log(`[tdarts/api] tRPC endpoint: http://localhost:${PORT}${PUBLIC_BASE_PATH}`);
    console.log(
      `[tdarts/api] REST: auth/google, media/*, socket/auth, updates, payments/verify, players/:id/avatar`,
    );
  });
}

start().catch((err) => {
  console.error('[tdarts/api] Fatal startup error:', err);
  process.exit(1);
});
