import { UserModel } from '@/database/models/user.model';
import { IUserDocument } from '@/interface/user.interface';
import { BadRequestError } from '@/middleware/errorHandle';
import jwt from 'jsonwebtoken';
import { connectMongo } from '@/lib/mongoose';
import { mailer } from '@/lib/mailer'; // A mailer függvény importálása

// Email opciók interfésze a mailer függvényhez
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
      // Ellenőrizzük, hogy létezik-e már a felhasználó
      const existingUser = await UserModel.findOne({
        $or: [{ email: user.email }, user.username ? { username: user.username } : {}],
      });
      if (existingUser) {
        throw new BadRequestError('Email or username already exists');
      }
      const newUser = await UserModel.create(user);
      const verificationCode = await newUser.generateVerifyEmailCode();

      // Verifikációs email küldése
      const mailOptions: MailOptions = {
        to: [user.email],
        subject: 'TDarts Email Verifikáció',
        text: '',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0c1414; color: #f2f2f2;">
            <h2 style="color: #cc3333;">Üdvözöljük a TDarts-ban!</h2>
            <p>Kérjük, erősítse meg email címét az alábbi verifikációs kóddal:</p>
            <h3 style="color: #cc3333;">${verificationCode}</h3>
            <p>Adja meg ezt a kódot a TDarts weboldalon a regisztráció befejezéséhez.</p>
            <p>Ha nem Ön regisztrált, kérjük, hagyja figyelmen kívül ezt az emailt.</p>
            <p>Üdvözlettel,<br>TDarts Csapat</p>
          </div>
        `,
      };
      const emailSent = await mailer(mailOptions);
      if (!emailSent) {
        throw new BadRequestError('Failed to send verification email');
      }

      return verificationCode;
    } catch (error: any) {
      if (error.code === 11000) {
        throw new BadRequestError('Email or username already exists');
      }
      throw error;
    }
  }

  static async login(email: string, password: string): Promise<string> {
    await connectMongo();
    const user = await UserModel.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      throw new BadRequestError('Invalid email or password');
    }
    await user.updateLastLogin();
    return this.generateAuthToken(user);
  }

  static async verifyEmail(email: string, code: string): Promise<void> {
    await connectMongo();
    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new BadRequestError('User not found');
    }
    await user.verifyEmail(code);
  }

  static async generateAuthToken(user: IUserDocument): Promise<string> {
    return jwt.sign({ id: user._id }, process.env.JWT_SECRET!, { expiresIn: '1d' });
  }

  static async verifyToken(token: string): Promise<IUserDocument> {
    await connectMongo();
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
      const user = await UserModel.findById(decoded.id);
      if (!user) {
        throw new BadRequestError('User not found');
      }
      await user.updateLastLogin(user._id);
      return user;
    } catch (error) {
      throw new BadRequestError('Invalid token');
    }
  }
}