import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/database/services/auth.service';
import { sendEmail } from '@/lib/mailer';
import { connectMongo } from '@/lib/mongoose';
import { UserModel } from '@/database/models/user.model';

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

    // Function to make URLs clickable
    const makeUrlsClickable = (text: string) => {
      const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
      return text.replace(urlRegex, (url) => {
        const href = url.startsWith('http') ? url : `https://${url}`;
        return `<a href="${href}" target="_blank" style="color: #b62441; text-decoration: underline;">${url}</a>`;
      });
    };

    // Generate email content based on language preference
    const isHungarian = language === 'hu';
    
    const emailContent = `
      <div class="email-content" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #b62441 0%, #8a1b31 100%); color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: bold;">
            ${isHungarian ? 'tDarts - Admin Értesítés' : 'tDarts - Admin Notification'}
          </h1>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
          ${isHungarian ? `
            <h2 style="color: #b62441; font-size: 20px; margin-bottom: 16px;">Kedves ${targetUser.name}!</h2>
            <p style="color: #374151; line-height: 1.6; margin-bottom: 16px;">
              A tDarts platform adminisztrátoraként szeretnénk értesíteni Önt a következőről:
            </p>
            <div style="background: #f9fafb; border-left: 4px solid #b62441; padding: 16px; margin: 20px 0;">
              <h3 style="color: #b62441; margin: 0 0 8px 0; font-size: 16px;">${subject}</h3>
              <p style="color: #374151; margin: 0; white-space: pre-line;">${makeUrlsClickable(message)}</p>
            </div>
            <p style="color: #374151; line-height: 1.6; margin-bottom: 16px;">
              Ha bármilyen kérdése van, kérjük, lépjen kapcsolatba velünk.
            </p>
            <p style="color: #374151; line-height: 1.6;">
              Üdvözlettel,<br>
              A tDarts admin csapat
            </p>
          ` : `
            <h2 style="color: #b62441; font-size: 20px; margin-bottom: 16px;">Dear ${targetUser.name}!</h2>
            <p style="color: #374151; line-height: 1.6; margin-bottom: 16px;">
              As a tDarts platform administrator, we would like to inform you about the following:
            </p>
            <div style="background: #f9fafb; border-left: 4px solid #b62441; padding: 16px; margin: 20px 0;">
              <h3 style="color: #b62441; margin: 0 0 8px 0; font-size: 16px;">${subject}</h3>
              <p style="color: #374151; margin: 0; white-space: pre-line;">${makeUrlsClickable(message)}</p>
            </div>
            <p style="color: #374151; line-height: 1.6; margin-bottom: 16px;">
              If you have any questions, please contact us.
            </p>
            <p style="color: #374151; line-height: 1.6;">
              Best regards,<br>
              The tDarts admin team
            </p>
          `}
        </div>
        
        <!-- Footer -->
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            © 2024 tDarts. Minden jog fenntartva.
          </p>
        </div>
      </div>
    `;

    await sendEmail({
      to: [targetUser.email],
      subject: `[tDarts Admin] ${subject}`,
      text: "",
      html: emailContent,
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
