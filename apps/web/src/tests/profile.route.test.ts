import {
  updateProfileAction,
  verifyEmailAction,
  getTicketsAction,
} from '@/features/profile/actions';
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

describe('Profile Actions', () => {
  beforeAll(async () => {
    await connectToDatabase();
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';
  }, 15000);

  beforeEach(async () => {
    await UserModel.deleteMany({});
    jest.clearAllMocks();
  });

  describe('updateProfileAction', () => {
    it('should update user profile', async () => {
      const mockUser = {
        _id: 'user_id',
        email: 'new@example.com',
        name: 'New Name',
        username: 'new_user',
        isVerified: true,
        country: null,
        locale: 'hu',
      };
      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: 'valid_token' }),
      });
      (AuthService.verifyToken as jest.Mock).mockResolvedValue(mockUser);
      (ProfileService.updateProfile as jest.Mock).mockResolvedValue(mockUser);

      const result = await updateProfileAction({
        email: 'new@example.com',
        name: 'New Name',
        username: 'new_user',
        password: 'newpassword123',
        confirmPassword: 'newpassword123',
      });

      expect(result).toMatchObject({
        success: true,
        message: 'Profile updated successfully',
        user: { email: 'new@example.com', name: 'New Name', username: 'new_user' },
      });
    }, 15000);

    it('should return 401 for missing token', async () => {
      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue(undefined),
      });

      const result = await updateProfileAction({ name: 'New Name' });

      expect(result).toMatchObject({
        ok: false,
        code: 'UNAUTHORIZED',
        status: 401,
        message: 'Unauthorized',
      });
    }, 15000);

    it('should return 400 for invalid email', async () => {
      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: 'valid_token' }),
      });
      (AuthService.verifyToken as jest.Mock).mockResolvedValue({ _id: 'user_id' });

      const result = await updateProfileAction({ email: 'invalid-email' });

      expect(result).toMatchObject({
        ok: false,
        code: 'BAD_REQUEST',
        status: 400,
      });
    }, 15000);
  });

  describe('verifyEmailAction', () => {
    it('should verify email', async () => {
      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: 'valid_token' }),
      });
      (AuthService.verifyToken as jest.Mock).mockResolvedValue({ _id: 'user_id' });
      (ProfileService.verifyEmail as jest.Mock).mockResolvedValue(undefined);

      const result = await verifyEmailAction({ code: 'valid_code' });

      expect(result).toMatchObject({ success: true });
    }, 15000);

    it('should return 401 for missing token', async () => {
      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue(undefined),
      });

      const result = await verifyEmailAction({ code: 'valid_code' });

      expect(result).toMatchObject({
        ok: false,
        code: 'UNAUTHORIZED',
        status: 401,
      });
    }, 15000);
  });

  describe('getTicketsAction', () => {
    it('should return tickets for valid token', async () => {
      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: 'valid_token' }),
      });
      (AuthService.verifyToken as jest.Mock).mockResolvedValue({ _id: 'user_id' });
      (FeedbackService.getFeedbackByUserId as jest.Mock).mockResolvedValue([
        { _id: 'ticket_1', toObject: () => ({ _id: 'ticket_1', title: 'Test', status: 'pending' }) },
      ]);

      const result = await getTicketsAction();

      expect(result).toMatchObject({ success: true });
      expect((result as any).data).toBeDefined();
      expect(Array.isArray((result as any).data)).toBe(true);
    }, 15000);
  });
});
