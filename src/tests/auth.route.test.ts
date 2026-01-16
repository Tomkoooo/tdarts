import { POST as register } from '@/app/api/auth/register/route';
import { POST as login } from '@/app/api/auth/login/route';
import { POST as forgotPassword } from '@/app/api/auth/forgot-password/route';
import { POST as resetPassword } from '@/app/api/auth/reset-password/route';
import { AuthService } from '@/database/services/auth.service';
import { connectMongo as connectToDatabase } from '@/lib/mongoose';
import { UserModel } from '@/database/models/user.model';

jest.mock('@/database/services/auth.service');

describe('Auth Routes', () => {
  beforeAll(async () => {
    await connectToDatabase();
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';
  }, 15000);

  beforeEach(async () => {
    await UserModel.deleteMany({});
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a user', async () => {
      const mockVerificationCode = 'mocked-verification-code';
      (AuthService.register as jest.Mock).mockResolvedValue(mockVerificationCode);

      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          confirmPassword: 'password123',
          username: 'test_user',
          name: 'Test User',
        }),
      });

      const response = await register(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toMatchObject({
        message: 'User registered',
      });
    }, 15000);

    it('should return 400 for missing fields', async () => {
      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      });

      const response = await register(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json).toMatchObject({
        error: 'Email, password, and name are required',
      });
    }, 15000);
  });

  describe('POST /api/auth/login', () => {
    it('should login a user', async () => {
      const mockToken = 'mocked-jwt-token';
      const mockUser = {
        _id: 'user_id',
        username: 'test_user',
        name: 'Test User',
        email: 'test@example.com',
        isVerified: true,
        isAdmin: false,
      };
      (AuthService.login as jest.Mock).mockResolvedValue({ token: mockToken, user: mockUser });

      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
      });

      const response = await login(request); // Fixed: Changed from register to login
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toMatchObject({
        message: 'Login successful',
      });
    }, 15000);

    it('should return 400 for missing fields', async () => {
      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      });

      const response = await login(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json).toMatchObject({
        error: 'Email and password are required',
      });
    }, 15000);
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should send reset password email', async () => {
      (AuthService.forgotPassword as jest.Mock).mockResolvedValue(undefined);

      const request = new Request('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      });

      const response = await forgotPassword(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toMatchObject({
        message: 'Reset password email sent',
      });
    }, 15000);

    it('should return 400 for missing email', async () => {
      const request = new Request('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await forgotPassword(request);
      const json = await response.json();
      const error = JSON.parse(json.error);

      expect(response.status).toBe(400);
      expect(error).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'invalid_type',
            expected: 'string',
            received: 'undefined',
            path: ['email'],
            message: 'Required',
          }),
        ])
      );
    }, 15000);

    it('should return 400 for invalid email', async () => {
      const request = new Request('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: 'invalid-email' }),
      });

      const response = await forgotPassword(request);
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
  });

  describe('POST /api/auth/reset-password', () => {
    it('should reset password with valid code', async () => {
      (AuthService.resetPassword as jest.Mock).mockResolvedValue(undefined);

      const request = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          code: 'valid_code',
          newPassword: 'newpassword123',
        }),
      });

      const response = await resetPassword(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toMatchObject({
        message: 'Password reset successfully',
      });
    }, 15000);

    it('should return 400 for missing fields', async () => {
      const request = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', code: 'valid_code' }),
      });

      const response = await resetPassword(request);
      const json = await response.json();
      const error = JSON.parse(json.error);

      expect(response.status).toBe(400);
      expect(error).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'invalid_type',
            expected: 'string',
            received: 'undefined',
            path: ['newPassword'],
            message: 'Required',
          }),
        ])
      );
    }, 15000);

    it('should return 400 for invalid email', async () => {
      const request = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
          code: 'valid_code',
          newPassword: 'newpassword123',
        }),
      });

      const response = await resetPassword(request);
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

    it('should return 400 for missing code', async () => {
      const request = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          newPassword: 'newpassword123',
        }),
      });

      const response = await resetPassword(request);
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
  });
});