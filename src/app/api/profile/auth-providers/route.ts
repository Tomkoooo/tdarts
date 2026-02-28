import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AuthService } from '@/database/services/auth.service';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.verifyToken(token);
    const hasPassword = Boolean(user.password);
    const googleLinked = Boolean(user.googleId);
    const canUnlinkGoogle = googleLinked && user.isVerified && hasPassword;

    return NextResponse.json(
      {
        success: true,
        data: {
          googleLinked,
          hasPassword,
          emailVerified: user.isVerified,
          canUnlinkGoogle,
          authProvider: user.authProvider || 'local',
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load auth providers' }, { status: error.status || 400 });
  }
}

export const GET = withApiTelemetry('/api/profile/auth-providers', __GET as any);
