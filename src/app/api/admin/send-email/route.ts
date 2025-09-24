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

    const { userId, subject, message } = await request.json();

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

    // Send email notification
    const emailContent = `
      <div class="email-content" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p style="color: #6b7280; font-size: 12px; margin-bottom: 20px; font-style: italic;">For English scroll down</p>
        
        <h2 style="color: #b62441;">Értesítés a tDarts platformról</h2>
        <p>Kedves ${targetUser.name}!</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">${subject}</h3>
          <p style="white-space: pre-wrap; margin-bottom: 0;">${makeUrlsClickable(message)}</p>
        </div>
        
        <p style="color: #6b7280; font-size: 14px;">
          Ez az üzenet a tDarts platform adminisztrátorától érkezett.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <h2 style="color: #b62441; font-size: 1.1em; margin-top: 0.5em;">Notification from tDarts platform</h2>
        <p>Dear ${targetUser.name},</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">${subject}</h3>
          <p style="white-space: pre-wrap; margin-bottom: 0;">${makeUrlsClickable(message)}</p>
        </div>
        
        <p style="color: #6b7280; font-size: 14px;">
          This message was sent by a tDarts platform administrator.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          tDarts Platform - Versenykezelés<br>
          <span style="color: #bdbdbd; font-size: 11px;">tDarts Platform - Tournament Management</span>
        </p>
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
