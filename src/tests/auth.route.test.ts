import { POST as register } from '@/app/api/auth/register/route';
import { POST as login } from '@/app/api/auth/login/route';
import { AuthService } from '@/database/services/auth.service';
import { connectMongo as connectToDatabase } from '@/lib/mongoose';
import { UserModel } from '@/database/models/user.model';

jest.mock('@/database/services/auth.service');

describe('Auth Routes', () => {
  beforeAll(async () => {
    // Connection is handled by src/tests/setup.ts
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
          username: 'test_user',
          name: 'Test User',
        }),
      });

      const response = await register(request);
      const json = await response.json();

      expect(response.status).toBe(200); // Updated to expect 200
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
      expect(json).toMatchObject({ error: 'Email, password, and name are required' }); // Updated error message
    }, 15000);
  });

  describe('POST /api/auth/login', () => {
    it('should login a user', async () => {
      const mockToken = 'mocked-jwt-token';
      (AuthService.login as jest.Mock).mockResolvedValue(mockToken);

      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' }), // Changed to email
      });

      const response = await login(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toMatchObject({
        message: 'Login successful',
      });
    }, 15000);

    it('should return 400 for missing fields', async () => {
      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }), // Changed to email
      });

      const response = await login(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json).toMatchObject({ error: 'Email and password are required' }); // Updated error message
    }, 15000);
  });
});