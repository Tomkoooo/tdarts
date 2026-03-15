import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectMongo } from '@/lib/mongoose';
import { AuthService } from '@/database/services/auth.service';
import { findSessionUserByEmail, findSessionUserById } from '@/features/auth/lib/sessionUser.db';

function buildAuthCookie(token: string) {
  return {
    name: 'token',
    value: token,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 180,
      sameSite: 'strict' as const,
      path: '/',
    },
  };
}

export async function handleGoogleCallbackGet(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.redirect(new URL('/auth/login?error=NoSession', request.url));
  }

  await connectMongo();
  const user = await findSessionUserByEmail(session.user.email);
  if (!user) {
    return NextResponse.redirect(new URL('/auth/login?error=UserNotFound', request.url));
  }

  const token = await AuthService.generateAuthToken(user);
  const callbackUrl = request.nextUrl.searchParams.get('callbackUrl');
  const redirectUrl = callbackUrl
    ? `${callbackUrl}${callbackUrl.includes('?') ? '&' : '?'}token=${token}`
    : '/';

  const response = NextResponse.redirect(new URL(redirectUrl, request.url));
  const cookie = buildAuthCookie(token);
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}

export async function handleGoogleCallbackPost() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  await connectMongo();
  let user = await findSessionUserByEmail(session.user.email);
  if (!user) {
    user = await findSessionUserById((session.user as { id?: string }).id);
  }

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const token = await AuthService.generateAuthToken(user);
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
      authProvider: user.authProvider,
      locale: user.locale || 'hu',
    },
  });

  const cookie = buildAuthCookie(token);
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
