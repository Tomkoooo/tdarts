import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type { UserDocument } from '../interfaces/user.interface';
import { ValidationError } from '../errors/index';
import { authEmailLinkTtlMinutes } from '../lib/auth-email-link';

function randomSixDigitCode(): string {
  return String(crypto.randomInt(100_000, 1_000_000));
}

function randomUrlToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

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
    country: { type: String, default: null },
    locale: { type: String, enum: ['hu', 'en', 'de'], default: 'hu' },
    termsAcceptedAt: { type: Date, default: null },
    codes: {
      reset_password: { type: String, default: null },
      reset_password_token: { type: String, default: null },
      reset_password_expires: { type: Date, default: null },
      verify_email: { type: String, default: null },
      verify_email_token: { type: String, default: null },
      verify_email_expires: { type: Date, default: null },
      magic_login_token: { type: String, default: null },
      magic_login_expires: { type: Date, default: null },
      two_factor_auth: { type: String, default: null },
    },
  },
  { collection: 'users', timestamps: true }
);

const tokenStringPartial = (path: string) => ({
  unique: true,
  partialFilterExpression: { [path]: { $type: 'string' } },
});
userSchema.index({ 'codes.verify_email_token': 1 }, tokenStringPartial('codes.verify_email_token'));
userSchema.index({ 'codes.reset_password_token': 1 }, tokenStringPartial('codes.reset_password_token'));
userSchema.index({ 'codes.magic_login_token': 1 }, tokenStringPartial('codes.magic_login_token'));

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
    this.password = await bcrypt.hash(this.password, 10);
  }

  // Keep linked player identity fields aligned with the user profile.
  if ((this.isModified('name') || this.isModified('country')) && !this.isNew) {
    try {
      const { PlayerModel } = await import('./player.model');
      const linkedPlayer = await PlayerModel.findOne({ userRef: this._id });
      if (linkedPlayer) {
        await PlayerModel.findByIdAndUpdate(linkedPlayer._id, {
          name: this.name,
          country: this.country || null,
        });
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
  const ttlMin = authEmailLinkTtlMinutes();
  const expires = new Date(Date.now() + ttlMin * 60_000);
  const code = randomSixDigitCode();
  const token = randomUrlToken();
  this.codes.reset_password = code;
  this.codes.reset_password_token = token;
  this.codes.reset_password_expires = expires;
  await this.save();
  return code;
};

userSchema.methods.generateVerifyEmailCode = async function (): Promise<string> {
  const ttlMin = authEmailLinkTtlMinutes();
  const expires = new Date(Date.now() + ttlMin * 60_000);
  const code = randomSixDigitCode();
  const token = randomUrlToken();
  this.codes.verify_email = code;
  this.codes.verify_email_token = token;
  this.codes.verify_email_expires = expires;
  await this.save();
  return code;
};

userSchema.methods.generateMagicLoginToken = async function (): Promise<string> {
  const ttlMin = authEmailLinkTtlMinutes();
  const expires = new Date(Date.now() + ttlMin * 60_000);
  const token = randomUrlToken();
  this.codes.magic_login_token = token;
  this.codes.magic_login_expires = expires;
  await this.save();
  return token;
};

userSchema.methods.generateTwoFactorAuthCode = async function (): Promise<string> {
  const code = crypto.randomBytes(16).toString('hex');
  this.codes.two_factor_auth = code;
  await this.save();
  return code;
};

userSchema.methods.verifyEmail = async function (code: string): Promise<void> {
  if (this.codes.verify_email !== code) {
    throw new ValidationError('Invalid verification code', 'auth', {
      userId: this._id?.toString(),
      errorCode: 'AUTH_INVALID_VERIFICATION_CODE',
      expected: true,
      operation: 'user.verifyEmail',
    });
  }

  this.isVerified = true;
  this.codes.verify_email = null;
  this.codes.verify_email_token = null;
  this.codes.verify_email_expires = null;
  await this.save();
};

userSchema.methods.finalizeEmailVerificationFromLinkToken = async function (): Promise<void> {
  if (
    !this.codes.verify_email_token ||
    !this.codes.verify_email_expires ||
    this.codes.verify_email_expires < new Date()
  ) {
    throw new ValidationError('Invalid or expired verification link', 'auth', {
      userId: this._id?.toString(),
      errorCode: 'AUTH_INVALID_VERIFICATION_LINK',
      expected: true,
      operation: 'user.finalizeEmailVerificationFromLinkToken',
    });
  }
  this.isVerified = true;
  this.codes.verify_email = null;
  this.codes.verify_email_token = null;
  this.codes.verify_email_expires = null;
  await this.save();
};

userSchema.methods.resetPassword = async function (newPassword: string, credential: string): Promise<void> {
  const isSixDigit = /^\d{6}$/.test(credential);
  if (isSixDigit) {
    if (this.codes.reset_password !== credential) {
      throw new ValidationError('Invalid reset password code', 'auth', {
        userId: this._id?.toString(),
        errorCode: 'AUTH_INVALID_RESET_CODE',
        expected: true,
        operation: 'user.resetPassword',
      });
    }
  } else {
    if (
      this.codes.reset_password_token !== credential ||
      !this.codes.reset_password_expires ||
      this.codes.reset_password_expires < new Date()
    ) {
      throw new ValidationError('Invalid reset password code', 'auth', {
        userId: this._id?.toString(),
        errorCode: 'AUTH_INVALID_RESET_CODE',
        expected: true,
        operation: 'user.resetPassword',
      });
    }
  }

  this.password = newPassword; // Set the new password to trigger pre('save') hashing
  this.codes.reset_password = null;
  this.codes.reset_password_token = null;
  this.codes.reset_password_expires = null;
  await this.save();
};

userSchema.methods.finalizeMagicLoginFromToken = async function (): Promise<void> {
  if (
    !this.codes.magic_login_token ||
    !this.codes.magic_login_expires ||
    this.codes.magic_login_expires < new Date()
  ) {
    throw new ValidationError('Invalid or expired sign-in link', 'auth', {
      userId: this._id?.toString(),
      errorCode: 'AUTH_INVALID_MAGIC_LOGIN',
      expected: true,
      operation: 'user.finalizeMagicLoginFromToken',
    });
  }
  this.codes.magic_login_token = null;
  this.codes.magic_login_expires = null;
  await this.save();
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
