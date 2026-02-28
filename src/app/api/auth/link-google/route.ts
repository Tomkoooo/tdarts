import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectMongo } from '@/lib/mongoose';
import { UserModel } from '@/database/models/user.model';
import { AuthService } from '@/database/services/auth.service';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const googleProviderId = (session.user as any).googleProviderId as string | undefined;
    if (!googleProviderId) {
      return NextResponse.json(
        { error: 'Google provider session is missing. Please start Google sign-in again.' },
        { status: 400 }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    await connectMongo();
    
    // Keressük meg a meglévő felhasználót email és jelszó alapján
    const existingUser = await UserModel.findOne({ email }).select('+password');
    
    if (!existingUser || !(await existingUser.matchPassword(password))) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Ellenőrizzük, hogy nincs-e már Google OAuth kapcsolat
    if (existingUser.googleId) {
      return NextResponse.json({ error: 'Google account already linked' }, { status: 400 });
    }

    // Ellenőrizzük, hogy a Google fiók nincs-e másik fiókhoz kapcsolva
    const alreadyLinkedUser = await UserModel.findOne({ googleId: googleProviderId });
    if (alreadyLinkedUser && alreadyLinkedUser._id.toString() !== existingUser._id.toString()) {
      return NextResponse.json({ error: 'This Google account is already linked to another user' }, { status: 409 });
    }

    // Kapcsoljuk össze a Google OAuth fiókot a meglévő felhasználóval
    existingUser.googleId = googleProviderId;
    existingUser.isVerified = true;
    if (session.user.image) {
      existingUser.profilePicture = session.user.image;
    }
    existingUser.authProvider = 'google';
    await existingUser.save();

    // Generáljunk JWT tokent
    const token = await AuthService.generateAuthToken(existingUser);
    
    // Cookie beállítása
    const response = NextResponse.json({ 
      success: true, 
      user: {
        _id: existingUser._id.toString(),
        username: existingUser.username,
        email: existingUser.email,
        name: existingUser.name,
        isAdmin: existingUser.isAdmin,
        isVerified: existingUser.isVerified,
        profilePicture: existingUser.profilePicture,
        authProvider: existingUser.authProvider
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
    console.error('Google OAuth linking error:', error);
    return NextResponse.json({ 
      error: 'Account linking failed',
      details: error.message 
    }, { status: 500 });
  }
}

export const POST = withApiTelemetry('/api/auth/link-google', __POST as any);
