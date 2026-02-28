import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectMongo } from '@/lib/mongoose';
import { UserModel } from '@/database/models/user.model';
import { AuthService } from '@/database/services/auth.service';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __POST() {
  try {
    const session = await getServerSession(authOptions);
    
    console.log('Google OAuth API - Session:', session);
    
    if (!session?.user) {
      console.log('No session or user found');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await connectMongo();
    
    // Keressük meg a felhasználót
    const user = await UserModel.findOne({ 
      email: session.user.email
    });

    console.log('Found user:', user ? user._id : 'No user found');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generáljunk JWT tokent a meglévő AuthService-tel
    const token = await AuthService.generateAuthToken(user);
    
    console.log('Generated token for user:', user._id);
    
    // Cookie beállítása
    const response = NextResponse.json({ 
      success: true, 
      user: {
        _id: user._id.toString(),
        username: user.username,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
        isVerified: user.isVerified,
        profilePicture: user.profilePicture,
        country: user.country || null,
        authProvider: user.authProvider
      }
    });
    
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 180 // 180 nap
    });

    return response;
  } catch (error: any) {
    console.error('Google OAuth login error:', error);
    return NextResponse.json({ 
      error: 'Authentication failed',
      details: error.message 
    }, { status: 500 });
  }
}

export const POST = withApiTelemetry('/api/auth/google', __POST as any);
