import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserDocument } from '@/interface/user.interface';

const userSchema = new mongoose.Schema<UserDocument>(
  {
    username: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false }, // OAuth esetén nem kötelező
    isVerified: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    lastLogin: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false },
    // OAuth adatok
    googleId: { type: String, default: null },
    profilePicture: { type: String, default: null },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    codes: {
      reset_password: { type: String, default: null },
      verify_email: { type: String, default: null },
      two_factor_auth: { type: String, default: null },
    },
  },
  { collection: 'users', timestamps: true }
);

userSchema.pre('save', async function (next) {
  // Ensure username does not contain spaces
  const usernameRegex = /^[^\s]+$/;
  if (!usernameRegex.test(this.username)) {
    return next(new Error('Username cannot contain spaces'));
  }
  // Verify email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(this.email)) {
    return next(new Error('Invalid email format'));
  }
  // Hash password if modified and password exists (not OAuth user)
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 15);
  }
  
  // Update linked player document if name changed
  if (this.isModified('name') && !this.isNew) {
    try {
      const { PlayerModel } = await import('./player.model');
      const linkedPlayer = await PlayerModel.findOne({ userRef: this._id });
      if (linkedPlayer) {
        await PlayerModel.findByIdAndUpdate(
          linkedPlayer._id,
          { name: this.name },
          { new: true }
        );
        console.log(`Auto-updated player name for user ${this._id} to: ${this.name}`);
      }
    } catch (error) {
      console.error('Error auto-updating player name:', error);
      // Don't throw error to prevent user update from failing
    }
  }
  
  this.updatedAt = new Date();
  next();
});

userSchema.methods.matchPassword = async function (password: string): Promise<boolean> {
  if (!this.password) {
    return false; // OAuth felhasználóknál nincs jelszó
  }
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateResetPasswordCode = async function (): Promise<string> {
  const code = Math.random().toString(36).substring(2, 15);
  this.codes.reset_password = code;
  await this.save();
  return code;
};

userSchema.methods.generateVerifyEmailCode = async function (): Promise<string> {
  const code = Math.random().toString(36).substring(2, 15);
  this.codes.verify_email = code;
  await this.save();
  return code;
};

userSchema.methods.generateTwoFactorAuthCode = async function (): Promise<string> {
  const code = Math.random().toString(36).substring(2, 15);
  this.codes.two_factor_auth = code;
  await this.save();
  return code;
};

userSchema.methods.verifyEmail = async function (code: string): Promise<void> {
  try {
    if (this.codes.verify_email !== code) {
      throw new Error('Invalid verification code');
    }
    this.isVerified = true;
    this.codes.verify_email = null;
    await this.save();
  } catch (error: any) {
    throw new Error(`Email verification failed: ${error.message}`);
  }
};

userSchema.methods.resetPassword = async function (newPassword: string, code: string): Promise<void> {
  try {
    if (this.codes.reset_password !== code) {
      throw new Error('Invalid reset password code');
    }
    this.password = newPassword; // Set the new password to trigger pre('save') hashing
    this.codes.reset_password = null;
    await this.save();
  } catch (error: any) {
    throw new Error(`Password reset failed: ${error.message}`);
  }
};

userSchema.methods.verifyTwoFactorAuth = async function (code: string): Promise<boolean> {
  if (this.codes.two_factor_auth === code) {
    this.codes.two_factor_auth = null;
    await this.save();
    return true;
  }
  return false;
};

userSchema.methods.updateLastLogin = async function (): Promise<void> {
  this.lastLogin = new Date();
  await this.save();
};

userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.codes;
  return user;
};

// Export the User model, reusing it if already defined
export const UserModel =
  mongoose.models.User || mongoose.model<UserDocument>('User', userSchema);