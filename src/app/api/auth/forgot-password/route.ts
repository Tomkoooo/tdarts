import { NextResponse } from 'next/server';
import { AuthService } from '@/database/services/auth.service';
import { z } from 'zod';
import { withApiTelemetry } from '@/lib/api-telemetry';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

async function __POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = forgotPasswordSchema.parse(body);
    await AuthService.forgotPassword(email);
    return NextResponse.json({ message: 'Reset password email sent' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to send reset password email' }, { status: error.status || 400 });
  }
}

export const POST = withApiTelemetry('/api/auth/forgot-password', __POST as any);
