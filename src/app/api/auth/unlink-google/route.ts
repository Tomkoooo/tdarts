import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AuthService } from '@/database/services/auth.service';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.verifyToken(token);

    if (!user.googleId) {
      return NextResponse.json({ error: 'No Google account is linked' }, { status: 400 });
    }

    if (!user.isVerified || !user.password) {
      return NextResponse.json(
        { error: 'Google unlink requires a verified email and password on this account' },
        { status: 400 }
      );
    }

    user.googleId = undefined;
    user.authProvider = 'local';
    await user.save();

    return NextResponse.json(
      {
        success: true,
        user: {
          _id: user._id.toString(),
          username: user.username,
          email: user.email,
          name: user.name,
          isAdmin: user.isAdmin,
          isVerified: user.isVerified,
          profilePicture: user.profilePicture,
          authProvider: user.authProvider,
          country: user.country || null,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to unlink Google account' }, { status: error.status || 400 });
  }
}
