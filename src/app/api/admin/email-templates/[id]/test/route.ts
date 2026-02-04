import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { EmailTemplateModel } from '@/database/models/emailtemplate.model';
import { EmailTemplateService } from '@/database/services/emailtemplate.service';
import { sendEmail } from '@/lib/mailer';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).isAdmin) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { recipientEmail } = await req.json();
    if (!recipientEmail) {
      return NextResponse.json({ success: false, message: 'Recipient email is required' }, { status: 400 });
    }

    await connectMongo();
    const template = await EmailTemplateModel.findById(params.id);

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
      currentDate: new Date().toLocaleDateString('hu-HU'),
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
    const subject = EmailTemplateService.renderTemplate(template.subject, dummyData);
    const html = EmailTemplateService.renderTemplate(template.htmlContent, dummyData);
    const text = EmailTemplateService.renderTemplate(template.textContent, dummyData);

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
