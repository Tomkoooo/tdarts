import { NextRequest } from 'next/server';
import { POST } from '@/app/api/load-test/[...action]/route';

const env = process.env as Record<string, string | undefined>;

describe('POST /api/load-test/[...action] production guard', () => {
  const prevNodeEnv = process.env.NODE_ENV;
  const prevAllow = process.env.ALLOW_LOAD_TEST_ENDPOINTS;
  const prevMode = process.env.LOAD_TEST_MODE;
  const prevSecret = process.env.LOAD_TEST_SECRET;
  const prevUser = process.env.LOAD_TEST_USER_ID;
  const prevClub = process.env.LOAD_TEST_CLUB_ID;

  afterEach(() => {
    env.NODE_ENV = prevNodeEnv;
    if (prevAllow === undefined) {
      delete process.env.ALLOW_LOAD_TEST_ENDPOINTS;
    } else {
      process.env.ALLOW_LOAD_TEST_ENDPOINTS = prevAllow;
    }
    if (prevMode === undefined) {
      delete process.env.LOAD_TEST_MODE;
    } else {
      process.env.LOAD_TEST_MODE = prevMode;
    }
    if (prevSecret === undefined) {
      delete process.env.LOAD_TEST_SECRET;
    } else {
      process.env.LOAD_TEST_SECRET = prevSecret;
    }
    if (prevUser === undefined) {
      delete process.env.LOAD_TEST_USER_ID;
    } else {
      process.env.LOAD_TEST_USER_ID = prevUser;
    }
    if (prevClub === undefined) {
      delete process.env.LOAD_TEST_CLUB_ID;
    } else {
      process.env.LOAD_TEST_CLUB_ID = prevClub;
    }
  });

  it('returns 403 in production when ALLOW_LOAD_TEST_ENDPOINTS is not set, even if load-test env is enabled', async () => {
    env.NODE_ENV = 'production';
    delete process.env.ALLOW_LOAD_TEST_ENDPOINTS;
    process.env.LOAD_TEST_MODE = 'true';
    process.env.LOAD_TEST_SECRET = 'test-secret';
    process.env.LOAD_TEST_USER_ID = 'user-id';
    process.env.LOAD_TEST_CLUB_ID = 'club-id';

    const request = new NextRequest('http://localhost:3000/api/load-test/create-tournament', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: {
        'Content-Type': 'application/json',
        'x-load-test-secret': 'test-secret',
      },
    });

    const response = await POST(request, { params: Promise.resolve({ action: ['create-tournament'] }) });
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toContain('disabled in production');
  });

  it('allows load test in production when ALLOW_LOAD_TEST_ENDPOINTS=true (smoke: reaches mode check)', async () => {
    env.NODE_ENV = 'production';
    process.env.ALLOW_LOAD_TEST_ENDPOINTS = 'true';
    process.env.LOAD_TEST_MODE = 'false';

    const request = new NextRequest('http://localhost:3000/api/load-test/create-tournament', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: {
        'Content-Type': 'application/json',
        'x-load-test-secret': 'x',
      },
    });

    const response = await POST(request, { params: Promise.resolve({ action: ['create-tournament'] }) });
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe('Load test mode is disabled');
  });
});
