import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { AuthService } from '@/database/services/auth.service';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __POST(request: NextRequest) {
  try {
    await connectMongo();
    
    // Verify user access
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.verifyToken(token);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is already verified
    if (user.isVerified) {
      return NextResponse.json({ 
        success: false, 
        error: 'Email cím már ellenőrzött' 
      }, { status: 400 });
    }

    // Generate new verification code and send email
    try {
      await AuthService.sendVerificationEmail(user);
      
      return NextResponse.json({
        success: true,
        message: 'Ellenőrző kód újraküldve az email címre'
      });
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      return NextResponse.json({
        success: false,
        error: 'Hiba történt az email küldése során. Kérjük, próbálja újra később.'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error resending verification code:', error);
    return NextResponse.json(
      { success: false, error: 'Hiba történt az ellenőrző kód újraküldése során' },
      { status: 500 }
    );
  }
}

export const POST = withApiTelemetry('/api/profile/resend-verification', __POST as any);
