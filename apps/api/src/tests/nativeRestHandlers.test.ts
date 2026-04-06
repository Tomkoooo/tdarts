/**
 * REST handlers (socket, updates, payments, players) — services mocked.
 */
import { AuthService, AuthorizationService, AppUpdatesService, PaymentsService, PlayerService } from '@tdarts/services';
import { handleSocketAuthPost } from '../http/socketHandlers';
import { handleUpdatesGet } from '../http/updatesHandlers';
import { handlePaymentsVerifyPost } from '../http/paymentsHandlers';
import { handlePlayerAvatarPost } from '../http/playersHandlers';

jest.mock('@tdarts/services', () => ({
  AuthService: {
    verifyToken: jest.fn(),
    issueSocketToken: jest.fn(),
  },
  AuthorizationService: {
    getUserIdFromRequest: jest.fn(),
  },
  AppUpdatesService: {
    getPublicManifest: jest.fn(),
  },
  PaymentsService: {
    verifyCheckoutSessionForUser: jest.fn(),
  },
  PlayerService: {
    uploadPlayerAvatarFromBuffer: jest.fn(),
  },
}));

const mobileHeaders: Record<string, string> = {
  'x-client-id': 'test-client-id',
  'x-client-secret': 'test-client-secret',
};

describe('handleSocketAuthPost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects mobile without Tier 1', async () => {
    const req = new Request('http://localhost/api/socket/auth', {
      method: 'POST',
      headers: { authorization: 'Bearer x' },
    });
    const res = await handleSocketAuthPost(req, { mode: 'mobile' });
    expect(res.status).toBe(401);
  });

  it('returns socket token for mobile with Tier 1 + valid JWT', async () => {
    (AuthService.verifyToken as jest.Mock).mockResolvedValueOnce({
      _id: { toString: () => 'user-abc' },
    });
    (AuthService.issueSocketToken as jest.Mock).mockReturnValueOnce({
      token: 'socket-jwt',
      expiresInSec: 600,
    });

    const req = new Request('http://localhost/api/socket/auth', {
      method: 'POST',
      headers: { ...mobileHeaders, authorization: 'Bearer login-jwt' },
    });
    const res = await handleSocketAuthPost(req, { mode: 'mobile' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.socketToken).toBe('socket-jwt');
    expect(AuthService.issueSocketToken).toHaveBeenCalledWith('user-abc');
  });

  it('uses web session resolution (no Tier 1)', async () => {
    (AuthorizationService.getUserIdFromRequest as jest.Mock).mockResolvedValueOnce('web-user');
    (AuthService.issueSocketToken as jest.Mock).mockReturnValueOnce({
      token: 's',
      expiresInSec: 60,
    });

    const req = new Request('http://localhost/api/socket/auth', {
      method: 'POST',
      headers: new Headers({ cookie: 'token=fake' }),
    });
    const res = await handleSocketAuthPost(req, { mode: 'web' });
    expect(res.status).toBe(200);
    expect(AuthService.issueSocketToken).toHaveBeenCalledWith('web-user');
  });
});

describe('handleUpdatesGet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AppUpdatesService.getPublicManifest as jest.Mock).mockReturnValue({
      version: '1.0.0',
      minClientVersion: null,
      socketUrl: null,
    });
  });

  it('returns manifest JSON', async () => {
    const res = await handleUpdatesGet();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.version).toBe('1.0.0');
    expect(res.headers.get('Cache-Control')).toContain('max-age=60');
  });
});

describe('handlePaymentsVerifyPost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('verifies session for authenticated user (web)', async () => {
    (AuthorizationService.getUserIdFromRequest as jest.Mock).mockResolvedValueOnce('u1');
    (PaymentsService.verifyCheckoutSessionForUser as jest.Mock).mockResolvedValueOnce({
      ok: true,
      paymentStatus: 'paid',
      sessionId: 'cs_1',
      customerEmail: 'a@b.com',
    });

    const req = new Request('http://localhost/api/payments/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'cs_test' }),
    });
    const res = await handlePaymentsVerifyPost(req, { mode: 'web' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(PaymentsService.verifyCheckoutSessionForUser).toHaveBeenCalledWith('u1', 'cs_test');
  });
});

describe('handlePlayerAvatarPost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uploads when web user is resolved', async () => {
    (AuthorizationService.getUserIdFromRequest as jest.Mock).mockResolvedValueOnce('u1');
    (PlayerService.uploadPlayerAvatarFromBuffer as jest.Mock).mockResolvedValueOnce({
      url: '/api/media/x',
      mediaId: 'x',
    });

    const fd = new FormData();
    fd.set('file', new Blob([Buffer.from('fake')], { type: 'image/png' }), 'a.png');

    const req = new Request('http://localhost/api/players/p1/avatar', {
      method: 'POST',
      body: fd,
    });
    const res = await handlePlayerAvatarPost(req, 'p1', { mode: 'web' });
    expect(res.status).toBe(200);
    expect(PlayerService.uploadPlayerAvatarFromBuffer).toHaveBeenCalled();
  });
});
