import { getServerSession } from 'next-auth';
import { UserModel } from '@/database/models/user.model';
import { AuthService } from '@/database/services/auth.service';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/mongoose', () => ({
  connectMongo: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/database/models/user.model', () => ({
  UserModel: {
    findOne: jest.fn(),
  },
}));

jest.mock('@/database/services/auth.service', () => ({
  AuthService: {
    generateAuthToken: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { POST: linkGoogle } = require('@/app/api/auth/link-google/route');

describe('POST /api/auth/link-google', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when Google provider ID is missing from session', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'google@example.com' },
    });

    const request = new Request('http://localhost:3000/api/auth/link-google', {
      method: 'POST',
      body: JSON.stringify({
        email: 'local@example.com',
        password: 'password123',
      }),
    });

    const response = await linkGoogle(request as any);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain('Google provider session is missing');
    expect(UserModel.findOne).not.toHaveBeenCalled();
  });

  it('links local account with trusted Google provider ID', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        email: 'google@example.com',
        image: 'https://example.com/avatar.png',
        googleProviderId: 'google-provider-123',
      },
    });

    const existingUser: any = {
      _id: { toString: () => 'user-1' },
      email: 'local@example.com',
      username: 'local_user',
      name: 'Local User',
      isAdmin: false,
      isVerified: false,
      profilePicture: null,
      authProvider: 'local',
      googleId: null,
      matchPassword: jest.fn().mockResolvedValue(true),
      save: jest.fn().mockResolvedValue(undefined),
    };

    (UserModel.findOne as jest.Mock)
      .mockReturnValueOnce({
        select: jest.fn().mockResolvedValue(existingUser),
      })
      .mockResolvedValueOnce(null);

    (AuthService.generateAuthToken as jest.Mock).mockResolvedValue('jwt-token');

    const request = new Request('http://localhost:3000/api/auth/link-google', {
      method: 'POST',
      body: JSON.stringify({
        email: 'local@example.com',
        password: 'password123',
      }),
    });

    const response = await linkGoogle(request as any);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(existingUser.googleId).toBe('google-provider-123');
    expect(existingUser.authProvider).toBe('google');
    expect(existingUser.save).toHaveBeenCalled();
    expect(AuthService.generateAuthToken).toHaveBeenCalledWith(existingUser);
  });

  it('returns 409 when Google account is already linked to another user', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        email: 'google@example.com',
        googleProviderId: 'google-provider-123',
      },
    });

    const existingUser: any = {
      _id: { toString: () => 'user-1' },
      googleId: null,
      matchPassword: jest.fn().mockResolvedValue(true),
      save: jest.fn(),
    };

    (UserModel.findOne as jest.Mock)
      .mockReturnValueOnce({
        select: jest.fn().mockResolvedValue(existingUser),
      })
      .mockResolvedValueOnce({
        _id: { toString: () => 'user-2' },
      });

    const request = new Request('http://localhost:3000/api/auth/link-google', {
      method: 'POST',
      body: JSON.stringify({
        email: 'local@example.com',
        password: 'password123',
      }),
    });

    const response = await linkGoogle(request as any);
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.error).toBe('This Google account is already linked to another user');
    expect(existingUser.save).not.toHaveBeenCalled();
  });

  it('returns 400 when local account already has a linked Google account', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        email: 'google@example.com',
        googleProviderId: 'google-provider-123',
      },
    });

    const existingUser: any = {
      _id: { toString: () => 'user-1' },
      googleId: 'already-linked-google-id',
      matchPassword: jest.fn().mockResolvedValue(true),
      save: jest.fn(),
    };

    (UserModel.findOne as jest.Mock).mockReturnValueOnce({
      select: jest.fn().mockResolvedValue(existingUser),
    });

    const request = new Request('http://localhost:3000/api/auth/link-google', {
      method: 'POST',
      body: JSON.stringify({
        email: 'local@example.com',
        password: 'password123',
      }),
    });

    const response = await linkGoogle(request as any);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe('Google account already linked');
  });
});
