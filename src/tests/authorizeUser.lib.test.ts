import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { AuthService } from '@/database/services/auth.service';
import { AuthorizationService } from '@/database/services/authorization.service';
import { authorizeUser, authorizeUserResult } from '@/features/auth/lib/authorizeUser';

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
  beforeEach(() => {
    jest.clearAllMocks();
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
});
