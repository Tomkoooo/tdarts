import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyEmailResendToken } from '@/lib/email-resend';
import { normalizeEmailLocale } from '@/lib/email-layout';
import { EmailTemplateService } from '@/database/services/emailtemplate.service';
import { sendEmail } from '@/lib/mailer';

const resendSchema = z.object({
  token: z.string().min(1),
  locale: z.enum(['hu', 'en', 'de']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = resendSchema.parse(await request.json());
    const payload = verifyEmailResendToken(body.token);
    const locale = normalizeEmailLocale(body.locale || payload.locale);

    const rendered = await EmailTemplateService.getRenderedTemplate(
      payload.templateKey,
      payload.variables || {},
      { locale }
    );

    if (!rendered) {
      return NextResponse.json(
        { success: false, error: 'This email type cannot be re-sent in another language right now.' },
        { status: 400 }
      );
    }

    await sendEmail({
      to: [payload.to],
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      resendContext: {
        templateKey: payload.templateKey,
        variables: payload.variables || {},
        locale,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        locale === 'en'
          ? 'Email re-sent in English.'
          : locale === 'de'
            ? 'E-Mail wurde auf Deutsch erneut gesendet.'
            : 'Az email ujra lett kuldve magyar nyelven.',
    });
  } catch (error: any) {
    console.error('Email resend error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to resend email.' },
      { status: 400 }
    );
  }
}
