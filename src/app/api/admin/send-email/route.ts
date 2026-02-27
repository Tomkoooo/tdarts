import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/database/services/auth.service';
import { sendEmail } from '@/lib/mailer';
import { connectMongo } from '@/lib/mongoose';
import { UserModel } from '@/database/models/user.model';
import { EmailTemplateService } from '@/database/services/emailtemplate.service';
import { normalizeEmailLocale, renderMinimalEmailLayout, textToEmailHtml } from '@/lib/email-layout';

export async function POST(request: NextRequest) {
  try {
    await connectMongo();
    
    // Get user from JWT token
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (!user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { userId, subject, message, language = 'hu' } = await request.json();

    if (!userId || !subject || !message) {
      return NextResponse.json({ 
        error: 'Missing required fields: userId, subject, message' 
      }, { status: 400 });
    }

    // Get target user
    const targetUser = await UserModel.findById(userId);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!targetUser.email) {
      return NextResponse.json({ 
        error: 'Target user does not have an email address' 
      }, { status: 400 });
    }

    const resolvedLocale = normalizeEmailLocale(
      targetUser.locale || language || request.headers.get('accept-language')
    );
    const template = await EmailTemplateService.getRenderedTemplate(
      'admin_user_notification',
      {
        userName: targetUser.name || targetUser.username || 'User',
        customSubject: subject,
        customMessage: message,
        language: resolvedLocale,
      },
      {
        locale: resolvedLocale,
      }
    );

    const fallbackText =
      resolvedLocale === 'en'
        ? `Dear ${targetUser.name || targetUser.username || 'User'},\n\n${subject}\n${message}\n\nBest regards,\ntDarts Admin Team`
        : `Kedves ${targetUser.name || targetUser.username || 'Felhasználó'},\n\n${subject}\n${message}\n\nÜdvözlettel,\ntDarts Admin csapat`;

    await sendEmail({
      to: [targetUser.email],
      subject: template?.subject || `[tDarts Admin] ${subject}`,
      text: template?.text || fallbackText,
      html:
        template?.html ||
        renderMinimalEmailLayout({
          locale: resolvedLocale,
          title: `[tDarts Admin] ${subject}`,
          heading: subject,
          bodyHtml: textToEmailHtml(fallbackText),
        }),
      resendContext: {
        templateKey: 'admin_user_notification',
        variables: {
          userName: targetUser.name || targetUser.username || 'User',
          customSubject: subject,
          customMessage: message,
          language: resolvedLocale,
        },
        locale: resolvedLocale,
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Email sent successfully' 
    });

  } catch (error: any) {
    console.error('Admin send email error:', error);
    return NextResponse.json({ 
      error: 'Failed to send email',
      details: error.message 
    }, { status: 500 });
  }
}
