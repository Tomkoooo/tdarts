import { NextResponse } from 'next/server';
import { ProfileService } from '@/database/services/profile.service';
import { AuthService } from '@/database/services/auth.service';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    // Ellenőrizzük a NextAuth session-t is
    const session = await getServerSession(authOptions);
    
    if (!token && !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let userId = null;
    
    // Ha van JWT token, használjuk azt
    if (token) {
      try {
        const user = await AuthService.verifyToken(token);
        userId = user._id.toString();
        console.log('Logout - JWT user found:', userId);
      } catch (error) {
        console.log('Logout - JWT token invalid, trying NextAuth session');
        console.log(error);
        // Continue to NextAuth session check
      }
    }
    
    // Ha nincs JWT token vagy érvénytelen, próbáljuk meg a NextAuth session-t
    if (!userId && session?.user) {
      try {
        const { connectMongo } = await import('@/lib/mongoose');
        const { UserModel } = await import('@/database/models/user.model');
        await connectMongo();
        
        const user = await UserModel.findOne({ 
          email: session.user.email
        });
        
        if (user) {
          userId = user._id.toString();
          console.log('Logout - NextAuth user found:', userId);
        }
      } catch (error) {
        console.error('Logout - Error finding user from NextAuth session:', error);
      }
    }

    if (userId) {
      await ProfileService.logout(userId);
      console.log('Logout - ProfileService.logout called for user:', userId);
    }

    // Töröljük a token sütit
    if (token) {
      cookieStore.delete('token');
      console.log('Logout - JWT token cookie deleted');
    }
    
    // NextAuth session cookie-k törlése
    if (session) {
      console.log('Logout - NextAuth session found, clearing cookies');
      // NextAuth session cookie-k törlése
      cookieStore.delete('next-auth.session-token');
      cookieStore.delete('__Secure-next-auth.session-token');
      cookieStore.delete('next-auth.csrf-token');
      cookieStore.delete('__Host-next-auth.csrf-token');
      cookieStore.delete('next-auth.callback-url');
      cookieStore.delete('__Secure-next-auth.callback-url');
    }

    return NextResponse.json({ 
      message: 'Logged out successfully',
      clearedJWT: !!token,
      hadNextAuthSession: !!session
    }, { status: 200 });
  } catch (error: any) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: error.message || 'Failed to logout' }, { status: error.status || 400 });
  }
}

export const POST = withApiTelemetry('/api/profile/logout', __POST as any);
