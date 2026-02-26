import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { EmailTemplateModel } from '@/database/models/emailtemplate.model';
import { EmailTemplateService } from '@/database/services/emailtemplate.service';
import { sendEmail } from '@/lib/mailer';
import { AuthService } from '@/database/services/auth.service';
import { normalizeEmailLocale } from '@/lib/email-layout';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
   // Check authentication
      const token = req.cookies.get('token')?.value;
      if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
  
      const user = await AuthService.verifyToken(token);
      if (!user || !user.isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
  

    const { recipientEmail, locale } = await req.json();
    if (!recipientEmail) {
      return NextResponse.json({ success: false, message: 'Recipient email is required' }, { status: 400 });
    }

    const {id} = await params;

    await connectMongo();
    const template = await EmailTemplateModel.findById(id);
    const resolvedLocale = normalizeEmailLocale(locale || template.locale || 'hu');
    const localeTemplate =
      (await EmailTemplateModel.findOne({ key: template.key, locale: resolvedLocale })) || template;


    if (!template) {
      return NextResponse.json({ success: false, message: 'Template not found' }, { status: 404 });
    }

    // Generate dummy data for all variables
    const dummyData: Record<string, string> = {
      userName: 'Teszt Felhasználó',
      tournamentName: 'TDarts Téli Kupa',
      tournamentCode: 'TD-WINTER-2024',
      freeSpots: '5',
      tournamentUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://tdarts.hu'}/tournaments/TD-WINTER-2024`,
      currentYear: new Date().getFullYear().toString(),
      currentDate: new Date().toLocaleDateString(resolvedLocale === 'de' ? 'de-DE' : resolvedLocale === 'en' ? 'en-US' : 'hu-HU'),
      clubName: 'TDarts Sportegyesület',
      feedbackTitle: 'Tapasztalatok a tornával kapcsolatban',
      feedbackId: '65e1234567890abcdef12345',
      verificationCode: '123456',
      resetCode: '654321',
      loginUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://tdarts.hu'}/login`,
      clubUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://tdarts.hu'}/club`,
      profileUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://tdarts.hu'}/profile`,
      howItWorksUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://tdarts.hu'}/how-it-works`,
      tournamentDate: new Date().toLocaleDateString('hu-HU') + ' 18:00',
    };

    // Render template
    const subject = EmailTemplateService.renderTemplate(localeTemplate.subject, dummyData);
    const html = EmailTemplateService.renderTemplate(localeTemplate.htmlContent, dummyData);
    const text = EmailTemplateService.renderTemplate(localeTemplate.textContent, dummyData);

    // Send email
    const success = await sendEmail({
      to: [recipientEmail],
      subject: `[TESZT] ${subject}`,
      html,
      text,
    });

    if (success) {
      return NextResponse.json({ success: true, message: 'Test email sent successfully' });
    } else {
      return NextResponse.json({ success: false, message: 'Failed to send test email' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error sending test email:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
