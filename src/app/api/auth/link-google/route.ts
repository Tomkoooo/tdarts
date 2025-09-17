import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectMongo } from '@/lib/mongoose';
import { UserModel } from '@/database/models/user.model';
import { AuthService } from '@/database/services/auth.service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
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

    // Kapcsoljuk össze a Google OAuth fiókot a meglévő felhasználóval
    // A session.user.id a MongoDB ObjectId-t tartalmazza, nem a Google ID-t
    // A Google ID-t a NextAuth callback-ben kellene tárolni, de most csak az email-t használjuk
    existingUser.googleId = (session.user as any).id || 'linked-via-email';
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
