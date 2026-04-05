/**
 * Unit tests for auth router — services are mocked.
 */
import { createCallerFactory } from '../trpc/init';
import { appRouter, createTRPCContext } from '../trpc/root';
import { AuthService } from '@tdarts/services';

jest.mock('@tdarts/services', () => ({
  AuthService: {
    login: jest.fn(),
    loginWithGoogleIdToken: jest.fn(),
    register: jest.fn(),
    verifyEmail: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    verifyToken: jest.fn(),
  },
}));

const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/trpc/auth.login', {
    method: 'POST',
    headers: new Headers({ 'x-client-id': 'test-client-id', 'x-client-secret': 'test-client-secret', ...headers }),
  });
}

const createCaller = createCallerFactory(appRouter);

// ---------------------------------------------------------------------------
// auth.login
// ---------------------------------------------------------------------------

describe('auth.login', () => {
  it('returns token + user on valid credentials', async () => {
    mockAuthService.login.mockResolvedValueOnce({
      token: 'jwt-token-abc',
      user: { _id: 'user1', username: 'testuser', email: 'test@example.com', name: 'Test User', isAdmin: false, isVerified: true },
    });

    const ctx = await createTRPCContext({ req: makeRequest() });
    const caller = createCaller(ctx);
    const result = await caller.auth.login({ email: 'test@example.com', password: 'Secret123' });

    expect(result.token).toBe('jwt-token-abc');
    expect(result.user.username).toBe('testuser');
    expect(mockAuthService.login).toHaveBeenCalledWith('test@example.com', 'Secret123');
  });

  it('propagates service errors as TRPC errors', async () => {
    const { BadRequestError } = require('@tdarts/core');
    mockAuthService.login.mockRejectedValueOnce(new BadRequestError('Invalid credentials', 'auth'));

    const ctx = await createTRPCContext({ req: makeRequest() });
    const caller = createCaller(ctx);
    await expect(caller.auth.login({ email: 'bad@example.com', password: 'wrong' })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('rejects missing email (Zod validation)', async () => {
    const ctx = await createTRPCContext({ req: makeRequest() });
    const caller = createCaller(ctx);
    await expect(caller.auth.login({ email: '', password: 'Secret123' })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('rejects missing caller credentials', async () => {
    const ctx = await createTRPCContext({
      req: new Request('http://localhost/trpc/auth.login', { method: 'POST', headers: new Headers() }),
    });
    const caller = createCaller(ctx);
    await expect(caller.auth.login({ email: 'test@example.com', password: 'pw' })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});

// ---------------------------------------------------------------------------
// auth.loginGoogle
// ---------------------------------------------------------------------------

describe('auth.loginGoogle', () => {
  it('returns token + user on valid id token', async () => {
    mockAuthService.loginWithGoogleIdToken.mockResolvedValueOnce({
      token: 'jwt-google',
      user: { _id: 'u1', username: 'guser', email: 'g@example.com', name: 'G User', isAdmin: false, isVerified: true },
    });

    const ctx = await createTRPCContext({ req: makeRequest() });
    const caller = createCaller(ctx);
    const result = await caller.auth.loginGoogle({ idToken: 'google-id-token-xyz' });

    expect(result.token).toBe('jwt-google');
    expect(mockAuthService.loginWithGoogleIdToken).toHaveBeenCalledWith('google-id-token-xyz');
  });

  it('rejects missing Tier 1 caller', async () => {
    const ctx = await createTRPCContext({
      req: new Request('http://localhost/trpc/auth.loginGoogle', { method: 'POST', headers: new Headers() }),
    });
    const caller = createCaller(ctx);
    await expect(caller.auth.loginGoogle({ idToken: 't' })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});

// ---------------------------------------------------------------------------
// auth.register
// ---------------------------------------------------------------------------

describe('auth.register', () => {
  it('calls AuthService.register with correct args', async () => {
    mockAuthService.register.mockResolvedValueOnce('user-id-123');

    const ctx = await createTRPCContext({ req: makeRequest() });
    const caller = createCaller(ctx);
    const result = await caller.auth.register({
      name: 'Test User',
      email: 'test@example.com',
      password: 'Secret123',
      confirmPassword: 'Secret123',
    });

    expect(result.ok).toBe(true);
    expect(mockAuthService.register).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Test User', email: 'test@example.com' }),
    );
  });

  it('rejects password mismatch (Zod refine)', async () => {
    const ctx = await createTRPCContext({ req: makeRequest() });
    const caller = createCaller(ctx);
    await expect(
      caller.auth.register({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Secret123',
        confirmPassword: 'Different1',
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});

// ---------------------------------------------------------------------------
// auth.ping
// ---------------------------------------------------------------------------

describe('auth.ping', () => {
  it('returns ok when Tier 1 credentials are valid', async () => {
    const ctx = await createTRPCContext({ req: makeRequest() });
    const caller = createCaller(ctx);
    const result = await caller.auth.ping();
    expect(result.ok).toBe(true);
  });
});
