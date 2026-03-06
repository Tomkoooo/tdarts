import { NextResponse } from 'next/server';
import { ProfileService } from '@/database/services/profile.service';
import { AuthService } from '@/database/services/auth.service';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { withApiTelemetry } from '@/lib/api-telemetry';

const verifyEmailSchema = z.object({
  code: z.string().min(1, 'Verification code is required'),
});

function resolveStatusCode(error: any): number {
  if (error instanceof z.ZodError) return 400;
  const status = error?.statusCode ?? error?.status;
  if (typeof status === 'number') return status;
  const message = String(error?.message || '').toLowerCase();
  if (message.includes('invalid token') || message.includes('unauthorized')) {
    return 401;
  }
  return 500;
}

async function __POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.verifyToken(token);
    const body = await request.json();
    const { code } = verifyEmailSchema.parse(body);

    await ProfileService.verifyEmail(user._id.toString(), code);
    return NextResponse.json({ message: 'Email verified successfully' }, { status: 200 });
  } catch (error: any) {
    const status = resolveStatusCode(error);
    return NextResponse.json(
      { error: status >= 500 ? 'Failed to verify email' : (error?.message || 'Failed to verify email') },
      { status }
    );
  }
}

export const POST = withApiTelemetry('/api/profile/verify-email', __POST as any);
