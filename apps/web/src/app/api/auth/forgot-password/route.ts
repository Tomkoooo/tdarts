import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthService } from '@tdarts/services';
import { withApiTelemetry } from '@/lib/api-telemetry';
import { handleError } from '@/middleware/errorHandle';

const bodySchema = z.object({
  email: z.string().email(),
});

async function __POST(request: NextRequest) {
  try {
    const body = bodySchema.parse(await request.json());
    await AuthService.forgotPassword(body.email);
    return NextResponse.json({ message: 'Reset password email sent' }, { status: 200 });
  } catch (error) {
    const handled = handleError(error);
    return NextResponse.json(handled.body, { status: handled.status });
  }
}

export const POST = withApiTelemetry('/api/auth/forgot-password', __POST as any);
