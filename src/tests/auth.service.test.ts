import { AuthService } from '@/database/services/auth.service';
import { UserModel } from '@/database/models/user.model';
import { BadRequestError } from '@/middleware/errorHandle';

describe('AuthService', () => {
  beforeEach(async () => {
    await UserModel.deleteMany({});
  });

  it('should register a new user', async () => {
    const verificationCode = await AuthService.register({
      email: 'test@example.com',
      password: 'password123',
      username: 'test_user',
      name: 'Test User',
    });
    expect(verificationCode).toBeDefined();
    const user = await UserModel.findOne({ email: 'test@example.com' });
    expect(user).toBeDefined();
    expect(user?.username).toBe('test_user');
    expect(user?.name).toBe('Test User');
  }, 15000);

  it('should throw error if email already exists', async () => {
    await AuthService.register({
      email: 'test@example.com',
      password: 'password123',
      username: 'test_user',
      name: 'Test User',
    });
    await expect(
      AuthService.register({
        email: 'test@example.com',
        password: 'password123',
        username: 'test_user_2',
        name: 'Test User',
      })
    ).rejects.toThrow(BadRequestError);
  }, 15000);

  it('should login with correct credentials', async () => {
    await AuthService.register({
      email: 'test@example.com',
      password: 'password123',
      username: 'test_user',
      name: 'Test User',
    });
    const token = await AuthService.login('test_user', 'password123');
    expect(token).toBeDefined();
  }, 15000);

  it('should throw error for invalid login credentials', async () => {
    await expect(AuthService.login('test_user', 'wrongpassword')).rejects.toThrow(BadRequestError);
  }, 15000);
});