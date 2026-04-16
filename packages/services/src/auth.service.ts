import { UserModel } from '@tdarts/core';
import { UserDocument as IUserDocument } from '@tdarts/core';
import { BadRequestError, ValidationError } from '@tdarts/core';
import jwt from 'jsonwebtoken';
import { connectMongo } from '@tdarts/core';

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
    const { MailerService } = await import('./mailer.service');
    
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

  /**
   * Secret for socket handshake JWTs. Prefer SOCKET_JWT_SECRET so standalone Socket.IO
   * servers can verify without sharing the main login JWT_SECRET.
   */
  private static socketTokenSigningSecret(): string {
    const secret = process.env.SOCKET_JWT_SECRET || process.env.JWT_SECRET;
    if (!secret) {
      throw new BadRequestError(
        'Missing JWT secret for socket token (set SOCKET_JWT_SECRET or JWT_SECRET)',
        'auth',
        {
          errorCode: 'AUTH_CONFIG',
          expected: false,
          operation: 'auth.socketTokenSigningSecret',
        },
      );
    }
    return secret;
  }

  /**
   * Short-lived JWT for WebSocket / realtime handshakes (claim `purpose: 'socket'`).
   * Includes `userId` / `userRole` for legacy Socket.IO servers that read those claims.
   */
  static issueSocketToken(userId: string): { token: string; expiresInSec: number } {
    const expiresInSec = Number(process.env.SOCKET_TOKEN_TTL_SEC ?? 600);
    const secret = AuthService.socketTokenSigningSecret();
    const token = jwt.sign(
      {
        id: userId,
        purpose: 'socket' as const,
        userId,
        userRole: 'user' as const,
      },
      secret,
      { expiresIn: expiresInSec },
    );
    return { token, expiresInSec };
  }

  static verifySocketToken(token: string): { userId: string } {
    try {
      const secret = AuthService.socketTokenSigningSecret();
      const decoded = jwt.verify(token, secret) as {
        id?: string;
        purpose?: string;
      };
      if (!decoded.id || decoded.purpose !== 'socket') {
        throw new BadRequestError('Invalid socket token', 'auth', {
          errorCode: 'AUTH_INVALID_SOCKET_TOKEN',
          expected: true,
          operation: 'auth.verifySocketToken',
        });
      }
      return { userId: decoded.id };
    } catch (e) {
      if (e instanceof BadRequestError) throw e;
      throw new BadRequestError('Invalid socket token', 'auth', {
        errorCode: 'AUTH_INVALID_SOCKET_TOKEN',
        expected: true,
        operation: 'auth.verifySocketToken',
      });
    }
  }

  static async verifyToken(token: string): Promise<IUserDocument> {
    await connectMongo();
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
      const user = await UserModel.findById(decoded.id).select(
        '_id username name email isVerified isAdmin profilePicture country locale isDeleted'
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

    const { MailerService } = await import('./mailer.service');
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

  static async loginWithGoogleIdToken(idToken: string): Promise<{
    token: string;
    user: {
      _id: string;
      username: string;
      email: string;
      name: string;
      isAdmin: boolean;
      isVerified: boolean;
      country?: string | null;
      locale?: 'hu' | 'en' | 'de';
    };
  }> {
    await connectMongo();
    const rawIds = process.env.GOOGLE_CLIENT_IDS ?? process.env.GOOGLE_CLIENT_ID ?? '';
    const clientIds = rawIds.split(',').map((s) => s.trim()).filter(Boolean);
    if (clientIds.length === 0) {
      throw new BadRequestError('Google sign-in is not configured', 'auth', {
        errorCode: 'AUTH_GOOGLE_DISABLED',
        expected: true,
        operation: 'auth.loginWithGoogleIdToken',
      });
    }
    const { OAuth2Client } = await import('google-auth-library');
    const client = new OAuth2Client();
    let payload:
      | { sub?: string; email?: string; email_verified?: boolean | string; name?: string }
      | undefined;
    try {
      const ticket = await client.verifyIdToken({ idToken, audience: clientIds });
      payload = ticket.getPayload() ?? undefined;
    } catch {
      throw new BadRequestError('Invalid Google token', 'auth', {
        errorCode: 'AUTH_GOOGLE_INVALID_TOKEN',
        expected: true,
        operation: 'auth.loginWithGoogleIdToken',
      });
    }
    if (!payload?.sub || !payload.email) {
      throw new BadRequestError('Google token missing required claims', 'auth', {
        errorCode: 'AUTH_GOOGLE_INVALID_PAYLOAD',
        expected: true,
        operation: 'auth.loginWithGoogleIdToken',
      });
    }
    const verified = payload.email_verified === true || payload.email_verified === 'true';
    if (!verified) {
      throw new BadRequestError('Google email not verified', 'auth', {
        errorCode: 'AUTH_GOOGLE_EMAIL_UNVERIFIED',
        expected: true,
        operation: 'auth.loginWithGoogleIdToken',
      });
    }
    const googleId = payload.sub;
    const email = payload.email.toLowerCase();
    const name = (payload.name ?? email.split('@')[0]).slice(0, 50);

    let user = await UserModel.findOne({ googleId });
    if (!user) {
      user = await UserModel.findOne({ email });
    }

    if (user) {
      if (user.isDeleted) {
        throw new BadRequestError('Account not available', 'auth', {
          email: maskEmail(email),
          errorCode: 'AUTH_ACCOUNT_DELETED',
          expected: true,
          operation: 'auth.loginWithGoogleIdToken',
        });
      }
      if (user.googleId && user.googleId !== googleId) {
        throw new BadRequestError('Google account mismatch for this email', 'auth', {
          email: maskEmail(email),
          errorCode: 'AUTH_GOOGLE_MISMATCH',
          expected: true,
          operation: 'auth.loginWithGoogleIdToken',
        });
      }
      if (!user.googleId) {
        user.googleId = googleId;
        user.authProvider = 'google';
        await user.save();
      }
      await user.updateLastLogin();
    } else {
      const baseRaw = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 16) || 'user';
      let username = baseRaw;
      for (let attempt = 0; attempt < 12; attempt++) {
        const exists = await UserModel.findOne({ username });
        if (!exists) break;
        username = `${baseRaw}_${Math.random().toString(36).slice(2, 8)}`;
      }
      user = await UserModel.create({
        email,
        name,
        username,
        googleId,
        authProvider: 'google' as const,
        isVerified: true,
        country: null,
      });
      await user.updateLastLogin();
    }

    const token = await this.generateAuthToken(user);
    return {
      token,
      user: {
        _id: String(user._id),
        username: user.username,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
        isVerified: user.isVerified,
        country: user.country ?? null,
        locale: user.locale ?? 'hu',
      },
    };
  }
}