import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectMongo } from '@/lib/mongoose';
import { UserModel } from '@/database/models/user.model';
import { AuthService } from '@/database/services/auth.service';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    console.log('Google OAuth callback - Session:', session);
    
    if (!session?.user) {
      console.log('No session or user found in callback');
      return NextResponse.redirect(new URL('/auth/login?error=NoSession', request.url));
    }

    await connectMongo();
    
    // Keressük meg a felhasználót
    // A session.user.id a MongoDB ObjectId-t tartalmazza, nem a Google ID-t
    const user = await UserModel.findOne({ 
      email: session.user.email
    });

    console.log('Google OAuth callback - Found user:', user ? user._id : 'No user found');

    if (!user) {
      console.log('User not found, redirecting to login');
      return NextResponse.redirect(new URL('/auth/login?error=UserNotFound', request.url));
    }

    // Generáljunk JWT tokent a meglévő AuthService-tel
    const token = await AuthService.generateAuthToken(user);
    
    console.log('Google OAuth callback - Generated token for user:', user._id);
    
    // Cookie beállítása és átirányítás
    const callbackUrl = request.nextUrl.searchParams.get('callbackUrl');
    let redirectUrl = '/';
    
    if (callbackUrl) {
      // Ha van callbackUrl, akkor oda irányítsunk és fűzzük hozzá a tokent
      const hasQuery = callbackUrl.includes('?');
      redirectUrl = `${callbackUrl}${hasQuery ? '&' : '?'}token=${token}`;
      console.log('Redirecting to callbackUrl with token:', callbackUrl);
    }
    
    const response = NextResponse.redirect(new URL(redirectUrl, request.url));
    
    // Set the token as an HTTP-only cookie (matching the login route settings)
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 180, // 180 days
      sameSite: 'strict',
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(new URL('/auth/login?error=CallbackError', request.url));
  }
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    console.log('Google OAuth callback POST - Session:', session);
    
    if (!session?.user) {
      console.log('No session or user found in callback POST');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await connectMongo();
    
    // Keressük meg a felhasználót - próbáljuk meg mindkét módon
    let user = await UserModel.findOne({ 
      email: session.user.email
    });

    // Ha nem találjuk email alapján, próbáljuk meg a Google ID alapján
    if (!user && (session.user as any).id) {
      user = await UserModel.findById((session.user as any).id);
    }

    console.log('Google OAuth callback POST - Found user:', user ? user._id : 'No user found');
    console.log('Google OAuth callback POST - User email:', user?.email);
    console.log('Google OAuth callback POST - User isAdmin:', user?.isAdmin);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generáljunk JWT tokent a meglévő AuthService-tel
    const token = await AuthService.generateAuthToken(user);
    
    console.log('Google OAuth callback POST - Generated token for user:', user._id);
    console.log('Google OAuth callback POST - Token generated successfully');
    
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
        authProvider: user.authProvider
      }
    });
    
    // Set the token as an HTTP-only cookie (matching the login route settings)
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 180, // 180 days
      sameSite: 'strict',
      path: '/',
    });

    console.log('Google OAuth callback POST - JWT token set in cookie');
    return response;
  } catch (error: any) {
    console.error('Google OAuth callback POST error:', error);
    return NextResponse.json({ 
      error: 'Authentication failed',
      details: error.message 
    }, { status: 500 });
  }
}
