import mongoose from 'mongoose';

export interface IUser {
    _id: string;
    username: string;
    name: string
    email: string;
    password?: string; // OAuth esetén opcionális
    isVerified: boolean;
    isAdmin: boolean;
    createdAt: Date;
    updatedAt: Date;
    lastLogin: Date | null;
    isDeleted?: boolean;
    // OAuth adatok
    googleId?: string;
    profilePicture?: string;
    authProvider?: 'local' | 'google';
    country?: string;
    locale?: 'hu' | 'en';
    codes: {
        reset_password: string | null;
        verify_email: string | null;
        two_factor_auth: string | null;
    }
}

export interface UserDocument extends Omit<IUser, '_id'>, mongoose.Document{
  _id:  mongoose.Types.ObjectId;
  name: string;
  username: string;
  email: string;
  isVerified: boolean;
  //methods
  generateVerifyEmailCode(): Promise<string>;
  matchPassword(password: string): Promise<boolean>;
  generateResetPasswordCode(): Promise<string>;
  generateTwoFactorAuthCode(): Promise<string>;
  verifyEmail(code: string): Promise<void>;
  resetPassword(newPassword: string, code: string): Promise<void>;
  verifyTwoFactorAuth(code: string): Promise<boolean>;
  updateLastLogin(): Promise<void>;
}
