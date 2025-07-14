import { ProfileService } from '@/database/services/profile.service';
import { UserModel } from '@/database/models/user.model';
import { BadRequestError } from '@/middleware/errorHandle';

describe('ProfileService', () => {
  beforeEach(async () => {
    await UserModel.deleteMany({});
  });

  it('should update user profile', async () => {
    const user = await UserModel.create({
      email: 'test@example.com',
      password: 'password123',
      username: 'test_user',
      name: 'Test User',
    });

    const updatedUser = await ProfileService.updateProfile(user._id.toString(), {
      email: 'new@example.com',
      name: 'New Name',
      username: 'new_user',
      password: 'newpassword123',
    });

    expect(updatedUser.email).toBe('new@example.com');
    expect(updatedUser.name).toBe('New Name');
    expect(updatedUser.username).toBe('new_user');
    expect(updatedUser.isVerified).toBe(false);
    expect(updatedUser.codes.verify_email).toBeDefined();
    expect(await updatedUser.matchPassword('newpassword123')).toBe(true);
  }, 15000);

  it('should throw error if email already exists', async () => {
    await UserModel.create({
      email: 'existing@example.com',
      password: 'password123',
      username: 'existing_user',
      name: 'Existing User',
    });

    const user = await UserModel.create({
      email: 'test@example.com',
      password: 'password123',
      username: 'test_user',
      name: 'Test User',
    });

    await expect(
      ProfileService.updateProfile(user._id.toString(), {
        email: 'existing@example.com',
      })
    ).rejects.toThrow(BadRequestError);
    await expect(
      ProfileService.updateProfile(user._id.toString(), {
        email: 'existing@example.com',
      })
    ).rejects.toThrow('Email or username already exists');
  }, 15000);

  it('should throw error if user not found', async () => {
    await expect(
      ProfileService.updateProfile('nonexistent_id', { name: 'New Name' })
    ).rejects.toThrow(BadRequestError);
    await expect(
      ProfileService.updateProfile('nonexistent_id', { name: 'New Name' })
    ).rejects.toThrow('User not found');
  }, 15000);

  it('should verify email with valid code', async () => {
    const user = await UserModel.create({
      email: 'test@example.com',
      password: 'password123',
      username: 'test_user',
      name: 'Test User',
    });

    const verificationCode = await user.generateVerifyEmailCode();
    await ProfileService.verifyEmail(user._id.toString(), verificationCode);
    const updatedUser = await UserModel.findById(user._id);
    expect(updatedUser?.isVerified).toBe(true);
    expect(updatedUser?.codes.verify_email).toBeUndefined();
  }, 15000);

  it('should throw error for invalid email verification code', async () => {
    const user = await UserModel.create({
      email: 'test@example.com',
      password: 'password123',
      username: 'test_user',
      name: 'Test User',
    });

    await expect(
      ProfileService.verifyEmail(user._id.toString(), 'invalid_code')
    ).rejects.toThrow(BadRequestError);
    await expect(
      ProfileService.verifyEmail(user._id.toString(), 'invalid_code')
    ).rejects.toThrow('Invalid verification code');
  }, 15000);

  it('should logout user', async () => {
    const user = await UserModel.create({
      email: 'test@example.com',
      password: 'password123',
      username: 'test_user',
      name: 'Test User',
    });

    await expect(ProfileService.logout(user._id.toString())).resolves.toBeUndefined();
  }, 15000);

  it('should throw error if user not found for logout', async () => {
    await expect(ProfileService.logout('nonexistent_id')).rejects.toThrow(BadRequestError);
    await expect(ProfileService.logout('nonexistent_id')).rejects.toThrow('User not found');
  }, 15000);
});