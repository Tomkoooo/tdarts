import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthService } from '@tdarts/services';
import { passwordValidator } from '@tdarts/schemas';
import { withApiTelemetry } from '@/lib/api-telemetry';
import { handleError } from '@/middleware/errorHandle';

const bodySchema = z.object({
  email: z.string().email(),
  code: z.string().min(6),
  newPassword: passwordValidator,
});

async function __POST(request: NextRequest) {
  try {
    const body = bodySchema.parse(await request.json());
    await AuthService.resetPassword(body.email, body.code, body.newPassword);
    return NextResponse.json({ message: 'Password reset successfully' }, { status: 200 });
  } catch (error) {
    const handled = handleError(error);
    return NextResponse.json(handled.body, { status: handled.status });
  }
}

export const POST = withApiTelemetry('/api/auth/reset-password', __POST as any);
