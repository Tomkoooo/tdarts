import mongoose from 'mongoose';

export interface IUser {
  _id: string;
  username: string;
  name: string;
  email: string;
  password?: string;
  isVerified: boolean;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin: Date | null;
  isDeleted?: boolean;
  googleId?: string;
  profilePicture?: string;
  authProvider?: 'local' | 'google';
  country?: string;
  locale?: 'hu' | 'en' | 'de';
  /** Single acceptance timestamp for terms + privacy (GDPR) as shown on onboarding. */
  termsAcceptedAt?: Date | null;
  codes: {
    reset_password: string | null;
    reset_password_token: string | null;
    reset_password_expires: Date | null;
    verify_email: string | null;
    verify_email_token: string | null;
    verify_email_expires: Date | null;
    magic_login_token: string | null;
    magic_login_expires: Date | null;
    two_factor_auth: string | null;
  };
}

export interface UserDocument extends Omit<IUser, '_id'>, mongoose.Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  username: string;
  email: string;
  isVerified: boolean;
  generateVerifyEmailCode(): Promise<string>;
  matchPassword(password: string): Promise<boolean>;
  generateResetPasswordCode(): Promise<string>;
  generateMagicLoginToken(): Promise<string>;
  generateTwoFactorAuthCode(): Promise<string>;
  verifyEmail(code: string): Promise<void>;
  finalizeEmailVerificationFromLinkToken(): Promise<void>;
  resetPassword(newPassword: string, credential: string): Promise<void>;
  verifyTwoFactorAuth(code: string): Promise<boolean>;
  updateLastLogin(): Promise<void>;
  finalizeMagicLoginFromToken(): Promise<void>;
}
