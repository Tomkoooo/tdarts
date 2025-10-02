import { UserModel } from '@/database/models/user.model';
import { UserDocument as IUserDocument } from '@/interface/user.interface';
import { BadRequestError, ValidationError } from '@/middleware/errorHandle';
import jwt from 'jsonwebtoken';
import { connectMongo } from '@/lib/mongoose';
import { sendEmail } from '@/lib/mailer';
import { hash } from 'bcryptjs';

interface MailOptions {
  from?: string;
  to: string[];
  subject: string;
  text: string;
  html?: string;
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
          email: user.email,
          username: user.username
        });
      }
      const newUser = await UserModel.create(user);
      return await this.sendVerificationEmail(newUser);
    } catch (error: any) {
      if (error.code === 11000) {
        throw new ValidationError('Email or username already exists', 'auth', {
          email: user.email,
          username: user.username
        });
      }
      throw error;
    }
  }

  static async login(email: string, password: string): Promise<{token: string, user: {_id: string, username: string, email: string, name: string, isAdmin: boolean, isVerified: boolean, twoFactorAuth: boolean}}> {
    await connectMongo();
    const user = await UserModel.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password)) || user.isDeleted) {
      throw new BadRequestError('Invalid email or password', 'auth', {
        email
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
        email
      });
    }
    await user.verifyEmail(code);
    const token = await this.generateAuthToken(user);
    return { user, token };
  }

  static async sendVerificationEmail(user: IUserDocument): Promise<string> {
    const verificationCode = await user.generateVerifyEmailCode();
    const mailOptions: MailOptions = {
      to: [user.email],
      subject: 'TDarts Email Verifikáció',
      text: '',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0c1414; color: #f2f2f2;">
          <h2 style="color: #cc3333;">${user.email === user.email ? 'Új email cím verifikáció' : 'Üdvözöljük a TDarts-ban!'}</h2>
          <p>Kérjük, erősítse meg email címét az alábbi verifikációs kóddal:</p>
          <h3 style="color: #cc3333;">${verificationCode}</h3>
          <p>Adja meg ezt a kódot a TDarts weboldalon az email cím megerősítéséhez.</p>
          <p>Ha nem Ön kezdeményezte ezt a műveletet, kérjük, hagyja figyelmen kívül ezt az emailt.</p>
          <p>Üdvözlettel,<br>TDarts Csapat</p>
        </div>
      `,
    };
    const emailSent = await sendEmail(mailOptions);
    if (!emailSent) {
      throw new BadRequestError('Failed to send verification email', 'auth', {
        email: user.email
      });
    }
    return verificationCode;
  }

  static async generateAuthToken(user: IUserDocument): Promise<string> {
    return jwt.sign({ id: user._id }, process.env.JWT_SECRET!, { expiresIn: '180d' });
  }

  static async verifyToken(token: string): Promise<IUserDocument> {
    await connectMongo();
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
      const user = await UserModel.findById(decoded.id);
      if (!user) {
        throw new BadRequestError('User not found', 'auth', {
          userId: decoded.id
        });
      }
      await user.updateLastLogin();
      return user;
    } catch (error) {
      throw new BadRequestError('Invalid token', 'auth');
      console.error('Verify token error:', error);
    }
  }

  static async forgotPassword(email: string): Promise<void> {
    await connectMongo();
    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new BadRequestError('User not found', 'auth', {
        email
      });
    }
    const resetCode = await user.generateResetPasswordCode();

    const mailOptions: MailOptions = {
      to: [email],
      subject: 'TDarts Jelszó Visszaállítás',
      text: '',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0c1414; color: #f2f2f2;">
          <h2 style="color: #cc3333;">Jelszó visszaállítás</h2>
          <p>Kérjük, használja az alábbi kódot a jelszó visszaállításához:</p>
          <h3 style="color: #cc3333;">${resetCode}</h3>
          <p>Adja meg ezt a kódot a TDarts weboldalon az új jelszó megadásához.</p>
          <p>Ha nem Ön kérte a jelszó visszaállítást, kérjük, hagyja figyelmen kívül ezt az emailt.</p>
          <p>Üdvözlettel,<br>TDarts Csapat</p>
        </div>
      `,
    };
    const emailSent = await sendEmail(mailOptions);
    if (!emailSent) {
      throw new BadRequestError('Failed to send reset password email', 'auth', {
        email
      });
    }
  }

  static async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    await connectMongo();
    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new BadRequestError('User not found', 'auth', {
        email
      });
    }
    if (user.codes.reset_password !== code) {
      throw new BadRequestError('Invalid reset code', 'auth', {
        email
      });
    }
    await user.resetPassword(newPassword, code);
  }

  static async generate2FA(email: string): Promise<void> {
    await connectMongo();
    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new BadRequestError('User not found', 'auth', {
        email
      });
    }
    //generate a 4 digit code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    user.codes.two_factor_auth = code;
    await user.save();
    //send email with code
    const mailOptions: MailOptions = {
      to: [email],
      subject: 'tDarts - kétlépcsős autentikáció',
      text: '',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0c1414; color: #f2f2f2;">
          <h2 style="color: #cc3333;">Kétlépcsős autentikáció</h2>
          <p>Kérjük, használja az alábbi kódot a 2FA beállításához:</p>
          <h3 style="color: #cc3333;">${code}</h3>
          <p>Adja meg ezt a kódot a tDarts weboldalon a 2FA beállításához.</p>
          <p>Ha nem Ön kérte a 2FA beállítást, kérjük, hagyja figyelmen kívül ezt az emailt.</p>
          <p>Üdvözlettel,<br>tDarts Csapat</p>
        </div>
      `,
    };
    const emailSent = await sendEmail(mailOptions);
    if (!emailSent) {
      throw new BadRequestError('Failed to send 2FA email', 'auth', {
        email
      });
    }
  }

  static async verify2FA(email: string, code: string): Promise<void> {
    await connectMongo();
    const user = await UserModel.findOne({ email});
    if (!user) {
      throw new BadRequestError('User not found', 'auth', {
        email
      });
    }
    if (user.codes.two_factor_auth !== code) {
      throw new BadRequestError('Invalid 2FA code', 'auth', {
        email
      });
    }
    user.codes.two_factor_auth = null;
    await user.save();
  }

  static async generateOTP(email: string): Promise<void> {
    await connectMongo();
    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new BadRequestError('User not found', 'auth', {
        email
      });
    }
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    user.codes.OTP = code;
    await user.save();
    //send email with code
    const mailOptions: MailOptions = {
      to: [email],
      subject: 'tDarts - OTP',
      text: '',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0c1414; color: #f2f2f2;">
          <h2 style="color: #cc3333;">OTP</h2>
          <p>Kérjük, használja az alábbi kódot a OTP beállításához:</p>
          <h3 style="color: #cc3333;">${code}</h3>
          <p>Adja meg ezt a kódot a tDarts weboldalon a OTP beállításához.</p>
          <p>Ha nem Ön kérte a OTP beállítást, kérjük, hagyja figyelmen kívül ezt az emailt.</p>
          <p>Üdvözlettel,<br>tDarts Csapat</p>
        </div>
      `,
  }
    const emailSent = await sendEmail(mailOptions);
    if (!emailSent) {
      throw new BadRequestError('Failed to send OTP email', 'auth', {
        email
      });
    }
  }
  
  static async verifyOTP(email: string, code: string): Promise<{token: string, user: {_id: string, username: string, email: string, name: string, isAdmin: boolean, isVerified: boolean, twoFactorAuth: boolean}}> {
    await connectMongo();
    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new BadRequestError('User not found', 'auth', {
        email
      });
    }
    if (user.codes.OTP !== code) {
      throw new BadRequestError('Invalid OTP code', 'auth', {
        email
      });
    }
    user.codes.OTP = null;
    await user.save();
    const token = await this.generateAuthToken(user);
    return { token, user };
  }
}