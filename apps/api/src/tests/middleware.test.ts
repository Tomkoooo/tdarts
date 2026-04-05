/**
 * Unit tests for tRPC middleware (requireKnownCaller, requireUserJwt, rateLimit)
 * Services are mocked — no DB connection needed.
 */

import { createCallerFactory } from '../trpc/init';
import { router } from '../trpc/init';
import { apiProcedure, userProcedure } from '../trpc/procedures';
import { createTRPCContext } from '../trpc/init';
import { z } from 'zod';

// Mock AuthService so requireUserJwt does not need a real MongoDB connection
jest.mock('@tdarts/services', () => ({
  AuthService: {
    verifyToken: jest.fn().mockRejectedValue(new Error('Invalid token')),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(headers: Record<string, string> = {}): Request {
  const h = new Headers(headers);
  return new Request('http://localhost/trpc/test', {
    method: 'POST',
    headers: h,
  });
}

const mobileHeaders = {
  'x-client-id': 'test-client-id',
  'x-client-secret': 'test-client-secret',
};

// Minimal test router
const testRouter = router({
  publicPing: apiProcedure.input(z.void()).query(() => ({ ok: true })),
  userPing: userProcedure.input(z.void()).query(({ ctx }) => ({ userId: ctx.userId })),
});

const createCaller = createCallerFactory(testRouter);

// ---------------------------------------------------------------------------
// requireKnownCaller
// ---------------------------------------------------------------------------

describe('requireKnownCaller', () => {
  it('allows a valid mobile_app caller', async () => {
    const ctx = await createTRPCContext({ req: makeRequest(mobileHeaders) });
    const caller = createCaller(ctx);
    const result = await caller.publicPing();
    expect(result.ok).toBe(true);
  });

  it('allows a valid integration caller', async () => {
    const ctx = await createTRPCContext({
      req: makeRequest({ 'x-integration-key': 'test-integration-key' }),
    });
    const caller = createCaller(ctx);
    const result = await caller.publicPing();
    expect(result.ok).toBe(true);
  });

  it('rejects missing caller credentials', async () => {
    const ctx = await createTRPCContext({ req: makeRequest({}) });
    const caller = createCaller(ctx);
    await expect(caller.publicPing()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('rejects wrong client secret', async () => {
    const ctx = await createTRPCContext({
      req: makeRequest({ 'x-client-id': 'test-client-id', 'x-client-secret': 'wrong-secret' }),
    });
    const caller = createCaller(ctx);
    await expect(caller.publicPing()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('rejects invalid integration key', async () => {
    const ctx = await createTRPCContext({
      req: makeRequest({ 'x-integration-key': 'not-a-valid-key' }),
    });
    const caller = createCaller(ctx);
    await expect(caller.publicPing()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('allows dev bypass in non-production', async () => {
    const ctx = await createTRPCContext({
      req: makeRequest({ 'x-dev-bypass': 'test-dev-bypass' }),
    });
    const caller = createCaller(ctx);
    const result = await caller.publicPing();
    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// requireUserJwt
// ---------------------------------------------------------------------------

describe('requireUserJwt', () => {
  it('rejects when Authorization header is missing', async () => {
    const ctx = await createTRPCContext({ req: makeRequest(mobileHeaders) });
    const caller = createCaller(ctx);
    await expect(caller.userPing()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('rejects malformed bearer token', async () => {
    const ctx = await createTRPCContext({
      req: makeRequest({ ...mobileHeaders, authorization: 'Bearer invalid.token.here' }),
    });
    const caller = createCaller(ctx);
    await expect(caller.userPing()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});
