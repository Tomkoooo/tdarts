import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { AuthService } from '@/database/services/auth.service';
import { AuthorizationService } from '@/database/services/authorization.service';
import { authorizeUser, authorizeUserResult } from '@/features/auth/lib/authorizeUser';

const env = process.env as Record<string, string | undefined>;

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

jest.mock('@/database/services/auth.service', () => ({
  AuthService: {
    verifyToken: jest.fn(),
  },
}));

jest.mock('@/database/services/authorization.service', () => ({
  AuthorizationService: {
    getUserIdFromRequest: jest.fn(),
  },
}));

describe('authorizeUser lib', () => {
  const prevNodeEnv = process.env.NODE_ENV;
  const prevAllow = process.env.ALLOW_LOAD_TEST_ENDPOINTS;
  const prevLoadMode = process.env.LOAD_TEST_MODE;
  const prevLoadUser = process.env.LOAD_TEST_USER_ID;
  const prevLoadSecret = process.env.LOAD_TEST_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    env.NODE_ENV = prevNodeEnv;
    if (prevAllow === undefined) {
      delete process.env.ALLOW_LOAD_TEST_ENDPOINTS;
    } else {
      process.env.ALLOW_LOAD_TEST_ENDPOINTS = prevAllow;
    }
    if (prevLoadMode === undefined) {
      delete process.env.LOAD_TEST_MODE;
    } else {
      process.env.LOAD_TEST_MODE = prevLoadMode;
    }
    if (prevLoadUser === undefined) {
      delete process.env.LOAD_TEST_USER_ID;
    } else {
      process.env.LOAD_TEST_USER_ID = prevLoadUser;
    }
    if (prevLoadSecret === undefined) {
      delete process.env.LOAD_TEST_SECRET;
    } else {
      process.env.LOAD_TEST_SECRET = prevLoadSecret;
    }
  });

  it('returns structured denial when request auth is missing', async () => {
    (AuthorizationService.getUserIdFromRequest as jest.Mock).mockResolvedValue(null);
    const request = new NextRequest('http://localhost:3000/api/test');
    const result = await authorizeUserResult({ request });
    expect(result).toEqual({
      ok: false,
      code: 'UNAUTHORIZED',
      status: 401,
      message: 'Unauthorized',
    });
  });

  it('returns user when cookie token is valid', async () => {
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn(() => ({ value: 'token' })),
    });
    (AuthService.verifyToken as jest.Mock).mockResolvedValue({ _id: { toString: () => 'user-1' } });
    const result = await authorizeUserResult();
    expect(result).toEqual({ ok: true, data: { userId: 'user-1' } });
  });

  it('throws in strict authorizeUser wrapper on denial', async () => {
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn(() => undefined),
    });
    await expect(authorizeUser()).rejects.toThrow('Unauthorized');
  });

  it('does not treat x-load-test-secret as auth in production without ALLOW_LOAD_TEST_ENDPOINTS', async () => {
    env.NODE_ENV = 'production';
    delete process.env.ALLOW_LOAD_TEST_ENDPOINTS;
    process.env.LOAD_TEST_MODE = 'true';
    process.env.LOAD_TEST_USER_ID = 'load-user';
    process.env.LOAD_TEST_SECRET = 'secret';
    (AuthorizationService.getUserIdFromRequest as jest.Mock).mockResolvedValue(null);
    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: { 'x-load-test-secret': 'secret' },
    });
    const result = await authorizeUserResult({ request });
    expect(result).toEqual({
      ok: false,
      code: 'UNAUTHORIZED',
      status: 401,
      message: 'Unauthorized',
    });
  });

  it('honors x-load-test-secret when production and ALLOW_LOAD_TEST_ENDPOINTS=true', async () => {
    env.NODE_ENV = 'production';
    process.env.ALLOW_LOAD_TEST_ENDPOINTS = 'true';
    process.env.LOAD_TEST_MODE = 'true';
    process.env.LOAD_TEST_USER_ID = 'load-user';
    process.env.LOAD_TEST_SECRET = 'secret';
    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: { 'x-load-test-secret': 'secret' },
    });
    const result = await authorizeUserResult({ request });
    expect(result).toEqual({ ok: true, data: { userId: 'load-user' } });
  });
});
