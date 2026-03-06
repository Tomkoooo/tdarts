import { POST as updateProfile } from '@/app/api/profile/update/route';
import { POST as verifyEmail } from '@/app/api/profile/verify-email/route';
import { GET as getTickets } from '@/app/api/profile/tickets/route';
import { NextRequest } from 'next/server';
import { ProfileService } from '@/database/services/profile.service';
import { AuthService } from '@/database/services/auth.service';
import { FeedbackService } from '@/database/services/feedback.service';
import { UserModel } from '@/database/models/user.model';
import { connectMongo as connectToDatabase } from '@/lib/mongoose';
import { cookies } from 'next/headers';

jest.mock('@/database/services/profile.service');
jest.mock('@/database/services/auth.service');
jest.mock('@/database/services/feedback.service');
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

describe('Profile Routes', () => {
  beforeAll(async () => {
    await connectToDatabase();
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';
  }, 15000);

  beforeEach(async () => {
    await UserModel.deleteMany({});
    jest.clearAllMocks();
  });

  describe('POST /api/profile/update', () => {
    it('should update user profile', async () => {
      const mockUser = {
        _id: 'user_id',
        email: 'new@example.com',
        name: 'New Name',
        username: 'new_user',
      };
      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: 'valid_token' }),
      });
      (AuthService.verifyToken as jest.Mock).mockResolvedValue(mockUser);
      (ProfileService.updateProfile as jest.Mock).mockResolvedValue(mockUser);

      const request = new Request('http://localhost:3000/api/profile/update', {
        method: 'POST',
        body: JSON.stringify({
          email: 'new@example.com',
          name: 'New Name',
          username: 'new_user',
          password: 'newpassword123',
          confirmPassword: 'newpassword123',
        }),
      });

      const response = await updateProfile(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toMatchObject({
        message: 'Profile updated successfully',
        user: { email: 'new@example.com', name: 'New Name', username: 'new_user' },
      });
    }, 15000);

    it('should return 401 for missing token', async () => {
      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue(undefined),
      });

      const request = new Request('http://localhost:3000/api/profile/update', {
        method: 'POST',
        body: JSON.stringify({ name: 'New Name' }),
      });

      const response = await updateProfile(request);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json).toMatchObject({ error: 'Unauthorized' });
    }, 15000);

    it('should return 400 for invalid email', async () => {
      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: 'valid_token' }),
      });
      (AuthService.verifyToken as jest.Mock).mockResolvedValue({ _id: 'user_id' });

      const request = new Request('http://localhost:3000/api/profile/update', {
        method: 'POST',
        body: JSON.stringify({ email: 'invalid-email' }),
      });

      const response = await updateProfile(request);
      const json = await response.json();
      const error = JSON.parse(json.error);

      expect(response.status).toBe(400);
      expect(error).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'invalid_string',
            validation: 'email',
            path: ['email'],
            message: 'Invalid email address',
          }),
        ])
      );
    }, 15000);

    it('should return 401 when token is invalid', async () => {
      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: 'invalid_token' }),
      });
      (AuthService.verifyToken as jest.Mock).mockRejectedValue(new Error('Invalid token'));

      const request = new Request('http://localhost:3000/api/profile/update', {
        method: 'POST',
        body: JSON.stringify({ name: 'New Name' }),
      });

      const response = await updateProfile(request);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json).toMatchObject({ error: 'Invalid token' });
    }, 15000);
  });

  describe('POST /api/profile/verify-email', () => {
    it('should verify email', async () => {
      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: 'valid_token' }),
      });
      (AuthService.verifyToken as jest.Mock).mockResolvedValue({ _id: 'user_id' });
      (ProfileService.verifyEmail as jest.Mock).mockResolvedValue(undefined);

      const request = new Request('http://localhost:3000/api/profile/verify-email', {
        method: 'POST',
        body: JSON.stringify({ code: 'valid_code' }),
      });

      const response = await verifyEmail(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toMatchObject({ message: 'Email verified successfully' });
    }, 15000);

    it('should return 401 for missing token', async () => {
      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue(undefined),
      });

      const request = new Request('http://localhost:3000/api/profile/verify-email', {
        method: 'POST',
        body: JSON.stringify({ code: 'valid_code' }),
      });

      const response = await verifyEmail(request);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json).toMatchObject({ error: 'Unauthorized' });
    }, 15000);

    it('should return 400 for missing code', async () => {
      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: 'valid_token' }),
      });
      (AuthService.verifyToken as jest.Mock).mockResolvedValue({ _id: 'user_id' });

      const request = new Request('http://localhost:3000/api/profile/verify-email', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await verifyEmail(request);
      const json = await response.json();
      const error = JSON.parse(json.error);

      expect(response.status).toBe(400);
      expect(error).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'invalid_type',
            expected: 'string',
            received: 'undefined',
            path: ['code'],
            message: 'Required',
          }),
        ])
      );
    }, 15000);

    it('should return 401 when token is invalid', async () => {
      (cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: 'invalid_token' }),
      });
      (AuthService.verifyToken as jest.Mock).mockRejectedValue(new Error('Invalid token'));

      const request = new Request('http://localhost:3000/api/profile/verify-email', {
        method: 'POST',
        body: JSON.stringify({ code: 'valid_code' }),
      });

      const response = await verifyEmail(request);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json).toMatchObject({ error: 'Invalid token' });
    }, 15000);
  });

  describe('GET /api/profile/tickets', () => {
    it('should return 401 when token is invalid', async () => {
      (AuthService.verifyToken as jest.Mock).mockRejectedValue(new Error('Invalid token'));

      const request = new NextRequest('http://localhost:3000/api/profile/tickets', {
        method: 'GET',
        headers: { cookie: 'token=invalid_token' },
      });

      const response = await getTickets(request as any);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json).toMatchObject({ error: 'Invalid token' });
    }, 15000);

    it('should return tickets for valid token', async () => {
      (AuthService.verifyToken as jest.Mock).mockResolvedValue({ _id: 'user_id' });
      (FeedbackService.getFeedbackByUserId as jest.Mock).mockResolvedValue([{ _id: 'ticket_1' }]);

      const request = new NextRequest('http://localhost:3000/api/profile/tickets', {
        method: 'GET',
        headers: { cookie: 'token=valid_token' },
      });

      const response = await getTickets(request as any);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toMatchObject({ success: true, data: [{ _id: 'ticket_1' }] });
    }, 15000);
  });
});