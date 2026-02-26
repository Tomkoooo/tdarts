import jwt from 'jsonwebtoken';
import { EmailLocale, normalizeEmailLocale } from '@/lib/email-layout';

export interface EmailResendContext {
  to: string;
  templateKey: string;
  variables: Record<string, any>;
  locale?: EmailLocale;
}

export interface EmailResendTokenPayload {
  to: string;
  templateKey: string;
  variables: Record<string, any>;
  locale: EmailLocale;
  iat?: number;
  exp?: number;
}

export function createEmailResendToken(context: EmailResendContext): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Missing JWT secret for email resend token');
  }

  const payload: EmailResendTokenPayload = {
    to: context.to.toLowerCase(),
    templateKey: context.templateKey,
    variables: context.variables || {},
    locale: normalizeEmailLocale(context.locale),
  };

  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

export function verifyEmailResendToken(token: string): EmailResendTokenPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Missing JWT secret for email resend token');
  }
  return jwt.verify(token, secret) as EmailResendTokenPayload;
}
