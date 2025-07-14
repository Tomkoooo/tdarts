import { AuthService } from '@/database/services/auth.service';
import { UserModel } from '@/database/models/user.model';
import { BadRequestError } from '@/middleware/errorHandle';
import { connectMongo as connectToDatabase } from '@/lib/mongoose';

describe('AuthService', () => {
  beforeAll(async () => {
    await connectToDatabase();
  }, 15000);

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
    expect(user?.codes.verify_email).toBeDefined();
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
    await expect(
      AuthService.register({
        email: 'test@example.com',
        password: 'password123',
        username: 'test_user_2',
        name: 'Test User',
      })
    ).rejects.toThrow('Email or username already exists');
  }, 15000);

  it('should login with correct credentials', async () => {
    await AuthService.register({
      email: 'test@example.com',
      password: 'password123',
      username: 'test_user',
      name: 'Test User',
    });
    const token = await AuthService.login('test@example.com', 'password123');
    expect(token).toBeDefined();
  }, 15000);

  it('should throw error for invalid login credentials', async () => {
    await expect(AuthService.login('test@example.com', 'wrongpassword')).rejects.toThrow(BadRequestError);
    await expect(AuthService.login('test@example.com', 'wrongpassword')).rejects.toThrow('Invalid email or password');
  }, 15000);

  it('should send reset password email', async () => {
    await AuthService.register({
      email: 'test@example.com',
      password: 'password123',
      username: 'test_user',
      name: 'Test User',
    });
    await expect(AuthService.forgotPassword('test@example.com')).resolves.toBeUndefined();
    const user = await UserModel.findOne({ email: 'test@example.com' });
    expect(user?.codes.reset_password).toBeDefined();
  }, 15000);

  it('should throw error if user does not exist for forgot password', async () => {
    await expect(AuthService.forgotPassword('nonexistent@example.com')).rejects.toThrow(BadRequestError);
    await expect(AuthService.forgotPassword('nonexistent@example.com')).rejects.toThrow('User not found');
  }, 15000);

  it('should reset password with valid code', async () => {
    await AuthService.register({
      email: 'test@example.com',
      password: 'password123',
      username: 'test_user',
      name: 'Test User',
    });
    const user = await UserModel.findOne({ email: 'test@example.com' });
    const resetCode = await user!.generateResetPasswordCode();
    await AuthService.resetPassword('test@example.com', resetCode, 'newpassword123');
    const updatedUser = await UserModel.findOne({ email: 'test@example.com' }).select('+password');
    expect(await updatedUser!.matchPassword('newpassword123')).toBe(true);
    expect(updatedUser!.codes.reset_password).toBeNull();
  }, 15000);

  it('should throw error for invalid reset code', async () => {
    await AuthService.register({
      email: 'test@example.com',
      password: 'password123',
      username: 'test_user',
      name: 'Test User',
    });
    await expect(
      AuthService.resetPassword('test@example.com', 'invalid_code', 'newpassword123')
    ).rejects.toThrow(BadRequestError);
    await expect(
      AuthService.resetPassword('test@example.com', 'invalid_code', 'newpassword123')
    ).rejects.toThrow('Invalid reset code');
  }, 15000);

  it('should throw error if user does not exist for reset password', async () => {
    await expect(
      AuthService.resetPassword('nonexistent@example.com', 'some_code', 'newpassword123')
    ).rejects.toThrow(BadRequestError);
    await expect(
      AuthService.resetPassword('nonexistent@example.com', 'some_code', 'newpassword123')
    ).rejects.toThrow('User not found');
  }, 15000);
});