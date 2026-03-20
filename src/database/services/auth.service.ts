import { UserModel } from '@/database/models/user.model';
import { UserDocument as IUserDocument } from '@/interface/user.interface';
import { BadRequestError, ValidationError } from '@/middleware/errorHandle';
import jwt from 'jsonwebtoken';
import { connectMongo } from '@/lib/mongoose';

// Utility function to mask email for privacy/GDPR compliance
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  const maskedLocal = local.length > 2 ? `${local[0]}***${local[local.length - 1]}` : '***';
  return `${maskedLocal}@${domain}`;
}

export class AuthService {
  static async register(user: {
    email: string;
    name: string;
    username: string;
    password: string;
  }): Promise<string> {
    await connectMongo();
    try {
      const existingUser = await UserModel.findOne({
        $or: [{ email: user.email }, user.username ? { username: user.username } : {}],
      });
      if (existingUser) {
        throw new ValidationError('Email or username already exists', 'auth', {
          email: maskEmail(user.email),
          username: user.username
        });
      }
      const newUser = await UserModel.create({
        ...user,
        country: null,
      });
      return await this.sendVerificationEmail(newUser);
    } catch (error: any) {
      if (error.code === 11000) {
        throw new ValidationError('Email or username already exists', 'auth', {
          email: maskEmail(user.email),
          username: user.username
        });
      }
      throw error;
    }
  }

  static async login(email: string, password: string): Promise<{token: string, user: {_id: string, username: string, email: string, name: string, isAdmin: boolean, isVerified: boolean, country?: string | null, locale?: 'hu' | 'en' | 'de'}}> {
    await connectMongo();
    const user = await UserModel.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password)) || user.isDeleted) {
      throw new BadRequestError('Invalid email or password', 'auth', {
        email: maskEmail(email),
        errorCode: 'AUTH_INVALID_CREDENTIALS',
        expected: true,
        operation: 'auth.login',
      });
    }
    await user.updateLastLogin();
    const token = await this.generateAuthToken(user);
    return {token, user}
  }

  static async verifyEmail(email: string, code: string): Promise<{user: IUserDocument, token: string}> {
    await connectMongo();
    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new BadRequestError('User not found', 'auth', {
        email: maskEmail(email),
        errorCode: 'AUTH_USER_NOT_FOUND',
        expected: true,
        operation: 'auth.verifyEmail',
      });
    }
    await user.verifyEmail(code);
    const token = await this.generateAuthToken(user);
    return { user, token };
  }

  static async sendVerificationEmail(user: IUserDocument): Promise<string> {
    const verificationCode = await user.generateVerifyEmailCode();
    const { MailerService } = await import('@/database/services/mailer.service');
    
    await MailerService.sendVerificationEmail(user.email, {
      userName: user.name || user.username || 'Játékos',
      verificationCode,
      locale: user.locale || 'hu',
    });
    
    return verificationCode;
  }

  static async generateAuthToken(user: { _id: unknown }): Promise<string> {
    const userId = typeof user?._id === 'string' ? user._id : String(user?._id ?? '');
    if (!userId || userId === 'undefined' || userId === 'null') {
      throw new BadRequestError('Invalid user id for token generation', 'auth', {
        errorCode: 'AUTH_INVALID_USER_ID',
        expected: false,
        operation: 'auth.generateAuthToken',
      });
    }
    return jwt.sign({ id: userId }, process.env.JWT_SECRET!, { expiresIn: '180d' });
  }

  static async verifyToken(token: string): Promise<IUserDocument> {
    await connectMongo();
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
      const user = await UserModel.findById(decoded.id).select(
        '_id username name email isVerified isAdmin profilePicture isDeleted'
      );
      if (!user) {
        throw new BadRequestError('User not found', 'auth', {
          userId: decoded.id,
          errorCode: 'AUTH_USER_NOT_FOUND',
          expected: true,
          operation: 'auth.verifyToken',
        });
      }
      // Avoid write amplification on high-traffic auth checks.
      // Last-login should be updated on explicit sign-in flows, not per request verification.
      return user;
    } catch {
      throw new BadRequestError('Invalid token', 'auth', {
        errorCode: 'AUTH_INVALID_TOKEN',
        expected: true,
        operation: 'auth.verifyToken',
      });
    }
  }

  static async forgotPassword(email: string): Promise<void> {
    await connectMongo();
    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new BadRequestError('User not found', 'auth', {
        email: maskEmail(email),
        errorCode: 'AUTH_USER_NOT_FOUND',
        expected: true,
        operation: 'auth.forgotPassword',
      });
    }
    const resetCode = await user.generateResetPasswordCode();

    const { MailerService } = await import('@/database/services/mailer.service');
    await MailerService.sendPasswordResetEmail(email, {
      userName: user.name || user.username || 'Játékos',
      resetCode,
      locale: user.locale || 'hu',
    });
  }

  static async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    await connectMongo();
    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new BadRequestError('User not found', 'auth', {
        email: maskEmail(email),
        errorCode: 'AUTH_USER_NOT_FOUND',
        expected: true,
        operation: 'auth.resetPassword',
      });
    }
    if (user.codes.reset_password !== code) {
      throw new BadRequestError('Invalid reset code', 'auth', {
        email: maskEmail(email),
        errorCode: 'AUTH_INVALID_RESET_CODE',
        expected: true,
        operation: 'auth.resetPassword',
      });
    }
    await user.resetPassword(newPassword, code);
  }
}